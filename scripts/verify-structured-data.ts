/**
 * verify-structured-data.ts — 구조화 데이터 검증 테스트. 위반 시 exit 1.
 *  - 모든 JSON-LD 블록이 유효한 JSON 인지
 *  - 글(4개 카테고리)에 Article + BreadcrumbList 존재
 *  - 홈에 Organization 존재
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { p } from "./lib.ts";

const CATS = ["symptoms", "supplements", "conditions", "guides"];
const errors: string[] = [];

function ldTypes(html: string, file: string): string[] {
  const types: string[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try { const j = JSON.parse(m[1]); types.push(j["@type"]); }
    catch { errors.push(`${file}: JSON-LD 파싱 실패`); }
  }
  return types;
}

// 홈: Organization
const home = readFileSync(p("index.html"), "utf8");
if (!ldTypes(home, "index.html").includes("Organization")) errors.push("index.html: Organization 누락");

// 글: Article + BreadcrumbList
let checked = 0;
for (const cat of CATS) {
  const dir = p(cat);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".html") || f === "index.html") continue;
    checked++;
    const t = ldTypes(readFileSync(p(cat, f), "utf8"), `${cat}/${f}`);
    if (!t.includes("Article")) errors.push(`${cat}/${f}: Article 누락`);
    if (!t.includes("BreadcrumbList")) errors.push(`${cat}/${f}: BreadcrumbList 누락`);
  }
}

for (const e of errors) console.error("✗ " + e);
console.log(`verify-structured-data: 글 ${checked}개 검사, 오류 ${errors.length}건`);
process.exit(errors.length ? 1 : 0);
