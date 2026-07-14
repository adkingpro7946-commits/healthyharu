/**
 * generate-draft.ts — 초안 생성기 (현재 STUB).
 * ⚠️ 지금은 LLM 을 호출하지 않는다. Source Pack 만 근거로 하는 "구조화된 빈 초안"을 만들어
 *    검토 PR 로 넘긴다. 근거 없는 의료 수치를 지어내지 않으므로 린터를 통과한다.
 *
 * 실제 생성 연결 지점:
 *   process.env.ANTHROPIC_API_KEY 가 있으면 여기서 Claude API 를 호출해
 *   "Source Pack 안의 출처만 사용" 프롬프트로 본문과 claims 를 채우도록 확장한다.
 *   (검토자 없는 자동 발행 금지 원칙은 유지: contentStatus 는 항상 draft.)
 */
import { readFileSync } from "node:fs";
import { saveJson, bodyHash, p } from "./lib.ts";
import type { ContentMeta } from "./lib.ts";
import type { Topic } from "./pick-topic.ts";

const SECTIONS = [
  "## 3줄 요약",
  "## 이 글이 도움이 되는 사람",
  "## 먼저 확인할 위험 신호",
  "## 쉬운 설명",
  "## 오늘 할 행동",
  "## 하지 말아야 할 행동",
  "## 병원에서 물어볼 질문",
  "## 근거 수준과 불확실성",
  "## 정확한 출처",
  "## 작성·검수·수정 이력",
];

export function generateDraft(topic: Topic, sourcePackPath: string, nowIso: string): ContentMeta {
  const pack = JSON.parse(readFileSync(p(sourcePackPath), "utf8"));
  const sources: string[] = (pack.entries ?? []).map((e: any) => e.sourceId);

  // 근거를 지어내지 않는다. 본문은 구조 + 검토 지침만 담은 초안.
  const body = [
    `> ⚠️ 자동 생성 초안 — 편집·의료 검토 전. 아래 각 항목을 Source Pack(${sourcePackPath})의 출처로만 채운다.`,
    "",
    ...SECTIONS.map((h) =>
      `${h}\n(작성 예정 — 검토자가 Source Pack 근거로 작성. 모든 의학적 서술은 claim 으로 출처를 인용한다.)\n`,
    ),
  ].join("\n");

  const meta: ContentMeta = {
    title: topic.title,
    slug: topic.slug,
    description: `${topic.title} — 시니어 눈높이로 쉽게 정리한 참고용 건강정보(검토 전 초안).`,
    cluster: topic.cluster,
    intent: topic.intent || "informational",
    riskLevel: topic.riskLevel,
    datePublished: "",             // 발행(병합) 시점에 기입
    dateModified: "",
    reviewedAt: "",                // 검토 전
    reviewDue: "",
    author: "editorial-team",
    reviewer: "",                  // 검수자 없음
    reviewStatus: "초안",
    sources,
    claims: [],                    // 검토 단계에서 근거와 함께 채움
    aiAssisted: true,
    contentStatus: "draft",        // 절대 자동 published 아님
    body,
  };
  meta.bodyHash = bodyHash(body);
  return meta;
}

if (process.argv[1]?.endsWith("generate-draft.ts")) {
  const [packPath, nowIso = "1970-01-01T00:00:00Z"] = process.argv.slice(2);
  if (!packPath) { console.error("사용: tsx scripts/generate-draft.ts <sourcePackPath> <nowIso>"); process.exit(1); }
  const pack = JSON.parse(readFileSync(p(packPath), "utf8"));
  const topic: Topic = { slug: pack.slug, title: pack.title, category: pack.category, cluster: pack.category, riskLevel: pack.riskLevel, priority: 0, status: "queued", intent: "informational" };
  const meta = generateDraft(topic, packPath, nowIso);
  const out = `content/drafts/${pack.category}__${pack.slug}.json`;
  saveJson(out, meta);
  console.log(`초안 생성(STUB): ${out}`);
}
