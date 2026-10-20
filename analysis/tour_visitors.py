"""한국관광공사 관광빅데이터(기초지자체 방문자 수)로 사례 C의 '봄, 가을 주중 수요가 약하다' 가설을 확인한다.

숙박 휴양 지역 19곳(public/areas.js의 stays)이 속한 시군구의 하루 방문자 수를 계절과 요일 유형별로 나눠 본다.
방문자 수는 이동통신 데이터로 추정한 값이며, 숙박 예약 수가 아니다. 실제 회사의 예약이나 성과가 아니다.
원문 응답은 data/external/tour_visitors/에만 저장하고 git에 올리지 않는다.

    TOUR_API_KEY=... python -I analysis/tour_visitors.py
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_data import ROOT  # noqa: E402

RESULT = ROOT / "analysis/results/tour_visitors.json"
RAW = ROOT / "data/external/tour_visitors"
ENDPOINT = "https://apis.data.go.kr/B551011/DataLabService/locgoRegnVisitrDDList"
START, END = date(2024, 1, 1), date(2025, 12, 31)  # 두 해를 모두 채운 기간
PAGE = 10000

# public/areas.js의 숙박 휴양 지역 19곳과 시군구 이름. 시 아래 구로 나뉘어 오는 곳은 앞부분으로 묶는다.
REGIONS = [
    ("STAY01", "강원 홍천", "홍천군", ("42", "51")),
    ("STAY02", "강원 고성", "고성군", ("42", "51")),
    ("STAY03", "강원 양양", "양양군", ("42", "51")),
    ("STAY04", "강원 삼척", "삼척시", ("42", "51")),
    ("STAY05", "강원 춘천", "춘천시", ("42", "51")),
    ("STAY06", "경기 고양", "고양시", ("41",)),
    ("STAY07", "경기 양평", "양평군", ("41",)),
    ("STAY08", "충남 천안", "천안시", ("44",)),
    ("STAY09", "충북 단양", "단양군", ("43",)),
    ("STAY10", "전북 부안 변산", "부안군", ("45", "52")),
    ("STAY11", "전남 여수", "여수시", ("46",)),
    ("STAY12", "전남 진도", "진도군", ("46",)),
    ("STAY13", "경남 남해", "남해군", ("48",)),
    ("STAY14", "경남 거제", "거제시", ("48",)),
    ("STAY15", "경북 경주", "경주시", ("47",)),
    ("STAY16", "경북 청송", "청송군", ("47",)),
    ("STAY17", "부산 해운대", "해운대구", ("26",)),
    ("STAY18", "제주 제주시", "제주시", ("50",)),
    ("STAY19", "제주 서귀포", "서귀포시", ("50",)),
]

# 관공서 공휴일과 대체공휴일, 임시공휴일
HOLIDAYS = {date.fromisoformat(d) for d in [
    "2024-01-01", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12", "2024-03-01", "2024-04-10",
    "2024-05-05", "2024-05-06", "2024-05-15", "2024-06-06", "2024-08-15", "2024-09-16", "2024-09-17",
    "2024-09-18", "2024-10-01", "2024-10-03", "2024-10-09", "2024-12-25",
    "2025-01-01", "2025-01-27", "2025-01-28", "2025-01-29", "2025-01-30", "2025-03-01", "2025-03-03",
    "2025-05-05", "2025-05-06", "2025-06-03", "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05",
    "2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25",
]}
SEASONS = {3: "봄", 4: "봄", 5: "봄", 6: "여름", 7: "여름", 8: "여름",
           9: "가을", 10: "가을", 11: "가을", 12: "겨울", 1: "겨울", 2: "겨울"}


def r(x, n=3):
    return round(float(x), n)


def day_type(d: date) -> str:
    """월~목 중 공휴일과 공휴일 전날이 아닌 날은 주중, 나머지(금, 토, 일, 공휴일, 공휴일 전날)는 주말."""
    if d in HOLIDAYS or (d + timedelta(days=1)) in HOLIDAYS or d.weekday() >= 4:
        return "주말"
    return "주중"


# ---------- 수집 ----------

def api_key() -> str:
    key = os.environ.get("TOUR_API_KEY", "")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("TOUR_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        raise SystemExit("TOUR_API_KEY가 없습니다. .env에 TOUR_API_KEY=발급받은 키 를 넣어 주세요.")
    return urllib.parse.unquote(key)  # 인코딩 키를 넣어도 같은 값으로 맞춘다


def months():
    d = START
    while d <= END:
        nxt = date(d.year + d.month // 12, d.month % 12 + 1, 1)
        yield d, min(nxt - timedelta(days=1), END)
        d = nxt


def call(params: dict) -> dict:
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as res:
                body = json.loads(res.read().decode("utf-8"))
            break
        except (OSError, json.JSONDecodeError):
            if attempt == 2:
                raise
            time.sleep(2)
    if "response" not in body:
        raise SystemExit(f"API 오류: {json.dumps(body, ensure_ascii=False)[:300]}")
    head = body["response"]["header"]
    if head.get("resultCode") != "0000":
        raise SystemExit(f"API 오류: {head}")
    return body["response"]["body"]


def fetch_month(start: date, end: date, key: str) -> list:
    path = RAW / f"{start:%Y%m}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    rows, page = [], 1
    while True:
        body = call({"serviceKey": key, "MobileOS": "ETC", "MobileApp": "crm-loop", "_type": "json",
                     "numOfRows": PAGE, "pageNo": page,
                     "startYmd": f"{start:%Y%m%d}", "endYmd": f"{end:%Y%m%d}"})
        items = (body.get("items") or {}).get("item") or []
        rows += items if isinstance(items, list) else [items]
        if page * PAGE >= int(body.get("totalCount", 0)):
            break
        page += 1
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    return rows


# ---------- 계산 ----------

def match_regions(rows: list) -> dict:
    """시군구 코드를 숙박 휴양 지역 코드에 연결한다. 한 지역이라도 못 찾으면 멈춘다.

    고양시, 천안시처럼 시 전체 코드와 구 코드가 함께 오면 시 전체 코드만 쓴다. 시 전체 값은 여러 구를
    다녀간 사람을 한 번만 센 값이라 구 값을 더하면 두 번 세게 된다. 시 전체 코드가 없을 때만 구를 더한다.
    """
    found = {}
    names = {(str(x["signguCode"]), x["signguNm"]) for x in rows}
    for code, label, prefix, area in REGIONS:
        hits = [c for c, n in names if n.startswith(prefix) and c.startswith(area)]
        whole = [c for c in hits if (c, prefix) in names]
        hits = whole or hits
        if not hits:
            raise SystemExit(f"{label}({prefix})에 맞는 시군구를 찾지 못했습니다.")
        for c in hits:
            found[c] = code
    return found


def aggregate(rows: list, tou_cd: str) -> dict:
    """지역마다 시군구를 합친 하루 방문자 수를 계절과 요일 유형별 하루 평균으로 낸다."""
    regions = match_regions(rows)
    daily = defaultdict(float)
    for x in rows:
        c = str(x["signguCode"])
        if c in regions and str(x["touDivCd"]) == tou_cd:
            daily[(regions[c], date.fromisoformat(f"{x['baseYmd'][:4]}-{x['baseYmd'][4:6]}-{x['baseYmd'][6:]}"))] += float(x["touNum"])
    cells = defaultdict(list)
    for (code, d), n in daily.items():
        cells[(code, SEASONS[d.month], day_type(d))].append(n)
    out = {}
    for code, label, *_ in REGIONS:
        days = [n for (c, _), n in daily.items() if c == code]
        base = sum(days) / len(days)
        cell = {f"{s} {t}": sum(cells[(code, s, t)]) / len(cells[(code, s, t)])
                for s in ("봄", "여름", "가을", "겨울") for t in ("주중", "주말")}
        idx = {k: v / base for k, v in cell.items()}
        shoulder_weekday = (idx["봄 주중"] + idx["가을 주중"]) / 2
        shoulder_weekend = (idx["봄 주말"] + idx["가을 주말"]) / 2
        peak = max(idx, key=idx.get)
        out[code] = {
            "name": label, "days": len(days), "daily_mean": r(base, 0),
            "daily_mean_by_cell": {k: r(v, 0) for k, v in cell.items()},
            "index_by_cell": {k: r(v) for k, v in idx.items()},
            "shoulder_weekday_index": r(shoulder_weekday),
            "shoulder_weekday_vs_weekend": r(shoulder_weekday / shoulder_weekend),
            "shoulder_weekday_vs_summer_weekday": r(shoulder_weekday / idx["여름 주중"]),
            "shoulder_weekday_vs_winter_weekday": r(shoulder_weekday / idx["겨울 주중"]),
            "peak_cell": peak,
            "lowest_cell": min(idx, key=idx.get),
            "supports_hypothesis": bool(shoulder_weekday < 1 and shoulder_weekday < shoulder_weekend),
        }
    return out


def summarize(regions: dict) -> dict:
    vals = sorted(v["shoulder_weekday_vs_weekend"] for v in regions.values())
    return {
        "regions": len(regions),
        "supports": sum(v["supports_hypothesis"] for v in regions.values()),
        "not_supports": [v["name"] for v in regions.values() if not v["supports_hypothesis"]],
        "shoulder_weekday_vs_weekend_median": r(vals[len(vals) // 2]),
        "shoulder_weekday_vs_weekend_range": [r(vals[0]), r(vals[-1])],
        "below_summer_weekday": sum(v["shoulder_weekday_vs_summer_weekday"] < 1 for v in regions.values()),
        "below_winter_weekday": sum(v["shoulder_weekday_vs_winter_weekday"] < 1 for v in regions.values()),
        "lowest_cell_counts": dict(Counter(v["lowest_cell"] for v in regions.values()).most_common()),
    }


def main():
    key = api_key()
    rows = [x for s, e in months() for x in fetch_month(s, e, key)]
    need = {"signguCode", "signguNm", "touDivCd", "touDivNm", "touNum", "baseYmd"}
    if not rows or not need <= set(rows[0]):
        raise SystemExit(f"응답 필드가 예상과 다릅니다: {sorted(rows[0]) if rows else '빈 응답'}")
    kinds = sorted({(str(x["touDivCd"]), x["touDivNm"]) for x in rows})
    outside = next(c for c, n in kinds if "외지인" in n)
    regions = aggregate(rows, outside)
    return {
        "source": "한국관광공사 빅데이터 지역별 방문자수 (기초지자체, 이동통신 데이터 추정)",
        "period": [START.isoformat(), END.isoformat()],
        "visitor_kind": dict(kinds)[outside],
        "visitor_kinds_in_response": [f"{c} {n}" for c, n in kinds],
        "rows": len(rows),
        "day_type_rule": "주중은 월~목 중 공휴일과 공휴일 전날이 아닌 날, 주말은 금, 토, 일, 공휴일, 공휴일 전날",
        "season_rule": "봄 3~5월, 여름 6~8월, 가을 9~11월, 겨울 12~2월",
        "index_rule": "지역의 기간 전체 하루 평균 방문자 수를 1로 둔 값",
        "hypothesis_rule": "봄, 가을 주중 지수의 평균이 1보다 작고 봄, 가을 주말 지수의 평균보다 작으면 가설에 맞는다",
        "summary": summarize(regions),
        "regions": regions,
    }


if __name__ == "__main__":
    out = main()
    RESULT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(RESULT)
