/* =====================================================================
   layout.js — 모든 페이지 공통 헤더 / 응급배너 / 푸터 주입
   사용법: 각 HTML <head>에서 먼저
     <script>window.BASE = "";     // 루트 페이지
     window.BASE = "../";          // /tools, /symptoms 등 한 뎁스 아래
     </script>
   그리고 본문 맨 위 <div id="site-header"></div>, 맨 아래 <div id="site-footer"></div>.
   ===================================================================== */
(function () {
  var BASE = window.BASE || "";
  function u(path) { return BASE + path; }        // 내부 링크 헬퍼

  var page = document.body.getAttribute("data-page") || "";

  /* ---------- 헤더 ---------- */
  var nav = [
    { key: "home",        label: "홈",          href: "index.html" },
    { key: "symptoms",    label: "증상정보",     href: "symptoms/index.html" },
    { key: "supplements", label: "영양제백과",   href: "supplements/index.html" },
    { key: "tools",       label: "건강도구",     href: "tools/symptom-checker.html" },
    { key: "conditions",  label: "만성질환관리", href: "conditions/index.html" },
    { key: "guides",      label: "건강생활",     href: "guides/index.html" }
  ];

  var navHtml = nav.map(function (n) {
    var cur = (n.key === page) ? ' aria-current="page"' : "";
    return '<li><a href="' + u(n.href) + '"' + cur + ">" + n.label + "</a></li>";
  }).join("");

  var headerHtml =
    '<div class="emergency-banner">' +
      '🚨 응급 상황(가슴통증·의식저하·심한 출혈 등)에는 지체 없이 <strong>119</strong> 또는 가까운 응급실로 연락하세요.' +
    '</div>' +
    '<header class="site-header">' +
      '<div class="container">' +
        '<div class="header-top">' +
          '<a class="logo" href="' + u("index.html") + '" aria-label="건강한 하루 홈으로">' +
            '<span class="logo-mark" aria-hidden="true">♡</span>' +
            '<span>건강한 하루</span>' +
          '</a>' +
          '<div class="a11y-bar" role="group" aria-label="화면 편의 기능">' +
            '<span class="a11y-label">글씨</span>' +
            '<div class="a11y-group" role="group" aria-label="글씨 크기">' +
              '<button type="button" data-font="normal" aria-pressed="true">보통</button>' +
              '<button type="button" data-font="large" aria-pressed="false">크게</button>' +
              '<button type="button" data-font="xlarge" aria-pressed="false">아주크게</button>' +
            '</div>' +
            '<button type="button" id="btn-contrast" aria-pressed="false">🌗 고대비</button>' +
            '<button type="button" id="btn-dark" aria-pressed="false">🌙 어둡게</button>' +
            '<button type="button" id="btn-speak">🔊 듣기</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<nav class="main-nav" aria-label="주요 메뉴">' +
        '<div class="container"><ul>' + navHtml + '</ul></div>' +
      '</nav>' +
      '<div class="search-bar">' +
        '<div class="container">' +
          '<form id="site-search" role="search" aria-label="사이트 검색">' +
            '<label for="site-search-input" class="sr-only">건강정보 검색</label>' +
            '<input type="search" id="site-search-input" name="q" ' +
              'placeholder="🔍 증상·영양제·질환 검색 (예: 무릎, 비타민D, 고혈압)" autocomplete="off">' +
            '<button type="submit" class="btn btn-primary">검색</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</header>';

  /* ---------- 푸터 ---------- */
  var footerHtml =
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-disclaimer">' +
          '<strong>⚠️ 의료 면책 안내</strong> — 본 사이트의 모든 정보와 도구는 <b>건강 정보 제공(참고용)</b>이며 ' +
          '의학적 진단·처방이 아닙니다. 증상이 있거나 약 복용을 바꿀 때는 반드시 <b>의사·약사와 상담</b>하세요.' +
        '</div>' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<h4>건강한 하루</h4>' +
            '<p>50대 이상을 위한 크고 읽기 쉬운 건강정보와 자가진단 도구. ' +
            '공신력 있는 공공기관 자료를 바탕으로 쉽게 풀어 전합니다.</p>' +
          '</div>' +
          '<div>' +
            '<h4>바로가기</h4>' +
            '<ul class="footer-links">' +
              '<li><a href="' + u("tools/symptom-checker.html") + '">증상 자가진단</a></li>' +
              '<li><a href="' + u("tools/supplement-finder.html") + '">영양제 추천·궁합</a></li>' +
              '<li><a href="' + u("tools/drug-interaction.html") + '">약·영양제 상호작용</a></li>' +
              '<li><a href="' + u("symptoms/index.html") + '">증상정보</a></li>' +
            '</ul>' +
          '</div>' +
          '<div>' +
            '<h4>사이트 정보</h4>' +
            '<ul class="footer-links">' +
              '<li><a href="' + u("about.html") + '">사이트 소개</a></li>' +
              '<li><a href="' + u("contact.html") + '">문의하기</a></li>' +
              '<li><a href="' + u("privacy.html") + '">개인정보처리방침</a></li>' +
              '<li><a href="' + u("terms.html") + '">이용약관</a></li>' +
              '<li><a href="' + u("disclaimer.html") + '">의료정보 면책조항</a></li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '© 2026 건강한 하루 (geongangh_haru). 모든 정보는 참고용입니다. ' +
          '정확한 진단과 치료는 의료기관을 이용하세요.' +
        '</div>' +
      '</div>' +
    '</footer>';

  /* ---------- 주입 ---------- */
  var h = document.getElementById("site-header");
  if (h) h.outerHTML = headerHtml;
  var f = document.getElementById("site-footer");
  if (f) f.outerHTML = footerHtml;

  // 헤더 검색 폼: 검색 결과 페이지로 이동 (BASE 반영)
  var searchForm = document.getElementById("site-search");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = (document.getElementById("site-search-input").value || "").trim();
      window.location.href = u("search.html") + (q ? ("?q=" + encodeURIComponent(q)) : "");
    });
  }

  // 광고 스크립트 자동 로드 (BASE 반영). ads.js 내부에서 미설정 시 자리표시 유지.
  if (!document.querySelector('script[data-ads-module]')) {
    var adsScript = document.createElement("script");
    adsScript.src = u("js/ads.js");
    adsScript.setAttribute("data-ads-module", "1");
    document.body.appendChild(adsScript);
  }

  // 접근성 스크립트가 헤더 주입 후 버튼을 찾도록 이벤트 발행
  document.dispatchEvent(new CustomEvent("layout:ready"));
})();
