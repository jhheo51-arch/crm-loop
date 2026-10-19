import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import hillstrom as h  # noqa: E402
import report  # noqa: E402

R = json.loads(report.RESULT.read_text(encoding="utf-8"))
HAS_DATA = h.SOURCES["hillstrom"]["path"].exists()


# ---------- 계산식 ----------

def test_diff_interval_contains_difference():
    rng = np.random.default_rng(0)
    d = h.diff(rng.normal(1.0, 1, 5000), rng.normal(0.0, 1, 5000))
    assert d["lo"] < d["diff"] < d["hi"]
    assert d["lo"] < 1.0 < d["hi"]


def test_qini_orders_perfect_above_random_above_reversed():
    rng = np.random.default_rng(0)
    n = 20000
    t = rng.integers(0, 2, n)
    lift = rng.uniform(0, 0.3, n)  # 고객마다 다른 실제 증분
    y = (rng.uniform(size=n) < 0.1 + t * lift).astype(int)
    good = h.qini(lift, t, y)["coef"]
    bad = h.qini(-lift, t, y)["coef"]
    rand = h.qini(rng.uniform(size=n), t, y)["coef"]
    assert good > abs(rand) and bad < -abs(rand)


def test_budget_formula_by_hand():
    rows = [
        {"n_treated": 100, "n_control": 100, "spend_sum_t": 300.0, "spend_sum_c": 100.0, "cum_spend_diff": {"lo": 1.0, "hi": 3.0}},
        {"n_treated": 100, "n_control": 100, "spend_sum_t": 100.0, "spend_sum_c": 100.0, "cum_spend_diff": {"lo": 0.0, "hi": 2.0}},
    ]
    b = h.budget(rows, margin=0.5, send_cost=0.1, coupon_rate=0.0, base=1000)
    # 상위 50%: 증분 매출 2.0, 이익 0.5 x 2 - 0.1 = 0.9, 500명
    assert b["by_k"][1]["profit_total"] == pytest.approx(450.0)
    # 전원: 증분 매출 1.0, 이익 0.5 - 0.1 = 0.4, 1000명
    assert b["by_k"][2]["profit_total"] == pytest.approx(400.0)
    assert b["best_k_pct"] == 50
    # 쿠폰은 발송군 매출 전체에 붙는다: 0.5 x 2 - 0.1 x 3 - 0.1 = 0.6
    assert h.budget(rows, 0.5, 0.1, 0.1, 1000)["by_k"][1]["profit_per"] == pytest.approx(0.6)


def test_budget_never_negative_best():
    """보내지 않는 선택(0%)이 항상 후보에 있어 최적 이익은 음수가 될 수 없다."""
    for arm in R["arms"].values():
        for s in arm["sensitivity"] + arm["coupon_scenario"]:
            assert s["profit_best"] >= 0


# ---------- 결과 파일 구조와 내부 일관성 ----------

def test_result_meta_and_assignment():
    assert R["meta"]["sha256"] == h.SOURCES["hillstrom"]["sha256"]
    assert sum(R["assignment"].values()) == R["meta"]["rows"] == 64000


@pytest.mark.parametrize("arm", ["mens", "womens"])
def test_groups_add_up_to_arm(arm):
    a = R["arms"][arm]
    assert sum(g["n_treated"] for g in a["groups"]) == a["ate"]["n_treated"]
    assert sum(g["n_control"] for g in a["groups"]) == a["ate"]["n_control"]
    last = a["budget"]["by_k"][-1]
    assert last["inc_spend_per"] == pytest.approx(a["ate"]["spend"]["diff"], abs=1e-3)


@pytest.mark.parametrize("arm", ["mens", "womens"])
def test_segments_cover_all_customers(arm):
    a = R["arms"][arm]
    for rows in a["segments"].values():
        assert sum(x["n_treated"] for x in rows) == a["ate"]["n_treated"]


