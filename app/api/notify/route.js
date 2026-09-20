// API route ฝั่ง server — เก็บ bot token ไว้ที่นี่เท่านั้น ไม่หลุดไปฝั่ง browser
export async function POST(request) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return Response.json(
      { ok: false, error: "ยังไม่ได้ตั้งค่า Telegram env vars" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await request.json();

    // รับได้หลายข้อความในครั้งเดียว (เช่น แจ้งขายใหม่ + เตือนสต๊อกใกล้หมด)
    for (const messageText of messages) {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: messageText,
            parse_mode: "HTML",
          }),
        }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
