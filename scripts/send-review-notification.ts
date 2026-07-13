/**
 * send-review-notification.ts — 검토 요청 알림.
 * 시크릿이 있으면 텔레그램으로 전송, 없으면 콘솔에 '보낼 내용'만 출력(안전 기본값).
 * 시크릿은 절대 커밋하지 않는다. CI 에서 환경변수로 주입한다.
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  (텔레그램)
 *   REVIEW_EMAIL_TO                        (이메일 수신자 — 실제 발송은 CI 액션/서비스로 연결)
 */
export async function notify(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (token && chat) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text: message, disable_web_page_preview: true }),
      });
      console.log(res.ok ? "텔레그램 알림 전송됨" : `텔레그램 실패: ${res.status}`);
    } catch (e) { console.error("텔레그램 오류:", (e as Error).message); }
  } else {
    console.log("── 알림 시크릿 미설정 → 전송하지 않고 내용만 출력 ──");
    console.log(message);
    if (process.env.REVIEW_EMAIL_TO) console.log(`(이메일 수신 예정: ${process.env.REVIEW_EMAIL_TO})`);
  }
}

if (process.argv[1]?.endsWith("send-review-notification.ts")) {
  const msg = process.argv.slice(2).join(" ") || "검토 요청 테스트 메시지";
  notify(msg);
}