def test_model_chosen_by_dev_not_test():
    for a in R["arms"].values():
        u = a["uplift"]
        assert u["chosen"] == max(u["dev_qini"], key=u["dev_qini"].get)


# ---------- 문서의 해석 문장이 결과와 맞는지 ----------

def test_claims_in_documents_hold():
    m, w = R["arms"]["mens"], R["arms"]["womens"]
    # 남성용 메일: 순위 모델은 무작위와 구별되지 않고, 여성용은 낫다
    assert m["uplift"]["test"]["qini_visit_lo"] <= 0 <= m["uplift"]["test"]["qini_visit_hi"]
    assert w["uplift"]["test"]["qini_visit_lo"] > 0
    # 남성용 메일: 발송 비용 0.10 이하이면 모든 마진율에서 전원 발송이 최적
    assert all(s["best_k_pct"] == 100 for s in m["sensitivity"] if s["send_cost"] <= 0.10)
    # 여성용 메일: 기본 가정의 최적은 상위 80%, 발송 비용이 오르면 최적 범위가 넓어지지 않는다
    assert w["budget"]["best_k_pct"] == 80
    for mg in {s["margin"] for s in w["sensitivity"]}:
        ks = [s["best_k_pct"] for s in sorted(w["sensitivity"], key=lambda s: s["send_cost"]) if s["margin"] == mg]
        assert ks == sorted(ks, reverse=True)
    # 20% 쿠폰이면 두 메일 모두 보내지 않는 것이 최적
    assert all(c["best_k_pct"] == 0 for a in (m, w) for c in a["coupon_scenario"] if c["coupon_rate"] == 0.2)
    # 여성용 메일의 60%, 80%, 전원 이익 차이는 최적 범위의 95% 구간 안에 있다
    best = next(b for b in w["budget"]["by_k"] if b["k_pct"] == 80)
    for k in (60, 100):
        b = next(b for b in w["budget"]["by_k"] if b["k_pct"] == k)
        assert best["profit_total_lo"] <= b["profit_total"] <= best["profit_total_hi"]
    # 매출 기준 표본은 방문 기준의 열 배를 넘는다
    for a in (m, w):
        sp = {(s["outcome"], s["holdout"]): s["n_total"] for s in a["sample_plan"]}
        assert all(sp[("spend", hh)] > 10 * sp[("visit", hh)] for hh in (0.1, 0.2, 0.5))


# ---------- 문서가 결과 파일과 같은지 ----------

def test_measurement_doc_is_up_to_date():
    assert report.DOC.read_text(encoding="utf-8") == report.doc(R), "python -I analysis/report.py 를 다시 실행하세요"


def test_readme_block_is_up_to_date():
    text = report.README.read_text(encoding="utf-8")
    assert report.render_readme(text, R) == text, "python -I analysis/report.py 를 다시 실행하세요"


def test_docs_have_no_middle_dot():
    for p in [report.README, report.DOC, report.ROOT / "docs/KPI.md", report.ROOT / "docs/PRD.md", report.ROOT / "docs/CASE-C-SEASONAL-STAY.md"]:
        assert "·" not in p.read_text(encoding="utf-8"), p


# ---------- 원문으로 다시 계산 (데이터가 있을 때만) ----------

@pytest.mark.skipif(not HAS_DATA, reason="원문 데이터 없음: python -I analysis/fetch_data.py")
def test_ate_matches_raw_data():
    d = h.load()
    for arm, label in h.ARMS.items():
        t = d[d.segment == label]
        c = d[d.segment == h.CONTROL]
        for o in h.OUTCOMES:
            assert R["arms"][arm]["ate"][o]["diff"] == pytest.approx(t[o].mean() - c[o].mean(), abs=1e-4)


@pytest.mark.skipif(not HAS_DATA, reason="원문 데이터 없음")
def test_uplift_is_reproducible():
    d = h.load()
    x = h.pair(d, "womens").reset_index(drop=True)
    assert h.uplift(x)["test"]["qini_visit"] == R["arms"]["womens"]["uplift"]["test"]["qini_visit"]
