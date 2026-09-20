// API route ฝั่ง server — เก็บ bot token ไว้ที่นี่เท่านั้น ไม่หลุดไปฝั่ง browser
export async function POST(request) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error("[notify] ไม่ได้ตั้งค่า env vars:", {
      hasToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
    });
    return Response.json(
      { ok: false, error: "ยังไม่ได้ตั้งค่า Telegram env vars" },
      { status: 500 }
    );
  }

  try {
    const { messages } = await request.json();
    const results = [];

    for (const messageText of messages) {
      const res = await fetch(
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

      const data = await res.json();
      results.push(data);

      // สำคัญ: log ผลลัพธ์จริงจาก Telegram ไว้เสมอ ไม่ว่าสำเร็จหรือพัง
      // เข้าไปดูได้ที่ Vercel > โปรเจกต์ > Logs
      if (!data.ok) {
        console.error("[notify] Telegram ปฏิเสธข้อความ:", data);
      } else {
        console.log("[notify] ส่งสำเร็จ:", data.result?.message_id);
      }
    }

    // ถ้ามีข้อความไหนที่ Telegram ปฏิเสธ ให้ตอบ error กลับไปตามจริง
    const allOk = results.every((r) => r.ok);
    return Response.json({ ok: allOk, results });
  } catch (error) {
    console.error("[notify] เกิด exception:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
