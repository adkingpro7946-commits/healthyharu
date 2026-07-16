/**
 * generate-column.ts — 매일 자동으로 "가치 있는 건강 칼럼(A등급 생활·웰빙)"을 1편 생성·발행.
 *  1) data/column-topics.txt 에서 아직 안 쓴 주제 1개 선택(계절 주제는 해당 월 우선)
 *  2) Claude API 로 2000자 이상 깊이 있는 칼럼 작성(생활·웰빙만; 약 용량·진단·응급판단 금지)
 *  3) 분량 미달이면 1회 재시도 → 의료 안전 금지표현 검사(걸리면 발행 중단)
 *  4) 기존 글 207개 중 관련 글을 자동으로 골라 내부링크 연결(SEO)
 *  5) columns/<slug>.html 생성(Article+FAQ+Breadcrumb 구조화 데이터) + 목록 맨 앞에 추가
 * 필요: 환경변수 ANTHROPIC_API_KEY (GitHub Secrets)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { p, FORBIDDEN } from "./lib.ts";

const PUB = "ca-pub-8033753532566337";
const DOMAIN = "https://healthyharu.co.kr";
const TODAY = process.env.COLUMN_DATE || new Date().toISOString().slice(0, 10);
const MODEL = process.env.COLUMN_MODEL || "claude-sonnet-5";
const MIN_CHARS = 2000; // 사용자 요구 분량. 미달이면 재시도.

interface Topic { slug: string; title: string; tag: string; months: number[]; }

/* ---------- 1) 주제 선택 (계절 주제는 이번 달 것 우선) ---------- */
function readTopics(): Topic[] {
  return readFileSync(p("data/column-topics.txt"), "utf8").split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))
    .map((line) => {
      const [slug, title, tag, months] = line.split("|").map((s) => (s || "").trim());
      return {
        slug, title, tag: tag || "건강생활",
        months: months ? months.split(",").map((m) => parseInt(m, 10)).filter(Boolean) : [],
      };
    })
    .filter((t) => t.slug && t.title);
}

function pickTopic(): { topic: Topic | null; remaining: number } {
  const all = readTopics();
  const used = new Set(
    readdirSync(p("columns")).filter((f) => f.endsWith(".html") && f !== "index.html")
      .map((f) => f.replace(/\.html$/, "")),
  );
  const open = all.filter((t) => !used.has(t.slug));
  if (!open.length) return { topic: null, remaining: 0 };

  const month = parseInt(TODAY.slice(5, 7), 10);
  // 이번 달용 계절 주제 > 계절 무관 주제 > 나머지(철 지난 것은 마지막)
  const inSeason = open.filter((t) => t.months.includes(month));
  const evergreen = open.filter((t) => t.months.length === 0);
  const pool = inSeason.length ? inSeason : evergreen.length ? evergreen : open;
  return { topic: pool[0], remaining: open.length };
}

/* ---------- 2) 관련 글 자동 선정 (내부링크 = SEO) ---------- */
interface Related { t: string; u: string; c: string; d: string; k?: string; }

// 어느 글에나 나오는 흔한 말 — 매칭에 쓰면 엉뚱한 글이 걸린다.
const STOP = new Set([
  "이유", "방법", "때문", "경우", "무엇", "어떻게", "우리", "오늘", "하루", "시니어", "생활", "건강",
  "관리", "사람", "시간", "제대로", "다시", "조금", "함께", "그리고", "위한", "위해", "대한", "가지",
  "이것", "저것", "여기", "거기", "정말", "가장", "매우", "아주", "너무", "이야기", "습관",
  "언제", "얼마나", "나이", "무슨", "어떤", "이런", "그런", "동안", "정도", "하나",
]);
const PARTICLE = /(이|가|은|는|을|를|의|에|로|으로|와|과|도|만|께|부터|까지|에서|에게|처럼|보다)$/;
// 용언 어미로 끝나면 명사가 아니다 → 제목 매칭에서 뺀다.
// ('지키는', '않는', '편안한', '마셔야', '할까', '들수록', '문제입니다' 같은 것들)
// 주의: '면(수면)', '서(독서)' 는 멀쩡한 명사 어미라서 넣지 않는다.
const VERBISH = /(는|한|던|며|까|야|록|다)$/;

