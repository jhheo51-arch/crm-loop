"""Hillstrom 이메일 실험 분석: 평균 증분 효과, 고객군별 증분 효과, 업리프트 모델, 예산 계산.

결과는 analysis/results/hillstrom.json 하나에 쓴다. README, 문서, 화면은 이 파일의 숫자만 쓴다.
실행: python -I analysis/hillstrom.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # python -I 실행에서도 같은 폴더 모듈을 찾는다

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import KFold, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from fetch_data import SOURCES, fetch

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "analysis/results/hillstrom.json"
SEED = 42
CONTROL = "No E-Mail"
ARMS = {"mens": "Mens E-Mail", "womens": "Womens E-Mail"}
OUTCOMES = ["visit", "conversion", "spend"]
Z = 1.959963984540054  # 95% 양측
BOOT = 300
FOLDS = 5
GROUPS = 5  # 예산 계산은 5분위(20%씩). 구매가 드물어 10분위는 잡음이 큼

# 예산 계산 기본 가정. 실제 단가가 아니며, 민감도 표로 결론이 바뀌는 지점을 함께 본다.
ASSUMPTIONS = {
    "currency": "USD",
    "margin": 0.30,
    "send_cost": 0.05,
    "coupon_rate": 0.0,
    "base_customers": 10000,
}
SENS_MARGIN = [0.2, 0.3, 0.4]
SENS_SEND = [0.01, 0.05, 0.10, 0.25, 0.50]


def load() -> pd.DataFrame:
    d = pd.read_csv(fetch("hillstrom"))
    d["recency_group"] = pd.cut(d["recency"], [0, 4, 8, 12], labels=["1-4개월", "5-8개월", "9-12개월"]).astype(str)
    d["past_purchase"] = np.select(
        [(d.mens == 1) & (d.womens == 1), d.mens == 1, d.womens == 1],
        ["남성용, 여성용 모두", "남성용만", "여성용만"],
        "기록 없음",
    )
    return d


def r(x, n=4):
    return None if x is None or not np.isfinite(x) else round(float(x), n)


def diff(yt: np.ndarray, yc: np.ndarray) -> dict:
    """두 군 평균 차이와 Welch 표준오차 기반 95% 신뢰구간."""
    mt, mc = yt.mean(), yc.mean()
    se = np.sqrt(yt.var(ddof=1) / len(yt) + yc.var(ddof=1) / len(yc))
    d = mt - mc
    from scipy.stats import norm

    p = 2 * (1 - norm.cdf(abs(d / se))) if se > 0 else None
    return {"treated": r(mt), "control": r(mc), "diff": r(d), "lo": r(d - Z * se), "hi": r(d + Z * se), "p": r(p, 6)}


def pair(d: pd.DataFrame, arm: str) -> pd.DataFrame:
    x = d[d.segment.isin([ARMS[arm], CONTROL])].copy()
    x["t"] = (x.segment == ARMS[arm]).astype(int)
    return x


def balance(x: pd.DataFrame) -> dict:
    """무작위 배정 점검: 공변량의 표준화 평균 차이(SMD). 0.1 미만이면 균형으로 본다."""
    cols = ["recency", "history", "mens", "womens", "newbie"]
    dummies = pd.get_dummies(x[["zip_code", "channel"]]).astype(float)
    m = pd.concat([x[cols].astype(float), dummies], axis=1)
    t, c = m[x.t == 1], m[x.t == 0]
    smd = (t.mean() - c.mean()) / np.sqrt((t.var() + c.var()) / 2)
    return {"max_abs_smd": r(smd.abs().max()), "by_var": {k: r(v) for k, v in smd.items()}}


def ate(x: pd.DataFrame) -> dict:
    t, c = x[x.t == 1], x[x.t == 0]
    return {"n_treated": int(len(t)), "n_control": int(len(c)), **{o: diff(t[o].values, c[o].values) for o in OUTCOMES}}


def segments(x: pd.DataFrame) -> dict:
    out = {}
    for by in ["history_segment", "recency_group", "newbie", "channel", "zip_code", "past_purchase"]:
        rows = []
        for level, g in x.groupby(by, sort=True):
            t, c = g[g.t == 1], g[g.t == 0]
            rows.append({
                "level": str(level),
                "n_treated": int(len(t)),
                "n_control": int(len(c)),
                "visit": diff(t.visit.values, c.visit.values),
                "spend": diff(t.spend.values, c.spend.values),
            })
        out[by] = rows
    return out


# ---------- 업리프트 ----------

def features(x: pd.DataFrame) -> pd.DataFrame:
    f = x[["recency", "history", "mens", "womens", "newbie"]].astype(float)
    f = pd.concat([f, pd.get_dummies(x[["zip_code", "channel"]]).astype(float)], axis=1)
    return f


def _logit():
    return make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))


def _hgb():
    return HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=200, random_state=0)


def fit_two_model(make, X, t, y):
    mt, mc = make().fit(X[t == 1], y[t == 1]), make().fit(X[t == 0], y[t == 0])
    return lambda Xn: mt.predict_proba(Xn)[:, 1] - mc.predict_proba(Xn)[:, 1]


def fit_class_transform(X, t, y):
    """Z = 1 이면 (발송, 방문) 또는 (미발송, 미방문). 두 군이 1:1일 때 uplift = 2P(Z=1) - 1."""
    p = t.mean()
    w = np.where(t == 1, 0.5 / p, 0.5 / (1 - p))  # 배정 비율이 1:1에서 벗어난 만큼 보정
    m = _hgb().fit(X, (t == y).astype(int), sample_weight=w)
    return lambda Xn: 2 * m.predict_proba(Xn)[:, 1] - 1


def fit_segment_rule(x_train: pd.DataFrame):
    """모델 없이 고객군(신규 여부 x 채널 x 최근성) 칸별 증분 방문률로 순위를 매기는 규칙."""
    keys = ["newbie", "channel", "recency_group"]
    g = x_train.groupby(keys + ["t"]).visit.mean().unstack("t")
    cell = (g[1] - g[0]).rename("score").reset_index()
    overall = x_train[x_train.t == 1].visit.mean() - x_train[x_train.t == 0].visit.mean()

    def score(xn: pd.DataFrame):
        return xn[keys].merge(cell, on=keys, how="left")["score"].fillna(overall).values

    return score


CANDIDATES = ["two_model_logit", "two_model_hgb", "class_transform_hgb", "segment_rule"]


def fit(name: str, x: pd.DataFrame):
    X, t, y = features(x), x.t.values, x.visit.values
    if name == "two_model_logit":
        s = fit_two_model(_logit, X, t, y)
    elif name == "two_model_hgb":
        s = fit_two_model(_hgb, X, t, y)
    elif name == "class_transform_hgb":
        s = fit_class_transform(X, t, y)
    else:
        rule = fit_segment_rule(x)
        return rule
    cols = X.columns

    def score(xn: pd.DataFrame):
        return s(features(xn).reindex(columns=cols, fill_value=0.0))

    return score


def qini(score: np.ndarray, t: np.ndarray, y: np.ndarray, points: int = 100) -> dict:
    """점수 순으로 상위 φ를 골랐을 때 증분 반응 수: Yt(φ) - Yc(φ) x Nt(φ)/Nc(φ).

    coef는 모델 곡선과 무작위 직선 사이 넓이를 전체 고객 수로 나눈 값이다. 0보다 크면 무작위보다 낫다.
    """
    o = np.argsort(-score, kind="stable")
    t, y = t[o], y[o]
    nt, nc = np.cumsum(t), np.cumsum(1 - t)
    yt, yc = np.cumsum(y * t), np.cumsum(y * (1 - t))
    with np.errstate(divide="ignore", invalid="ignore"):
        q = np.where(nc > 0, yt - yc * nt / nc, 0.0)
    n = len(t)
    idx = np.unique(np.clip(np.round(np.linspace(0, n, points + 1)).astype(int) - 1, 0, n - 1))
    frac = (idx + 1) / n
    model = q[idx]
    random = frac * q[-1]
    coef = np.trapezoid(model - random, frac) / n
    return {"coef": coef, "frac": frac, "model": model, "random": random, "total": q[-1]}


def share_at(qn: dict, f: float) -> float:
    """상위 f를 골랐을 때 전체 증분 반응 중 확보하는 비율."""
    i = int(np.argmin(np.abs(qn["frac"] - f)))
    return qn["model"][i] / qn["total"] if qn["total"] else None


def crossfit(name: str, x: pd.DataFrame, seed: int = SEED) -> np.ndarray:
    s = np.zeros(len(x))
    for tr, te in KFold(FOLDS, shuffle=True, random_state=seed).split(x):
        s[te] = fit(name, x.iloc[tr])(x.iloc[te])
    return s


def uplift(x: pd.DataFrame) -> dict:
    strata = x.t.astype(str) + x.visit.astype(str)
    dev, test = train_test_split(x, test_size=0.2, random_state=SEED, stratify=strata)
    dev, test = dev.reset_index(drop=True), test.reset_index(drop=True)

    # 1) 개발용 데이터에서 교차 적합 Qini로 모델을 고른다. 시험용 데이터는 보지 않는다.
    dev_scores = {n: qini(crossfit(n, dev), dev.t.values, dev.visit.values)["coef"] for n in CANDIDATES}
    chosen = max(dev_scores, key=dev_scores.get)

    # 2) 고른 모델을 개발용 전체로 다시 학습해 시험용에서 한 번만 평가한다.
    s_test = fit(chosen, dev)(test)
    q = qini(s_test, test.t.values, test.visit.values)
    q_conv = qini(s_test, test.t.values, test.conversion.values)
    rng = np.random.default_rng(SEED)
    boot = []
    for _ in range(BOOT):
        i = rng.integers(0, len(test), len(test))
        boot.append(qini(s_test[i], test.t.values[i], test.visit.values[i], points=50)["coef"])
    lo, hi = np.percentile(boot, [2.5, 97.5])

    step = max(1, len(q["frac"]) // 20)
    curve = [{"frac": r(f, 3), "model": r(m, 1), "random": r(rd, 1)}
             for f, m, rd in zip(q["frac"][::step], q["model"][::step], q["random"][::step])]
    return {
        "outcome_for_training": "visit",
        "split": {"dev": int(len(dev)), "test": int(len(test)), "folds": FOLDS, "seed": SEED},
        "dev_qini": {k: r(v, 5) for k, v in dev_scores.items()},
        "chosen": chosen,
        "test": {
            "qini_visit": r(q["coef"], 5),
            "qini_visit_lo": r(lo, 5),
            "qini_visit_hi": r(hi, 5),
            "qini_conversion": r(q_conv["coef"], 5),
            "incremental_visits_total": r(q["total"], 1),
            "share_of_incremental_visits_top30": r(share_at(q, 0.3), 3),
            "share_of_incremental_visits_top50": r(share_at(q, 0.5), 3),
            "curve": curve,
        },
    }


# ---------- 예산 ----------

def groups(x: pd.DataFrame, chosen: str) -> list:
    """교차 적합 점수(각 고객은 자기가 빠진 모델로 점수를 받음)로 5분위를 나누고 분위별 결과를 센다."""
    s = crossfit(chosen, x)
    rank = pd.Series(s).rank(method="first", ascending=False)
    g = np.ceil(rank / len(x) * GROUPS).astype(int).values
    rows = []
    for k in range(1, GROUPS + 1):
        m = x[g == k]
        t, c = m[m.t == 1], m[m.t == 0]
        rows.append({
            "group": k,
            "label": f"상위 {(k - 1) * 100 // GROUPS}-{k * 100 // GROUPS}%",
            "n_treated": int(len(t)),
            "n_control": int(len(c)),
            "visit_t": r(t.visit.mean()), "visit_c": r(c.visit.mean()),
            "conversion_t": r(t.conversion.mean()), "conversion_c": r(c.conversion.mean()),
            "spend_sum_t": r(t.spend.sum(), 2), "spend_sum_c": r(c.spend.sum(), 2),
            "spend_t": r(t.spend.mean()), "spend_c": r(c.spend.mean()),
            "spend_diff": diff(t.spend.values, c.spend.values),
            # 상위 1~k분위를 합쳐 골랐을 때의 증분 매출과 신뢰구간
            "cum_spend_diff": diff(x[(g <= k) & (x.t == 1)].spend.values, x[(g <= k) & (x.t == 0)].spend.values),
        })
    return rows


def budget(rows: list, margin: float, send_cost: float, coupon_rate: float, base: int) -> dict:
    """상위 k개 분위에 보낼 때 고객 1명당 증분 이익 = 마진율 x 증분 매출 - 쿠폰율 x 발송군 매출 - 발송 비용.

    쿠폰은 보내지 않았어도 샀을 고객의 구매에도 나가므로 발송군 매출 전체에 붙는다.
    """
    by_k = [{"k_pct": 0, "n_target": 0, "inc_spend_per": 0.0, "profit_per": 0.0, "profit_total": 0.0}]
    for k in range(1, len(rows) + 1):
        sel = rows[:k]
        nt, nc = sum(x["n_treated"] for x in sel), sum(x["n_control"] for x in sel)
        st, sc = sum(x["spend_sum_t"] for x in sel) / nt, sum(x["spend_sum_c"] for x in sel) / nc
        per = margin * (st - sc) - coupon_rate * st - send_cost
        cum = rows[k - 1]["cum_spend_diff"]
        n_target = round(base * k / len(rows))
        by_k.append({"k_pct": k * 100 // len(rows), "n_target": n_target, "inc_spend_per": r(st - sc),
                     "profit_per": r(per), "profit_total": r(per * n_target, 1),
                     # 증분 매출의 95% 구간만 반영한 이익 범위(쿠폰 항의 변동은 무시)
                     "profit_total_lo": r((margin * cum["lo"] - coupon_rate * st - send_cost) * n_target, 1),
                     "profit_total_hi": r((margin * cum["hi"] - coupon_rate * st - send_cost) * n_target, 1)})
    best = max(by_k, key=lambda b: b["profit_total"])
    return {"by_k": by_k, "best_k_pct": best["k_pct"], "profit_best": best["profit_total"],
            "profit_all": by_k[-1]["profit_total"]}


# ---------- 다음 캠페인 측정 계획 ----------

def sample_plan(x: pd.DataFrame) -> list:
    """홀드아웃(미발송) 비율별로, 이번 효과의 절반을 잡아내는 데 필요한 전체 고객 수 (양측 5%, 검정력 80%).

    효과를 절반으로 잡는 이유: 이번 실험의 효과는 최선의 경우일 수 있어 보수적으로 본다.
    """
    z = Z + 0.8416212335729143
    rows = []
    for o in ["visit", "spend"]:
        t, c = x[x.t == 1][o], x[x.t == 0][o]
        delta = (t.mean() - c.mean()) / 2
        for h in [0.1, 0.2, 0.5]:
            n = z ** 2 * (t.var() / (1 - h) + c.var() / h) / delta ** 2
            rows.append({"outcome": o, "target_diff": r(delta), "holdout": h, "n_total": int(np.ceil(n)),
                         "n_holdout": int(np.ceil(n * h))})
    return rows


def main():
    d = load()
    result = {
        "meta": {
            "dataset": "Kevin Hillstrom MineThatData E-Mail Analytics Challenge (2008)",
            "source": SOURCES["hillstrom"]["url"],
            "sha256": SOURCES["hillstrom"]["sha256"],
            "rows": int(len(d)),
            "period": "발송 후 2주",
            "currency": "USD",
            "note": "공개 실험 데이터로 방법을 보여 주기 위한 분석이다. 실제 회사의 성과가 아니다.",
        },
        "assignment": {k: int(v) for k, v in d.segment.value_counts().sort_index().items()},
        "assumptions": ASSUMPTIONS,
        "arms": {},
    }
    for arm in ARMS:
        x = pair(d, arm).reset_index(drop=True)
        up = uplift(x)
        rows = groups(x, up["chosen"])
        a = ASSUMPTIONS
        result["arms"][arm] = {
            "label": ARMS[arm],
            "balance": balance(x),
            "ate": ate(x),
            "segments": segments(x),
            "uplift": up,
            "groups": rows,
            "sample_plan": sample_plan(x),
            "budget": budget(rows, a["margin"], a["send_cost"], a["coupon_rate"], a["base_customers"]),
            "sensitivity": [
                {"margin": m, "send_cost": s, **{k: v for k, v in budget(rows, m, s, a["coupon_rate"], a["base_customers"]).items() if k != "by_k"}}
                for m in SENS_MARGIN for s in SENS_SEND
            ],
            "coupon_scenario": [
                {"coupon_rate": c, **{k: v for k, v in budget(rows, a["margin"], a["send_cost"], c, a["base_customers"]).items() if k != "by_k"}}
                for c in [0.0, 0.1, 0.2]
            ],
        }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()
