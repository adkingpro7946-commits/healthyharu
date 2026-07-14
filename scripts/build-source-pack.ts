/**
 * build-source-pack.ts — 주제에 맞는 공식 출처를 모아 Source Pack 을 만든다.
 * 초안 생성은 반드시 이 Source Pack 안의 출처만 사용한다.
 * ※ 자동 스크래핑은 하지 않는다(저작권·정확성). 각 excerpt 는 검토자가 원문에서 확인·기입한다.
 */
import { loadJson, saveJson } from "./lib.ts";
import type { Topic as T } from "./pick-topic.ts";

export interface SourcePackEntry { sourceId: string; url: string; note: string; excerpt: string; verified: boolean; }
export interface SourcePack {
  slug: string; title: string; category: string; riskLevel: string;
  createdAt: string; entries: SourcePackEntry[]; instructions: string;
}

// 카테고리별 우선 참고 출처 매핑
const PREFERRED: Record<string, string[]> = {
  symptoms: ["KDCA-HEALTH", "AMC-ENCY", "SNUH-ENCY"],
  conditions: ["KDCA-HEALTH", "KMA", "AMC-ENCY"],
  supplements: ["MFDS", "MFDS-DRUGSAFE", "KDCA-HEALTH"],
  guides: ["KDCA-HEALTH", "NHIS", "KDCA"],
};

export function buildSourcePack(topic: T, nowIso: string): SourcePack {
  const all = loadJson<any>("content/sources.json").sources as any[];
  const ids = PREFERRED[topic.category] ?? ["KDCA-HEALTH"];
  const entries: SourcePackEntry[] = ids.map((id) => {
    const s = all.find((x) => x.id === id);
    return { sourceId: id, url: s?.url ?? "", note: `${s?.publisher ?? ""} — ${topic.title} 관련 항목 확인`, excerpt: "", verified: false };
  });
  return {
    slug: topic.slug, title: topic.title, category: topic.category, riskLevel: topic.riskLevel,
    createdAt: nowIso, entries,
    instructions:
      "초안은 이 Source Pack 의 출처만 근거로 작성한다. 모든 의료 수치·위험·효능·부작용·복용량·상호작용·응급기준·검사수치 주장에는 이 중 하나의 sourceId 를 claim 으로 붙인다. excerpt/verified 는 검토자가 원문 확인 후 채운다.",
  };
}

if (process.argv[1]?.endsWith("build-source-pack.ts")) {
  // 단독 실행: pick-topic 결과로 팩 생성 (타임스탬프는 인자로 받음)
  const nowIso = process.argv[2] || "1970-01-01T00:00:00Z";
  import("./pick-topic.ts").then(({ pickTopic }) => {
    const t = pickTopic();
    if (!t) { console.error("주제 없음"); process.exit(3); }
    const pack = buildSourcePack(t, nowIso);
    saveJson(`content/source-packs/${t.category}__${t.slug}.json`, pack);
    console.log(`source-pack 생성: content/source-packs/${t.category}__${t.slug}.json`);
  });
}
