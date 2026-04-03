/**
 * Telegram Watchdog Alert Module
 * Used to report third-party API failures to the admin.
 */
export async function sendTelegramAlert(message: string, error?: unknown) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("⚠️ Telegram Alert Module: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in .env");
    console.error("Local Error Log:", message, error);
    return;
  }

  const errorMessage = error instanceof Error ? error.message : String(error || "");
  const stack = error instanceof Error ? error.stack : "";
  
  const text = `[C&D Ecosystem Alert] 🚨
  
**Message:** ${message}

${errorMessage ? `**Error:** ${errorMessage}` : ""}

${stack ? "```\n" + stack.substring(0, 500) + "...\n```" : ""}`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      console.error("Failed to push Telegram alert. Status:", response.status);
    }
  } catch (err) {
    console.error("Critical failure in Telegram Watchdog:", err);
  }
}