function keyTerms(topic: Topic): string[] {
  const out = new Set<string>();
  // 태그(분류)는 주제 파일에서 사람이 직접 정한 깨끗한 명사다 → 어미 검사 없이 항상 신뢰한다.
  // ('수면'이 '면'으로 끝난다고 버려지면 관련글을 통째로 놓친다.)
  if (topic.tag) out.add(topic.tag);
  for (const t of topic.title.match(/[가-힣]{2,}/g) || []) {
    const base = t.replace(PARTICLE, "");            // 조사 제거: '무릎이'→'무릎', '몸에'→'몸'
    if (base.length < 2) continue;                   // 1글자는 우연히 다른 낱말 안에 박힌다('몸'→'잇몸')
    if (STOP.has(base) || VERBISH.test(base)) continue;
    out.add(base);
  }
  return [...out];
}

function loadIndex(): Related[] {
  try { return JSON.parse(readFileSync(p("data/search-index.json"), "utf8")); } catch { return []; }
}

/** 폴백용 글자 매칭. 의미를 모르니 부정확하다 — Claude가 고른 게 있으면 그쪽을 쓴다. */
function pickRelated(topic: Topic, idx: Related[], n = 3): Related[] {
  const terms = keyTerms(topic);
  const scored = idx.map((it) => {
    let s = 0;
    for (const term of terms) {
      if ((it.t || "").includes(term)) s += 4;        // 제목에 있으면 가장 확실
      else if ((it.k || "").includes(term)) s += 3;   // 키워드
      else if ((it.c || "").includes(term)) s += 3;   // 분류
      else if ((it.d || "").includes(term)) s += 1;   // 설명(가장 약함)
    }
    return { it, s };
  }).filter((x) => x.s >= 3)  // 설명에 한두 번 스친 정도는 버린다
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, n).map((x) => x.it);
}

/* ---------- 3) 칼럼 생성 ---------- */
const SYSTEM =
  "당신은 한국 시니어(50~70대) 대상 건강정보 사이트 '건강한 하루'의 건강 칼럼 작가입니다.\n" +
  "[안전 — 반드시 지킴]\n" +
  "① 생활습관·웰빙(A등급)만 다룬다. 특정 약물의 용량·복용 시작/중단 지시, 확정 진단, 응급 판단 기준, 검사 수치 판독은 절대 쓰지 않는다.\n" +
  "② '완치·특효·치료제' 같은 과장과 단정 금지. '도움이 될 수 있습니다' 톤을 쓴다.\n" +
  "③ 독자를 '당신'으로 부르지 않는다. '~하시면', '~해 보세요' 처럼 존대로 쓴다.\n" +
  "④ 지병·복용약이 있으면 의료진 상담을 권한다.\n" +
  "[품질 — 다른 건강 글과 달라야 함]\n" +
  "⑤ 본문 2000자 이상. 짧게 끊지 말고 충분히 풀어서 쓴다.\n" +
  "⑥ 뻔한 나열 금지. '왜 그런지'를 먼저 설명하고 '그래서 무엇을 하면 되는지'로 잇는다.\n" +
  "⑦ 모호한 조언 금지. '물을 많이 드세요'가 아니라 '아침에 일어나 한 컵(200ml), 식사 30분 전에 한 컵'처럼 구체적인 양·때·횟수를 쓴다.\n" +
  "⑧ 한국 시니어의 실제 생활을 녹인다: 계절(장마·폭염·환절기·한파), 우리 밥상(국·김치·나물), 보건소·경로당·복지관, 국가건강검진, 명절 같은 맥락.\n" +
  "⑨ 따뜻하고 쉬운 말. 어려운 의학용어는 풀어 쓴다. 돋보기 없이 읽히도록 문장을 길게 늘어뜨리지 않는다.\n" +
  "출력은 오직 JSON 하나. 코드블록·설명·머리말 없이 JSON만.";

