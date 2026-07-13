/**
 * detect-duplicate.ts — 후보 주제가 기존 콘텐츠와 중복인지 검사.
 * slug 완전일치 또는 제목 토큰 과반 중복이면 duplicate=true.
 * 사용: tsx scripts/detect-duplicate.ts "<slug>" "<title>"  → JSON 출력, 중복이면 exit 2
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { p } from "./lib.ts";

export function existingSlugs(): Set<string> {
  const slugs = new Set<string>();
  for (const cat of ["symptoms", "supplements", "conditions", "guides"]) {
    const dir = p(cat);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir))
      if (f.endsWith(".html") && f !== "index.html") slugs.add(`${cat}/${f.replace(/\.html$/, "")}`);
  }
  return slugs;
}

export function existingTitles(): string[] {
  const titles: string[] = [];
  for (const cat of ["symptoms", "supplements", "conditions", "guides"]) {
    const dir = p(cat);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".html") || f === "index.html") continue;
      const m = readFileSync(p(cat, f), "utf8").match(/<h1[^>]*>(.*?)<\/h1>/s);
      if (m) titles.push(m[1].replace(/<[^>]+>/g, "").trim());
    }
  }
  return titles;
}

const tokens = (s: string) => new Set(s.toLowerCase().replace(/[·,()]/g, " ").split(/\s+/).filter((t) => t.length > 1));

export function isDuplicate(slug: string, title: string) {
  const slugs = existingSlugs();
  const bare = slug.includes("/") ? slug.split("/").pop()! : slug;
  const slugHit = [...slugs].some((s) => s === slug || s.split("/").pop() === bare);
  const tt = tokens(title);
  let titleHit = false, best = "";
  for (const et of existingTitles()) {
    const et2 = tokens(et);
    const overlap = [...tt].filter((x) => et2.has(x)).length;
    if (tt.size && overlap / tt.size >= 0.6) { titleHit = true; best = et; break; }
  }
  return { duplicate: slugHit || titleHit, slugHit, titleHit, similarTo: best };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("detect-duplicate.ts")) {
  const [slug = "", title = ""] = process.argv.slice(2);
  const r = isDuplicate(slug, title);
  console.log(JSON.stringify(r, null, 2));
  process.exit(r.duplicate ? 2 : 0);
}
