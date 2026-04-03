import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Meta Webhook Verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "concepts-design-meta-token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Meta Webhook Verified!");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verify token" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object !== "page" && body.object !== "instagram") {
      return NextResponse.json({ error: "Not a page/instagram event" }, { status: 404 });
    }

    for (const entry of body.entry) {
      const event = entry.messaging?.[0];
      if (!event || !event.message || !event.message.text) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;
      console.log(`Received message from ${senderId}: ${messageText}`);

      // Classify with Gemini
      let category = "GENERAL";
      let extractedInfo = { name: "Meta User", email: "", phone: "", notes: messageText };

      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const prompt = `Analyze this Instagram/Facebook DM and classify it.
Is it a "WARM_LEAD" (interested in architecture services, quotes, consultations) or "GENERAL" (generic, praise, spam)?

Message: "${messageText}"

Respond with just "WARM_LEAD" or "GENERAL".`;

          const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 50 },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text.includes("WARM_LEAD")) category = "WARM_LEAD";
          }
        } catch (llmError) {
          console.error("LLM classification error:", llmError);
        }
      }

      // Save warm leads
      if (category === "WARM_LEAD" || messageText.toLowerCase().includes("quote") || messageText.toLowerCase().includes("cost")) {
        await supabase.from("leads").insert({
          name: extractedInfo.name,
          email: `${senderId}@meta.com`,
          source: body.object === "instagram" ? "INSTAGRAM" : "FACEBOOK",
          status: "NEW",
          notes: `[Meta DM] ${extractedInfo.notes}`,
        });
        console.log("✅ New Warm Lead Saved!");
      }

      console.log(`📤 Auto-Reply to ${senderId} (category: ${category})`);
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    console.error("Meta Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
