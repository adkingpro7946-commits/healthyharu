/**
 * verify-citations.ts — 인용 무결성 검증. 위반 시 exit 1.
 *  - 모든 claim.source 가 sources.json 에 존재
 *  - meta.sources 의 모든 ID 가 sources.json 에 존재
 *  - riskLevel B/C 는 claims 가 최소 1개 이상(근거 필수)
 *  - claim.source 가 meta.sources 에도 있는지(일관성, warn)
 *
 * 사용: npm run verify:citations  [파일경로...]  (없으면 content/drafts/*.json 전체)
 */
import { readFileSync } from "node:fs";
import { listDrafts, sourceIds, p } from "./lib.ts";
import type { ContentMeta, Finding } from "./lib.ts";

const files = process.argv.slice(2).length ? process.argv.slice(2) : listDrafts();
const SRC = sourceIds();
const findings: Finding[] = [];
const add = (level: "error" | "warn", rule: string, file: string, detail: string) =>
  findings.push({ level, rule, file, detail });

for (const rel of files) {
  const file = rel.replace(/\\/g, "/").replace(p("") + "/", "");
  let meta: ContentMeta;
  try { meta = JSON.parse(readFileSync(rel, "utf8")); }
  catch { add("error", "parse", file, "JSON 파싱 실패"); continue; }

  for (const id of meta.sources ?? [])
    if (!SRC.has(id)) add("error", "없는source", file, `sources 의 '${id}' 미등록`);

  const claimSources = new Set<string>();
  for (const c of meta.claims ?? []) {
    claimSources.add(c.source);
    if (!SRC.has(c.source)) add("error", "없는source", file, `claim '${c.id}' source '${c.source}' 미등록`);
    if (!(meta.sources ?? []).includes(c.source))
      add("warn", "sources불일치", file, `claim source '${c.source}' 가 meta.sources 에 없음`);
  }

  if ((meta.riskLevel === "B" || meta.riskLevel === "C") && (meta.claims ?? []).length === 0)
    add("error", "근거부족", file, `riskLevel ${meta.riskLevel} 는 최소 1개 이상의 출처 있는 claim 필요`);
}

const errors = findings.filter((f) => f.level === "error");
for (const f of findings) (f.level === "error" ? console.error : console.warn)(`${f.level === "error" ? "✗" : "△"} [${f.rule}] ${f.file} — ${f.detail}`);
console.log(`\nverify-citations: ${files.length}개 검사, 오류 ${errors.length}건 / 경고 ${findings.length - errors.length}건`);
process.exit(errors.length ? 1 : 0);
