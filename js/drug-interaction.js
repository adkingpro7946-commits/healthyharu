/* =====================================================================
   drug-interaction.js — 약·영양제 상호작용 체커 (핵심 차별화 기능)
   흐름: 복용 약 선택(복수) → 영양제 선택(복수) → 등급별 결과
   등급: danger(주의) / warn(시간간격) / ok(문제없음)
   ===================================================================== */
(function () {
  var DATA = null;
  var $ = function (id) { return document.getElementById(id); };
  var selDrugs = [];
  var selSups = [];
  var LVL = {
    danger: { badge: "badge-danger", cls: "result-danger", icon: "🔴", label: "주의 — 함께 복용 피하거나 반드시 상담" },
    warn:   { badge: "badge-warn",   cls: "result-warn",   icon: "🟡", label: "시간 간격 두기 권장" },
    ok:     { badge: "badge-ok",     cls: "result-ok",     icon: "🟢", label: "일반적으로 문제 없음" }
  };

  function load() {
    fetch("../data/drug-interactions.json").then(function (r) { return r.json(); }).then(function (d) {
      DATA = d;
      renderDrugs();
      renderSups();
    }).catch(function () {
      $("di-drugs").innerHTML = "<p class='muted'>데이터를 불러오지 못했습니다.</p>";
    });
  }

  function renderDrugs() {
    $("di-drugs").innerHTML = DATA.drugs.map(function (dr) {
      return '<button type="button" class="choice-btn" data-drug="' + dr.id + '">' +
             '<span aria-hidden="true">' + dr.icon + '</span> ' + dr.name + "</button>";
    }).join("");
    $("di-drugs").querySelectorAll("[data-drug]").forEach(function (b) {
      b.addEventListener("click", function () { toggle(selDrugs, b.getAttribute("data-drug"), b); });
    });
  }

  function renderSups() {
    $("di-sups").innerHTML = DATA.supplements.map(function (s) {
      return '<button type="button" class="choice-btn" data-sup="' + s.id + '">' + s.name + "</button>";
    }).join("");
    $("di-sups").querySelectorAll("[data-sup]").forEach(function (b) {
      b.addEventListener("click", function () { toggle(selSups, b.getAttribute("data-sup"), b); });
    });
  }

  function toggle(arr, id, btn) {
    var i = arr.indexOf(id);
    if (i >= 0) { arr.splice(i, 1); btn.classList.remove("selected"); }
    else { arr.push(id); btn.classList.add("selected"); }
  }

  function nameOfDrug(id) { var d = DATA.drugs.find(function (x) { return x.id === id; }); return d ? d.name : id; }
  function nameOfSup(id)  { var s = DATA.supplements.find(function (x) { return x.id === id; }); return s ? s.name : id; }

  function check() {
    if (selDrugs.length === 0 || selSups.length === 0) {
      $("di-result").innerHTML = "<div class='disclaimer-box'>복용 중인 <b>약</b>과 <b>영양제</b>를 각각 하나 이상 골라주세요.</div>";
      $("di-result").classList.remove("hidden");
      return;
    }

    var found = { danger: [], warn: [], ok: [] };
    var unknownPairs = [];

    selDrugs.forEach(function (dr) {
      selSups.forEach(function (su) {
        var hit = DATA.interactions.find(function (it) { return it.drug === dr && it.supplement === su; });
        var pair = nameOfDrug(dr) + " + " + nameOfSup(su);
        if (hit) { found[hit.level].push({ pair: pair, reason: hit.reason }); }
        else { unknownPairs.push(pair); }
      });
    });

    var html = "<h2 class='text-center mb-md'>상호작용 확인 결과</h2>";

    ["danger", "warn", "ok"].forEach(function (lvl) {
      if (found[lvl].length === 0) return;
      var meta = LVL[lvl];
      html += '<div class="result-card ' + meta.cls + '">' +
        '<h3>' + meta.icon + " " + meta.label + "</h3><ul>" +
        found[lvl].map(function (f) {
          return "<li><b>" + f.pair + "</b><br>" + f.reason + "</li>";
        }).join("") + "</ul></div>";
    });

    if (unknownPairs.length) {
      html += '<div class="result-card result-info"><h3>ℹ️ 등록된 정보가 없는 조합</h3><ul>' +
        unknownPairs.map(function (p) { return "<li>" + p + "</li>"; }).join("") +
        "</ul><p class='muted'>정보가 없다고 해서 안전하다는 뜻은 아닙니다. 약사에게 확인하세요.</p></div>";
    }

    html += '<div class="disclaimer-box strong"><span class="di-icon">⚠️</span> ' +
      '<b>이 결과만 보고 복용 약을 바꾸거나 중단하지 마세요.</b> 상호작용은 약의 종류·용량·개인 상태에 따라 ' +
      '다릅니다. 반드시 담당 <b>의사·약사</b>와 상담하세요. 응급 시 <b>119</b>.</div>' +
      '<div class="text-center mt-lg"><button type="button" class="btn btn-outline" id="di-reset">다시 선택하기</button></div>';

    $("di-result").innerHTML = html;
    $("di-result").classList.remove("hidden");
    $("di-reset").addEventListener("click", reset);
    $("di-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function reset() {
    selDrugs = []; selSups = [];
    document.querySelectorAll("#di-drugs .choice-btn, #di-sups .choice-btn").forEach(function (b) { b.classList.remove("selected"); });
    $("di-result").classList.add("hidden");
    $("di-top").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    load();
    $("di-check").addEventListener("click", check);
  });
})();
