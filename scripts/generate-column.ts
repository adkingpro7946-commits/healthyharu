/**
 * generate-column.ts — 매일 자동으로 "가치 있는 건강 칼럼(A등급 생활·웰빙)"을 1편 생성·발행.
 *  1) data/column-topics.txt 에서 아직 안 쓴 주제 1개 선택
 *  2) Claude API 로 깊이 있는 칼럼 작성(생활·웰빙만; 약 용량·진단·응급판단 금지)
 *  3) 의료 안전 금지표현 검사 — 걸리면 발행 중단
 *  4) columns/<slug>.html 생성 + columns/index.html 목록 맨 앞에 추가
 * 필요: 환경변수 ANTHROPIC_API_KEY (GitHub Secrets)
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { p, FORBIDDEN } from "./lib.ts";

const PUB = "ca-pub-8033753532566337";
const DOMAIN = "https://healthyharu.co.kr";
const TODAY = process.env.COLUMN_DATE || new Date().toISOString().slice(0, 10);

function pickTopic(): { slug: string; title: string; tag: string } | null {
  const lines = readFileSync(p("data/column-topics.txt"), "utf8").split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const used = new Set(readdirSync(p("columns")).filter((f) => f.endsWith(".html") && f !== "index.html")
    .map((f) => f.replace(/\.html$/, "")));
  for (const line of lines) {
    const [slug, title, tag] = line.split("|").map((s) => s.trim());
    if (slug && !used.has(slug)) return { slug, title, tag: tag || "건강생활" };
  }
  return null;
}

async function writeColumn(topic: { slug: string; title: string; tag: string }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY 없음");

  const system =
    "당신은 한국 시니어(50~70대) 대상 건강정보 사이트 '건강한 하루'의 건강 칼럼 작가입니다. " +
    "따뜻하고 쉬운 한국어로, 돋보기 없이 읽기 좋게 씁니다. 다음을 반드시 지킵니다: " +
    "① 생활습관·웰빙 위주(A등급)만 다룬다. 특정 약물의 용량·복용 지시, 확정 진단, 응급 판단 기준, 검사 수치 판독은 쓰지 않는다. " +
    "② '완치·특효' 같은 과장, 단정 표현 금지. '도움이 될 수 있습니다' 톤. " +
    "③ 지병·복용약이 있으면 의료진 상담을 권한다. " +
    "④ 짧지 않고 가치 있게(900~1300자), 실천 가능한 조언 위주. " +
    "출력은 오직 JSON 하나. 코드블록·설명 없이 JSON만.";
  const user =
    `주제: "${topic.title}". 아래 형식의 JSON만 출력:\n` +
    `{"title":"제목(주제를 살린 매력적 제목)","description":"검색용 요약 120자 이내",` +
    `"tags":["${topic.tag}","태그2","태그3"],"intro":"도입 문단(3~5문장)",` +
    `"sections":[{"heading":"소제목","body":"문단(4~6문장)"}](3~4개),` +
    `"todayActions":["오늘부터 실천할 구체적 행동 4~5개"],"avoid":["피하면 좋은 것 2~3개"]}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 3000, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error("Anthropic API 실패: " + res.status + " " + (await res.text()).slice(0, 300));
  const data: any = await res.json();
  let text = (data.content?.[0]?.text || "").trim();
  const m = text.match(/\{[\s\S]*\}/);
  if (m) text = m[0];
  return JSON.parse(text);
}

function esc(s: string) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function render(topic: any, c: any): string {
  // Cloudflare(auto-trailing-slash)가 .html 을 떼고 307 하므로 정식 URL은 확장자 없이 쓴다.
  const url = `${DOMAIN}/columns/${topic.slug}`;
  const tags = (c.tags || [topic.tag]).slice(0, 3).map((t: string) => `<span class="tag">${esc(t)}</span>`).join("");
  const sections = (c.sections || []).map((s: any) => `          <h2>${esc(s.heading)}</h2>\n          <p>${esc(s.body)}</p>`).join("\n");
  const actions = (c.todayActions || []).map((a: string) => `            <li>${esc(a)}</li>`).join("\n");
  const avoids = (c.avoid || []).map((a: string) => `            <li>${esc(a)}</li>`).join("\n");
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
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"홈","item":"${DOMAIN}/"},{"@type":"ListItem","position":2,"name":"건강 칼럼","item":"${DOMAIN}/columns/"},{"@type":"ListItem","position":3,"name":"${esc(c.title)}","item":"${url}"}]}</script>
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

          <h2>🏠 오늘부터 이렇게</h2>
          <ul>
${actions}
          </ul>
${avoids ? `          <h2>이런 건 살짝 줄여보세요</h2>\n          <ul>\n${avoids}\n          </ul>` : ""}

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
          <h3>관련 글·도구</h3>
          <div class="grid cols-2">
            <a class="link-card" href="index.html"><h3>📝 건강 칼럼 더 보기</h3><p>매일 이어지는 시니어 건강 이야기.</p></a>
            <a class="link-card" href="../tools/symptom-checker.html"><h3>🩺 증상 체크·진료 안내</h3><p>아픈 곳을 눌러 확인해 보세요.</p></a>
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

function updateHub(topic: any, c: any) {
  const hubPath = p("columns/index.html");
  let hub = readFileSync(hubPath, "utf8");
  const card = `          <a class="link-card" href="${topic.slug}.html">\n` +
    `            <span class="tag">${esc((c.tags && c.tags[0]) || topic.tag)}</span>\n` +
    `            <h3>${esc(c.title)}</h3>\n` +
    `            <p>${esc(c.description)}</p>\n` +
    `          </a>`;
  hub = hub.replace("<!-- COLUMNS:INSERT -->", "<!-- COLUMNS:INSERT -->\n" + card);
  writeFileSync(hubPath, hub, "utf8");
}

function safetyCheck(text: string) {
  for (const f of FORBIDDEN) {
    const m = text.match(f.re);
    if (m) throw new Error(`안전 검사 실패 [${f.key}]: "${m[0]}" — ${f.why}`);
  }
}

(async () => {
  const topic = pickTopic();
  if (!topic) { console.log("::notice:: 남은 칼럼 주제 없음 — 오늘은 생성 안 함"); process.exit(3); }
  console.log("주제 선택:", topic.slug, "-", topic.title);
  const c = await writeColumn(topic);
  const allText = [c.title, c.description, c.intro, ...(c.sections || []).map((s: any) => s.heading + " " + s.body), ...(c.todayActions || []), ...(c.avoid || [])].join("\n");
  safetyCheck(allText); // 금지표현이면 여기서 throw → 발행 중단
  writeFileSync(p(`columns/${topic.slug}.html`), render(topic, c), "utf8");
  updateHub(topic, c);
  console.log(`✅ 칼럼 발행: columns/${topic.slug}.html`);
})().catch((e) => { console.error("✗ 칼럼 생성 실패:", e.message); process.exit(1); });