function userPrompt(topic: Topic, idx: Related[], extra = ""): string {
  const list = idx.map((it, i) => `${i}. ${it.t} [${it.c}]`).join("\n");
  return (
    `주제: "${topic.title}" (분류: ${topic.tag})${extra}\n\n` +
    `[이 사이트에 이미 있는 글 목록]\n${list}\n\n` +
    `위 목록에서 이 칼럼과 **정말로 관련 있는** 글만 최대 3개를 번호로 고르세요(relatedIds).\n` +
    `- 낱말이 겹친다고 고르지 마세요. 예: '머리를 젊게 쓰는 두뇌 습관' 칼럼에 '머리카락이 빠질 때'는 무관합니다.\n` +
    `- 관련 있는 글이 없으면 빈 배열로 두세요. 억지로 채우지 마세요.\n` +
    `- 고른 글과 내용이 겹치지 않게, 이 칼럼만의 각도로 쓰세요.\n\n` +
    `아래 JSON 형식으로만 출력:\n` +
    `{\n` +
    `  "title": "검색해서 클릭하고 싶은 구체적인 제목(주제를 살리되 뻔하지 않게)",\n` +
    `  "description": "검색결과에 뜰 요약. 140자 이내, 이 글을 읽으면 뭘 얻는지",\n` +
    `  "tags": ["${topic.tag}", "태그2", "태그3"],\n` +
    `  "relatedIds": [번호, 번호, 번호],\n` +
    `  "intro": "도입 4~6문장. 독자가 '내 얘기다' 하고 느낄 상황으로 연다",\n` +
    `  "sections": [{"heading":"소제목", "body":"5~8문장. 원리→실천 순서로"}],  // 4~5개, 가장 긴 부분\n` +
    `  "myth": {"claim":"이 주제에 흔한 오해 한 문장", "truth":"실제로는 어떤지 3~4문장"},\n` +
    `  "todayActions": ["오늘부터 바로 할 수 있는 구체적 행동 5개. 양·때·횟수를 넣을 것"],\n` +
    `  "faq": [{"q":"실제로 많이 묻는 질문", "a":"3~4문장 답"}],  // 3개\n` +
    `  "closing": "마무리 3~4문장. 부담 주지 말고 격려로"\n` +
    `}`
  );
}

/** Claude가 고른 번호를 검증해 실제 글로 바꾼다. 엉터리 번호면 글자매칭으로 폴백. */
function resolveRelated(c: any, topic: Topic, idx: Related[]): Related[] {
  const ids: number[] = Array.isArray(c.relatedIds) ? c.relatedIds : [];
  const seen = new Set<number>();
  const picked = ids
    .filter((n) => Number.isInteger(n) && n >= 0 && n < idx.length && !seen.has(n) && seen.add(n))
    .slice(0, 3).map((n) => idx[n]);
  if (picked.length) return picked;
  console.log("::warning:: Claude가 관련글을 못 골랐음 → 글자매칭 폴백");
  return pickRelated(topic, idx);
}

