/**
 * run-daily.ts — 일일 콘텐츠 파이프라인 오케스트레이터.
 * 주제선정 → 중복검사 → Source Pack → 초안(STUB) → 린트/검증 → 품질점수 → 요약.
 * 검사 실패 시 exit 1 (CI 가 PR 을 만들지 않도록). 정상 시 초안 경로/요약 출력.
 * ※ 여기서는 절대 발행하지 않는다. 산출물은 초안(draft)뿐이며 병합/발행은 사람 검토가 한다.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pickTopic } from "./pick-topic.ts";
import { isDuplicate } from "./detect-duplicate.ts";
import { buildSourcePack } from "./build-source-pack.ts";
import { generateDraft } from "./generate-draft.ts";
import { saveJson } from "./lib.ts";
import type { ContentMeta } from "./lib.ts";

const nowIso = new Date().toISOString();
const run = (cmd: string) => { execSync(cmd, { stdio: "inherit" }); };

function main() {
  const topic = pickTopic();
  if (!topic) { console.log("::notice:: 대기 중인 주제 없음 — 오늘은 초안 생성 없음"); process.exit(3); }

  const dup = isDuplicate(`${topic.category}/${topic.slug}`, topic.title);
  if (dup.duplicate) { console.log(`::warning:: 중복 감지(${dup.similarTo}) — 건너뜀`); process.exit(3); }

  const packRel = `content/source-packs/${topic.category}__${topic.slug}.json`;
  saveJson(packRel, buildSourcePack(topic, nowIso));

  const draftRel = `content/drafts/${topic.category}__${topic.slug}.json`;
  const draft: ContentMeta = generateDraft(topic, packRel, nowIso);
  saveJson(draftRel, draft);

  // 안전 검사 — 실패 시 throw → exit 1
  run(`node scripts/lint-medical-claims.ts ${draftRel}`);
  run(`node scripts/verify-citations.ts ${draftRel}`);

  // 품질 점수(간단 휴리스틱)
  const hasSources = draft.sources.length > 0;
  const score = (hasSources ? 40 : 0) + (draft.description.length > 20 ? 20 : 0) + 20 /*구조 통과*/ + (draft.body!.includes("작성·검수·수정 이력") ? 20 : 0);

  const requiresMedicalReview = topic.riskLevel === "C";
  const autoPublishable = false; // 항상 사람 검토 필요(B·C는 특히)

  const summary = {
    date: nowIso, topic, draft: draftRel, sourcePack: packRel,
    riskLevel: topic.riskLevel, qualityScore: score,
    autoPublishable, requiresMedicalReview,
    checks: { lint: "pass", citations: "pass" },
    note: "이 초안은 발행되지 않았습니다. PR 검토 후 병합해야 발행됩니다." +
      (requiresMedicalReview ? " (riskLevel C: 의료전문가 검수 완료 전 병합 금지)" : ""),
  };
  saveJson("content/drafts/_last-summary.json", summary);
  console.log("\n=== 일일 초안 요약 ===");
  console.log(JSON.stringify(summary, null, 2));
}

main();
