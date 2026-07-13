/* =====================================================================
   search.js — 사이트 내 검색 (search.html 전용)
   data/search-index.json 을 불러와 제목·설명·태그로 검색한다.
   ===================================================================== */
(function () {
  var BASE = window.BASE || "";
  var INDEX = null;
  var $ = function (id) { return document.getElementById(id); };

  function getQuery() {
    var m = location.search.match(/[?&]q=([^&]*)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  function loadIndex() {
    return fetch(BASE + "data/search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { INDEX = data; });
  }

  // 점수: 제목 3, 태그 2, 설명 1 (모든 검색어가 하나라도 매칭되어야 결과 포함)
  function search(query) {
    var terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    var results = [];
    INDEX.forEach(function (it) {
      var t = (it.t || "").toLowerCase();
      var d = (it.d || "").toLowerCase();
      var k = (it.k || "").toLowerCase();
      var score = 0, allHit = true;
      terms.forEach(function (term) {
        var hit = 0;
        if (t.indexOf(term) >= 0) hit += 3;
        if (k.indexOf(term) >= 0) hit += 2;
        if (d.indexOf(term) >= 0) hit += 1;
        if (hit === 0) allHit = false;
        score += hit;
      });
      if (allHit) results.push({ it: it, score: score });
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return results.map(function (r) { return r.it; });
  }

  function render(query, results) {
    var wrap = $("search-results");
    if (!query) {
      wrap.innerHTML = '<p class="muted text-center">위 검색창에 궁금한 <b>증상·영양제·질환</b>을 입력해 보세요.</p>';
      return;
    }
    $("search-summary").textContent =
      "‘" + query + "’ 검색 결과 " + results.length + "건";
    if (results.length === 0) {
      wrap.innerHTML =
        '<div class="disclaimer-box"><span class="di-icon">🔎</span> ' +
        '검색 결과가 없습니다. 더 짧은 단어(예: 무릎, 혈압, 비타민)로 다시 찾아보세요.</div>';
      return;
    }
    wrap.innerHTML = '<div class="grid cols-2">' + results.map(function (it) {
      return '<a class="link-card" href="' + BASE + it.u + '">' +
        '<span class="tag">' + it.c + "</span>" +
        "<h3>" + it.t + "</h3>" +
        (it.d ? "<p>" + it.d + "</p>" : "") +
      "</a>";
    }).join("") + "</div>";
  }

  function run() {
    var q = getQuery();
    var input = $("search-page-input");
    if (input) input.value = q;
    render(q, q ? search(q) : []);
  }

  document.addEventListener("DOMContentLoaded", function () {
    // 페이지 자체 검색창(있으면) 연결 — 입력하며 실시간 검색
    var input = $("search-page-input");
    var form = $("search-page-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = (input.value || "").trim();
        history.replaceState(null, "", "search.html" + (q ? "?q=" + encodeURIComponent(q) : ""));
        render(q, q ? search(q) : []);
      });
    }
    if (input) {
      var timer = null;
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          var q = (input.value || "").trim();
          render(q, q ? search(q) : []);
        }, 200);
      });
    }
    loadIndex().then(run).catch(function () {
      $("search-results").innerHTML = "<p class='muted'>검색 데이터를 불러오지 못했습니다. 새로고침 해주세요.</p>";
    });
  });
})();
