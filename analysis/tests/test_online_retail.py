import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import customer_report as report  # noqa: E402
import online_retail as o  # noqa: E402

R = json.loads(report.RESULT.read_text(encoding="utf-8"))
HAS_DATA = o.CACHE.exists() or o.SOURCES["online_retail_ii"]["path"].exists()


# ---------- 계산식 ----------

def test_cancellation_removes_matching_original_only():
    t = pd.Timestamp
    df = pd.DataFrame({
        "Invoice": ["1", "2", "C3", "4"], "StockCode": ["10001"] * 4, "Quantity": [5, 5, -5, 7],
        "InvoiceDate": [t("2010-01-01"), t("2010-01-02"), t("2010-01-03"), t("2010-01-04")],
        "Price": [1.0] * 4, "customer": [1.0] * 4,
    })
    out, n = o.drop_cancelled(df)
    assert n == 1
    assert list(out.Invoice) == ["2", "4"]  # 취소 줄과 먼저 들어온 같은 수량 주문 한 줄만 빠진다


def test_capture_by_hand():
    assert o.capture([3, 2, 1, 0, 0], [10, 0, 0, 0, 10], top=0.2) == pytest.approx(0.5)


def test_gamma_gamma_shrinks_toward_population_mean():
    p = {"p": 2.0, "q": 3.0, "v": 10.0}
    pop = p["v"] * p["p"] / (p["q"] - 1)  # 10
    low, high = o.gg_expected(p, np.array([1, 50]), np.array([100.0, 100.0]))
    assert pop < low < high < 100  # 구매가 많을수록 자기 평균에 가까워진다


def test_bgnbd_expected_grows_with_time_and_frequency():
    p = {"r": 1.0, "alpha": 10.0, "a": 0.5, "b": 5.0}
    x, tx, T = np.array([1.0, 5.0]), np.array([20.0, 20.0]), np.array([30.0, 30.0])
    e10, e50 = o.bgnbd_expected(p, 10, x, tx, T), o.bgnbd_expected(p, 50, x, tx, T)
    assert (e50 > e10).all() and e10[1] > e10[0]


# ---------- 결과 파일의 내부 일관성 ----------

def test_meta_and_cleaning():
    assert R["meta"]["sha256"] == o.SOURCES["online_retail_ii"]["sha256"]
    rows = [x["rows"] for x in R["cleaning"]]
    assert rows == sorted(rows, reverse=True) and rows[-1] == R["meta"]["rows_clean"]


def test_cohorts_cover_all_customers():
    c = R["cohort"]
    assert sum(c["size"]) == R["meta"]["customers"]
    assert all(row[0] == 1.0 and len(row) == len(c["months"]) - i for i, row in enumerate(c["retention"]))


def test_segments_and_deciles_cover_customers():
    v = R["rfm_validation"]
    assert sum(s["n"] for s in v["segments"]) == v["customers"]
    assert sum(s["n"] for s in R["rfm_now"]["segments"]) == R["rfm_now"]["customers"]
    assert sum(d["n"] for d in R["clv"]["deciles"]) == R["clv"]["customers"]
    assert sum(s["next_rev_share"] for s in v["segments"]) == pytest.approx(1, abs=1e-3)
    assert set(report.ACTION) == {s["segment"] for s in R["rfm_now"]["segments"]}


# ---------- 문서의 해석 문장이 결과와 맞는지 ----------

def test_claims_in_document_hold():
    f, a = report.facts(R), R["cohort"]["avg"]
    assert a["1"] < 0.5 and abs(a["6"] - a["12"]) < 0.05  # 첫 달에 대부분 빠지고 그 뒤는 비슷하다
    assert f["new11"] < f["new10"]
    assert f["lo"]["asof"][5:7] in ("12", "01", "02") and f["hi"]["asof"][5:7] in ("08", "09", "10")
    assert f["best"]["next_rev_share"] > f["best"]["share"]
    assert f["risk"]["repurchase"] > 0.5 and f["risk"]["next_rev_share"] < f["risk"]["revenue_share_before"]
    assert f["sleep"]["repurchase"] < f["risk"]["repurchase"]
    assert f["over"] > 0 and f["rest_ratio"] > 1.5 and f["baseline_better"]
    au = R["clv"]["active_auc"]
    assert max(au.values()) - min(au.values()) < 0.05


def test_doc_is_up_to_date():
    assert report.DOC.read_text(encoding="utf-8") == report.doc(R), "python -I analysis/customer_report.py 를 다시 실행하세요"
    assert "·" not in report.DOC.read_text(encoding="utf-8")


# ---------- 원문으로 다시 계산 (데이터가 있을 때만) ----------

@pytest.mark.skipif(not HAS_DATA, reason="원문 데이터 없음: python -I analysis/fetch_data.py online_retail_ii")
def test_results_match_raw_data():
    assert json.loads(json.dumps(o.run(), ensure_ascii=False)) == R