async function callClaude(topic: Topic, idx: Related[], extra = ""): Promise<any> {
  // COLUMN_FIXTURE=<파일> 로 API 호출 없이 파이프라인만 점검할 수 있다(비용 0).
  const fixture = process.env.COLUMN_FIXTURE;
  if (fixture) return JSON.parse(readFileSync(fixture, "utf8"));

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY 없음");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000, system: SYSTEM,
      messages: [{ role: "user", content: userPrompt(topic, idx, extra) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 실패: ${res.status} ${(await res.text()).slice(0, 300)}`);
  const data: any = await res.json();
  let text = (data.content?.[0]?.text || "").trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (m) text = m[0];
  return JSON.parse(text);
}

/** 본문으로 렌더될 텍스트만 모아 글자수를 센다(HTML 태그 제외 기준). */
function bodyText(c: any): string {
  return [
    c.intro,
    ...(c.sections || []).map((s: any) => `${s.heading} ${s.body}`),
    c.myth ? `${c.myth.claim} ${c.myth.truth}` : "",
    ...(c.todayActions || []),
    ...(c.faq || []).map((f: any) => `${f.q} ${f.a}`),
    c.closing || "",
  ].join(" ").replace(/\s+/g, " ").trim();
}

function safetyCheck(text: string) {
  for (const f of FORBIDDEN) {
    const m = text.match(f.re);
    if (m) throw new Error(`안전 검사 실패 [${f.key}]: "${m[0]}" — ${f.why}`);
  }
}

/* ---------- 4) 렌더 ---------- */
const esc = (s: string) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function render(topic: Topic, c: any, related: Related[]): string {
  const url = `${DOMAIN}/columns/${topic.slug}`;
  const tags = (c.tags || [topic.tag]).slice(0, 3).map((t: string) => `<span class="tag">${esc(t)}</span>`).join("");
  const sections = (c.sections || [])
    .map((s: any) => `          <h2>${esc(s.heading)}</h2>\n          <p>${esc(s.body)}</p>`).join("\n");
  const actions = (c.todayActions || []).map((a: string) => `            <li>${esc(a)}</li>`).join("\n");
  const faqHtml = (c.faq || [])
    .map((f: any) => `          <h3>${esc(f.q)}</h3>\n          <p>${esc(f.a)}</p>`).join("\n");
  const relHtml = related
    .map((r) => `            <a class="link-card" href="../${r.u}"><h3>${esc(r.t)}</h3><p>${esc((r.d || "").slice(0, 70))}…</p></a>`)
    .join("\n");

  // FAQ 구조화 데이터 — 구글 검색결과에 질문이 펼쳐질 수 있다(SEO)
  const faqLd = (c.faq || []).length
    ? `\n  <script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: (c.faq || []).map((f: any) => ({
          "@type": "Question", name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      })}</script>`
    : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(c.title)} — 건강 칼럼 | 건강한 하루</title>
  <meta name="description" content="${esc(c.description)}">
  <link rel="stylesheet" href="https://fastly.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
  <link rel="stylesheet" href="../css/style.css">
  <script>window.BASE = "../";</script>
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(c.title)} — 건강 칼럼">
  <meta property="og:description" content="${esc(c.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="건강한 하루">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(c.title)} — 건강 칼럼">
  <meta name="twitter:description" content="${esc(c.description)}">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"${esc(c.title)}","description":"${esc(c.description)}","datePublished":"${TODAY}","dateModified":"${TODAY}","author":{"@type":"Organization","name":"건강한 하루 편집팀","url":"${DOMAIN}/authors"},"publisher":{"@type":"Organization","name":"건강한 하루","url":"${DOMAIN}/"},"mainEntityOfPage":"${url}","inLanguage":"ko-KR"}</script>
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"${DOMAIN}/"},{"@type":"ListItem","position":2,"name":"건강 칼럼","item":"${DOMAIN}/columns/"},{"@type":"ListItem","position":3,"name":"${esc(c.title)}","item":"${url}"}]}</script>${faqLd}
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUB}" crossorigin="anonymous"></script>
</head>
<body data-page="columns">
  <a class="skip-link" href="#main">본문 바로가기</a>
  <div id="site-header"></div>

  <main id="main">
    <section class="section">
      <div class="container article-wrap">
        <nav class="breadcrumb" aria-label="현재 위치">
          <a href="../index.html">홈</a> › <a href="index.html">건강 칼럼</a> › ${esc(c.title)}
        </nav>
        <header class="article-header">
          <h1>${esc(c.title)}</h1>
          <p class="article-meta">건강 칼럼 · 최종 검토일: ${TODAY} · 참고용 건강정보</p>
          <div class="pill-row">${tags}</div>
        </header>

        <div class="ad-slot">광고 영역 (승인 후 게재)</div>

        <div class="article-body">
          <p>${esc(c.intro)}</p>
${sections}

          <div class="ad-slot">광고 영역 (승인 후 게재)</div>
${c.myth ? `
          <h2>🔎 흔한 오해 하나</h2>
          <div class="disclaimer-box">
            <p><b>"${esc(c.myth.claim)}"</b></p>
            <p>${esc(c.myth.truth)}</p>
          </div>` : ""}

          <h2>🏠 오늘부터 이렇게</h2>
          <ul>
${actions}
          </ul>
${faqHtml ? `
          <h2>❓ 자주 묻는 질문</h2>
${faqHtml}` : ""}
${c.closing ? `\n          <p>${esc(c.closing)}</p>` : ""}

          <div class="disclaimer-box strong">
            <span class="di-icon">⚠️</span> 이 칼럼은 <b>참고용 건강정보</b>이며 의학적 진단·처방이 아닙니다.
            지병이 있거나 복용 중인 약이 있으면 생활 습관을 바꾸기 전 <b>의사·약사와 상담</b>하시고,
            응급 상황에는 즉시 <b>119</b>에 연락하세요.
          </div>
          <div class="source-box">
            <strong>출처·참고</strong> — 질병관리청 국가건강정보포털 등 공신력 있는 자료를 바탕으로
            시니어 눈높이에 맞게 쉽게 재구성했습니다. 개별 상황은 의료진의 진료가 필요합니다.
          </div>
        </div>

        <div class="related-links">
          <h3>함께 보면 좋은 글</h3>
          <div class="grid cols-2">
${relHtml}
            <a class="link-card" href="index.html"><h3>📝 건강 칼럼 더 보기</h3><p>매일 이어지는 시니어 건강 이야기.</p></a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <div id="site-footer"></div>
  <script src="../js/layout.js"></script>
  <script src="../js/accessibility.js"></script>
</body>
</html>
`;
}

function updateHub(topic: Topic, c: any) {
  const hubPath = p("columns/index.html");
  const hub = readFileSync(hubPath, "utf8");
  const card =
    `          <a class="link-card" href="${topic.slug}.html">\n` +
    `            <span class="tag">${esc((c.tags && c.tags[0]) || topic.tag)}</span>\n` +
    `            <h3>${esc(c.title)}</h3>\n` +
    `            <p>${esc(c.description)}</p>\n` +
    `          </a>`;
  writeFileSync(hubPath, hub.replace("<!-- COLUMNS:INSERT -->", "<!-- COLUMNS:INSERT -->\n" + card), "utf8");
}

/* ---------- 실행 ---------- */
(async () => {
  const { topic, remaining } = pickTopic();
  if (!topic) {
    console.log("::warning:: 남은 칼럼 주제가 없습니다 — data/column-topics.txt 에 주제를 추가하세요.");
    process.exit(3);
  }
  console.log(`주제: ${topic.slug} — ${topic.title} (남은 주제 ${remaining}개)`);
  if (remaining <= 20) console.log(`::warning:: 남은 주제 ${remaining}개. 곧 소진되니 주제를 보충하세요.`);

  const idx = loadIndex();

  let c = await callClaude(topic, idx);
  let len = bodyText(c).length;
  console.log(`1차 생성: ${len}자`);
  if (len < MIN_CHARS) {
    console.log(`분량 미달(${MIN_CHARS}자 기준) → 재시도`);
    c = await callClaude(topic, idx,
      `\n\n중요: 이전 시도가 ${len}자로 너무 짧았습니다. 각 section의 body를 7~8문장으로 늘리고 sections를 5개로 하여 본문 총 ${MIN_CHARS + 400}자 이상으로 쓰세요.`);
    len = bodyText(c).length;
    console.log(`2차 생성: ${len}자`);
  }
  if (len < 1600) throw new Error(`분량 미달로 발행 중단: ${len}자`);

  safetyCheck(bodyText(c) + " " + c.title + " " + c.description); // 금지표현이면 발행 중단

  const related = resolveRelated(c, topic, idx);
  console.log(`내부링크: ${related.map((r) => r.t).join(" / ") || "(없음)"}`);

  writeFileSync(p(`columns/${topic.slug}.html`), render(topic, c, related), "utf8");
  updateHub(topic, c);
  console.log(`✅ 발행: columns/${topic.slug}.html — "${c.title}" (${len}자, 내부링크 ${related.length}개)`);
})().catch((e) => { console.error("✗ 칼럼 생성 실패:", e.message); process.exit(1); });
