import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || "dummy-key";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `You are an AI assistant for "Concepts & Design" an architecture firm.
Analyze incoming messages. Your goal is to determine if a message is a "Warm Lead" or a "General Inquiry".
A "Warm Lead" expresses specific interest in services, projects, hiring, or requests a quote/consultation.
A "General Inquiry" is just saying hi, simple praise ("nice video"), or generic spam/questions.

Respond EXACTLY in this JSON format:
{
  "category": "WARM_LEAD" | "GENERAL",
  "extractedInfo": {
    "name": "extracted name if any, or null",
    "email": "extracted email if any, or null",
    "phone": "extracted phone if any, or null",
    "notes": "Brief summary of what they want"
  },
  "autoReply": "If GENERAL, generate a polite response thanking them. If WARM_LEAD, generate a polite response saying our team will contact them shortly."
}`
});

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

    // Verify it's from a page subscription
    if (body.object !== "page" && body.object !== "instagram") {
      return NextResponse.json({ error: "Not a page/instagram event" }, { status: 404 });
    }

    // Process each entry in the webhook payload (usually just one)
    for (const entry of body.entry) {
      const event = entry.messaging?.[0];
      if (!event || !event.message || !event.message.text) continue;

      const senderId = event.sender.id;
      const messageText = event.message.text;

      console.log(`Received message from ${senderId}: ${messageText}`);

      // Call Gemini for Categorization
      let category = "GENERAL";
      let extractedInfo = { name: "Meta User", email: "", phone: "", notes: messageText };
      let autoReplyMsg = "Thanks for reaching out! We will get back to you soon.";

      if (apiKey !== "dummy-key") {
        try {
          const result = await model.generateContent(messageText);
          const responseText = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "");
          const parsed = JSON.parse(responseText);
          
          category = parsed.category;
          if (parsed.extractedInfo) {
             extractedInfo.name = parsed.extractedInfo.name || "Meta User";
             extractedInfo.email = parsed.extractedInfo.email || "";
             extractedInfo.phone = parsed.extractedInfo.phone || "";
             extractedInfo.notes = parsed.extractedInfo.notes || messageText;
          }
          autoReplyMsg = parsed.autoReply || autoReplyMsg;
          console.log("LLM Classification Output:", parsed);
        } catch (llmError) {
          console.error("LLM parsing error:", llmError);
        }
      }

      // If WARM_LEAD, save to Database
      if (category === "WARM_LEAD" || messageText.toLowerCase().includes("quote") || messageText.toLowerCase().includes("cost")) {
        await prisma.lead.create({
          data: {
            name: extractedInfo.name,
            email: extractedInfo.email || `${senderId}@meta.com`,
            phone: extractedInfo.phone,
            source: body.object === "instagram" ? "INSTAGRAM" : "FACEBOOK",
            status: "NEW",
            notes: `[Meta DM] ${extractedInfo.notes}`
          }
        });
        console.log("✅ New Warm Lead Saved to DB!");
      }

      // Send Auto-Reply (Mocked for now since we don't have Graph API access token)
      console.log(`📤 Sending Auto-Reply to ${senderId}: ${autoReplyMsg}`);
      
      // Actual implementation would be:
      // await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      //   method: 'POST', body: JSON.stringify({ recipient: { id: senderId }, message: { text: autoReplyMsg } })
      // })
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });

  } catch (error) {
    console.error("Meta Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
