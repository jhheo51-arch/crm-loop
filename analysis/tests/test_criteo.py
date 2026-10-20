import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import criteo as c  # noqa: E402
import hillstrom as h  # noqa: E402

R = json.loads(c.OUT.read_text(encoding="utf-8"))
H = json.loads((c.ROOT / "analysis/results/hillstrom.json").read_text(encoding="utf-8"))


# ---------- 계산식 ----------

def test_prop_diff_matches_hillstrom_diff():
    rng = np.random.default_rng(0)
    yt, yc = (rng.uniform(size=4000) < 0.08).astype(int), (rng.uniform(size=3000) < 0.05).astype(int)
    a, b = c.prop_diff(int(yt.sum()), len(yt), int(yc.sum()), len(yc)), h.diff(yt, yc)
    for k in ("diff", "lo", "hi"):
        assert a[k] == pytest.approx(b[k], abs=1e-4)


def test_masks_take_exact_share_of_each_stratum():
    strata = np.array([1000, 37, 5, 0, 5000, 400, 21, 3])
    ms = c.masks(strata, frac=0.1, seed=1)
    assert [len(m) for m in ms] == list(strata)
    assert [int(m.sum()) for m in ms] == [round(0.1 * n) for n in strata]
    assert all((a == b).all() for a, b in zip(ms, c.masks(strata, frac=0.1, seed=1)))


def test_pick_is_same_regardless_of_chunk_size():
    """조각 크기가 달라도 같은 행이 표본으로 뽑혀야 두 번 읽은 파일에서 학습용과 평가용이 겹치지 않는다."""
    rng = np.random.default_rng(0)
    df = pd.DataFrame({"treatment": rng.integers(0, 2, 5000), "visit": rng.integers(0, 2, 5000),
                       "conversion": rng.integers(0, 2, 5000)}).astype("int8")
    s = c.stratum(df)
    ms = c.masks(np.bincount(s, minlength=8), frac=0.2, seed=3)

    def run(size):
        ptr = np.zeros(8, dtype=np.int64)
        return np.concatenate([c.pick(s[i:i + size], ms, ptr) for i in range(0, len(s), size)])

    assert (run(5000) == run(333)).all()
    assert run(5000).sum() == sum(int(m.sum()) for m in ms)


def test_qini_from_blocks_matches_hillstrom_qini():
    rng = np.random.default_rng(0)
    n = 20000
    t = rng.integers(0, 2, n)
    lift = rng.uniform(0, 0.3, n)
    y = (rng.uniform(size=n) < 0.1 + t * lift).astype(int)
    o = np.argsort(-lift, kind="stable")
    a = c.qini_from_blocks(c.blocks(t[o], y[o], 100))
    b = h.qini(lift, t, y)
    assert a["total"] == pytest.approx(b["total"])
    assert a["coef"] == pytest.approx(b["coef"], rel=0.02)
    assert c.share_at(a, 1.0) == pytest.approx(1.0)


def test_budget_formula_by_hand():
    def row(nt, nc, ct, cc, et):
        return {"n_treated": nt, "n_control": nc, "conversion_sum_t": ct, "conversion_sum_c": cc,
                "exposure_sum_t": et, "cum_conversion_diff": {"lo": 0.0, "hi": 0.0}}

    rows = [row(1000, 1000, 30, 10, 500), row(1000, 1000, 10, 10, 100)]
    b = c.budget(rows, order_value=50, margin=0.3, cost_per_exposed=0.1, base=1000)
    # 상위 50%: 15 x 0.02 - 0.1 x 0.5 = 0.25, 500명
    assert b["by_k"][1]["profit_total"] == pytest.approx(125.0)
    # 전원: 15 x 0.01 - 0.1 x 0.3 = 0.12, 1000명
    assert b["by_k"][2]["profit_total"] == pytest.approx(120.0)
    assert b["best_k_pct"] == 50


# ---------- 결과 파일이 원본, 표본 설계와 맞는지 ----------

def test_file_matches_official_page():
    o, x = R["official"], R["observed"]
    assert R["meta"]["sha256"] == c.SOURCES["criteo"]["sha256"]
    assert R["meta"]["rows"] == o["rows"] == R["assignment"]["treated"] + R["assignment"]["control"]
    assert x["treatment_ratio"] == pytest.approx(o["treatment_ratio"], abs=1e-3)
    assert x["visit"] == pytest.approx(o["visit"], abs=1e-5)
    assert x["conversion"] == pytest.approx(o["conversion"], abs=1e-5)


def test_sample_is_stratified_and_disjoint_from_eval():
    s = R["sample"]
    assert sum(s["strata_full"]) == R["meta"]["rows"]
    assert s["strata_sample"] == [round(s["frac"] * n) for n in s["strata_full"]]
    sp = R["uplift"]["split"]
    assert sp["dev"] == sum(s["strata_sample"])
    assert sp["dev"] + sp["eval"] == R["meta"]["rows"]


def test_groups_add_up_to_eval_and_model_chosen_on_sample():
    g = R["groups"]
    assert sum(x["n_treated"] + x["n_control"] for x in g) == R["uplift"]["split"]["eval"]
    u = R["uplift"]
    assert u["chosen"] == max(u["dev_qini"], key=u["dev_qini"].get)
    assert all(s["profit_best"] >= 0 for s in R["sensitivity"])


# ---------- 문서가 결과와 맞는지 ----------

import report  # noqa: E402

DOC = report.DOC.read_text(encoding="utf-8")


def test_doc_has_criteo_section_after_measurement_plan():
    assert DOC.index("## 6. 다음 캠페인의 측정 계획") < DOC.index("## 7. 최근 공개 데이터로 다시 확인") < DOC.index("## 8. 한계")
    assert "층화 표본" in DOC and f"{R['uplift']['split']['dev']:,}명" in DOC


def test_doc_verdicts_follow_results():
    f = report.criteo_facts(H, R)
    sec = DOC[DOC.index("## 7. 최근"):DOC.index("## 8. 한계")]
    assert ("**같습니다.**" in sec) == f["small_purchase"]
    assert ("**다릅니다.**" in sec) != f["small_purchase"]
    assert f"| {report.yes(f['beats_random_visit'])} / {report.yes(f['beats_random_conv'])} |" in sec
    assert f"**{report.scope(R['budget']['best_k_pct'])}**" in sec
    assert "가정값" in sec and "·" not in sec


def test_readme_links_criteo_section():
    readme = report.README.read_text(encoding="utf-8")
    assert "analysis/criteo.py" in readme
    head, rest = readme.split(report.START)
    assert "Criteo" in head + rest.split(report.END)[1]

def test_web_criteo_values_follow_results():
    w, f = report.criteo_web(H, R), report.criteo_facts(H, R)
    assert w["small_purchase"] == f["small_purchase"] and w["cut_pays"] == f["cut_pays"]
    assert w["budget"]["best_k_pct"] == R["budget"]["best_k_pct"]
    assert w["top30"]["criteo"] == R["uplift"]["test"]["share_of_incremental_visits_top30"]
    assert w["doc"].endswith("#7-최근-공개-데이터로-다시-확인-criteo-광고-실험-2018")
    assert '"criteo":' in report.WEB.read_text(encoding="utf-8")
