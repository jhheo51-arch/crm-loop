"""Criteo 업리프트 데이터(2018 공개, v2.1)로 사례 A의 두 결론을 다시 확인한다.

확인할 결론
1) 방문 증분은 크지만 구매(전환) 증분은 작은가
2) 업리프트 순위로 대상을 자르면 이익이 나는가 (주문 금액, 마진, 비용은 가정값)

데이터가 1,398만 행이라 한 번에 메모리에 올리지 않는다.
- 평균 증분 효과는 전체 행을 조각으로 읽어 센다.
- 모델 학습은 (처치, 방문, 전환) 여덟 층에서 같은 비율(10%)을 뽑은 층화 표본으로 한다.
- 순위 평가와 예산 계산은 학습에 쓰지 않은 나머지 90% 전부로 한다.

결과는 analysis/results/criteo.json 하나에 쓴다.
실행: python -I analysis/criteo.py [원문 .csv.gz 경로]
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # python -I 실행에서도 같은 폴더 모듈을 찾는다

import numpy as np
import pandas as pd
from scipy.stats import norm
from sklearn.model_selection import KFold

import hillstrom as h
from fetch_data import SOURCES, fetch, sha256

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "analysis/results/criteo.json"
SEED = 42
FRAC = 0.10
CHUNK = 1_000_000
FOLDS = 5
GROUPS = 5
BOOT = 200
POINTS = 100
FEATURES = [f"f{i}" for i in range(12)]
LABELS = ["treatment", "conversion", "visit", "exposure"]
OUTCOMES = ["visit", "conversion", "exposure"]
CANDIDATES = ["two_model_logit", "two_model_hgb", "class_transform_hgb"]

# 공식 페이지(ailab.criteo.com)에 적힌 v2.1 값. 내려받은 파일이 같은지 대조한다.
OFFICIAL = {"rows": 13979592, "treatment_ratio": 0.85, "visit": 0.046992, "conversion": 0.00292}

# 데이터에 금액이 없어 전환 1건의 가치와 광고 비용을 정해야 한다. 실제 단가가 아니라 가정값이다.
ASSUMPTIONS = {
    "currency": "USD",
    "order_value": 50.0,  # 전환 1건당 매출
    "margin": 0.30,
    "cost_per_exposed": 0.10,  # 광고에 실제로 노출된 고객 1명당 비용
    "base_customers": 100000,
}
SENS_VALUE = [25.0, 50.0, 100.0]
SENS_COST = [0.05, 0.10, 0.25, 0.50, 1.00]
# 비교용: 이메일처럼 노출 여부와 상관없이 대상 1명마다 비용이 드는 경우의 1명당 비용
SENS_TARGET_COST = [0.005, 0.01, 0.02, 0.05]


def r(x, n=4):
    return h.r(x, n)


def read(path: Path):
    dtypes = {**{f: "float32" for f in FEATURES}, **{c: "int8" for c in LABELS}}
    return pd.read_csv(path, dtype=dtypes, chunksize=CHUNK)


def stratum(df: pd.DataFrame) -> np.ndarray:
    """처치 x 방문 x 전환 여덟 층 (0~7)."""
    return (df.treatment.values * 4 + df.visit.values * 2 + df.conversion.values).astype(np.int8)


def prop_diff(st: int, nt: int, sc: int, nc: int) -> dict:
    """두 군 비율 차이와 95% 신뢰구간. 0/1 값에 hillstrom.diff와 같은 식(분산 ddof=1)을 쓴다."""
    pt, pc = st / nt, sc / nc
    vt, vc = pt * (1 - pt) * nt / (nt - 1), pc * (1 - pc) * nc / (nc - 1)
    se = np.sqrt(vt / nt + vc / nc)
    d = pt - pc
    p = 2 * (1 - norm.cdf(abs(d / se))) if se > 0 else None
    return {"treated": r(pt, 6), "control": r(pc, 6), "diff": r(d, 6), "lo": r(d - h.Z * se, 6),
            "hi": r(d + h.Z * se, 6), "p": r(p, 6)}


# ---------- 1차: 전체 집계와 층 크기 ----------

def scan(path: Path) -> dict:
    n = np.zeros(2, dtype=np.int64)
    s = {o: np.zeros(2, dtype=np.int64) for o in OUTCOMES}
    strata = np.zeros(8, dtype=np.int64)
    for df in read(path):
        t = df.treatment.values
        for k in (0, 1):
            m = t == k
            n[k] += m.sum()
            for o in OUTCOMES:
                s[o][k] += df[o].values[m].sum()
        strata += np.bincount(stratum(df), minlength=8)
    return {"n": n, "sum": s, "strata": strata}


def masks(strata: np.ndarray, frac: float = FRAC, seed: int = SEED) -> list:
    """층마다 정확히 frac 비율을 뽑는다. 층 안의 순번으로 고르므로 파일을 다시 읽어도 같은 행이 뽑힌다."""
    rng = np.random.default_rng(seed)
    out = []
    for n_s in strata:
        m = np.zeros(int(n_s), dtype=bool)
        m[rng.choice(int(n_s), int(round(frac * n_s)), replace=False)] = True
        out.append(m)
    return out


def pick(svals: np.ndarray, ms: list, ptr: np.ndarray) -> np.ndarray:
    """조각 안 각 행이 표본인지. ptr은 층별로 지금까지 읽은 행 수이며 이 함수가 갱신한다."""
    sel = np.zeros(len(svals), dtype=bool)
    for k in range(8):
        idx = np.flatnonzero(svals == k)
        sel[idx] = ms[k][ptr[k]:ptr[k] + len(idx)]
        ptr[k] += len(idx)
    return sel


# ---------- 2차: 층화 표본 ----------

def sample(path: Path, ms: list) -> pd.DataFrame:
    ptr = np.zeros(8, dtype=np.int64)
    parts = [df[pick(stratum(df), ms, ptr)] for df in read(path)]
    return pd.concat(parts, ignore_index=True)


# ---------- 업리프트 ----------

def fit(name: str, X: np.ndarray, t: np.ndarray, y: np.ndarray):
    if name == "two_model_logit":
        return h.fit_two_model(h._logit, X, t, y)
    if name == "two_model_hgb":
        return h.fit_two_model(h._hgb, X, t, y)
    return h.fit_class_transform(X, t, y)


def crossfit(name: str, X: np.ndarray, t: np.ndarray, y: np.ndarray) -> np.ndarray:
    s = np.zeros(len(t))
    for tr, te in KFold(FOLDS, shuffle=True, random_state=SEED).split(X):
        s[te] = fit(name, X[tr], t[tr], y[tr])(X[te])
    return s


def blocks(t: np.ndarray, y: np.ndarray, nb: int, w: np.ndarray | None = None) -> dict:
    """점수 순으로 정렬된 행을 nb개의 같은 크기 묶음으로 나눠 묶음별 합계를 센다."""
    n = len(t)
    edges = np.round(np.linspace(0, n, nb + 1)).astype(np.int64)
    w = np.ones(n, dtype=np.int32) if w is None else w.astype(np.int32)  # 합계는 2^31보다 작다
    tw = t.astype(np.int32) * w
    cw = w - tw
    yw = y.astype(np.int32)
    return {
        "n": np.diff(edges),
        "nt": np.add.reduceat(tw, edges[:-1]),
        "nc": np.add.reduceat(cw, edges[:-1]),
        "yt": np.add.reduceat(yw * tw, edges[:-1]),
        "yc": np.add.reduceat(yw * cw, edges[:-1]),
    }


def qini_from_blocks(b: dict) -> dict:
    """hillstrom.qini와 같은 정의를 묶음 경계에서 계산한다. 1,000만 행에서도 메모리를 적게 쓴다."""
    nt, nc, yt, yc = (np.concatenate([[0], np.cumsum(b[k])]).astype(float) for k in ("nt", "nc", "yt", "yc"))
    with np.errstate(divide="ignore", invalid="ignore"):
        q = np.where(nc > 0, yt - yc * nt / nc, 0.0)
    n = float(np.sum(b["n"]))
    frac = np.concatenate([[0], np.cumsum(b["n"])]) / n
    random = frac * q[-1]
    coef = np.trapezoid(q - random, frac) / n
    return {"coef": coef, "frac": frac, "model": q, "random": random, "total": q[-1]}


def share_at(qn: dict, f: float):
    i = int(np.argmin(np.abs(qn["frac"] - f)))
    return qn["model"][i] / qn["total"] if qn["total"] else None


def evaluate(path: Path, ms: list, score) -> dict:
    """표본에 들지 않은 행만 다시 읽어 점수를 매기고, 점수 순으로 정렬한 배열을 돌려준다."""
    ptr = np.zeros(8, dtype=np.int64)
    parts = []
    for df in read(path):
        rest = df[~pick(stratum(df), ms, ptr)]
        parts.append((score(rest[FEATURES].values).astype(np.float32),
                      *(rest[c].values for c in ["treatment", "visit", "conversion", "exposure"])))
    s, t, v, c, e = (np.concatenate([p[i] for p in parts]) for i in range(5))
    o = np.argsort(-s, kind="stable")
    return {"t": t[o], "visit": v[o], "conversion": c[o], "exposure": e[o]}


def groups(ev: dict, k: int = GROUPS) -> list:
    """점수 순 k분위별 결과와, 상위 1~j분위를 합쳤을 때의 전환 증분."""
    t = ev["t"]
    n = len(t)
    edges = np.round(np.linspace(0, n, k + 1)).astype(np.int64)
    rows = []
    for j in range(k):
        sl = slice(edges[j], edges[j + 1])
        cum = slice(0, edges[j + 1])
        tt = t[sl] == 1
        row = {"group": j + 1, "label": f"상위 {j * 100 // k}-{(j + 1) * 100 // k}%",
               "n_treated": int(tt.sum()), "n_control": int((~tt).sum())}
        for o in ["visit", "conversion", "exposure"]:
            y = ev[o][sl]
            row[f"{o}_sum_t"] = int(y[tt].sum())
            row[f"{o}_sum_c"] = int(y[~tt].sum())
        row["visit_diff"] = prop_diff(row["visit_sum_t"], row["n_treated"], row["visit_sum_c"], row["n_control"])
        row["conversion_diff"] = prop_diff(row["conversion_sum_t"], row["n_treated"], row["conversion_sum_c"], row["n_control"])
        ct = t[cum] == 1
        yc = ev["conversion"][cum]
        row["cum_conversion_diff"] = prop_diff(int(yc[ct].sum()), int(ct.sum()), int(yc[~ct].sum()), int((~ct).sum()))
        rows.append(row)
    return rows


def budget(rows: list, order_value: float, margin: float, cost_per_exposed: float, base: int,
           per_target: bool = False) -> dict:
    """상위 k개 분위를 대상으로 삼을 때 고객 1명당 증분 이익
    = 전환 1건 매출 x 마진율 x 증분 전환율 - 노출 1명당 비용 x 대상군 노출률.

    대상으로 정해도 광고가 실제로 보이지 않은 고객에게는 비용이 들지 않으므로 처치군의 실측 노출률을 곱한다.
    per_target=True면 비교를 위해 노출률을 1로 두고 대상 1명마다 비용을 매긴다 (이메일 발송과 같은 방식).
    """
    by_k = [{"k_pct": 0, "n_target": 0, "inc_conv_per": 0.0, "exposure_t": 0.0, "profit_per": 0.0, "profit_total": 0.0,
             "profit_total_lo": 0.0, "profit_total_hi": 0.0}]
    unit = order_value * margin
    for k in range(1, len(rows) + 1):
        sel = rows[:k]
        nt, nc = sum(x["n_treated"] for x in sel), sum(x["n_control"] for x in sel)
        inc = sum(x["conversion_sum_t"] for x in sel) / nt - sum(x["conversion_sum_c"] for x in sel) / nc
        et = sum(x["exposure_sum_t"] for x in sel) / nt
        paid = 1.0 if per_target else et
        per = unit * inc - cost_per_exposed * paid
        cum = rows[k - 1]["cum_conversion_diff"]
        n_target = round(base * k / len(rows))
        by_k.append({"k_pct": k * 100 // len(rows), "n_target": n_target, "inc_conv_per": r(inc, 6),
                     "exposure_t": r(et, 6), "profit_per": r(per, 6), "profit_total": r(per * n_target, 1),
                     "profit_total_lo": r((unit * cum["lo"] - cost_per_exposed * paid) * n_target, 1),
                     "profit_total_hi": r((unit * cum["hi"] - cost_per_exposed * paid) * n_target, 1)})
    best = max(by_k, key=lambda b: b["profit_total"])
    return {"by_k": by_k, "best_k_pct": best["k_pct"], "profit_best": best["profit_total"],
            "profit_all": by_k[-1]["profit_total"]}


def uplift(dev: pd.DataFrame, path: Path, ms: list) -> dict:
    X, t, y = dev[FEATURES].values, dev.treatment.values, dev.visit.values
    # 1) 층화 표본 안에서 교차 적합 Qini로 모델을 고른다. 나머지 90%는 보지 않는다.
    dev_scores = {}
    for name in CANDIDATES:
        s = crossfit(name, X, t, y)
        o = np.argsort(-s, kind="stable")
        dev_scores[name] = qini_from_blocks(blocks(t[o], y[o], POINTS))["coef"]
        print(name, dev_scores[name], flush=True)
    chosen = max(dev_scores, key=dev_scores.get)

    # 2) 고른 모델을 표본 전체로 다시 학습해 나머지 90%에서 한 번만 평가한다.
    model = fit(chosen, X, t, y)
    ev = evaluate(path, ms, model)
    bv = blocks(ev["t"], ev["visit"], POINTS)
    q = qini_from_blocks(bv)
    q_conv = qini_from_blocks(blocks(ev["t"], ev["conversion"], POINTS))
    # 정렬은 그대로 두고 행마다 포아송(1) 가중치를 주는 부트스트랩. 1,000만 행을 다시 정렬하지 않아도 된다.
    rng = np.random.default_rng(SEED)
    boot = [qini_from_blocks(blocks(ev["t"], ev["visit"], 50, rng.poisson(1.0, len(ev["t"])).astype(np.int8)))["coef"]
            for _ in range(BOOT)]
    lo, hi = np.percentile(boot, [2.5, 97.5])
    boot_c = [qini_from_blocks(blocks(ev["t"], ev["conversion"], 50, rng.poisson(1.0, len(ev["t"])).astype(np.int8)))["coef"]
              for _ in range(BOOT)]
    lo_c, hi_c = np.percentile(boot_c, [2.5, 97.5])

    step = max(1, len(q["frac"]) // 20)
    curve = [{"frac": r(f, 3), "model": r(m, 1), "random": r(rd, 1)}
             for f, m, rd in zip(q["frac"][::step], q["model"][::step], q["random"][::step])]
    return {
        "outcome_for_training": "visit",
        "split": {"dev": int(len(dev)), "eval": int(len(ev["t"])), "folds": FOLDS, "seed": SEED, "frac": FRAC},
        "dev_qini": {k: r(v, 6) for k, v in dev_scores.items()},
        "chosen": chosen,
        "test": {
            "qini_visit": r(q["coef"], 6), "qini_visit_lo": r(lo, 6), "qini_visit_hi": r(hi, 6),
            "qini_conversion": r(q_conv["coef"], 6), "qini_conversion_lo": r(lo_c, 6), "qini_conversion_hi": r(hi_c, 6),
            "incremental_visits_total": r(q["total"], 1),
            "share_of_incremental_visits_top30": r(share_at(q, 0.3), 3),
            "share_of_incremental_visits_top50": r(share_at(q, 0.5), 3),
            "curve": curve,
        },
    }, ev


def main(path: Path | None = None):
    path = path or fetch("criteo")
    digest = sha256(path)
    if digest != SOURCES["criteo"]["sha256"]:
        raise SystemExit(f"criteo: 해시가 다릅니다 ({digest}).")
    sc = scan(path)
    n, s = sc["n"], sc["sum"]
    ms = masks(sc["strata"])
    dev = sample(path, ms)
    up, ev = uplift(dev, path, ms)
    rows = groups(ev)
    a = ASSUMPTIONS
    result = {
        "meta": {
            "dataset": "Criteo Uplift Prediction Dataset v2.1 (Diemert et al., AdKDD 2018)",
            "source": SOURCES["criteo"]["url"],
            "official_page": SOURCES["criteo"]["page"],
            "license": "CC BY-NC-SA 4.0",
            "sha256": digest,
            "rows": int(n.sum()),
            "channel": "디스플레이 광고 (처치군은 광고 노출 대상, 대조군은 광고 제외)",
            "currency": "USD",
            "note": "공개 실험 데이터로 사례 A의 결론을 다시 확인하기 위한 분석이다. 금액 정보가 없어 이익 계산은 모두 가정값에 기댄다.",
        },
        "official": OFFICIAL,
        "observed": {
            "treatment_ratio": r(n[1] / n.sum(), 6),
            "visit": r(s["visit"].sum() / n.sum(), 6),
            "conversion": r(s["conversion"].sum() / n.sum(), 6),
        },
        "assignment": {"treated": int(n[1]), "control": int(n[0])},
        "ate": {o: prop_diff(int(s[o][1]), int(n[1]), int(s[o][0]), int(n[0])) for o in OUTCOMES},
        "sample": {
            "method": "처치, 방문, 전환 여덟 층에서 같은 비율로 뽑은 층화 표본",
            "frac": FRAC,
            "strata_full": [int(x) for x in sc["strata"]],
            "strata_sample": [int(m.sum()) for m in ms],
        },
        "assumptions": a,
        "uplift": up,
        "groups": rows,
        "budget": budget(rows, a["order_value"], a["margin"], a["cost_per_exposed"], a["base_customers"]),
        "sensitivity": [
            {"order_value": v, "cost_per_exposed": c,
             **{k: x for k, x in budget(rows, v, a["margin"], c, a["base_customers"]).items() if k != "by_k"}}
            for v in SENS_VALUE for c in SENS_COST
        ],
        "sensitivity_per_target": [
            {"order_value": a["order_value"], "cost_per_target": c,
             **budget(rows, a["order_value"], a["margin"], c, a["base_customers"], per_target=True)}
            for c in SENS_TARGET_COST
        ],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else None)
