/* =====================================================================
   coupang.js — 쿠팡 파트너스 다이나믹 배너를 .coupang-slot 에 렌더링.
   layout.js 가 글(article) 페이지 하단에만 슬롯을 넣고 이 스크립트를 로드한다.
   ※ g.js 인라인 스니펫 대신 위젯 iframe 을 직접 삽입 — 주입된 슬롯에서도 안정적으로 동작.
   ===================================================================== */
(function () {
  // 쿠팡 파트너스에서 발급한 배너 설정 (id/trackingCode 는 공개 임베드 값)
  var CFG = { id: 1006671, template: "carousel", trackingCode: "AF5074937", subId: "", width: 320, height: 100, tsource: "" };

  var slots = document.querySelectorAll(".coupang-slot");
  if (!slots.length) return;

  var url = "https://ads-partners.coupang.com/widgets.html" +
    "?id=" + CFG.id +
    "&template=" + CFG.template +
    "&trackingCode=" + CFG.trackingCode +
    "&subId=" + encodeURIComponent(CFG.subId) +
    "&width=" + CFG.width +
    "&height=" + CFG.height +
    "&tsource=" + CFG.tsource;

  slots.forEach(function (slot) {
    if (slot.getAttribute("data-filled")) return;
    slot.setAttribute("data-filled", "1");
    var f = document.createElement("iframe");
    f.src = url;
    f.width = String(CFG.width);
    f.height = String(CFG.height);
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
