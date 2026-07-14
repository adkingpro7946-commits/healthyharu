# 콘텐츠 모델 · 글 템플릿 · 위험도 정책 (Section 3·4·9)

## 콘텐츠 모델(frontmatter)
정적 HTML 글의 메타데이터는 `content/meta/<category>/<slug>.json` 에 보관한다(초안은 `content/drafts/<...>.json`).
스키마는 `scripts/lib.ts` 의 `ContentMeta` 이며 필드는 다음과 같다.

| 필드 | 의미 |
|---|---|
| title, slug, description | 제목·URL 슬러그·요약 |
| cluster | 상위 허브(카테고리) |
| intent | 검색 의도 |
| riskLevel | A / B / C (아래 위험도 정책) |
| datePublished, dateModified | 발행일·수정일 |
| reviewedAt, reviewDue | 검토일·다음 재검토 예정일 |
| author, reviewer | `content/people.json` 의 실존 ID (허위 금지) |
| reviewStatus | 초안 / 편집검토 / 의료검수대기 / 의료검수완료 |
| sources, claims | 참조 출처 ID 목록 / 의료 주장+근거 |
| aiAssisted | AI 보조 여부 |
| contentStatus | draft / in-review / published / archived |
| bodyHash | 본문 해시 — **실질 변경 없이 검토일만 바꾸는 것을 차단** |

- **실질 변경 없이 dateModified/reviewedAt 을 바꾸지 않는다.** `bodyHash` 가 본문과 불일치하면 린터가 빌드를 실패시킨다.
- 현재 기존 200편은 `reviewStatus: 의료검수대기`, `reviewer: ""`(의료전문가 개별 검수 미완료). 출처(sources/claims) 백필은 진행 대상.

## 글 템플릿(신규 초안 표준 순서)
1. 3줄 요약 2. 이 글이 도움이 되는 사람 3. 먼저 확인할 위험 신호 4. 쉬운 설명
5. 오늘 할 행동 6. 하지 말아야 할 행동 7. 병원에서 물어볼 질문
8. 근거 수준과 불확실성 9. 정확한 출처 10. 작성·검수·수정 이력
- **응급 위험 신호(🚨) 앞에는 광고를 배치하지 않는다.**
- `generate-draft.ts` 가 이 순서의 빈 초안을 만들고, 검토자가 Source Pack 근거로 채운다.

## 위험도 정책 (riskLevel)
- **A**: 생활습관·체크리스트 → 초안 자동 생성 가능(그래도 발행은 검토 후).
- **B**: 질환·검사·영양제 → **자동 발행 금지**, 편집 검토 필요.
- **C**: 약물 상호작용·응급 판단·복용 중단·진단 → **자동 발행 금지 + 의료전문가 검수 완료 전 병합 금지.**
- 파이프라인은 어떤 경우에도 **직접 발행하지 않으며**, 산출물은 검토 PR(초안)뿐이다.
