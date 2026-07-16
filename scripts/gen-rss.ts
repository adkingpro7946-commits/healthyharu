/**
 * gen-rss.ts — 발행(published) 상태의 콘텐츠만 모아 feed.xml 을 만든다.
 * ※ 검토·승인된 콘텐츠만 노출한다는 원칙. 현재는 contentStatus === "published" 기준.
 *    (의료 검수 워크플로가 성숙하면 reviewStatus 기준으로 강화 가능.)
 */
import { readdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { p } from "./lib.ts";
import type { ContentMeta } from "./lib.ts";

const DOMAIN = "https://healthyharu.co.kr";
const CATS = ["symptoms", "supplements", "conditions", "guides"];

const items: (ContentMeta & { url: string })[] = [];
for (const cat of CATS) {
  const dir = p("content/meta", cat);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const m: ContentMeta = JSON.parse(readFileSync(p("content/meta", cat, f), "utf8"));
    if (m.contentStatus === "published")
      items.push({ ...m, url: `${DOMAIN}/${cat}/${m.slug}` });
  }
}
items.sort((a, b) => (b.dateModified || "").localeCompare(a.dateModified || ""));
const recent = items.slice(0, 30);

const rfc822 = (d: string) => {
  const [y, mo, da] = (d || "2026-07-12").split("-").map(Number);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mons = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dow = days[new Date(Date.UTC(y, mo - 1, da)).getUTCDay()];
  return `${dow}, ${String(da).padStart(2, "0")} ${mons[mo - 1]} ${y} 00:00:00 +0900`;
};
const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0"><channel>',
  `<title>건강한 하루 — 새 건강정보</title>`,
  `<link>${DOMAIN}/</link>`,
  `<description>시니어를 위한 건강정보와 건강 도구. 발행된 최신 글.</description>`,
  `<language>ko-KR</language>`,
  ...recent.map((it) =>
    `<item><title>${esc(it.title)}</title><link>${it.url}</link>` +
    `<guid isPermaLink="true">${it.url}</guid>` +
    `<pubDate>${rfc822(it.dateModified)}</pubDate>` +
    `<description>${esc(it.description)}</description></item>`),
  "</channel></rss>",
].join("\n");

writeFileSync(p("feed.xml"), xml + "\n", "utf8");
console.log(`feed.xml 생성: 발행 글 ${items.length}개 중 최신 ${recent.length}개 수록`);
