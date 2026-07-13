# 브랜드 흔적 감사 (Section 1)

## 검색 결과 — 저장소 오염 없음
`마케팅 인사이드 / 마케팅인사이드 / Marketing Inside / marketinginside` 전체 검색: **0건**.
title·meta description·Open Graph·Twitter Card·JSON-LD·sitemap·RSS·footer·정적 HTML 어디에도 없음.

> 참고: 운영 도메인 healthyharu.co.kr 에 한때 "마케팅 인사이드"가 보였던 것은 **다른 폴더가 잘못 업로드된 배포 사고**였고, 이 저장소(건강한 하루) 소스 자체는 오염되지 않았음. 올바른 폴더 재배포로 해결됨.
> service worker / manifest / 별도 RSS 파일: 기존엔 없었음(이번에 feed.xml 추가).

## 브랜드 통일
- `og:site_name = 건강한 하루` — 전 페이지 적용.
- 이번 변경으로 **Twitter Card** 전 페이지 추가(기존 0 → 전체).

## 대표 URL 정책 (Canonical Policy)
- **대표 도메인: `https://healthyharu.co.kr` (apex, non-www)**
- 페이지 URL 은 `.html` 확장자 포함 경로를 대표로 한다(예: `/conditions/hypertension.html`).
- 모든 페이지에 자기참조 `<link rel="canonical">` + Open Graph `og:url` 이 대표 URL 로 설정됨.
- `sitemap.xml` 은 대표 URL 만 포함(404·검색 페이지 제외).
- **중복/변형 URL → 대표 URL 301**: `www.healthyharu.co.kr/*` → `healthyharu.co.kr/*` (루트 `_redirects`). www→apex 는 Cloudflare Redirect Rule 로도 가능.

## 변경 전후 요약
| 항목 | 전 | 후 |
|---|---|---|
| Twitter Card | 없음 | 전 페이지 |
| canonical/OG | 글·주요 페이지 | + 신뢰 페이지 6종 포함 전 페이지 |
| 대표 URL 301 | 없음 | `_redirects` 로 www→apex |
| 구조화 데이터 | MedicalWebPage(글) | + Article + BreadcrumbList(글), Organization(홈) |
