from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = ROOT / "public" / "downloads"
NEW_PDF = DOWNLOADS / "CRM-LOOP-Case-B-Plan.pdf"
TOTAL_PAGES = 5


def build_pdf():
    pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
    pdfmetrics.registerFont(TTFont("Malgun-Bold", r"C:\Windows\Fonts\malgunbd.ttf"))

    ink = colors.HexColor("#17231C")
    green = colors.HexColor("#5D7765")
    pale = colors.HexColor("#E9EFE8")
    warm = colors.HexColor("#F5F2EA")
    line = colors.HexColor("#D3D8D1")
    soft = colors.HexColor("#55615A")
    white = colors.white
    accent = colors.HexColor("#A95F3A")

    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["BodyText"], fontName="Malgun", fontSize=11, leading=17, textColor=ink, spaceAfter=6, wordWrap="CJK", splitLongWords=False)
    note = ParagraphStyle("note", parent=body, fontSize=9.3, leading=14.2, textColor=soft, spaceAfter=0)
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Malgun-Bold", fontSize=34, leading=38, textColor=ink, alignment=TA_LEFT, spaceAfter=6, wordWrap="CJK")
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName="Malgun-Bold", fontSize=19, leading=25, textColor=ink, spaceBefore=0, spaceAfter=8, wordWrap="CJK")
    h3 = ParagraphStyle("h3", parent=styles["Heading3"], fontName="Malgun-Bold", fontSize=12, leading=17, textColor=ink, spaceBefore=2, spaceAfter=5, wordWrap="CJK")
    eyebrow = ParagraphStyle("eyebrow", parent=body, fontName="Malgun-Bold", fontSize=8.6, leading=11.2, textColor=green, spaceAfter=5)
    lead = ParagraphStyle("lead", parent=body, fontName="Malgun-Bold", fontSize=17.5, leading=25.5, spaceAfter=9, wordWrap="CJK")
    quote = ParagraphStyle("quote", parent=body, fontName="Malgun-Bold", fontSize=12, leading=18.5, leftIndent=8, rightIndent=6, borderColor=green, borderWidth=1.2, borderPadding=11, backColor=pale, spaceAfter=7)
    warning = ParagraphStyle("warning", parent=note, textColor=accent, fontName="Malgun-Bold")

    def p(text, style=body):
        return Paragraph(str(text).replace("\n", "<br/>"), style)

    def heading(label, title, intro=None):
        items = [p(label, eyebrow), p(title, h2)]
        if intro:
            items.append(p(intro, body))
        return KeepTogether(items)

    def table(rows, widths, font_size=9.4, header=True, compact=False, first_col_bold=False):
        cooked = []
        for row_index, row in enumerate(rows):
            cells = []
            for col_index, value in enumerate(row):
                is_header = header and row_index == 0
                is_key = first_col_bold and col_index == 0 and not is_header
                style = ParagraphStyle(
                    f"table-{font_size}-{row_index}-{col_index}-{len(rows)}", parent=body,
                    fontName="Malgun-Bold" if is_header or is_key else "Malgun", fontSize=font_size,
                    leading=font_size + (3.7 if compact else 4.2), textColor=white if is_header else ink,
                    spaceAfter=0, wordWrap="CJK", splitLongWords=False,
                )
                cells.append(p(value, style))
            cooked.append(cells)
        result = Table(cooked, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
        vertical_padding = 6.4 if compact else 7.4
        commands = [
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6.2), ("RIGHTPADDING", (0, 0), (-1, -1), 6.2),
            ("TOPPADDING", (0, 0), (-1, -1), vertical_padding), ("BOTTOMPADDING", (0, 0), (-1, -1), vertical_padding),
            ("BOX", (0, 0), (-1, -1), 0.5, line), ("LINEBELOW", (0, 0), (-1, -2), 0.35, line),
        ]
        if header:
            commands.append(("BACKGROUND", (0, 0), (-1, 0), ink))
        for row_index in range(1 if header else 0, len(rows)):
            if row_index % 2 == 0:
                commands.append(("BACKGROUND", (0, row_index), (-1, row_index), warm))
        result.setStyle(TableStyle(commands))
        return result

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(line)
        canvas.line(16 * mm, 13 * mm, 194 * mm, 13 * mm)
        canvas.setFont("Malgun", 7.2)
        canvas.setFillColor(green)
        canvas.drawString(16 * mm, 8.2 * mm, "CRM LOOP")
        canvas.drawRightString(194 * mm, 8.2 * mm, f"{TOTAL_PAGES}쪽 중 {doc.page}쪽")
        canvas.restoreState()

    doc = SimpleDocTemplate(str(NEW_PDF), pagesize=A4, rightMargin=16 * mm, leftMargin=16 * mm, topMargin=15 * mm, bottomMargin=18 * mm, title="CRM LOOP Case B Plan", author="Portfolio author")

    snapshot_rows = [
        ["구분", "제가 정한 범위", "확인할 수 있는 것"],
        ["사례", "CRM LOOP 기획서 2, VIP 행사", "초청 대상, 현장 경험, 후속 메시지를 정한 기획안"],
        ["행사", "향 브랜드 신제품 프리뷰 가정", "초청부터 D+30까지 이어지는 고객 여정"],
        ["자료", "공식 자료, 공개 후기, 가상 데이터", "사실, 관찰, 가정의 출처와 한계 표시"],
        ["산출물", "기획안, CRM 운영표, 웹 화면", "고객 누락과 후속 업무를 관리하는 구조"],
    ]
    name_rows = [
        ["CRM", "동의한 고객의 선택과 반응 기록"],
        ["LOOP", "그 기록이 초청, 참석, 상담, 재방문으로 다시 이어지는 순환"],
    ]
    strength_rows = [
        ["01", "초대 이유를 고객군마다 정함", "네 고객군마다 선정 이유, 제공 가치, 제외 조건을 정했습니다."],
        ["02", "고객이 고른 향으로 후속", "현장에서 고객이 고른 향과 남긴 선택에 따라 후속 메시지를 다섯 갈래로 나눴습니다."],
        ["03", "동의와 분모를 먼저 고정", "마케팅 동의를 행사 참여와 따로 묻고, 지표마다 분자와 분모를 미리 정했습니다."],
    ]
    experience_rows = [
        ["순간", "설계", "이유"],
        ["도착과 대기", "시간대별로 입장을 나누고 예상 대기 시간을 미리 알립니다. 오래 기다린 고객은 담당자가 먼저 맞이합니다.", "공개 방문 후기에서 긴 대기에 관한 문장을 확인했습니다."],
        ["향 비교", "차 안의 장면별로 향을 비교하게 하고, 고객이 고른 향을 기록합니다.", "후속 메시지를 제품 기능이 아니라 고객이 고른 향으로 보내기 위해서입니다."],
        ["향 만들기 체험(DIY)", "마감되면 대체 샘플과 우선 재예약 중 고객이 고르게 합니다.", "공개 후기에서 체험 마감과 품절 사례를 확인했습니다."],
        ["퇴장 전 동의", "행사 참여와 마케팅 수신 동의를 따로 묻습니다. 거절해도 체험과 기프트는 그대로 드립니다.", "동의한 고객에게만 후속 메시지를 보내고, 거절이 행사 경험을 해치지 않게 합니다."],
    ]
    followup_rows = [
        ["받는 고객", "메시지", "시점", "바라는 행동"],
        ["구매한 고객", "고른 향의 사용 팁과 리필 시점 안내", "D+1", "리필 구매"],
        ["상담을 요청한 고객", "매장 또는 화상 상담 예약 안내", "D+1~2", "상담 완료"],
        ["체험이 끊긴 고객", "대체 샘플 수령 또는 재예약 안내", "D+2~3", "체험 회복"],
        ["관심만 보인 고객", "고른 향과 사용 장면을 담은 구매 안내, 최대 2회", "D+1~7", "구매 또는 예약"],
        ["동의하지 않은 고객", "후속 메시지를 보내지 않습니다", "없음", "잘못된 발송 0건"],
    ]
    team_rows = [
        ["협업 부서", "먼저 확인할 것", "인계할 결과"],
        ["리테일, 현장", "시간대별 수용량, 직원 배치, 혜택, 제품 재고, 품절 시 대체 가능 범위", "정원표, 인력표, 서비스 복구 기준"],
        ["콘텐츠", "공개 전후 메시지 범위, 엠바고, 필수 제품 정보, 채널별 표현", "콘텐츠 캘린더, 메시지 승인본, 반응 태그"],
        ["디자인, 공간", "초청장, 현장 사인, 체험물, 촬영, 동의 화면의 제작 조건", "제작물 목록, 설치 위치, 최종 승인 시점"],
    ]
    segment_rows = [
        ["고객군", "가상 인원", "초대한 이유", "행사 뒤 다음 행동"],
        ["우수, 재구매 고객", "70", "기존 향 구매와 재구매 관계", "사용 팁, 리필 시점 안내"],
        ["고관여 잠재 고객", "80", "카디퓨저, 자동차 생활 관심", "차량 환경 상담, 예약"],
        ["콘텐츠 크리에이터", "30", "브랜드 적합성과 공개 범위", "엠바고 확인, 콘텐츠 반응"],
        ["휴면 VIP", "60", "과거 구매 뒤 최근 반응 없음", "반응 없으면 반복 연락 중지"],
    ]
    role_rows = [
        ["구분", "항목"],
        ["공통 기준", "고객군 코드, 행동 이름, KPI 계산식, 최소 동의 원칙"],
        ["행사마다 조정", "초청 문구, 예약 채널, 발송 시각, 혜택 재고, 직원 응대"],
        ["함께 검토", "고객군 크기, 제외 고객, 서비스 복구, 결과 해석, 다음 실험"],
    ]
    link_rows = [
        ["연결", "사례 B에 가져온 기준"],
        ["고객 가치 분석", "휴면 고객의 다음 해 재구매는 29.8%, 이탈 위험 고객은 63.2%였습니다. 업종이 달라 수치를 옮기지 않고, 휴면 VIP의 기대 반응을 따로 잡는 근거로만 씁니다."],
        ["Journey 설계도", "동의 기록 네 항목(목적, 채널, 동의 시각, 정책 버전)은 상시 재방문 Journey의 진입 필터와 같습니다."],
        ["KPI 정의서", "후속 반응률은 KPI 정의서와 같이 열람을 빼고 클릭, 회신, 상담 요청만 셉니다."],
        ["사례 A", "이 퍼널에는 비교군이 없어 관계 행동률 34.1%는 효과가 아니라 반응입니다. 효과는 초청 홀드아웃으로 잽니다."],
    ]
    decision_rows = [
        ["단계", "담당자가 확인할 질문", "남길 데이터", "다음 고객 행동"],
        ["선정", "왜 이 고객을 초대하는가?", "고객군, 선정 이유, 발송 제외", "적격 고객만 초청"],
        ["RSVP", "방문 시간과 지원 요청은?", "응답, 시간, 동반인, 언어, 접근 요청", "확정, 대기, 거절 분기"],
        ["체크인", "도착했고 얼마나 기다렸는가?", "도착, 대기 시작, 체험 시작 시각", "장기 대기 고객 호출"],
        ["체험", "선호한 향과 중단 지점은?", "향 선호, 완료와 중단 이유, 상담 요청", "샘플 또는 재예약"],
        ["동의", "선호 연락 채널은?", "목적, 채널, 동의 시각, 정책 버전", "동의 고객만 후속"],
        ["후속", "다음 결정에 필요한 정보는?", "발송, 클릭, 회신, 인계 상태", "사용 팁, 상담, 예약"],
        ["D+30", "구매, 예약, 재방문이 있었는가?", "최종 행동, 시각, 구매액, 수신 거부", "결과 기록, 빈도 조정"],
    ]
    rule_rows = [
        ["기록 원칙", "프로젝트에서 적용한 기준"],
        ["참석과 동의 분리", "행사에 왔다고 마케팅 연락에 동의한 것으로 처리하지 않음"],
        ["상태와 근거 함께 기록", "완료 표시만 두지 않고 담당자, 시각, 근거를 함께 남김"],
        ["반응 정의 고정", "메일 열람을 제외하고 클릭, 회신, 상담 요청만 후속 반응으로 계산"],
    ]
    funnel_rows = [
        ["단계", "가상 인원", "고정 분모", "가상 비율"], ["초청", "240", "선정 고객", "-"],
        ["RSVP 응답", "156", "초청 240명", "65.0%"], ["방문 확정", "132", "응답 156명", "84.6%"],
        ["실제 참석", "116", "확정 132명", "87.9%"], ["체험 완료", "104", "참석 116명", "89.7%"],
        ["마케팅 동의", "82", "참석 116명", "70.7%"], ["후속 반응", "47", "동의 82명", "57.3%"],
        ["상담, 예약, 구매", "28", "동의 82명", "34.1%"],
    ]
    missed_rows = [
        ["구간", "누락", "고객 케어와 다음 업무", "담당"],
        ["초청과 RSVP 사이", "84", "48시간 뒤 한 번 알리고 이후 미응답 종료", "CRM Manager"],
        ["응답과 확정 사이", "24", "거절, 시간 미정 구분, 대체 시간과 대기 명단 안내", "Guest Manager"],
        ["확정과 참석 사이", "16", "노쇼를 실패로 단정하지 않고 사유, 재예약 선택 확인", "Guest Manager"],
        ["참석과 체험 사이", "12", "향 만들기 체험(DIY) 마감, 대기, 시간 부족 구분, 샘플 또는 재예약 제공", "Experience Lead"],
        ["참석과 동의 사이", "34", "거절과 미확인 분리, 마케팅 후속에서 제외", "CRM & Privacy"],
        ["동의와 반응 사이", "35", "선호 채널 최대 두 번, 반응 없으면 빈도 축소", "Lifecycle CRM"],
        ["반응과 관계 행동 사이", "19", "정보 탐색, 상담 보류, 재고 요청으로 분류", "Client Care"],
    ]
    timeline_rows = [
        ["시점", "확인할 일", "남길 산출물"],
        ["T-8~6주", "목표, 고객군, KPI, 동의 기준", "CRM 브리프, 선정 규칙"],
        ["T-5~3주", "초청 여정, 초청 문구, RSVP, 혜택 재고", "초청물, 응답 현황, 대기 명단"],
        ["T-2~1주", "명단 점검, 직원 교육, 예외 상황 리허설", "현장 순서표, 담당자표"],
        ["행사 당일", "체크인, 체험, 동의, 상담 요청 실시간 인계", "현장 기록, 미처리 업무"],
        ["D+1~7일", "선호, 체험, 구매 여부별 후속", "메시지, 상담과 예약 인계"],
        ["D+30", "재방문, 구매, 수신 거절, 표본 한계 회고", "성과표, 다음 행사 실험안"],
    ]
    experiment_rows = [
        ["먼저 확인할 질문", "A안", "B안", "볼 지표"],
        ["선공개가 현장 발견감을 해치는가?", "제품 상세 공개", "세계관 티저", "참석, 체험, 상담"],
        ["체험 마감 고객에게 무엇을 제안할까?", "대체 샘플", "우선 재예약", "수락, 7일 반응, 재방문"],
        ["후속에서 무엇을 기억시킬까?", "기능 설명", "고객이 고른 향과 장면", "클릭, 상담, 예약"],
        ["행사가 없었어도 다시 왔을 고객은?", "초청", "무작위로 남긴 미초청군", "30일 증분 재방문, 증분 구매"],
    ]
    source_rows = [
        ["자료", "확인한 범위", "사용한 방식"],
        ["공식 채널", "5개 브랜드 공식 채널", "브랜드, 행사, 제품, 매장, 고객 접점 확인"],
        ["기사, 공개 후기", "관련 기사, 후기, 에디터 방문기", "대기, 마감, 품절을 현장 검증 질문으로 전환"],
    ]

    story = [
        p("CRM LOOP 기획서 2", eyebrow), p("VIP 프리뷰에서 재방문까지", h1),
        p("향 브랜드 신제품 프리뷰를 가정한 VIP 행사 기획안", h3), Spacer(1, 1.5 * mm),
        table(name_rows, [24 * mm, 154 * mm], font_size=10.2, compact=True, header=False, first_col_bold=True),
        Spacer(1, 3 * mm),
        p("누구를 왜 초대하고, 현장에서 무엇을 경험하게 하고, 행사 뒤 어떤 메시지로 다시 오게 할지 정한 기획안입니다.", lead),
        p("실제 VIP 행사를 운영한 경험은 없습니다. 공식 자료와 공개 후기를 조사해 가상 고객 운영표와 측정 기준을 만들고, 사실과 가정을 구분했습니다.", quote),
        Spacer(1, 2.5 * mm), table(snapshot_rows, [31 * mm, 75 * mm, 72 * mm], font_size=9.7, first_col_bold=True),
        Spacer(1, 5 * mm), p("자료를 읽고 제가 내린 세 가지 판단", h3),
        table(strength_rows, [14 * mm, 52 * mm, 112 * mm], font_size=9.7, header=False, first_col_bold=True),
        Spacer(1, 4 * mm), p("고객 수와 전환 결과는 모두 가상값입니다. 실제 브랜드의 고객, 매출, 행사 성과를 사용하지 않았습니다.", warning),
        PageBreak(),
        heading("01 GOAL", "30일 안에 상담, 예약, 구매로 다시 오게 합니다"),
        heading("02 AUDIENCE", "고객군마다 초대 이유와 후속 조건을 정했습니다"),
        table(segment_rows, [40 * mm, 20 * mm, 59 * mm, 59 * mm], font_size=9.4, compact=True, first_col_bold=True),
        Spacer(1, 4 * mm), heading("03 EXPERIENCE", "현장에서 무엇을 경험하게 할지 정했습니다", "고객이 머무는 순간마다 무엇을 주고, 왜 그렇게 정했는지 적었습니다."),
        table(experience_rows, [32 * mm, 80 * mm, 66 * mm], font_size=8.8, compact=True, first_col_bold=True),
        Spacer(1, 2.5 * mm), heading("04 FOLLOW-UP", "행사 뒤 누구에게 무엇을 보낼지 나눴습니다", "동의하지 않은 고객에게는 보내지 않습니다."),
        table(followup_rows, [36 * mm, 78 * mm, 22 * mm, 42 * mm], font_size=8.9, compact=True, first_col_bold=True), PageBreak(),
        heading("05 MEASUREMENT", "성과는 고정한 분모로 판단합니다", "아래 값은 계산 방법을 보여 주는 가상 결과입니다."),
        table(funnel_rows, [45 * mm, 25 * mm, 68 * mm, 40 * mm], font_size=9.5, compact=True, first_col_bold=True),
        Spacer(1, 3 * mm), p("메일 열람은 반응에서 제외합니다. 클릭, 회신, 상담 요청만 세며, 실제 집계에서는 고객 ID로 중복 행동을 제거합니다.", note),
        Spacer(1, 5 * mm), p("작은 행사에서 먼저 확인할 네 가지", h3),
        table(experiment_rows, [56 * mm, 30 * mm, 42 * mm, 50 * mm], font_size=9.2, compact=True),
        Spacer(1, 5 * mm), p("다른 사례와 이어지는 점", h3),
        table(link_rows, [36 * mm, 142 * mm], font_size=9.0, compact=True, first_col_bold=True), PageBreak(),
        heading("APPENDIX", "실행 부록", "기획을 현장에서 실행할 때 쓰는 담당자 인계, 누락 업무, 협업, 일정 기준입니다."),
        p("담당자가 단계마다 확인할 질문", h3),
        table(decision_rows, [18 * mm, 49 * mm, 65 * mm, 46 * mm], font_size=9.0, compact=True, first_col_bold=True),
        Spacer(1, 5 * mm), p("단계 사이에서 놓친 고객과 해야 할 일", h3),
        table(missed_rows, [42 * mm, 16 * mm, 80 * mm, 40 * mm], font_size=8.9, compact=True, first_col_bold=True),
        Spacer(1, 5 * mm), p("CRM 기록에서 지킨 세 가지 기준", h3),
        table(rule_rows, [35 * mm, 143 * mm], font_size=9.0, compact=True, first_col_bold=True),
        PageBreak(),
        p("팀마다 먼저 확인할 내용", h3),
        table(team_rows, [30 * mm, 86 * mm, 62 * mm], font_size=9.0, compact=True, first_col_bold=True),
        Spacer(1, 5 * mm), p("행사 8주 전부터 행사 후 30일까지", h3),
        table(timeline_rows, [27 * mm, 91 * mm, 60 * mm], font_size=9.0, compact=True, first_col_bold=True),
        Spacer(1, 5 * mm), p("공통 기준과 행사마다 바꿀 항목", h3),
        table(role_rows, [35 * mm, 143 * mm], font_size=9.0, compact=True, first_col_bold=True),
        Spacer(1, 5 * mm), p("공개자료를 사용한 기준", h3),
        table(source_rows, [31 * mm, 61 * mm, 86 * mm], font_size=9.0, compact=True, first_col_bold=True),
        Spacer(1, 3 * mm), p("실제 고객군, 시스템 필드, 보관 기간, 동의 문구는 실제로 적용할 때 법무, CRM 담당자와 확인해야 합니다. 상세 출처와 한계는 GitHub 저장소의 조사 출처 문서(RESEARCH-SOURCES.md)와 Excel의 ‘근거 및 출처’ 시트에 있습니다.", note),
    ]
    doc.build(story, onFirstPage=footer, onLaterPages=footer)


if __name__ == "__main__":
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    build_pdf()
    print(NEW_PDF)
