import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY || "dummy-key";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: `You are an AI assistant for "Concepts & Design" an architecture firm.
Analyze incoming emails. Your goal is to determine if a message is a "Warm Lead" or a "General Inquiry".
A "Warm Lead" expresses specific interest in services, projects, hiring, or requests a quote/consultation.
A "General Inquiry" is just saying hi, simple praise, generic spam, or unrelated questions.

Respond EXACTLY in this JSON format:
{
  "category": "WARM_LEAD" | "GENERAL",
  "extractedInfo": {
    "name": "extracted name if any, or null",
    "phone": "extracted phone if any, or null",
    "notes": "Brief summary of what they want"
  },
  "autoReply": "If GENERAL, generate a polite response. If WARM_LEAD, generate a polite response saying our team will contact them shortly."
}`
});

export async function GET(request: NextRequest) {
  // This endpoint acts as a polling trigger (e.g. called by cron every 5 mins)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== \`Bearer \${process.env.CRON_SECRET || 'dev-secret'}\`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Initialize Gmail API client
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );

    oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    // Mock mode if credentials are missing
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.log("No Gmail credentials found. Returning mock success.");
      return NextResponse.json({ message: "Gmail polling mock executed" }, { status: 200 });
    }

    // 2. Fetch unread messages
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread -from:me",
      maxResults: 10,
    });

    const messages = res.data.messages || [];
    if (messages.length === 0) {
      return NextResponse.json({ message: "No new emails." }, { status: 200 });
    }

    let leadsAdded = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      const fullMsg = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const payload = fullMsg.data.payload;
      const headers = payload?.headers;
      
      const subjectHeader = headers?.find(h => h.name === 'Subject');
      const fromHeader = headers?.find(h => h.name === 'From');
      
      const subject = subjectHeader ? subjectHeader.value : 'No Subject';
      const from = fromHeader ? fromHeader.value : 'Unknown Sender';
      
      // Basic extraction of email from "Name <email@domain.com>"
      const emailMatch = from?.match(/<(.+)>/);
      const senderEmail = emailMatch ? emailMatch[1] : from;
      
      // Get body snippet
      const snippet = fullMsg.data.snippet || "";
      const fullText = \`Subject: \${subject}\n\n\${snippet}\`;
      
      console.log(\`Processing Email from \${senderEmail}: \${subject}\`);

      // 3. Categorize with Gemini
      let category = "GENERAL";
      let extractedInfo = { name: "Email Lead", phone: "", notes: fullText };
      let autoReplyMsg = "Thank you for your email. We will reply shortly.";

      if (apiKey !== "dummy-key") {
        try {
          const result = await model.generateContent(fullText);
          const responseText = result.response.text().replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "");
          const parsed = JSON.parse(responseText);
          
          category = parsed.category;
          if (parsed.extractedInfo) {
             extractedInfo.name = parsed.extractedInfo.name || from?.split("<")[0].trim() || "Email Lead";
             extractedInfo.phone = parsed.extractedInfo.phone || "";
             extractedInfo.notes = parsed.extractedInfo.notes || fullText;
          }
          autoReplyMsg = parsed.autoReply || autoReplyMsg;
          console.log("LLM Email Classification:", parsed);
        } catch (llmError) {
          console.error("LLM parsing error:", llmError);
        }
      }

      // 4. If WARM_LEAD, insert to Database
      if (category === "WARM_LEAD" || fullText.toLowerCase().includes("quote")) {
        await prisma.lead.create({
          data: {
            name: extractedInfo.name,
            email: senderEmail || "unknown@email.com",
            phone: extractedInfo.phone,
            source: "EMAIL",
            status: "NEW",
            notes: \`[Gmail] \${extractedInfo.notes}\`
          }
        });
        leadsAdded++;
        console.log("✅ New Warm Lead Saved from Gmail!");
      }

      // 5. Send Auto-reply (mocked for now)
      console.log(\`📤 Sending Email Reply to \${senderEmail}: \${autoReplyMsg}\`);
      
      // 6. Mark as read
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: { removeLabelIds: ["UNREAD"] }
      });
    }

    return NextResponse.json({ message: \`Processed \${messages.length} emails. Added \${leadsAdded} leads.\` }, { status: 200 });
  } catch (error) {
    console.error("Gmail Polling Error:", error);
    return NextResponse.json({ error: "Gmail error" }, { status: 500 });
  }
}
