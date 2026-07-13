/**
 * lint-medical-claims.ts — 의료 안전 린터.
 * 아래 위반이 하나라도 있으면 exit 1 로 빌드를 실패시킨다.
 *  - 출처 없는 의료 수치/주장
 *  - 존재하지 않는 source ID
 *  - 복용 시작·중단 직접 지시
 *  - 확정 진단 표현
 *  - 영양제를 치료제로 표현(완치·특효)
 *  - 허위 작성자/검수자
 *  - 실제 변경 없이 검토 날짜만 수정(bodyHash 불일치)
 *
 * 사용: npm run lint:claims  [파일경로...]  (인자 없으면 content/drafts/*.json 전체)
 */
import { readFileSync } from "node:fs";
import {
  listDrafts, sourceIds, authorIds, reviewerIds,
  bodyHash, CLAIM_REQUIRED, FORBIDDEN, p,
} from "./lib.ts";
import type { ContentMeta, Finding } from "./lib.ts";

const files = process.argv.slice(2).length ? process.argv.slice(2) : listDrafts();
const SRC = sourceIds(), AUTH = authorIds(), REV = reviewerIds();
const findings: Finding[] = [];
const err = (rule: string, file: string, detail: string) =>
  findings.push({ level: "error", rule, file, detail });

for (const rel of files) {
  const file = rel.replace(/\\/g, "/").replace(p("") + "/", "");
  let meta: ContentMeta;
  try { meta = JSON.parse(readFileSync(rel, "utf8")); }
  catch { err("parse", file, "JSON 파싱 실패"); continue; }
  const body = meta.body ?? "";

  // 1) 작성자/검수자 실존 확인
  if (!meta.author || !AUTH.has(meta.author))
    err("허위작성자", file, `author '${meta.author}' 가 people.json authors 에 없음`);
  if (meta.reviewer && !REV.has(meta.reviewer))
    err("허위검수자", file, `reviewer '${meta.reviewer}' 가 people.json reviewers 에 없음`);
  if (meta.reviewStatus === "의료검수완료" && (!meta.reviewer || !REV.has(meta.reviewer)))
    err("검수상태위조", file, "의료검수완료인데 실존 검수자가 없음");

  // 2) claim.source 존재
  for (const c of meta.claims ?? [])
    if (!SRC.has(c.source)) err("없는source", file, `claim '${c.id}' 의 source '${c.source}' 미등록`);

  // 3) 출처 필요한 의료 주장인데 근거 없음
  const triggered = CLAIM_REQUIRED.filter((c) => c.re.test(body)).map((c) => c.key);
  if (triggered.length && (meta.claims ?? []).length === 0)
    err("출처없는수치", file, `의료 주장(${triggered.join(", ")}) 있는데 claims 가 비어 있음`);

  // 4) 금지 표현
  for (const f of FORBIDDEN) {
    const m = body.match(f.re);
    if (m) err(f.key, file, `${f.why} — "${m[0]}"`);
  }

  // 5) 검토 날짜-무변경 위조 방지
  if (meta.bodyHash && meta.bodyHash !== bodyHash(body))
    err("검토날짜위조", file, "bodyHash 가 본문과 불일치(본문 변경 없이 검토일만 바꾼 정황). 실제 변경 시 bodyHash 갱신 필요");
}

for (const f of findings) console.error(`✗ [${f.rule}] ${f.file} — ${f.detail}`);
console.log(files.length
  ? `\nlint-medical-claims: ${files.length}개 검사, 오류 ${findings.length}건`
  : "lint-medical-claims: 검사할 초안 없음(content/drafts 비어 있음) → 통과");
process.exit(findings.length ? 1 : 0);
