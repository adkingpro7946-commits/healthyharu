/* =====================================================================
   symptom-checker.js — 증상 자가진단 도구
   흐름: 부위 선택 → 세부 증상 체크 → 결과 카드(의심상태 / red flag / 자가관리)
   ===================================================================== */
(function () {
  var DATA = null;
  var selectedPart = null;
  var selectedSymptom = null;       // 증상 키(예: knee-pain)
  var checked = [];                  // 체크된 세부 증상

  var $ = function (id) { return document.getElementById(id); };
  var supMap = {};                   // 영양제 id→name 캐시(관련 영양제 표시용)

  function loadData() {
    Promise.all([
      fetch("../data/symptoms.json").then(function (r) { return r.json(); }),
      fetch("../data/supplements.json").then(function (r) { return r.json(); }).catch(function () { return null; })
    ]).then(function (res) {
      DATA = res[0];
      if (res[1]) {
        Object.keys(res[1].supplements).forEach(function (k) {
          supMap[k] = res[1].supplements[k].name;
        });
      }
      renderParts();
    }).catch(function () {
      $("sc-parts").innerHTML = "<p class='muted'>데이터를 불러오지 못했습니다. 새로고침 해주세요.</p>";
    });
  }

  /* 1단계: 부위 버튼 */
  function renderParts() {
    var html = DATA.bodyParts.map(function (p) {
      return '<button type="button" class="choice-btn" data-part="' + p.id + '">' +
             '<span aria-hidden="true">' + p.icon + '</span> ' + p.name + '</button>';
    }).join("");
    $("sc-parts").innerHTML = html;
    $("sc-parts").querySelectorAll("[data-part]").forEach(function (b) {
      b.addEventListener("click", function () { selectPart(b.getAttribute("data-part"), b); });
    });
  }

  function selectPart(partId, btn) {
    selectedPart = partId;
    selectedSymptom = null;
    checked = [];
    $("sc-parts").querySelectorAll(".choice-btn").forEach(function (b) { b.classList.remove("selected"); });
    btn.classList.add("selected");

    // 해당 부위의 증상 목록
    var keys = Object.keys(DATA.symptoms).filter(function (k) {
      return DATA.symptoms[k].bodyPart === partId;
    });
    var html = keys.map(function (k) {
      return '<button type="button" class="choice-btn" data-symptom="' + k + '">' +
             DATA.symptoms[k].name + "</button>";
    }).join("");
    $("sc-symptom-list").innerHTML = html || "<p class='muted'>준비 중인 부위입니다.</p>";
    $("sc-symptom-list").querySelectorAll("[data-symptom]").forEach(function (b) {
      b.addEventListener("click", function () { selectSymptom(b.getAttribute("data-symptom"), b); });
    });
    $("sc-step2").classList.remove("hidden");
    $("sc-step3").classList.add("hidden");
    $("sc-result").classList.add("hidden");
    $("sc-step2").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* 2단계: 세부 증상 체크 */
  function selectSymptom(symKey, btn) {
    selectedSymptom = symKey;
    checked = [];
    $("sc-symptom-list").querySelectorAll(".choice-btn").forEach(function (b) { b.classList.remove("selected"); });
    btn.classList.add("selected");

    var sym = DATA.symptoms[symKey];
    var html = sym.relatedSymptoms.map(function (s, i) {
      return '<label class="check-item"><input type="checkbox" value="' + i + '"> <span>' + s + "</span></label>";
    }).join("");
    $("sc-detail-title").textContent = "「" + sym.name + "」— 해당되는 것을 모두 눌러주세요";
    $("sc-detail-list").innerHTML = html;
    $("sc-detail-list").querySelectorAll(".check-item").forEach(function (item) {
      var cb = item.querySelector("input");
      item.addEventListener("click", function (e) {
        if (e.target.tagName !== "INPUT") { cb.checked = !cb.checked; }
        item.classList.toggle("checked", cb.checked);
      });
    });
    $("sc-step3").classList.remove("hidden");
    $("sc-result").classList.add("hidden");
    $("sc-step3").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* 3단계: 결과 */
  function showResult() {
    if (!selectedSymptom) return;
    var sym = DATA.symptoms[selectedSymptom];

    var relSup = (sym.relatedSupplements || []).map(function (id) {
      return supMap[id] || id;
    });

    var relatedLinks = "";
    if (sym.article || relSup.length) {
      relatedLinks = '<div class="result-card result-info"><h3>🔗 더 알아보기</h3><ul>';
      if (sym.article) relatedLinks += '<li><a href="../' + sym.article + '">「' + sym.name + '」 자세한 정보 글 보기</a></li>';
      if (relSup.length) relatedLinks += '<li>관련 영양제: ' + relSup.join(", ") +
        ' &nbsp;→ <a href="supplement-finder.html">영양제 추천·궁합 확인</a></li>';
      relatedLinks += "</ul></div>";
    }

    var html =
      '<h2 class="text-center mb-md">「' + sym.name + '」 자가진단 결과</h2>' +

      '<div class="result-card result-info"><h3>🔎 관련 있을 수 있는 상태</h3><ul>' +
        sym.possibleConditions.map(function (c) { return "<li>" + c + "일 수 있습니다.</li>"; }).join("") +
      '</ul><p class="muted" style="margin:.5em 0 0;">※ 원인은 다양하며, 정확한 진단은 진료가 필요합니다.</p></div>' +

      '<div class="result-card result-danger"><h3>🚨 이럴 땐 꼭 병원에 가세요</h3><ul>' +
        sym.redFlags.map(function (c) { return "<li>" + c + "</li>"; }).join("") +
      '</ul></div>' +

      '<div class="result-card result-ok"><h3>🏠 집에서 할 수 있는 관리</h3><ul>' +
        sym.selfCare.map(function (c) { return "<li>" + c + "</li>"; }).join("") +
      '</ul></div>' +

      relatedLinks +

      '<div class="disclaimer-box strong"><span class="di-icon">⚠️</span> ' +
      '본 결과는 <b>참고용</b>이며 의학적 진단이 아닙니다. 증상이 지속·악화되면 반드시 ' +
      '<b>의사·약사와 상담</b>하세요. 응급 증상은 즉시 <b>119</b>.</div>' +

      '<div class="text-center mt-lg"><button type="button" class="btn btn-outline" id="sc-restart">처음부터 다시 하기</button></div>';

    $("sc-result").innerHTML = html;
    $("sc-result").classList.remove("hidden");
    $("sc-restart").addEventListener("click", restart);
    $("sc-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function restart() {
    selectedPart = null; selectedSymptom = null; checked = [];
    $("sc-parts").querySelectorAll(".choice-btn").forEach(function (b) { b.classList.remove("selected"); });
    $("sc-step2").classList.add("hidden");
    $("sc-step3").classList.add("hidden");
    $("sc-result").classList.add("hidden");
    $("sc-top").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadData();
    $("sc-show-result").addEventListener("click", showResult);
  });
})();
