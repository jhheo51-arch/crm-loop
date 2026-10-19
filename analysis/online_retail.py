"""Online Retail II 거래 데이터로 코호트 리텐션, RFM 고객군, 고객 생애가치(CLV)를 계산한다.

공개 데이터로 방법을 보여 주기 위한 분석이다. 실제 회사의 고객이나 성과가 아니다.
결과는 analysis/results/online_retail.json 하나에 쓰고, 문서는 customer_report.py가 이 파일로 만든다.

    python -I analysis/online_retail.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.optimize import minimize
from scipy.special import gammaln, hyp2f1
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_data import ROOT, SOURCES, fetch, sha256  # noqa: E402

RESULT = ROOT / "analysis/results/online_retail.json"
CACHE = SOURCES["online_retail_ii"]["path"].parent / "online_retail_II.csv.gz"
START, END = pd.Timestamp("2009-12-01"), pd.Timestamp("2011-12-01")  # 2011년 12월은 9일까지만 있어 뺀다
SPLIT = pd.Timestamp("2010-12-01")  # 앞 12개월로 모델을 만들고 뒤 12개월로 맞는지 본다


def r(x, n=4):
    return round(float(x), n)


# ---------- 불러오기와 정제 ----------

def load_raw() -> pd.DataFrame:
    if not CACHE.exists():
        xlsx = fetch("online_retail_ii")
        sheets = pd.read_excel(xlsx, sheet_name=None, engine="openpyxl")
        pd.concat(sheets.values(), ignore_index=True).to_csv(CACHE, index=False)
    df = pd.read_csv(CACHE, dtype={"Invoice": str, "StockCode": str}, parse_dates=["InvoiceDate"])
    return df.rename(columns={"Customer ID": "customer"})


def drop_cancelled(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """취소 줄과, 같은 고객이 같은 상품을 같은 수량으로 먼저 주문한 원 주문 줄을 한 줄씩 짝지어 뺀다."""
    key = ["customer", "StockCode", "qty_abs"]
    df = df.assign(qty_abs=df.Quantity.abs()).sort_values("InvoiceDate", kind="stable")
    cancel = df[df.Invoice.str.startswith("C")].copy()
    sale = df[~df.Invoice.str.startswith("C")].copy()
    cancel["k"] = cancel.groupby(key).cumcount()
    sale["k"] = sale.groupby(key).cumcount()
    m = sale.reset_index().merge(cancel[key + ["k", "InvoiceDate"]], on=key + ["k"], suffixes=("", "_c"))
    matched = m.loc[m.InvoiceDate <= m.InvoiceDate_c, "index"]
    return sale.drop(index=matched).drop(columns=["qty_abs", "k"]), len(matched)


def clean(raw: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    log = [{"step": "원본 (두 시트 합계)", "rows": len(raw)}]
    df = raw.drop_duplicates()
    log.append({"step": "완전히 같은 줄 제거 (두 시트가 2010년 12월 1일에서 9일까지 겹침)", "rows": len(df)})
    df = df[df.customer.notna()].copy()
    log.append({"step": "고객 번호 없는 줄 제거", "rows": len(df)})
    df, n_matched = drop_cancelled(df)
    log.append({"step": f"취소 줄 제거, 짝이 맞는 원 주문 {n_matched:,}줄도 제거", "rows": len(df)})
    df = df[(df.Quantity > 0) & (df.Price > 0) & df.StockCode.str.match(r"^\d{5}")]
    log.append({"step": "수량이나 가격이 0 이하인 줄, 배송비와 수수료 같은 상품 외 코드 제거", "rows": len(df)})
    df = df[(df.InvoiceDate >= START) & (df.InvoiceDate < END)].copy()
    log.append({"step": "분석 기간 밖 제거 (2009년 12월에서 2011년 11월까지 24개월)", "rows": len(df)})
    df["customer"] = df.customer.astype(int)
    df["revenue"] = df.Quantity * df.Price
    df["day"] = df.InvoiceDate.dt.normalize()
    df["month"] = df.InvoiceDate.dt.to_period("M")
    return df, log


def orders(df: pd.DataFrame) -> pd.DataFrame:
    """고객과 날짜 단위 구매. 같은 날 여러 송장은 한 번의 구매로 센다."""
    return df.groupby(["customer", "day"], as_index=False).agg(revenue=("revenue", "sum"), month=("month", "first"))


# ---------- 코호트 리텐션 ----------

def cohorts(o: pd.DataFrame) -> dict:
    first = o.groupby("customer").month.min().rename("cohort")
    a = o[["customer", "month"]].drop_duplicates().join(first, on="customer")
    a["offset"] = (a.month - a.cohort).apply(lambda x: x.n)
    size = a[a.offset == 0].groupby("cohort").customer.nunique()
    active = a.groupby(["cohort", "offset"]).customer.nunique().unstack(fill_value=0)
    rate = active.div(size, axis=0)
    months = [str(c) for c in rate.index]
    matrix = [[r(rate.loc[c, k]) for k in rate.columns if k < len(rate.columns) - i] for i, c in enumerate(rate.index)]

    def avg(k, skip_first=True):
        """k개월 뒤 리텐션의 고객 수 가중 평균. 첫 코호트는 데이터 시작 전 고객이 섞여 따로 둔다."""
        rows = [c for i, c in enumerate(rate.index) if k < len(rate.columns) - i and not (skip_first and i == 0)]
        return r((rate.loc[rows, k] * size[rows]).sum() / size[rows].sum()) if rows else None

    return {"months": months, "size": [int(size[c]) for c in rate.index], "retention": matrix,
            "first_cohort_m1": r(rate.iloc[0, 1]), "first_cohort_m12": r(rate.iloc[0, 12]),
            "avg": {str(k): avg(k) for k in (1, 2, 3, 6, 12)}}


# ---------- 북극성 지표: 90일 재구매율 (docs/KPI.md) ----------

def repurchase_90(o: pd.DataFrame) -> list:
    """기준일 전 12개월에 산 고객 중 기준일부터 90일 안에 다시 산 고객 비율. 기준일은 매달 1일."""
    rows = []
    for asof in pd.date_range(SPLIT, END - pd.Timedelta(days=90), freq="MS"):
        base = set(o.customer[(o.day >= asof - pd.DateOffset(months=12)) & (o.day < asof)])
        again = base & set(o.customer[(o.day >= asof) & (o.day < asof + pd.Timedelta(days=90))])
        rows.append({"asof": str(asof.date()), "base": len(base), "repurchased": len(again), "rate": r(len(again) / len(base))})
    return rows


# ---------- RFM ----------

SEGMENTS = [  # 위에서부터 먼저 맞는 규칙을 쓴다. R, F는 1(낮음)에서 5(높음) 점수
    ("최우수", lambda R, F: (R >= 4) & (F >= 4)),
    ("충성 고객", lambda R, F: (R >= 3) & (F >= 3)),
    ("신규 고객", lambda R, F: (R >= 4) & (F <= 1)),
    ("성장 후보", lambda R, F: (R >= 3) & (F <= 2)),
    ("이탈 위험", lambda R, F: (R <= 2) & (F >= 3)),
    ("휴면 직전", lambda R, F: (R == 2) & (F <= 2)),
    ("휴면", lambda R, F: (R <= 1) & (F <= 2)),
]


def rfm(o: pd.DataFrame, asof: pd.Timestamp) -> pd.DataFrame:
    """asof 직전 12개월 구매로 R(마지막 구매 후 일수), F(구매 일수), M(매출)과 1에서 5점 점수를 매긴다."""
    w = o[(o.day >= asof - pd.DateOffset(months=12)) & (o.day < asof)]
    t = w.groupby("customer").agg(last=("day", "max"), F=("day", "nunique"), M=("revenue", "sum"))
    t["R_days"] = (asof - t["last"]).dt.days
    score = lambda s: pd.qcut(s.rank(method="first"), 5, labels=False) + 1  # noqa: E731
    t["R"], t["Fs"], t["Ms"] = score(-t.R_days), score(t.F), score(t.M)
    t["segment"] = None
    for name, rule in SEGMENTS:
        t.loc[t.segment.isna() & rule(t.R, t.Fs), "segment"] = name
    return t


def rfm_validation(o: pd.DataFrame) -> dict:
    """2010년 12월 1일 기준 고객군이 다음 12개월에 실제로 얼마나 다시 사고 얼마를 썼는지 본다."""
    t = rfm(o, SPLIT)
    nxt = o[(o.day >= SPLIT) & (o.day < END)].groupby("customer").revenue.sum()
    t["next_rev"] = nxt.reindex(t.index).fillna(0)
    total, total_next = len(t), t.next_rev.sum()
    rows = []
    for name, _ in SEGMENTS:
        g = t[t.segment == name]
        if len(g):
            rows.append({"segment": name, "n": len(g), "share": r(len(g) / total), "r_days_median": int(g.R_days.median()),
                         "f_median": int(g.F.median()), "m_median": r(g.M.median(), 2),
                         "revenue_share_before": r(g.M.sum() / t.M.sum()),
                         "repurchase": r((g.next_rev > 0).mean()), "next_rev_mean": r(g.next_rev.mean(), 2),
                         "next_rev_share": r(g.next_rev.sum() / total_next)})
    return {"asof": str(SPLIT.date()), "customers": total, "repurchase_all": r((t.next_rev > 0).mean()), "segments": rows}


def rfm_now(o: pd.DataFrame) -> dict:
    t = rfm(o, END)
    rows = [{"segment": s, "n": int((t.segment == s).sum()), "revenue_share": r(t.M[t.segment == s].sum() / t.M.sum())}
            for s, _ in SEGMENTS]
    return {"asof": str(END.date()), "customers": len(t), "segments": rows}


# ---------- CLV: BG/NBD (구매 횟수)와 Gamma-Gamma (구매 1회 금액) ----------

def rfm_summary(o: pd.DataFrame, start, end) -> pd.DataFrame:
    """기간 안에 처음 산 고객의 반복 구매 횟수 x, 첫 구매에서 마지막 구매까지 tx, 관찰 기간 T (주 단위)."""
    w = o[(o.day >= start) & (o.day < end)]
    g = w.groupby("customer")
    s = pd.DataFrame({"first": g.day.min(), "last": g.day.max(), "n": g.day.nunique()})
    s["x"] = s.n - 1
    s["tx"] = (s["last"] - s["first"]).dt.days / 7
    s["T"] = (end - s["first"]).dt.days / 7
    rep = w.merge(s[["first"]], left_on="customer", right_index=True)
    rep = rep[rep.day > rep["first"]].groupby("customer").revenue.mean()  # 첫 구매를 뺀 반복 구매의 평균 금액
    s["m"] = rep.reindex(s.index).fillna(0)
    return s


def bgnbd_ll(p, x, tx, T):
    r_, a, al, b = np.exp(p)
    A1 = gammaln(r_ + x) - gammaln(r_) + r_ * np.log(al)
    A2 = gammaln(a + b) + gammaln(b + x) - gammaln(b) - gammaln(a + b + x)
    A3 = -(r_ + x) * np.log(al + T)
    A4 = np.where(x > 0, np.log(a) - np.log(np.maximum(b + x - 1, 1e-12)) - (r_ + x) * np.log(al + tx), -np.inf)
    return -(A1 + A2 + np.logaddexp(A3, A4)).sum()


def fit_bgnbd(x, tx, T) -> dict:
    res = minimize(bgnbd_ll, np.zeros(4), args=(x, tx, T), method="Nelder-Mead", options={"maxiter": 20000, "xatol": 1e-8, "fatol": 1e-8})
    r_, a, al, b = np.exp(res.x)
    return {"r": r_, "alpha": al, "a": a, "b": b}


def bgnbd_expected(p, t, x, tx, T):
    """앞으로 t주 동안 기대 구매 횟수 (Fader, Hardie, Lee 2005 식 10)."""
    r_, al, a, b = p["r"], p["alpha"], p["a"], p["b"]
    h = hyp2f1(r_ + x, b + x, a + b + x - 1, t / (al + T + t))
    num = (a + b + x - 1) / (a - 1) * (1 - ((al + T) / (al + T + t)) ** (r_ + x) * h)
    den = 1 + np.where(x > 0, a / (b + x - 1) * ((al + T) / (al + tx)) ** (r_ + x), 0)
    return num / den


def gg_ll(p, x, m):
    pp, q, v = np.exp(p)
    return -(gammaln(pp * x + q) - gammaln(pp * x) - gammaln(q) + q * np.log(v) + (pp * x - 1) * np.log(m)
             + pp * x * np.log(x) - (pp * x + q) * np.log(x * m + v)).sum()


def fit_gg(x, m) -> dict:
    res = minimize(gg_ll, np.zeros(3), args=(x, m), method="Nelder-Mead", options={"maxiter": 20000})
    pp, q, v = np.exp(res.x)
    return {"p": pp, "q": q, "v": v}


def gg_expected(p, x, m):
    pp, q, v = p["p"], p["q"], p["v"]
    return (q - 1) / (pp * x + q - 1) * (v * pp / (q - 1)) + pp * x / (pp * x + q - 1) * m


def capture(score, actual, top=0.2) -> float:
    """점수 상위 top 비율 고객이 실제 다음 기간 매출의 몇 %를 냈는가."""
    k = int(round(len(score) * top))
    idx = np.argsort(-np.asarray(score), kind="stable")[:k]
    return float(np.asarray(actual)[idx].sum() / np.asarray(actual).sum())


def clv(o: pd.DataFrame) -> dict:
    s = rfm_summary(o, START, SPLIT)
    hold = o[(o.day >= SPLIT) & (o.day < END)].groupby("customer")
    s["x_next"] = hold.day.nunique().reindex(s.index).fillna(0)
    s["rev_next"] = hold.revenue.sum().reindex(s.index).fillna(0)
    weeks = (END - SPLIT).days / 7
    bg = fit_bgnbd(s.x.values, s.tx.values, s["T"].values)
    s["x_pred"] = bgnbd_expected(bg, weeks, s.x.values, s.tx.values, s["T"].values)
    rep = s[s.x > 0]
    gg = fit_gg(rep.x.values, rep.m.values)
    s["m_pred"] = gg_expected(gg, s.x.values, s.m.values)
    s["clv_pred"] = s.x_pred * s.m_pred
    s["rev_past"] = o[(o.day >= START) & (o.day < SPLIT)].groupby("customer").revenue.sum().reindex(s.index)
    corr_xm = float(np.corrcoef(rep.x, rep.m)[0, 1])

    def score(col):
        return {"mae": r(np.abs(s[col] - s.rev_next).mean(), 2), "total": r(s[col].sum(), 0), "top20_capture": r(capture(s[col], s.rev_next))}

    active = (s.x_next > 0).astype(int)
    s["dec"] = pd.qcut(s.clv_pred.rank(method="first"), 10, labels=False)
    dec = s.groupby("dec").agg(n=("x", "size"), pred=("clv_pred", "mean"), actual=("rev_next", "mean"), x_pred=("x_pred", "mean"), x_next=("x_next", "mean"))
    deciles = [{"decile": 10 - int(i), "n": int(d.n), "clv_pred": r(d.pred, 2), "rev_actual": r(d.actual, 2),
                "x_pred": r(d.x_pred, 3), "x_actual": r(d.x_next, 3)} for i, d in dec.iloc[::-1].iterrows()]
    return {"calibration": [str(START.date()), str(SPLIT.date())], "holdout": [str(SPLIT.date()), str(END.date())],
            "customers": len(s), "repeaters": len(rep), "holdout_weeks": r(weeks, 2),
            "bgnbd": {k: r(v, 5) for k, v in bg.items()}, "gamma_gamma": {k: r(v, 5) for k, v in gg.items()},
            "freq_value_corr": r(corr_xm), "x_total_pred": r(s.x_pred.sum(), 0), "x_total_actual": int(s.x_next.sum()),
            "rev_total_actual": r(s.rev_next.sum(), 0), "active_next": r((s.x_next > 0).mean()),
            "models": {"clv": score("clv_pred"), "past_revenue": score("rev_past")},
            "active_auc": {"bgnbd": r(roc_auc_score(active, s.x_pred)), "frequency": r(roc_auc_score(active, s.x)),
                           "recency": r(roc_auc_score(active, -(s["T"] - s.tx)))},
            "deciles": deciles}


def run() -> dict:
    raw = load_raw()
    df, log = clean(raw)
    o = orders(df)
    src = SOURCES["online_retail_ii"]
    return {
        "meta": {"dataset": "Online Retail II (UCI Machine Learning Repository, id 502)", "source": src["url"], "sha256": src["sha256"],
                 "license": "CC BY 4.0", "rows_raw": len(raw), "rows_clean": len(df), "customers": int(df.customer.nunique()),
                 "orders": len(o), "period": "2009-12-01 ~ 2011-11-30", "currency": "GBP",
                 "note": "영국 온라인 선물용품 판매 기록입니다. 공개 데이터로 방법을 보여 주기 위한 분석이며 실제 회사의 성과가 아닙니다."},
        "cleaning": log, "cohort": cohorts(o), "repurchase_90": repurchase_90(o), "rfm_validation": rfm_validation(o), "rfm_now": rfm_now(o), "clv": clv(o),
    }


if __name__ == "__main__":
    out = run()
    assert sha256(SOURCES["online_retail_ii"]["path"]) == out["meta"]["sha256"]
    RESULT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(RESULT)
