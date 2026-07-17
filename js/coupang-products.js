/* =====================================================================
   coupang-products.js — 글 내용에 맞는 쿠팡 상품을 자동으로 불러와 표시.
   - 페이지에 <div class="coupang-products" data-keyword="무릎 보호대"> 가 있으면 동작.
   - 실제 API 호출·서명은 coupang-api Worker가 담당(키는 사이트에 없음).
   - 실패하거나 상품이 없으면 블록을 조용히 숨긴다(깨진 화면 방지).
   ===================================================================== */
(function () {
  var API = "https://coupang-api.inforpro.workers.dev/search";

  var blocks = document.querySelectorAll(".coupang-products[data-keyword]");
  if (!blocks.length) return;

  function won(n) { return (Number(n) || 0).toLocaleString("ko-KR") + "원"; }

  function render(block, items) {
    var page = document.body.getAttribute("data-page") || "etc";
    var cards = items.map(function (it) {
      return (
        '<a class="cp-card" href="' + it.url + '" target="_blank" rel="nofollow sponsored noopener">' +
        '<div class="cp-thumb"><img src="' + it.image + '" alt="" loading="lazy"></div>' +
        '<div class="cp-name">' + (it.name || "") + "</div>" +
        '<div class="cp-price">' + won(it.price) + "</div>" +
        "</a>"
      );
    }).join("");
    block.innerHTML =
      '<h3 class="cp-title">🛒 관련 상품 살펴보기</h3>' +
      '<div class="cp-grid">' + cards + "</div>" +
      '<p class="cp-note">이 글은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. ' +
      "구매를 강요하지 않으며, 상품 선택은 본인의 판단입니다.</p>";
    block.setAttribute("data-filled", "1");
  }

  blocks.forEach(function (block) {
    if (block.getAttribute("data-filled")) return;
    var keyword = block.getAttribute("data-keyword");
    var subId = block.getAttribute("data-subid") || (document.body.getAttribute("data-page") || "columns");
    var limit = block.getAttribute("data-limit") || 3;
    if (!keyword) { block.style.display = "none"; return; }

    var u = API + "?keyword=" + encodeURIComponent(keyword) +
      "&limit=" + encodeURIComponent(limit) + "&subId=" + encodeURIComponent(subId);

    fetch(u, { headers: { "Content-Type": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && d.items && d.items.length) render(block, d.items);
        else block.style.display = "none";
      })
      .catch(function () { block.style.display = "none"; });
  });
})();
