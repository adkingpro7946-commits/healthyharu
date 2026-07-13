# 건강한 하루 — 시니어 건강정보 사이트

50~70대가 돋보기 없이 편하게 보는 **건강정보 + 자가진단 도구** 정적 웹사이트.
증상·영양제 정보를 제공하고, 3개의 인터랙티브 도구로 재방문·체류시간을 높이며, 구글 애드센스로 수익화합니다.

## 특징
- **크고 읽기 쉬움** — 본문 18px 이상, 줄간격 넓게, 고대비, 48px 버튼
- **접근성 도구바** — 글씨 크기 3단계 / 고대비 / 음성으로 듣기(한국어)
- **건강 도구 3종** — ① 증상 자가진단(21증상) ② 영양제 추천·궁합 ③ 약·영양제 상호작용(약 12·영양제 17종)
- **200편의 건강정보 글** — 증상(63)·영양제(46)·만성질환(46)·건강생활(45)
- **사이트 내 검색** — 모든 페이지 헤더 검색창 + 전용 검색 페이지(클라이언트 인덱스)
- 프레임워크·빌드 도구 없음. 순수 HTML/CSS/Vanilla JS.

## 폴더 구조
```
index.html            메인
/tools/               건강 도구 3종
/symptoms/            증상정보 글 + 목록
/supplements/         영양제백과 글 + 목록
/conditions/          만성질환 관리 글 + 목록
/guides/              건강생활 칼럼 + 목록
/data/*.json          도구용 데이터(증상·영양제·상호작용)
/js/                  layout(공통 헤더·푸터) / accessibility / 도구 로직 / ads
/css/style.css        디자인 시스템(접근성 CSS 변수)
about·contact·privacy·terms·disclaimer.html   필수 페이지
sitemap.xml · robots.txt · ads.txt · 404.html
search.html · js/search.js · data/search-index.json   사이트 내 검색
gen_sitemap.py        sitemap 자동 생성 스크립트
gen_search_index.py   검색 인덱스 생성(글 추가 후 실행)
DEPLOY.md             배포·애드센스 안내
```

## 로컬 실행
```bash
py -m http.server 5500     # http://localhost:5500
```
(파일을 `file://`로 직접 열면 도구 데이터가 로드되지 않으니 로컬 서버로 여세요.)

## 배포 / 애드센스
[DEPLOY.md](DEPLOY.md) 참고. 요약: 도메인·이메일 교체 → Netlify 등에 폴더 업로드 →
`js/ads.js`의 `ADSENSE_CLIENT`에 pub-ID 입력 → `ads.txt` 교체.

## 원칙 (YMYL·의료 안전)
모든 정보·도구 결과는 **참고용**이며 의학적 진단이 아닙니다.
과장·단정 표현 금지, 출처·검토일 표기, 응급 시 119 안내를 전 페이지에 유지합니다.
