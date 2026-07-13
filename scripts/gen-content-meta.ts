/**
 * gen-content-meta.ts — 기존 HTML 글에 콘텐츠 모델(frontmatter)을 부여한다.
 * content/meta/<category>/<slug>.json 을 생성. 실질 변경 없이 날짜만 바꾸지 않도록 bodyHash 를 기록한다.
 * 재실행 시 bodyHash 가 같으면 dateModified/reviewedAt 을 임의로 바꾸지 않는다.
 */
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { p, saveJson, bodyHash } from "./lib.ts";
import type { ContentMeta } from "./lib.ts";

const CATS = ["symptoms", "supplements", "conditions", "guides"] as const;
const riskByCat = (cat: string) => (cat === "guides" ? "A" : "B") as "A" | "B";
const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const field = (t: string, re: RegExp) => { const m = t.match(re); return m ? strip(m[1]) : ""; };

let made = 0, kept = 0;
for (const cat of CATS) {
  const dir = p(cat);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".html") || f === "index.html") continue;
    const slug = f.replace(/\.html$/, "");
    const html = readFileSync(p(cat, f), "utf8");
    const title = field(html, /<h1[^>]*>(.*?)<\/h1>/s) || field(html, /<title>(.*?)<\/title>/s).split("|")[0];
    const description = field(html, /<meta name="description" content="(.*?)"/s);
    const bodyM = html.match(/<div class="article-body">([\s\S]*?)<\/div>\s*<div class="related-links"/);
    const body = strip(bodyM ? bodyM[1] : html);
    const hash = bodyHash(body);

    const metaRel = `content/meta/${cat}/${slug}.json`;
    let prev: Partial<ContentMeta> = {};
    if (existsSync(p(metaRel))) prev = JSON.parse(readFileSync(p(metaRel), "utf8"));

    const unchanged = prev.bodyHash === hash;
    const meta: ContentMeta = {
      title, slug, description,
      cluster: cat,
      intent: "informational",
      riskLevel: riskByCat(cat),
      datePublished: prev.datePublished || "2026-07-12",
      dateModified: unchanged && prev.dateModified ? prev.dateModified : "2026-07-12",
      reviewedAt: prev.reviewedAt || "",           // 의료전문가 개별 검수 미완료
      reviewDue: prev.reviewDue || "2027-07-12",
      author: "editorial-team",
      reviewer: prev.reviewer || "",
      reviewStatus: (prev.reviewStatus as any) || "의료검수대기",
      sources: prev.sources || [],                 // 백필 예정
      claims: prev.claims || [],
      aiAssisted: true,
      contentStatus: "published",
      bodyHash: hash,
    };
    if (unchanged) kept++; else made++;
    saveJson(metaRel, meta);
  }
}
console.log(`gen-content-meta: 생성/갱신 ${made}건, 변경없음 유지 ${kept}건`);
