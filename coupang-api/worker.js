/**
 * coupang-api — 쿠팡 파트너스 상품검색을 대신 호출해 주는 작은 백엔드.
 *
 * 왜 필요한가: 파트너스 API는 Secret Key로 요청에 서명(HMAC)해야 한다.
 * 정적 사이트(브라우저)에 키를 두면 전 세계에 노출되고 CORS로 막힌다.
 * 그래서 키는 이 Worker의 "비밀값"으로만 두고(코드·저장소엔 없음),
 * 사이트는 이 Worker에게 "이 키워드 상품 3개 줘" 라고만 물어본다.
 *
 * 비밀값 설정(최초 1회):
 *   npx wrangler secret put COUPANG_ACCESS_KEY --config coupang-api/wrangler.toml
 *   npx wrangler secret put COUPANG_SECRET_KEY --config coupang-api/wrangler.toml
 * 배포:
 *   npx wrangler deploy --config coupang-api/wrangler.toml
 */

const HOST = "https://api-gateway.coupang.com";
const SEARCH_PATH = "/v2/providers/affiliate_open_api/apis/openapi/products/search";

// 이 도메인에서 온 요청만 응답한다(다른 사이트가 내 키로 API를 쓰지 못하게).
const ALLOW = [
  "https://healthyharu.co.kr",
  "https://www.healthyharu.co.kr",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

function corsHeaders(origin) {
  const allow = ALLOW.includes(origin) ? origin : ALLOW[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function authHeader(method, pathWithQuery, access, secret) {
  const [path, query = ""] = pathWithQuery.split("?");
  const datetime = new Date().toISOString().substr(2, 17).replace(/[:-]/g, "") + "Z"; // yyMMddTHHmmssZ
  const message = datetime + method + path + query;
  return hmacHex(secret, message).then(
    (signature) => `CEA algorithm=HmacSHA256, access-key=${access}, signed-date=${datetime}, signature=${signature}`,
  );
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (url.pathname !== "/search") {
      return new Response(JSON.stringify({ ok: true, hint: "GET /search?keyword=...&limit=3" }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // 다른 웹사이트가 브라우저로 이 엔드포인트를 쓰는 것을 막는다(Origin/Referer 확인).
    const ref = request.headers.get("Referer") || "";
    const okSource =
      !origin && !ref ? false : ALLOW.some((a) => origin.startsWith(a) || ref.startsWith(a));
    if (!okSource) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
      status: 403, headers: { "Content-Type": "application/json", ...cors },
    });

    const keyword = (url.searchParams.get("keyword") || "").trim().slice(0, 40);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "3", 10) || 3, 1), 5);
    const subId = (url.searchParams.get("subId") || "columns").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20);
    if (!keyword) return new Response(JSON.stringify({ ok: false, error: "keyword 필요" }), {
      status: 400, headers: { "Content-Type": "application/json", ...cors },
    });

    // 캐시: 같은 키워드는 재호출 없이 응답(속도 + API 호출 한도 보호). 하루 유지.
    const cacheKey = new Request(`https://cache.local/search?k=${encodeURIComponent(keyword)}&n=${limit}&s=${subId}`);
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, { headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...cors } });
    }

    if (!env.COUPANG_ACCESS_KEY || !env.COUPANG_SECRET_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "키 미설정" }), {
        status: 500, headers: { "Content-Type": "application/json", ...cors },
      });
    }

    try {
      const query = `keyword=${encodeURIComponent(keyword)}&limit=${limit}&subId=${subId}`;
      const pathWithQuery = `${SEARCH_PATH}?${query}`;
      const auth = await authHeader("GET", pathWithQuery, env.COUPANG_ACCESS_KEY, env.COUPANG_SECRET_KEY);
      const res = await fetch(HOST + pathWithQuery, {
        method: "GET",
        headers: { Authorization: auth, "Content-Type": "application/json" },
      });
      const data = await res.json();
      const items = (data?.data?.productData || []).slice(0, limit).map((it) => ({
        name: it.productName,
        image: it.productImage,
        url: it.productUrl,
        price: it.productPrice,
      }));
      const payload = JSON.stringify({ ok: true, keyword, items });
      const out = new Response(payload, {
        headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400", "X-Cache": "MISS", ...cors },
      });
      // 성공적으로 상품을 받았을 때만 캐시(빈 결과·에러는 캐시하지 않음).
      if (items.length) ctx.waitUntil(cache.put(cacheKey, out.clone()));
      return out;
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "쿠팡 호출 실패" }), {
        status: 502, headers: { "Content-Type": "application/json", ...cors },
      });
    }
  },
};
