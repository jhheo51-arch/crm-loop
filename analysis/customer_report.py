"""analysis/results/online_retail.json에서 고객 가치 분석 문서를 만든다.

    python -I analysis/customer_report.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RESULT = ROOT / "analysis/results/online_retail.json"
DOC = ROOT / "docs/CUSTOMER-VALUE.md"

ACTION = {  # 고객군별 CRM 제안. 데이터에서 나온 값이 아니라 설계 제안이다.
    "최우수": "할인 대신 신상품 먼저 보기와 대량 주문 상담을 안내합니다. 다시 살 가능성이 가장 높아 쿠폰은 미발송군으로 효과를 확인한 뒤에만 붙입니다.",
    "충성 고객": "자주 사는 품목의 재입고 알림과 묶음 구매를 제안해 최우수로 올립니다.",
    "신규 고객": "첫 구매 뒤 30일 안에 두 번째 구매 이유를 줍니다. 신규 고객 대부분이 다음 달에 다시 사지 않습니다.",
    "성장 후보": "처음 산 품목과 함께 많이 팔리는 품목을 추천합니다.",
    "이탈 위험": "미발송군을 둔 재방문 캠페인의 1순위입니다. 사례 A와 같은 방법으로 증분을 잽니다.",
    "휴면 직전": "비용이 낮은 채널로 가볍게 다시 알립니다.",
    "휴면": "발송 빈도를 줄이고 큰 시즌 안내만 보냅니다. 수신거부와 발송 비용을 아낍니다.",
}


def load() -> dict:
    return json.loads(RESULT.read_text(encoding="utf-8"))


def pct(x, d=1) -> str:
    return f"{x * 100:.{d}f}%"


def gbp(x) -> str:
    return f"£{x:,.0f}"


def facts(d: dict) -> dict:
    """문서의 해석 문장이 쓰는 값. 테스트가 같은 함수로 문장이 맞는지 확인한다."""
    c, v, k = d["cohort"], {s["segment"]: s for s in d["rfm_validation"]["segments"]}, d["clv"]
    size = dict(zip(c["months"], c["size"]))
    new10 = sum(n for m, n in size.items() if "2010-01" <= m <= "2010-11")
    new11 = sum(n for m, n in size.items() if "2011-01" <= m <= "2011-11")
    rep = d["repurchase_90"]
    lo, hi = min(rep, key=lambda x: x["rate"]), max(rep, key=lambda x: x["rate"])
    top = k["deciles"][0]
    rest = k["deciles"][1:]
    rest_ratio = sum(x["clv_pred"] for x in rest) / sum(x["rev_actual"] for x in rest)
    return {"new10": new10, "new11": new11, "lo": lo, "hi": hi, "v": v,
            "best": v["최우수"], "risk": v["이탈 위험"], "sleep": v["휴면"],
            "over": k["x_total_pred"] / k["x_total_actual"] - 1, "rev_over": k["models"]["clv"]["total"] / k["rev_total_actual"] - 1,
            "baseline_better": k["models"]["past_revenue"]["mae"] < k["models"]["clv"]["mae"]
            and k["models"]["past_revenue"]["top20_capture"] >= k["models"]["clv"]["top20_capture"],
            "top": top, "rest_ratio": rest_ratio}


def doc(d: dict) -> str:
    m, c, k, f = d["meta"], d["cohort"], d["clv"], facts(d)
    best, risk, sleep = f["best"], f["risk"], f["sleep"]
    L = [
        "# 고객 가치 분석: 코호트 리텐션, RFM, CLV",
        "",
        "[프로젝트 소개로 돌아가기](../README.md) | [KPI 정의서](KPI.md) | [사례 A 캠페인 측정](CAMPAIGN-MEASUREMENT.md)",
        "",
        "> 이 문서의 숫자는 `analysis/customer_report.py`가 `analysis/results/online_retail.json`에서 만듭니다. 손으로 고치지 말고 분석을 다시 실행하세요.",
        "",
        "사례 A가 \"보낸 메시지가 무엇을 바꿨는가\"를 쟀다면, 이 문서는 그 앞의 질문인 \"누구에게, 언제 보내야 하는가\"를 실제 거래 기록으로 답합니다. 고객이 언제 떠나는지(코호트), 지금 어떤 상태인지(RFM), 앞으로 얼마를 쓸지(CLV)를 차례로 봅니다.",
        "",
        "## 읽기 전에",
        "",
        f"- **데이터:** {m['dataset']}. {m['note']} 라이선스는 {m['license']}입니다.",
        f"- **기간:** {m['period']} (24개월). 2011년 12월은 9일까지만 있어 뺐습니다. 금액은 {m['currency']}입니다.",
        "- **원문:** 저장소에 넣지 않습니다. `python -I analysis/fetch_data.py online_retail_ii`가 내려받고 SHA-256 해시로 원본이 같은지 확인합니다.",
        "- **구매 1회:** 같은 고객이 같은 날 낸 송장은 한 번의 구매로 셉니다.",
        "- **도매 고객:** UCI 설명에 따르면 고객 중 도매상이 많습니다. 한 번에 사는 양이 많고 자주 삽니다. 개인 고객 중심의 업종에 숫자를 그대로 옮기지 않습니다.",
        "",
        "## 1. 정제",
        "",
        "| 단계 | 남은 줄 |",
        "|---|---:|",
        *[f"| {x['step']} | {x['rows']:,} |" for x in d["cleaning"]],
        "",
        f"남은 기록은 고객 {m['customers']:,}명, 구매 {m['orders']:,}회입니다. 취소는 취소 줄만 빼면 원래 주문이 매출로 남아 고객 가치를 부풀리므로, 같은 고객의 같은 상품, 같은 수량 주문을 찾아 함께 뺐습니다.",
        "",
        "## 2. 코호트 리텐션: 고객은 언제 떠나는가",
        "",
        "첫 구매 달이 같은 고객을 한 코호트로 묶고, 그 뒤 매달 다시 산 고객의 비율을 봅니다.",
        "",
        "| 첫 구매 달 | 고객 수 | 1개월 뒤 | 3개월 뒤 | 6개월 뒤 | 12개월 뒤 |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for i, mo in enumerate(c["months"]):
        if "2010-01" <= mo <= "2010-11":
            row = c["retention"][i]
            L.append(f"| {mo} | {c['size'][i]:,} | " + " | ".join(pct(row[j]) if j < len(row) else "-" for j in (1, 3, 6, 12)) + " |")
    a = c["avg"]
    L += [
        f"| **전체 가중 평균** | | **{pct(a['1'])}** | **{pct(a['3'])}** | **{pct(a['6'])}** | **{pct(a['12'])}** |",
        "",
        f"- **첫 달이 가장 큰 고비입니다.** 신규 고객의 {pct(1 - a['1'])}가 다음 달에 다시 사지 않습니다. 그 뒤로는 6개월 뒤 {pct(a['6'])}, 12개월 뒤 {pct(a['12'])}로 매달 비슷한 비율이 돌아옵니다. 첫 달에 대부분 빠지므로 신규 고객 메시지는 첫 30일에 모읍니다.",
        f"- **2009년 12월 코호트는 따로 봅니다.** 데이터가 시작하는 달이라 그전부터 사던 고객이 섞여 1개월 뒤 {pct(c['first_cohort_m1'])}, 12개월 뒤 {pct(c['first_cohort_m12'])}로 높게 나옵니다. 평균에서 뺐습니다.",
        f"- **새 고객 유입이 줄었습니다.** 2010년 1월에서 11월 사이 첫 구매 고객은 {f['new10']:,}명, 2011년 같은 기간은 {f['new11']:,}명입니다. 유지보다 획득 쪽 문제가 먼저인지 확인할 질문으로 남깁니다.",
        "",
        "### 북극성 지표: 90일 재구매율",
        "",
        "[KPI 정의서](KPI.md)의 북극성 지표입니다. 기준일 전 12개월에 산 고객 중 기준일부터 90일 안에 다시 산 고객의 비율입니다.",
        "",
        "| 기준일 | 대상 고객 | 다시 산 고객 | 90일 재구매율 |",
        "|---|---:|---:|---:|",
        *[f"| {x['asof']} | {x['base']:,} | {x['repurchased']:,} | {pct(x['rate'])} |" for x in d["repurchase_90"]],
        "",
        f"기준일에 따라 {pct(f['lo']['rate'])} ({f['lo']['asof']})에서 {pct(f['hi']['rate'])} ({f['hi']['asof']})까지 움직입니다. 연말 선물 수요를 앞둔 가을이 높아, 캠페인 전후를 비교할 때는 같은 계절끼리 비교하거나 미발송군과 비교해야 합니다.",
        "",
        "## 3. RFM: 고객은 지금 어떤 상태인가",
        "",
        "기준일 직전 12개월의 구매로 최근성(R, 마지막 구매 뒤 지난 일수), 빈도(F, 구매 횟수), 금액(M)을 구하고 R과 F를 고객 순위로 1점에서 5점까지 매겨 일곱 고객군으로 나눴습니다.",
        "",
        "| 고객군 | 규칙 (R, F 점수) |",
        "|---|---|",
        "| 최우수 | R 4 이상, F 4 이상 |",
        "| 충성 고객 | R 3 이상, F 3 이상 |",
        "| 신규 고객 | R 4 이상, F 1 |",
        "| 성장 후보 | R 3 이상, F 2 이하 |",
        "| 이탈 위험 | R 2 이하, F 3 이상 |",
        "| 휴면 직전 | R 2, F 2 이하 |",
        "| 휴면 | R 1, F 2 이하 |",
        "",
        "위에서부터 먼저 맞는 규칙을 씁니다.",
        "",
        "### 고객군이 다음 해를 맞히는가",
        "",
        f"고객군은 나눈 뒤에 실제로 다르게 행동해야 쓸모가 있습니다. {d['rfm_validation']['asof']} 기준으로 나누고, 그 뒤 12개월 동안 실제로 다시 샀는지와 얼마를 썼는지 봤습니다. 대상 고객 {d['rfm_validation']['customers']:,}명 중 {pct(d['rfm_validation']['repurchase_all'])}가 다시 샀습니다.",
        "",
        "| 고객군 | 고객 수 | 고객 비중 | 마지막 구매 뒤 (중앙값) | 구매 횟수 (중앙값) | 지난 12개월 매출 비중 | 다음 12개월 재구매율 | 다음 12개월 1인당 매출 | 다음 12개월 매출 비중 |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|",
        *[f"| {s['segment']} | {s['n']:,} | {pct(s['share'])} | {s['r_days_median']}일 | {s['f_median']}회 | {pct(s['revenue_share_before'])} | {pct(s['repurchase'])} | {gbp(s['next_rev_mean'])} | {pct(s['next_rev_share'])} |"
          for s in d["rfm_validation"]["segments"]],
        "",
        f"- **최우수 고객 {pct(best['share'])}가 다음 해 매출의 {pct(best['next_rev_share'])}를 냈습니다.** {pct(best['repurchase'])}가 다시 샀습니다. 이 고객군에 할인을 붙이면 원래 일어났을 구매에도 할인 비용이 나갈 가능성이 큽니다.",
        f"- **이탈 위험 고객은 아직 절반 넘게 남아 있습니다.** {pct(risk['repurchase'])}가 다시 샀지만 매출 비중은 {pct(risk['revenue_share_before'])}에서 {pct(risk['next_rev_share'])}로 줄었습니다. 떠나기 전이라 되돌릴 여지가 있고, 과거 구매가 많아 되돌렸을 때 얻는 것도 큽니다. 재방문 캠페인을 먼저 시험할 곳입니다.",
        f"- **휴면 고객은 {pct(sleep['repurchase'])}만 다시 샀습니다.** 고객 비중 {pct(sleep['share'])}에 다음 해 매출 비중 {pct(sleep['next_rev_share'])}입니다. 같은 비용을 들인다면 이탈 위험 고객이 먼저입니다.",
        "",
        "### 지금 고객군과 CRM 제안",
        "",
        f"{d['rfm_now']['asof']} 기준 고객 {d['rfm_now']['customers']:,}명의 고객군입니다. 제안은 위 검증에서 나온 설계 제안이며, 실제 효과는 미발송군을 두고 따로 재야 합니다.",
        "",
        "| 고객군 | 고객 수 | 지난 12개월 매출 비중 | CRM 제안 (설계 제안) |",
        "|---|---:|---:|---|",
        *[f"| {s['segment']} | {s['n']:,} | {pct(s['revenue_share'])} | {ACTION[s['segment']]} |" for s in d["rfm_now"]["segments"]],
        "",
        "## 4. CLV: 앞으로 얼마를 쓸 것인가",
        "",
        f"고객 생애가치(CLV)는 구매 횟수 모델(BG/NBD)과 구매 1회 금액 모델(Gamma-Gamma)을 곱해 구했습니다. {k['calibration'][0]}부터 {k['calibration'][1]} 전까지의 기록으로 모델을 만들고, 그 뒤 {k['holdout_weeks']:.0f}주 동안 실제로 쓴 금액과 비교했습니다. 대상은 앞 기간에 처음 산 고객 {k['customers']:,}명이고, 그중 두 번 이상 산 고객은 {k['repeaters']:,}명입니다.",
        "",
        f"- **모델 값:** BG/NBD r {k['bgnbd']['r']:.3f}, alpha {k['bgnbd']['alpha']:.3f}, a {k['bgnbd']['a']:.3f}, b {k['bgnbd']['b']:.3f} / Gamma-Gamma p {k['gamma_gamma']['p']:.3f}, q {k['gamma_gamma']['q']:.3f}, v {k['gamma_gamma']['v']:.5f}",
        f"- **Gamma-Gamma 전제 확인:** 구매 횟수와 1회 금액의 상관은 {k['freq_value_corr']:.3f}로 낮아, 두 모델을 따로 만들어 곱해도 됩니다.",
        "",
        "### 기준선과 비교",
        "",
        "모델이 쓸모 있는지는 가장 단순한 방법과 비교해야 알 수 있습니다. 기준선은 \"지난 12개월 매출이 다음 12개월에도 그대로 나온다\"입니다.",
        "",
        "| 방법 | 고객당 오차 (MAE) | 예측 총매출 | 상위 20% 고객이 낸 실제 매출 비중 |",
        "|---|---:|---:|---:|",
        f"| BG/NBD + Gamma-Gamma | {gbp(k['models']['clv']['mae'])} | {gbp(k['models']['clv']['total'])} | {pct(k['models']['clv']['top20_capture'])} |",
        f"| 지난 12개월 매출 (기준선) | {gbp(k['models']['past_revenue']['mae'])} | {gbp(k['models']['past_revenue']['total'])} | {pct(k['models']['past_revenue']['top20_capture'])} |",
        f"| 실제 | | {gbp(k['rev_total_actual'])} | |",
        "",
        "### 예측 CLV 10분위별 실제",
        "",
        "| 분위 (1이 가장 높음) | 고객 수 | 예측 구매 횟수 | 실제 구매 횟수 | 예측 CLV | 실제 매출 |",
        "|---:|---:|---:|---:|---:|---:|",
        *[f"| {x['decile']} | {x['n']:,} | {x['x_pred']:.2f} | {x['x_actual']:.2f} | {gbp(x['clv_pred'])} | {gbp(x['rev_actual'])} |" for x in k["deciles"]],
        "",
        "### 결과를 그대로 읽으면",
        "",
        f"- **상위 10%는 잘 맞혔습니다.** 예측 {gbp(f['top']['clv_pred'])}, 실제 {gbp(f['top']['rev_actual'])}입니다.",
        f"- **나머지는 크게 부풀렸습니다.** 2분위 아래 고객의 예측 CLV 합은 실제 매출의 {f['rest_ratio']:.1f}배이고, 전체 구매 횟수는 실제보다 {pct(f['over'])} 많게 잡았습니다. 모델은 앞 기간의 구매 속도가 그대로 이어진다고 보는데, 이 데이터에서는 다음 해에 구매가 줄었습니다.",
    ]
    if f["baseline_better"]:
        L.append("- **단순 기준선이 더 나았습니다.** 고객당 오차도 작고 상위 20% 고객을 고르는 힘도 같거나 높습니다. 이 데이터에서는 CLV 모델을 쓰지 않아도 지난해 매출 순위로 충분히 고객을 고를 수 있습니다.")
    else:
        L.append("- **CLV 모델이 기준선보다 나았습니다.** 고객당 오차가 작거나 상위 고객을 더 잘 골랐습니다.")
    au = k["active_auc"]
    L += [
        f"- **다음 해에 다시 살지를 가리는 힘**(AUC, 0.5는 무작위)은 모델의 예측 구매 횟수 {au['bgnbd']:.3f}, 지난 구매 횟수 {au['frequency']:.3f}, 최근성 {au['recency']:.3f}로 비슷합니다.",
        "",
        "그래서 이 프로젝트는 고객을 고를 때는 RFM 고객군과 지난 매출 순위를 쓰고, CLV 모델은 \"고객 한 명을 지키면 얼마가 남는가\"처럼 금액 크기가 필요한 예산 계산에만 씁니다. 그때도 모델 값을 그대로 쓰지 않고, 직전 기간의 실제 대비 예측 비율로 낮춰 씁니다.",
        "",
        "## 5. 캠페인으로 잇기",
        "",
        "1. **누구에게:** RFM의 이탈 위험 고객을 재방문 캠페인의 첫 대상으로 둡니다. 최우수 고객은 쿠폰 대상에서 뺍니다.",
        "2. **언제:** 신규 고객은 첫 구매 뒤 30일 안, 기존 고객은 90일 재구매율이 낮은 겨울 기준일 전후에 시험합니다.",
        "3. **어떻게 재는가:** 대상 고객 일부를 미발송군으로 남기고 [사례 A](CAMPAIGN-MEASUREMENT.md)와 같은 방법으로 증분 재구매율을 잽니다. 이 데이터는 실험이 아니라서 여기 나온 차이를 캠페인 효과라고 부르지 않습니다.",
        "",
        "## 한계",
        "",
        "- 실험 데이터가 아니라 거래 기록입니다. 고객군 사이의 차이는 캠페인 효과가 아니라 원래 다른 고객이기 때문일 수 있습니다.",
        "- 고객 번호가 없는 거래는 뺐습니다. 비회원 구매가 많은 업종이라면 남은 고객이 전체를 대표하지 않을 수 있습니다.",
        "- CLV 대상에는 2009년 12월에 처음 보인 고객이 들어 있습니다. 데이터 시작 전부터 사던 고객이 섞여 있어 이들의 첫 구매 시점은 실제보다 늦게 잡힙니다.",
        "- 마진 정보가 없어 CLV는 이익이 아니라 매출 기준입니다.",
        "- 도매 고객 중심이라 개인 고객 업종의 리텐션과 구매 주기와는 다를 수 있습니다.",
        "",
        "## 다시 만들기",
        "",
        "```bash",
        "python -I analysis/fetch_data.py online_retail_ii",
        "python -I analysis/online_retail.py",
        "python -I analysis/customer_report.py",
        "```",
        "",
    ]
    return "\n".join(L)


def main():
    DOC.write_text(doc(load()), encoding="utf-8")
    print(DOC)


if __name__ == "__main__":
    main()
