"""캠페인 브리프(docs/CAMPAIGN-BRIEF.md) 7장의 표본 설계: 미발송 비율별 최소 감지 차이와 필요한 회차 수.

대상 수와 기준 재구매율은 analysis/results/online_retail.json, 비교용 효과 크기는 analysis/results/hillstrom.json에서 읽는다.
표준 라이브러리만 써서 데이터 원본 없이도 다시 계산할 수 있다.

    python -I analysis/brief_sample.py
"""
import json
import math
from pathlib import Path
from statistics import NormalDist

ROOT = Path(__file__).resolve().parent.parent
RETAIL = ROOT / "analysis/results/online_retail.json"
HILLSTROM = ROOT / "analysis/results/hillstrom.json"
RESULT = ROOT / "analysis/results/brief_sample.json"

Z = NormalDist().inv_cdf(0.975) + NormalDist().inv_cdf(0.8)  # 양측 5%, 검정력 80%
HOLDOUTS = [0.2, 0.3, 0.5]
TARGET = 0.05  # 설계 값(가정). 90일 재구매율 증분을 이만큼 잡아내는 것을 목표로 둔다
MAX_ROUNDS = 30


def r(x, n=4):
    return round(float(x), n)


def mde(p: float, n: int, holdout: float) -> float:
    """기준 비율 p, 전체 n명, 미발송 비율 holdout일 때 두 비율 차이의 최소 감지 차이."""
    nc = round(n * holdout)
    nt = n - nc
    return Z * math.sqrt(p * (1 - p) * (1 / nt + 1 / nc))


def rounds_needed(p: float, n_round: int, holdout: float, target: float) -> int | None:
    """회차마다 n_round명이 새로 들어온다고 볼 때, 합친 결과의 최소 감지 차이가 target 이하가 되는 첫 회차 수."""
    for k in range(1, MAX_ROUNDS + 1):
        if mde(p, n_round * k, holdout) <= target:
            return k
    return None


def plan(retail: dict, hillstrom: dict) -> dict:
    n = next(s["n"] for s in retail["rfm_now"]["segments"] if s["segment"] == "이탈 위험")
    rate = {x["asof"]: x["rate"] for x in retail["repurchase_90"]}
    base = {"winter": rate["2011-01-01"], "autumn": rate["2011-09-01"]}
    p = max(base.values(), key=lambda v: v * (1 - v))  # 분산이 큰 쪽(0.5에 가까운 쪽)으로 보수적으로 잡는다
    half_visit = max(s["target_diff"] for a in hillstrom["arms"].values() for s in a["sample_plan"] if s["outcome"] == "visit")
    rows = []
    for h in HOLDOUTS:
        rows.append({
            "holdout": h, "n_send": n - round(n * h), "n_holdout": round(n * h),
            "mde_1_winter": r(mde(base["winter"], n, h)), "mde_1_autumn": r(mde(base["autumn"], n, h)),
            "rounds_target": rounds_needed(p, n, h, TARGET),
            "rounds_half_visit": rounds_needed(p, n, h, half_visit),
        })
    return {"n_round": n, "base": base, "p_plan": p, "alpha": 0.05, "power": 0.8,
            "target": TARGET, "half_visit": half_visit, "by_holdout": rows}


def main():
    retail = json.loads(RETAIL.read_text(encoding="utf-8"))
    hillstrom = json.loads(HILLSTROM.read_text(encoding="utf-8"))
    RESULT.write_text(json.dumps(plan(retail, hillstrom), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(RESULT.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
