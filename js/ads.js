/* =====================================================================
   ads.js — Google 애드센스 광고 삽입 (승인 후 스위치 하나로 활성화)
   ---------------------------------------------------------------------
   [사용법]
   1) 애드센스 승인 후, 아래 ADSENSE_CLIENT 에 본인 게시자 ID를 넣으세요.
      예: var ADSENSE_CLIENT = "ca-pub-1234567890123456";
   2) (선택) 각 광고를 개별 광고단위로 관리하려면, 광고를 넣을 위치의
      <div class="ad-slot"> 에 data-ad-slot="발급받은숫자ID" 를 넣으세요.
      비워두면 반응형 자동 크기로 표시됩니다.
   3) 루트의 ads.txt 도 본인 pub-ID로 교체하세요.

   ADSENSE_CLIENT 가 비어 있으면(기본값) 아무 것도 하지 않고
   회색 자리표시(placeholder)만 그대로 둡니다. → 개발/심사 준비 상태.
   ===================================================================== */
(function () {
  var ADSENSE_CLIENT = ""; // ← 승인 후 "ca-pub-XXXXXXXXXXXXXXXX" 로 교체

  var slots = document.querySelectorAll(".ad-slot");
  if (slots.length === 0) return;

  // 애드센스 미설정(운영 환경)에서는 빈 광고 자리표시를 렌더링하지 않는다.
  // 로컬 미리보기에서 자리표시를 보고 싶으면 주소에 ?ads=preview 를 붙인다.
  if (!ADSENSE_CLIENT) {
    var preview = /[?&]ads=preview\b/.test(location.search);
    if (!preview) slots.forEach(function (s) { s.style.display = "none"; });
    return;
  }

  // 1) 애드센스 로더 스크립트 1회 삽입
  if (!document.querySelector('script[data-adsense-loader]')) {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT;
    s.crossOrigin = "anonymous";
    s.setAttribute("data-adsense-loader", "1");
    document.head.appendChild(s);
  }

  // 2) 각 .ad-slot 을 실제 광고 단위로 교체
  slots.forEach(function (slot) {
    slot.innerHTML = "";
    slot.style.border = "none";
    slot.style.minHeight = "0";
    slot.style.background = "transparent";

    var ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", ADSENSE_CLIENT);
    if (slot.dataset.adSlot) {
      ins.setAttribute("data-ad-slot", slot.dataset.adSlot);
    }
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    slot.appendChild(ins);

    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
    catch (e) { /* 심사 전 등에서는 조용히 무시 */ }
  });
})();
