/**
 * pick-topic.ts — data/topic-backlog.csv 에서 다음 주제를 고른다.
 * status=queued 이고 중복이 아닌 것 중 priority 높은 순으로 1개.
 * export pickTopic() 로 파이프라인에서 재사용, CLI 로 실행 시 JSON 출력.
 */
import { readFileSync, existsSync } from "node:fs";
import { p } from "./lib.ts";
import { isDuplicate } from "./detect-duplicate.ts";

export interface Topic {
  slug: string; title: string; category: string; cluster: string;
  riskLevel: "A" | "B" | "C"; priority: number; status: string; intent: string;
}

export function loadBacklog(): Topic[] {
  const file = p("data/topic-backlog.csv");
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/);
  const header = lines.shift()!.split(",").map((h) => h.trim());
  return lines.filter(Boolean).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: any = {};
    header.forEach((h, i) => (row[h] = cols[i] ?? ""));
    row.priority = Number(row.priority || 0);
    return row as Topic;
  });
}

export function pickTopic(): Topic | null {
  const queued = loadBacklog()
    .filter((t) => t.status === "queued")
    .sort((a, b) => b.priority - a.priority);
  for (const t of queued) {
    if (!isDuplicate(`${t.category}/${t.slug}`, t.title).duplicate) return t;
  }
  return null;
}

if (process.argv[1]?.endsWith("pick-topic.ts")) {
  const t = pickTopic();
  if (!t) { console.log(JSON.stringify({ picked: null, reason: "queued 주제 없음 또는 모두 중복" })); process.exit(3); }
  console.log(JSON.stringify(t, null, 2));
}
