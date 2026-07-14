/* =====================================================================
   coupang.js — 쿠팡 파트너스 배너를 .coupang-slot 에 렌더링.
   - layout.js 가 글·홈 페이지 하단에만 슬롯을 넣고 이 스크립트를 로드한다.
   - 한 페이지에 배너는 최대 1개(과다 노출 방지).
   - subId 에 섹션명을 넣어 쿠팡 파트너스에서 섹션별 실적을 구분할 수 있게 한다.
   - 위젯 iframe 을 직접 삽입 — 주입된 슬롯에서도 안정적으로 동작.
   ===================================================================== */
(function () {
  // 배너 설정(공개 임베드 값). 섹션별로 다른 배너를 쓰고 싶으면 키를 추가한다.
  // 예) supplements: { ...건강식품 카테고리 배너... }
  var BANNERS = {
    _default: { id: 1006671, template: "carousel", trackingCode: "AF5074937", width: 320, height: 100, tsource: "" },
    // 영양제백과 글 → 건강식품 카테고리 배너(맥락에 맞는 상품)
    supplements: { id: 1006694, template: "carousel", trackingCode: "AF5074937", width: 320, height: 100, tsource: "" }
  };

  var page = (document.body.getAttribute("data-page") || "etc");
  var cfg = BANNERS[page] || BANNERS._default;
  var subId = cfg.subId || page; // 섹션별 실적 추적

  var slots = document.querySelectorAll(".coupang-slot");
  if (!slots.length) return;

  var url = "https://ads-partners.coupang.com/widgets.html" +
    "?id=" + cfg.id +
    "&template=" + cfg.template +
    "&trackingCode=" + cfg.trackingCode +
    "&subId=" + encodeURIComponent(subId) +
    "&width=" + cfg.width +
    "&height=" + cfg.height +
    "&tsource=" + (cfg.tsource || "");

  slots.forEach(function (slot) {
    if (slot.getAttribute("data-filled")) return;
    slot.setAttribute("data-filled", "1");
    var f = document.createElement("iframe");
    f.src = url;
    f.width = String(cfg.width);
    f.height = String(cfg.height);
    f.setAttribute("frameborder", "0");
    f.setAttribute("scrolling", "no");
    f.setAttribute("referrerpolicy", "unsafe-url");
    f.setAttribute("loading", "lazy");
    f.setAttribute("title", "쿠팡 파트너스 추천 상품");
    f.style.border = "0";
    f.style.maxWidth = "100%";
    slot.appendChild(f);
  });
})();
