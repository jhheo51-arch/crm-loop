import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import tour_visitors as t  # noqa: E402


def test_day_type_counts_holiday_and_holiday_eve_as_weekend():
    assert t.day_type(date(2024, 4, 9)) == "주말"   # 화요일이지만 총선(4/10) 전날
    assert t.day_type(date(2024, 4, 10)) == "주말"  # 공휴일
    assert t.day_type(date(2024, 4, 11)) == "주중"  # 목요일
    assert t.day_type(date(2024, 4, 12)) == "주말"  # 금요일


def fake_rows(weekday_n, weekend_n):
    """모든 지역에 같은 패턴을 넣는다. 고양시는 구 두 곳으로 나눠 넣어 합쳐지는지 본다."""
    rows = []
    codes = [(a[0] + c[-2:] + "0", p) for c, _, p, a in t.REGIONS]
    d = date(2024, 1, 1)
    while d <= date(2024, 12, 31):
        n = weekday_n if t.day_type(d) == "주중" else weekend_n
        for code, prefix in codes:
            names = [prefix + " 덕양구", prefix + " 일산동구"] if prefix == "고양시" else [prefix]
            for i, nm in enumerate(names):
                for cd, kind in (("1", "현지인(a)"), ("2", "외지인(b)")):
                    rows.append({"signguCode": code + str(i), "signguNm": nm, "touDivCd": cd, "touDivNm": kind,
                                 "touNum": n / len(names), "baseYmd": f"{d:%Y%m%d}"})
        d += timedelta(days=1)
    return rows


def test_aggregate_supports_when_weekdays_are_lower():
    out = t.aggregate(fake_rows(100, 300), "2")
    assert len(out) == 19
    g = out["STAY06"]
    assert g["daily_mean_by_cell"]["봄 주중"] == 100  # 구로 나뉜 고양시가 한 지역으로 합쳐진다
    assert g["shoulder_weekday_vs_weekend"] == pytest.approx(1 / 3, abs=1e-3)
    assert all(v["supports_hypothesis"] for v in out.values())


def test_aggregate_rejects_when_weekdays_are_not_lower():
    out = t.aggregate(fake_rows(300, 100), "2")
    assert not any(v["supports_hypothesis"] for v in out.values())
    assert t.summarize(out)["supports"] == 0


def test_whole_city_code_wins_over_districts():
    rows = [{"signguCode": c, "signguNm": n} for c, n in
            [("41280", "고양시"), ("41281", "고양시 덕양구"), ("41285", "고양시 일산동구")]]
    rows += [{"signguCode": a[0] + c[-2:] + "0", "signguNm": p} for c, _, p, a in t.REGIONS if p != "고양시"]
    found = t.match_regions(rows)
    assert [c for c, code in found.items() if code == "STAY06"] == ["41280"]


def test_missing_region_stops():
    rows = [x for x in fake_rows(1, 1)[:2000] if x["signguNm"] != "진도군"]
    with pytest.raises(SystemExit):
        t.match_regions(rows)
