# PR: 신뢰도·콘텐츠 품질·SEO·일일 콘텐츠 자동화

브랜치 `feat/trust-content-ops`. **목표: 매일 무조건 발행이 아니라, 공식 근거 기반 초안을 매일 만들어 검수 가능한 PR로 전달.** 기존 접근성 기능(큰 글씨·고대비·음성읽기·다크모드)과 디자인은 유지, 신뢰도·운영구조를 우선 개선.

## 1. 주요 변경 (요약)
- **브랜드 감사**: 마케팅 흔적 0건 확인, 대표 URL 정책 확정, www→apex 301(`_redirects`), Twitter Card 전 페이지. → `docs/brand-audit.md`
- **신뢰 페이지 7종**: about(기존) + `authors` `editorial-policy` `source-policy` `medical-review-policy` `corrections` `privacy-health-tools`. 허위 작성자·검수자 없음, "의료전문가 개별 검수 미완료" 명시. 푸터에 링크.
- **콘텐츠 모델**: 200편에 `content/meta/**` frontmatter 부여(검토상태·bodyHash 포함). → `docs/content-model.md`
- **의료 안전 린터**: `lint-medical-claims` `verify-citations` — 출처 없는 수치·없는 source ID·복용 시작/중단 지시·확정 진단·영양제 치료제화·허위 작성자/검수자·검토일 위조 시 빌드 실패.
- **건강 도구**: 입력값 브라우저 내 처리(저장 없음) 감사·명시, 각 도구에 목적/범위/한계/출처/버전/갱신일/개인정보/응급/면책 **정적 고지 블록**(no-JS). 명칭 변경: 자가진단 → **증상 체크·진료 안내**, 영양제 추천 → **영양정보 탐색**.
- **구조화 데이터**: 홈 Organization, 글 Article + BreadcrumbList, author URL→/authors.html. 검증 테스트 `verify-structured-data`.
- **검색 발견성**: sitemap 대표 URL만, `feed.xml`(발행 글만), 운영 환경에서 **빈 광고 자리 미표시**(`ads.js`).
- **일일 자동화**: `scripts/*` + `.github/workflows/daily-content.yml`(매일 05:30 KST). 초안 생성은 현재 **STUB**(근거 날조 방지). A만 초안 생성 대상, B·C 자동발행 금지, C는 의료검수 완료 전 병합 금지.

## 2. 발견한 문제와 위험도
| 문제 | 위험도 | 조치 |
|---|---|---|
| 배포 사고로 타 사이트가 도메인에 노출된 적 있음 | 높음 | 소스는 무오염 확인, 재배포로 해결, 대표 URL/redirect 정비 |
| 기존 200편 출처(claims) 미기입 | 중 | 콘텐츠 모델·린터 도입, 백필은 수동 검수 항목 |
| 의료전문가 검수 부재 | 중(YMYL) | 정직 고지, B·C 발행 게이트, C 병합 차단 규칙 |
| 빈 광고 자리 노출 | 하 | 운영 환경 미표시 처리 |

## 3. 자동화 흐름 (매일 05:30 KST)
```
pick-topic(백로그)
  → detect-duplicate(기존 글과 중복 검사)
  → build-source-pack(공식 출처 묶음)
  → generate-draft [STUB] (Source Pack만 사용, 근거 없는 수치 미생성)
  → lint-medical-claims  ─┐ 하나라도 실패 시 PR 안 만듦(빌드 실패)
  → verify-citations     ─┘
  → 품질 점수 → 새 브랜치 + PR 생성(라벨 risk-A/B/C, needs-review)
  → 검토 알림(텔레그램/이메일)  ※사람 검토·병합 전까지 발행 안 됨
```

## 4. 환경변수 (모두 선택 — 없어도 STUB 동작)
`.env.example` 참고. **시크릿은 커밋 금지**, GitHub Actions Secrets 로 주입.
- `ANTHROPIC_API_KEY` — 실제 초안 생성 연결 시(현재 STUB이라 불필요)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — 검토 알림(텔레그램)
- `REVIEW_EMAIL_TO` — 이메일 수신자

## 5. 로컬 실행
```bash
node --version            # 22.18+ 또는 24 (네이티브 TS 실행)
npm run gen:meta          # 글 메타 생성/동기화
npm run daily             # 주제→초안→린트/검증(발행 아님)
npm run check             # lint:claims + verify:citations + verify:sd
npm run gen:rss           # feed.xml 생성
py gen_sitemap.py         # sitemap 재생성 (도메인 상수)
py gen_search_index.py    # 검색 인덱스 재생성
python -m http.server 5500  # 미리보기 (ads=preview 로 광고자리 표시)
```

## 6. 배포
- 정적 사이트: Cloudflare Pages 직접 업로드 또는 GitHub 연동(권장). GitHub 연동 시 **main 병합 → 자동 배포**.
- `_redirects` 는 Cloudflare Pages 가 인식(www→apex 301).
- 데이터/스크립트/콘텐츠 메타는 사이트 동작에 영향 없음(정적 페이지는 그대로 서빙).

## 7. 되돌리기(Rollback)
- 이 브랜치는 `main` 에 병합 전이므로 **미병합 상태로 두면 원상태**.
- 병합 후 문제 시: `git revert <merge-commit>` 또는 이전 배포로 Cloudflare Pages 롤백.
- 자동화만 끄려면: `.github/workflows/daily-content.yml` 삭제 또는 schedule 주석 처리.

## 8. 테스트 결과
- `lint-medical-claims` 음성 테스트: 허위검수자·검수위조·없는source·복용중단·복용시작·확정진단·치료제표현·검토일위조 **8종 모두 차단(exit 1)**. 정상 스텁 통과(exit 0).
- `verify-citations`: 없는 source·근거부족 차단.
- `verify-structured-data`: 글 200편 Article+BreadcrumbList, 홈 Organization **0 오류**.
- `run-daily`: A 주제(자외선 차단) 초안 생성 → 린트/검증 통과, 품질 100, autoPublishable=false.
- 링크 검사: 221개 HTML **깨진 링크 0**. sitemap 219 URL(대표만). feed.xml 최신 30편.

## 9. 남은 수동 검수 항목
- [ ] 기존 200편 글에 **출처(claims) 백필** 및 편집/의료 검토 → reviewStatus 갱신
- [ ] **의료전문가 검수자 확보** 후 `content/people.json` reviewers 등재(현재 비어 있음)
- [ ] 기존 200편을 **글 템플릿(10단계 순서)** 로 점진 이관
- [ ] 실제 초안 생성 연결(`ANTHROPIC_API_KEY`) 또는 STUB 유지 결정
- [ ] GitHub 저장소 생성 + Cloudflare Pages Git 연동 + Actions Secrets 설정
- [ ] C 등급 병합 차단을 위한 **브랜치 보호 규칙 / CODEOWNERS**(GitHub 설정)
