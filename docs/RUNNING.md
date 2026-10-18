# 실행과 검사

[프로젝트 소개로 돌아가기](README.md)

## 로컬 실행

Node.js 22 이상에서 저장소 최상위 폴더의 터미널에 입력합니다.

```sh
npm ci
npm start
```

터미널에 표시된 주소를 브라우저에서 엽니다. 서울시 데이터 연결에 필요한 API 키(외부 서비스 인증값)는 `.env.example`을 참고해 로컬 `.env`에 넣습니다. `.env`는 Git 추적에서 제외합니다.

## 자동 검사

```sh
npm test
npm run build
node verify-worker.mjs
```

- `npm test`: 고객 단계, 계산식, 누락 업무와 출처 표시를 확인합니다.
- `npm run build`: 배포할 파일을 만듭니다.
- `node verify-worker.mjs`: 화면 파일과 API 경로를 확인합니다.

## 운영 화면 접근

소유자 전용 웹 화면은 외부 방문자에게 공개되어 있지 않습니다. 제출에는 README의 PDF, Excel과 GitHub 주소를 사용합니다.

## 저장소 구조

| 위치 | 내용 |
|---|---|
| `public/` | 웹 화면과 실행 코드 |
| `public/downloads/` | PDF와 Excel |
| `data/` | 서울시 장소 자료 |
| `tests/` | 자동 검사 |
| `PROJECT-PLAN.md` | 고객군, 행사 일정과 측정 기준 |
| `RESEARCH-SOURCES.md` | 조사 자료와 출처 |
