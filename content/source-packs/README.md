# Source Packs

일일 초안 생성에 쓰는 **출처 묶음**입니다. 초안은 반드시 해당 주제의 Source Pack **안의 출처만** 근거로 작성합니다.

- 파일명: `<category>__<slug>.json`
- `build-source-pack.ts` 가 `content/sources.json` 의 공식 출처 중 카테고리에 맞는 것을 골라 뼈대를 만듭니다.
- **자동 스크래핑은 하지 않습니다.** 각 `entries[].excerpt` 와 `verified` 는 **검토자가 원문을 직접 확인**하고 채웁니다.
- 초안의 모든 의료 주장(claims)은 이 팩의 `sourceId` 중 하나를 인용해야 하며, `lint-medical-claims` · `verify-citations` 가 이를 강제합니다.
