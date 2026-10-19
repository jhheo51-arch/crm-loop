"""analysis/results/hillstrom.json에서 분석 문서와 README 결과 구간을 만든다.

숫자를 손으로 옮기지 않기 위한 스크립트다. 테스트가 같은 함수로 다시 만들어 파일과 다르면 실패한다.
실행: python -I analysis/report.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULT = ROOT / "analysis/results/hillstrom.json"
DOC = ROOT / "docs/CAMPAIGN-MEASUREMENT.md"
README = ROOT / "README.md"
WEB = ROOT / "public/measurement-data.js"
START, END = "<!-- results:start -->", "<!-- results:end -->"

ARM_KO = {"mens": "남성용 메일", "womens": "여성용 메일"}
MODEL_KO = {
    "two_model_logit": "두 모델 방식 (로지스틱 회귀)",
    "two_model_hgb": "두 모델 방식 (부스팅 트리)",
    "class_transform_hgb": "클래스 변환 방식 (부스팅 트리)",
    "segment_rule": "고객군 규칙 (모델 없음)",
}
SEG_KO = {
    "history_segment": "지난 1년 구매 금액",
    "recency_group": "마지막 구매 후 경과",
    "newbie": "신규 고객 여부",
    "channel": "지난 구매 채널",
    "zip_code": "거주 지역",
    "past_purchase": "지난 구매 품목",
}
LEVEL_KO = {"0": "기존 고객", "1": "신규 고객 (최근 1년 첫 구매)", "Surburban": "Suburban (교외)",
            "Urban": "Urban (도시)", "Rural": "Rural (농촌)"}


def load() -> dict:
    return json.loads(RESULT.read_text(encoding="utf-8"))


def pp(x) -> str:
    return f"{x * 100:+.2f}%p"


def pct(x) -> str:
    return f"{x * 100:.2f}%"


def usd(x, sign=False) -> str:
    s = f"{abs(x):,.2f}"
    return ("-" if x < 0 else ("+" if sign else "")) + "$" + s


def usd0(x) -> str:
    return ("-" if x < 0 else "") + f"${abs(x):,.0f}"


def ci_pp(d) -> str:
    return f"{pp(d['diff'])} ({d['lo'] * 100:.2f} ~ {d['hi'] * 100:.2f})"


def ci_usd(d) -> str:
    return f"{usd(d['diff'], True)} ({d['lo']:.2f} ~ {d['hi']:.2f})"


def sig(d) -> str:
    return "" if d["lo"] > 0 or d["hi"] < 0 else " *"


def facts(r: dict) -> dict:
    """README와 문서가 함께 쓰는 핵심 문장 재료."""
    m, w = r["arms"]["mens"], r["arms"]["womens"]
    wp = {x["level"]: x for x in w["segments"]["past_purchase"]}
    return {
        "m": m, "w": w,
        "w_men_only": wp["남성용만"]["visit"], "w_women_only": wp["여성용만"]["visit"],
        "m_beats_random": m["uplift"]["test"]["qini_visit_lo"] > 0,
        "w_beats_random": w["uplift"]["test"]["qini_visit_lo"] > 0,
    }


def readme_block(r: dict) -> str:
    f = facts(r)
    m, w = f["m"], f["w"]
    wu = w["uplift"]["test"]
    mb, wb = m["budget"], w["budget"]
    a = r["assumptions"]
    wbest = next(b for b in wb["by_k"] if b["k_pct"] == wb["best_k_pct"])
    lines = [
        START,
        f"공개 이메일 실험 데이터 {r['meta']['rows']:,}명 (남성용 메일, 여성용 메일, 보내지 않음으로 무작위로 나누고 2주 관찰). 아래 숫자는 모두 메일을 보내지 않아도 샀을 고객을 빼고 계산했습니다.",
        "",
        "| 질문 | 남성용 메일 | 여성용 메일 |",
        "|---|---|---|",
        f"| 메일 덕분에 늘어난 방문률 (95% 구간) | {ci_pp(m['ate']['visit'])} | {ci_pp(w['ate']['visit'])} |",
        f"| 메일 덕분에 늘어난 구매율 | {ci_pp(m['ate']['conversion'])} | {ci_pp(w['ate']['conversion'])} |",
        f"| 메일 덕분에 늘어난 1인당 매출 (USD) | {ci_usd(m['ate']['spend'])} | {ci_usd(w['ate']['spend'])} |",
        f"| 반응할 고객을 점수로 골랐을 때 무작위로 고른 것보다 나았나 | {'예' if f['m_beats_random'] else '아니오'} | {'예' if f['w_beats_random'] else '아니오'} |",
        f"| 고객 1만 명 기준 이익이 가장 큰 발송 범위 | {scope(mb['best_k_pct'])} ({usd0(mb['profit_best'])}) | 상위 {wb['best_k_pct']}% ({usd0(wb['profit_best'])}, 전원 발송은 {usd0(wb['profit_all'])}) |",
        "",
        f"- 여성용 메일은 남성용 상품만 사던 고객에게 거의 효과가 없었습니다 (방문률 {pp(f['w_men_only']['diff'])}, 여성용 상품만 사던 고객은 {pp(f['w_women_only']['diff'])}). **판단:** 여성용 메일은 지난 구매 품목을 보고 받을 고객을 고릅니다.",
        f"- 여성용 메일은 점수 상위 30%에게만 보내도 메일 덕분에 늘어난 방문의 {mu_share(wu, 30)}를 얻었습니다. 남성용 메일은 효과가 고객 전체에 고르게 퍼져 있어 점수로 골라도 무작위와 차이가 없었습니다. **판단:** 남성용 메일은 고객을 고르지 않고 전원에게 보냅니다.",
        f"- 이익 계산은 마진율 {a['margin'] * 100:.0f}%, 1통 발송 비용 ${a['send_cost']:.2f}, 쿠폰 없음이라는 **가정값**입니다. 같은 마진율에서 발송 비용이 $0.25로 오르면 남성용 메일도 상위 {cost_k(m, a['margin'], 0.25)}%만 보내는 편이 낫고, 20% 쿠폰을 붙이면 두 메일 모두 보내지 않는 편이 낫습니다. **판단:** 이 캠페인에는 쿠폰을 붙이지 않고, 발송 비용이 바뀌면 발송 범위를 다시 계산합니다.",
        f"- 여성용 메일의 상위 {wb['best_k_pct']}% 이익 {usd0(wbest['profit_total'])}의 95% 범위는 {usd0(wbest['profit_total_lo'])} ~ {usd0(wbest['profit_total_hi'])}입니다. 상위 60%, 80%, 전원 발송의 차이는 이 범위 안에 있습니다. **판단:** 하위 고객을 빼는 결정은 다음 실험에서 확인할 때까지 미룹니다.",
        "",
        "점수 모델, Qini 곡선, 민감도 표 같은 분석 세부 사항은 [캠페인 측정 문서](docs/CAMPAIGN-MEASUREMENT.md)에 있습니다.",
        END,
    ]
    return "\n".join(lines)


def scope(k: int) -> str:
    return "전원" if k == 100 else ("보내지 않음" if k == 0 else f"상위 {k}%")


def cost_k(arm: dict, margin: float, send_cost: float) -> int:
    return next(s["best_k_pct"] for s in arm["sensitivity"] if s["margin"] == margin and s["send_cost"] == send_cost)


def mu_share(u: dict, k: int) -> str:
    return f"{u[f'share_of_incremental_visits_top{k}'] * 100:.0f}%"


def segment_table(arm: dict) -> list:
    out = []
    for by, rows in arm["segments"].items():
        out += [f"**{SEG_KO[by]}**", "", "| 고객군 | 발송 | 미발송 | 방문률 증분 (95% 구간) | 1인당 매출 증분 (95% 구간) |", "|---|---:|---:|---|---|"]
        for x in rows:
            out.append(f"| {LEVEL_KO.get(x['level'], x['level'])} | {x['n_treated']:,} | {x['n_control']:,} | "
                       f"{ci_pp(x['visit'])}{sig(x['visit'])} | {ci_usd(x['spend'])}{sig(x['spend'])} |")
        out.append("")
    return out


def doc(r: dict) -> str:
    f = facts(r)
    m, w = f["m"], f["w"]
    a = r["assumptions"]
    L = [
        "# 사례 A 캠페인 측정: 이메일 실험의 증분 효과, 업리프트, 예산",
        "",
        "[프로젝트 소개로 돌아가기](../README.md) | [KPI 정의서](KPI.md)",
        "",
        "> 이 문서의 숫자는 `analysis/report.py`가 `analysis/results/hillstrom.json`에서 만듭니다. 손으로 고치지 말고 분석을 다시 실행하세요.",
        "",
        "## 읽기 전에",
        "",
        f"- **데이터:** {r['meta']['dataset']}. 미국 온라인 소매업체의 고객 {r['meta']['rows']:,}명을 남성용 상품 메일, 여성용 상품 메일, 미발송으로 무작위 배정하고 2주 동안 방문, 구매, 구매 금액을 기록한 공개 데이터입니다.",
        "- **성격:** 방법을 보여 주기 위한 공개 실험 데이터 분석입니다. 실제 회사의 성과나 제가 집행한 캠페인이 아닙니다.",
        "- **원문:** 저장소에 넣지 않습니다. `python -I analysis/fetch_data.py`가 내려받고 SHA-256 해시로 원본이 같은지 확인합니다.",
        "- **가정값:** 마진율, 발송 비용, 쿠폰율은 데이터에 없는 값이라 제가 정한 가정입니다. 표에 `가정`으로 표시하고 민감도 표로 결론이 바뀌는 지점을 함께 적었습니다.",
        "- **표기:** 구간은 95% 신뢰구간입니다. `*`는 구간이 0을 포함해 효과가 있다고 말할 수 없는 칸입니다. 금액은 USD입니다.",
        "",
        "## 1. 무작위 배정 확인",
        "",
        "| 군 | 고객 수 |", "|---|---:|",
        *[f"| {k} | {v:,} |" for k, v in r["assignment"].items()],
        "",
        f"과거 구매 금액, 최근성, 신규 여부, 지역, 채널의 표준화 평균 차이는 최대 {m['balance']['max_abs_smd']:.3f} (남성용 메일 대 미발송), {w['balance']['max_abs_smd']:.3f} (여성용 메일 대 미발송)입니다. 기준인 0.1보다 작아 두 군을 그대로 비교해도 됩니다.",
        "",
        "## 2. 평균 증분 효과",
        "",
        "| 지표 | 남성용 메일 | 여성용 메일 |", "|---|---|---|",
    ]
    for o, name, fmt in [("visit", "방문률", ci_pp), ("conversion", "구매율", ci_pp), ("spend", "1인당 매출", ci_usd)]:
        L.append(f"| {name} 증분 | {fmt(m['ate'][o])} | {fmt(w['ate'][o])} |")
    L += [
        f"| 발송군 / 미발송군 방문률 | {pct(m['ate']['visit']['treated'])} / {pct(m['ate']['visit']['control'])} | {pct(w['ate']['visit']['treated'])} / {pct(w['ate']['visit']['control'])} |",
        "",
        "두 메일 모두 방문, 구매, 매출을 늘렸고 남성용 메일의 효과가 더 큽니다. 다만 매출 차이의 구간은 넓습니다. 구매가 드물고(미발송군 구매율 "
        f"{pct(m['ate']['conversion']['control'])}) 금액의 편차가 커서, 매출은 방문보다 훨씬 많은 표본이 있어야 정확히 잴 수 있습니다 (6장).",
        "",
        "## 3. 고객군별 증분 효과",
        "",
        f"평균만 보면 \"모두에게 보내자\"로 끝납니다. 고객군으로 나누면 효과가 다르게 나타납니다. 가장 뚜렷한 차이는 여성용 메일과 지난 구매 품목의 관계입니다. 남성용 상품만 사던 고객은 방문률 증분이 {ci_pp(f['w_men_only'])}로 작고, 여성용 상품만 사던 고객은 {ci_pp(f['w_women_only'])}입니다.",
        "",
        "고객군을 여러 개 동시에 보면 우연히 큰 차이가 하나쯤 나오기 마련입니다. 그래서 고객군 결과는 가설로 쓰고, 발송 대상 판단은 4장의 시험용 데이터 검증을 기준으로 합니다.",
        "",
        "### 남성용 메일", "", *segment_table(m),
        "### 여성용 메일", "", *segment_table(w),
        "## 4. 업리프트 모델",
        "",
        "\"보내면 반응할 사람\"이 아니라 \"보냈기 때문에 반응이 늘어나는 사람\"을 찾는 모델입니다. 학습 목표는 방문(visit)입니다. 구매는 미발송군 기준 1% 미만으로 드물어 학습 신호가 약합니다.",
        "",
        f"- **나누기:** 메일마다 개발용 80%, 시험용 20%로 나눴습니다 (발송 여부와 방문 여부 비율 유지, 난수 {m['uplift']['split']['seed']}).",
        f"- **모델 고르기:** 개발용 데이터 안에서 {m['uplift']['split']['folds']}겹 교차 적합으로 Qini 계수를 계산해 후보 중 하나를 고릅니다. 시험용 데이터는 이 단계에서 보지 않습니다.",
        "- **평가:** 고른 모델을 개발용 전체로 다시 학습해 시험용 데이터에서 한 번만 평가합니다. 구간은 시험용 데이터를 300번 다시 뽑아 구했습니다.",
        "- **Qini 계수:** 업리프트 점수 순으로 고객을 골랐을 때의 증분 방문 곡선과, 무작위로 골랐을 때의 직선 사이 넓이를 고객 수로 나눈 값입니다. 0보다 크면 무작위보다 낫습니다.",
        "",
        "| 후보 (개발용 교차 적합 Qini) | 남성용 메일 | 여성용 메일 |", "|---|---:|---:|",
        *[f"| {MODEL_KO[k]} | {m['uplift']['dev_qini'][k]:.5f} | {w['uplift']['dev_qini'][k]:.5f} |" for k in m["uplift"]["dev_qini"]],
        f"| **선택** | {MODEL_KO[m['uplift']['chosen']]} | {MODEL_KO[w['uplift']['chosen']]} |",
        "",
        "| 시험용 데이터 결과 | 남성용 메일 | 여성용 메일 |", "|---|---|---|",
    ]
    mu, wu = m["uplift"]["test"], w["uplift"]["test"]
    L += [
        f"| Qini 계수 (방문, 95% 구간) | {mu['qini_visit']:.5f} ({mu['qini_visit_lo']:.5f} ~ {mu['qini_visit_hi']:.5f}) | {wu['qini_visit']:.5f} ({wu['qini_visit_lo']:.5f} ~ {wu['qini_visit_hi']:.5f}) |",
        f"| Qini 계수 (구매, 참고) | {mu['qini_conversion']:.5f} | {wu['qini_conversion']:.5f} |",
        f"| 상위 30%에게 보낼 때 확보하는 증분 방문 비율 | {mu_share(mu, 30)} | {mu_share(wu, 30)} |",
        f"| 상위 50%에게 보낼 때 확보하는 증분 방문 비율 | {mu_share(mu, 50)} | {mu_share(wu, 50)} |",
        f"| 무작위 선정보다 낫다고 말할 수 있는가 | {'예' if f['m_beats_random'] else '아니오 (구간이 0을 포함)'} | {'예' if f['w_beats_random'] else '아니오 (구간이 0을 포함)'} |",
        "",
        "**해석.** 여성용 메일은 반응이 늘어나는 고객이 한쪽에 몰려 있어 순위를 매길 가치가 있습니다. 남성용 메일은 개발용 데이터에서 가장 나았던 모델도 시험용 데이터에서는 무작위와 구별되지 않았습니다. 효과가 고객 전반에 고르게 퍼져 있다는 뜻이고, 이 경우에는 모델보다 전원 발송이 단순하고 정확합니다. 모델이 언제 필요 없는지 확인하는 것도 측정의 결과로 봅니다.",
        "",
        "## 5. 예산 계산",
        "",
        "고객 1명당 증분 이익 = 마진율 x (발송군 1인당 매출 - 미발송군 1인당 매출) - 쿠폰율 x 발송군 1인당 매출 - 1통 발송 비용",
        "",
        "쿠폰은 메일이 없어도 샀을 고객의 구매에도 나가므로 증분 매출이 아니라 발송군 매출 전체에 붙습니다. 업리프트 점수는 교차 적합으로 매겨(각 고객은 자기가 빠진 모델로 점수를 받음) 5분위로 나눴고, 상위 분위부터 차례로 더하며 계산했습니다.",
        "",
        f"**기본 가정 (가정):** 마진율 {a['margin'] * 100:.0f}%, 발송 비용 1통 ${a['send_cost']:.2f}, 쿠폰 없음, 대상 고객 {a['base_customers']:,}명.",
        "",
    ]
    for key in ["mens", "womens"]:
        x = r["arms"][key]
        L += [f"### {ARM_KO[key]}", "",
              "| 분위 | 발송 | 미발송 | 방문률 (발송 / 미발송) | 1인당 매출 (발송 / 미발송) |", "|---|---:|---:|---|---|"]
        for g in x["groups"]:
            L.append(f"| {g['label']} | {g['n_treated']:,} | {g['n_control']:,} | {pct(g['visit_t'])} / {pct(g['visit_c'])} | {usd(g['spend_t'])} / {usd(g['spend_c'])} |")
        L += ["", "| 발송 범위 | 대상 수 | 1인당 증분 매출 | 1인당 증분 이익 | 총 증분 이익 (95% 범위) |", "|---|---:|---:|---:|---|"]
        for b in x["budget"]["by_k"][1:]:
            L.append(f"| 상위 {b['k_pct']}% | {b['n_target']:,} | {usd(b['inc_spend_per'])} | {usd(b['profit_per'])} | "
                     f"{usd0(b['profit_total'])} ({usd0(b['profit_total_lo'])} ~ {usd0(b['profit_total_hi'])}) |")
        L += ["", f"기본 가정에서 이익이 가장 큰 범위는 **{scope(x['budget']['best_k_pct'])}** ({usd0(x['budget']['profit_best'])})입니다."]
        if x["uplift"]["test"]["qini_visit_lo"] <= 0:
            L.append("이 메일은 업리프트 순위가 시험용 데이터에서 무작위와 구별되지 않았으므로, 분위 순서 자체에는 큰 의미를 두지 않습니다.")
        L.append("")
    L += [
        "### 민감도: 최적 발송 범위 (총 증분 이익)",
        "",
        "마진율과 발송 비용을 바꿔 가며 최적 범위를 다시 고른 표입니다. `0%`는 보내지 않는 것이 낫다는 뜻입니다.",
        "",
    ]
    for key in ["mens", "womens"]:
        x = r["arms"][key]
        sends = sorted({s["send_cost"] for s in x["sensitivity"]})
        L += [f"**{ARM_KO[key]}**", "", "| 마진율 \\ 발송 비용 | " + " | ".join(f"${s:.2f}" for s in sends) + " |",
              "|---|" + "---|" * len(sends)]
        for mg in sorted({s["margin"] for s in x["sensitivity"]}):
            cells = [next(s for s in x["sensitivity"] if s["margin"] == mg and s["send_cost"] == sc) for sc in sends]
            L.append(f"| {mg * 100:.0f}% | " + " | ".join(f"{c['best_k_pct']}% ({usd0(c['profit_best'])})" for c in cells) + " |")
        L.append("")
    L += ["### 쿠폰을 붙이면", "", "| 쿠폰율 | 남성용 메일 최적 범위 | 여성용 메일 최적 범위 |", "|---|---|---|"]
    for cm, cw in zip(m["coupon_scenario"], w["coupon_scenario"]):
        L.append(f"| {cm['coupon_rate'] * 100:.0f}% | {cm['best_k_pct']}% ({usd0(cm['profit_best'])}) | {cw['best_k_pct']}% ({usd0(cw['profit_best'])}) |")
    L += [
        "",
        "**해석.**",
        "",
        "- 남성용 메일은 발송 비용이 1통 $0.10 이하이면 전원 발송이 가장 낫습니다. 비용이 오르면 상위 분위만 남기거나 보내지 않는 쪽으로 바뀝니다.",
        "- 여성용 메일은 기본 가정에서 하위 20%를 뺀 범위의 이익이 가장 크고, 발송 비용이 오를수록 최적 범위가 더 좁아집니다.",
        "- 쿠폰은 증분 매출이 아니라 원래 살 고객의 매출에도 붙어 비용이 빠르게 커집니다. 이 데이터에서는 20% 쿠폰을 붙이면 두 메일 모두 보내지 않는 것이 낫습니다. 혜택을 키우기 전에 혜택 없이 메일만으로 생기는 증분부터 재야 하는 이유입니다.",
        "- 분위별 매출 차이는 구간이 넓습니다. 상위 60%, 80%, 전원 발송의 이익 차이는 95% 범위 안에 있으므로, 하위 고객 제외는 확정이 아니라 다음 실험의 가설입니다.",
        "",
        "## 6. 다음 캠페인의 측정 계획",
        "",
        "이번 효과의 절반을 잡아낼 수 있게 표본을 잡았습니다 (양측 5%, 검정력 80%). 효과를 절반으로 잡은 이유는 이번 실험 결과가 가장 좋은 경우일 수 있어서입니다.",
        "",
        "| 메일 | 지표 | 잡아낼 차이 | 홀드아웃 10% | 홀드아웃 20% | 홀드아웃 50% |", "|---|---|---|---:|---:|---:|",
    ]
    for key in ["mens", "womens"]:
        sp = r["arms"][key]["sample_plan"]
        for o, name, fmt in [("visit", "방문률", lambda v: f"{v * 100:.2f}%p"), ("spend", "1인당 매출", lambda v: f"${v:.2f}")]:
            rows = [s for s in sp if s["outcome"] == o]
            L.append(f"| {ARM_KO[key]} | {name} | {fmt(rows[0]['target_diff'])} | " + " | ".join(f"{s['n_total']:,}명" for s in rows) + " |")
    L += [
        "",
        "매출 기준으로 효과를 확정하려면 방문 기준보다 열 배 넘는 고객이 필요합니다. 그래서 다음 캠페인은 방문률(또는 구매율)을 판단 지표로 두고, 매출은 여러 회차를 모아 확인하는 보조 지표로 둡니다. 홀드아웃 비율이 작을수록 필요한 전체 고객 수가 커지므로, 고객 수가 적은 캠페인에서는 홀드아웃을 20% 이상으로 둡니다.",
        "",
        "## 7. 한계",
        "",
        "- 2008년 미국 온라인 소매업체 데이터이고 관찰 기간이 2주입니다. 지금의 채널 환경이나 다른 업종에 그대로 옮길 수 없습니다.",
        "- 수신거부, 스팸 신고, 장기 이탈은 기록되어 있지 않습니다. 보호 지표(수신거부율)는 이 데이터에서 `미측정`입니다.",
        "- 업리프트 모델은 방문으로 학습했습니다. 방문을 늘리는 고객과 매출을 늘리는 고객이 다를 수 있습니다.",
        "- 마진율, 발송 비용, 쿠폰율은 가정값입니다.",
        "- 고객군별 결과는 여러 비교를 동시에 한 결과라 우연한 차이가 섞여 있을 수 있습니다.",
        "",
    ]
    return "\n".join(L)


def web_data(r: dict) -> str:
    """웹의 사례 A 화면이 읽는 값만 골라 JS 모듈로 만든다. 화면에도 숫자를 손으로 옮기지 않는다."""
    keep_meta = ["dataset", "source", "sha256", "rows", "period", "currency", "note"]
    arms = {}
    for k, a in r["arms"].items():
        u = a["uplift"]
        arms[k] = {
            "label": a["label"],
            "ate": a["ate"],
            "past_purchase": [{"level": x["level"], "n_treated": x["n_treated"], "n_control": x["n_control"],
                               "visit": x["visit"]} for x in a["segments"]["past_purchase"]],
            "uplift": {"chosen": u["chosen"], **{x: u["test"][x] for x in
                       ["qini_visit", "qini_visit_lo", "qini_visit_hi", "share_of_incremental_visits_top30",
                        "share_of_incremental_visits_top50", "curve"]}},
            "budget": a["budget"],
            "coupon_scenario": a["coupon_scenario"],
            "sample_plan": a["sample_plan"],
        }
    data = {"meta": {k: r["meta"][k] for k in keep_meta}, "assumptions": r["assumptions"],
            "assignment": r["assignment"], "arms": arms}
    return ("// analysis/report.py가 analysis/results/hillstrom.json에서 만든 파일입니다. 직접 고치지 마세요.\n"
            "export const measurement=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")


def render_readme(text: str, r: dict) -> str:
    head, rest = text.split(START, 1)
    _, tail = rest.split(END, 1)
    return head + readme_block(r) + tail


def main():
    r = load()
    DOC.write_text(doc(r), encoding="utf-8")
    README.write_text(render_readme(README.read_text(encoding="utf-8"), r), encoding="utf-8")
    WEB.write_text(web_data(r), encoding="utf-8")
    print(WEB)
    print(DOC)
    print(README)


if __name__ == "__main__":
    main()
