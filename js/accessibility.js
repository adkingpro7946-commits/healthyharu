/* =====================================================================
   accessibility.js — 글씨크기 3단계 / 고대비 / 음성으로 듣기
   ※ 상태는 JS 메모리 변수로만 유지 (localStorage/sessionStorage 사용 금지)
   ===================================================================== */
(function () {
  // 메모리 상태 (새로고침 시 초기화 — 저장소 미사용 원칙)
  var state = { font: "normal", contrast: false, dark: false };

  function applyFont(size) {
    var html = document.documentElement;
    html.classList.remove("font-normal", "font-large", "font-xlarge");
    html.classList.add("font-" + size);
    state.font = size;
    document.querySelectorAll(".a11y-bar [data-font]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-font") === size ? "true" : "false");
    });
  }

  function applyContrast(on) {
    document.documentElement.classList.toggle("high-contrast", on);
    state.contrast = on;
    var btn = document.getElementById("btn-contrast");
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function applyDark(on) {
    document.documentElement.classList.toggle("dark-mode", on);
    state.dark = on;
    var btn = document.getElementById("btn-dark");
    if (btn) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "☀️ 밝게" : "🌙 어둡게";
    }
  }

  /* ---------- 음성으로 듣기 (Web Speech API) ---------- */
  var speaking = false;
  var supportsTTS = ("speechSynthesis" in window);

  function getReadableText() {
    // 본문 우선순위: .article-body → main → body
    var el = document.querySelector(".article-body") ||
             document.querySelector("main") ||
             document.body;
    // 광고/도구조작부/스크립트 제외를 위해 텍스트만 추출
    var clone = el.cloneNode(true);
    clone.querySelectorAll(".ad-slot, .a11y-bar, script, style, .no-speak").forEach(function (n) { n.remove(); });
    return (clone.innerText || clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function stopSpeak() {
    if (supportsTTS) window.speechSynthesis.cancel();
    speaking = false;
    updateSpeakBtn();
  }

  function startSpeak() {
    if (!supportsTTS) {
      alert("죄송합니다. 이 브라우저에서는 '음성으로 듣기'가 지원되지 않습니다.");
      return;
    }
    window.speechSynthesis.cancel();
    var text = getReadableText();
    if (!text) return;

    // 긴 텍스트는 문장 단위로 나눠서 안정적으로 재생
    var chunks = text.match(/[^.!?。\n]+[.!?。]?/g) || [text];
    chunks.forEach(function (chunk) {
      var ut = new SpeechSynthesisUtterance(chunk.trim());
      ut.lang = "ko-KR";
      ut.rate = 0.9;   // 약간 느리게
      ut.pitch = 1.0;
      window.speechSynthesis.speak(ut);
    });

    speaking = true;
    updateSpeakBtn();

    // 재생이 끝나면 버튼 원복 (폴링)
    var poll = setInterval(function () {
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
        speaking = false;
        updateSpeakBtn();
        clearInterval(poll);
      }
    }, 500);
  }

  function updateSpeakBtn() {
    var btn = document.getElementById("btn-speak");
    if (!btn) return;
    btn.textContent = speaking ? "⏹ 멈춤" : "🔊 듣기";
    btn.setAttribute("aria-pressed", speaking ? "true" : "false");
  }

  /* ---------- 버튼 연결 ---------- */
  function bind() {
    document.querySelectorAll(".a11y-bar [data-font]").forEach(function (b) {
      b.addEventListener("click", function () { applyFont(b.getAttribute("data-font")); });
    });
    var c = document.getElementById("btn-contrast");
    if (c) c.addEventListener("click", function () { applyContrast(!state.contrast); });
    var dk = document.getElementById("btn-dark");
    if (dk) dk.addEventListener("click", function () { applyDark(!state.dark); });
    var s = document.getElementById("btn-speak");
    if (s) s.addEventListener("click", function () { speaking ? stopSpeak() : startSpeak(); });

    // 페이지 이동/숨김 시 음성 정지
    window.addEventListener("beforeunload", stopSpeak);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopSpeak();
    });

    // 초기 상태 반영
    applyFont(state.font);
    if (!supportsTTS) {
      var btn = document.getElementById("btn-speak");
      if (btn) { btn.disabled = true; btn.title = "이 브라우저는 음성 읽기를 지원하지 않습니다"; }
    }
  }

  // 헤더는 layout.js가 주입하므로 그 이후에 바인딩
  if (document.getElementById("btn-speak")) {
    bind();
  } else {
    document.addEventListener("layout:ready", bind);
  }
})();
