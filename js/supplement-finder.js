/* =====================================================================
   supplement-finder.js — 영양제 추천 / 궁합 체커
   탭1: 나이대+건강고민 → 추천 카드
   탭2: 영양제 2개 이상 선택 → 좋은/나쁜 조합 판정 (양방향 조회)
   ===================================================================== */
(function () {
  var DATA = null;
  var SUP = {};
  var $ = function (id) { return document.getElementById(id); };

  var recAge = null;
  var recConcerns = [];
  var comboSelected = [];

  function load() {
    fetch("../data/supplements.json").then(function (r) { return r.json(); }).then(function (d) {
      DATA = d; SUP = d.supplements;
      renderConcerns();
      renderComboChoices();
    }).catch(function () {
      $("sf-concerns").innerHTML = "<p class='muted'>데이터를 불러오지 못했습니다.</p>";
    });
  }

  /* ---------- 탭 전환 ---------- */
  function bindTabs() {
    document.querySelectorAll(".tab-btn").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (x) { x.setAttribute("aria-selected", "false"); });
        t.setAttribute("aria-selected", "true");
        var target = t.getAttribute("data-tab");
        $("tab-recommend").classList.toggle("hidden", target !== "recommend");
        $("tab-combo").classList.toggle("hidden", target !== "combo");
      });
    });
  }

  /* ---------- 탭1: 추천 ---------- */
  function renderConcerns() {
    var ages = ["40대", "50대", "60대+"];
    $("sf-age").innerHTML = ages.map(function (a) {
      return '<button type="button" class="choice-btn" data-age="' + a + '">' + a + "</button>";
    }).join("");
    $("sf-age").querySelectorAll("[data-age]").forEach(function (b) {
      b.addEventListener("click", function () {
        recAge = b.getAttribute("data-age");
        $("sf-age").querySelectorAll(".choice-btn").forEach(function (x) { x.classList.remove("selected"); });
        b.classList.add("selected");
      });
    });

    $("sf-concerns").innerHTML = DATA.concerns.map(function (c) {
      return '<button type="button" class="choice-btn" data-concern="' + c.id + '">' +
             '<span aria-hidden="true">' + c.icon + '</span> ' + c.name + "</button>";
    }).join("");
    $("sf-concerns").querySelectorAll("[data-concern]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-concern");
        var i = recConcerns.indexOf(id);
        if (i >= 0) { recConcerns.splice(i, 1); b.classList.remove("selected"); }
        else { recConcerns.push(id); b.classList.add("selected"); }
      });
    });
  }

  function recommend() {
    if (recConcerns.length === 0) {
      $("sf-rec-result").innerHTML = "<div class='disclaimer-box'>먼저 건강 고민을 하나 이상 골라주세요.</div>";
      $("sf-rec-result").classList.remove("hidden");
      return;
    }
    var matched = Object.keys(SUP).filter(function (k) {
      return SUP[k].goodFor.some(function (g) { return recConcerns.indexOf(g) >= 0; });
    }).map(function (k) {
      var score = SUP[k].goodFor.filter(function (g) { return recConcerns.indexOf(g) >= 0; }).length;
      return { key: k, score: score };
    }).sort(function (a, b) { return b.score - a.score; });

    var cards = matched.map(function (m) {
      var s = SUP[m.key];
      var link = s.article ? '<a href="../' + s.article + '">자세히 보기 →</a>' : "";
      return '<div class="result-card result-info">' +
        '<h3>💊 ' + s.name + "</h3>" +
        "<p><b>도움:</b> " + s.goodForText.join(", ") + "</p>" +
        "<p><b>권장 섭취:</b> " + s.bestTime + "</p>" +
        '<p class="muted"><b>주의:</b> ' + s.caution + "</p>" +
        link + "</div>";
    }).join("");

    $("sf-rec-result").innerHTML =
      "<h2 class='text-center mb-md'>추천 영양제" + (recAge ? " (" + recAge + ")" : "") + "</h2>" +
      cards +
      '<div class="disclaimer-box strong"><span class="di-icon">⚠️</span> 영양제는 치료제가 아닙니다. ' +
      '기존에 드시는 약이 있다면 <b>약·영양제 상호작용</b>을 먼저 확인하고, 의사·약사와 상담하세요. ' +
      '&nbsp;<a href="drug-interaction.html">상호작용 확인하러 가기 →</a></div>';
    $("sf-rec-result").classList.remove("hidden");
    $("sf-rec-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- 탭2: 궁합 ---------- */
  function renderComboChoices() {
    $("sf-combo-choices").innerHTML = Object.keys(SUP).map(function (k) {
      return '<button type="button" class="choice-btn" data-sup="' + k + '">' + SUP[k].name + "</button>";
    }).join("");
    $("sf-combo-choices").querySelectorAll("[data-sup]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-sup");
        var i = comboSelected.indexOf(id);
        if (i >= 0) { comboSelected.splice(i, 1); b.classList.remove("selected"); }
        else { comboSelected.push(id); b.classList.add("selected"); }
      });
    });
  }

  function checkCombo() {
    if (comboSelected.length < 2) {
      $("sf-combo-result").innerHTML = "<div class='disclaimer-box'>영양제를 <b>2개 이상</b> 선택해주세요.</div>";
      $("sf-combo-result").classList.remove("hidden");
      return;
    }
    var goods = [], bads = [];
    for (var i = 0; i < comboSelected.length; i++) {
      for (var j = i + 1; j < comboSelected.length; j++) {
        var a = comboSelected[i], b = comboSelected[j];
        var na = SUP[a].name, nb = SUP[b].name;
        var good = (SUP[a].goodWith || []).indexOf(b) >= 0 || (SUP[b].goodWith || []).indexOf(a) >= 0;
        var bad  = (SUP[a].badWith  || []).indexOf(b) >= 0 || (SUP[b].badWith  || []).indexOf(a) >= 0;
        if (bad)  bads.push(na + " + " + nb);
        else if (good) goods.push(na + " + " + nb);
      }
    }

    var html = "<h2 class='text-center mb-md'>궁합 확인 결과</h2>";
    if (goods.length) {
      html += '<div class="result-card result-ok"><h3>✅ 함께 먹으면 좋은 조합</h3><ul>' +
        goods.map(function (g) { return "<li>" + g + " — 흡수·효과에 도움이 될 수 있어요.</li>"; }).join("") + "</ul></div>";
    }
    if (bads.length) {
      html += '<div class="result-card result-warn"><h3>⚠️ 시간을 띄우면 좋은 조합</h3><ul>' +
        bads.map(function (g) { return "<li>" + g + " — 서로 흡수를 방해할 수 있어 <b>2시간 이상 간격</b>을 두세요.</li>"; }).join("") + "</ul></div>";
    }
    if (!goods.length && !bads.length) {
      html += '<div class="result-card result-info"><h3>ℹ️ 특별한 상호작용 정보 없음</h3>' +
        "<p>선택하신 조합에는 눈에 띄는 좋은/나쁜 궁합 정보가 없습니다. 일반적으로 함께 드셔도 되지만, 용량과 복용 시간은 제품 안내를 따르세요.</p></div>";
    }
    html += '<div class="disclaimer-box strong"><span class="di-icon">⚠️</span> ' +
      '복용 중인 <b>약</b>이 있다면 영양제 궁합만으로 안심하지 마시고 ' +
      '<a href="drug-interaction.html">약·영양제 상호작용</a>도 꼭 확인하세요.</div>';

    $("sf-combo-result").innerHTML = html;
    $("sf-combo-result").classList.remove("hidden");
    $("sf-combo-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    load();
    bindTabs();
    $("sf-recommend-btn").addEventListener("click", recommend);
    $("sf-combo-btn").addEventListener("click", checkCombo);
  });
})();
