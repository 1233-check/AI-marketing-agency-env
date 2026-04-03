import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * Gmail webhook / cron endpoint
 * Polls Gmail for new emails, classifies them with Gemini, and saves warm leads.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET || "dev-secret";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_REFRESH_TOKEN) {
      console.log("No Gmail credentials found. Returning mock success.");
      return NextResponse.json({ message: "Gmail polling mock executed" }, { status: 200 });
    }

    // In production, use googleapis to fetch unread emails
    // For now, return a placeholder response
    return NextResponse.json({
      message: "Gmail polling endpoint ready. Configure GMAIL_REFRESH_TOKEN to activate.",
      processed: 0,
      leadsAdded: 0,
    });
  } catch (error) {
    console.error("Gmail Polling Error:", error);
    return NextResponse.json({ error: "Gmail error" }, { status: 500 });
  }
}

/**
 * POST: Receive a webhook payload from Gmail (push notification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract email info from webhook payload
    const { from, subject, snippet } = body;

    if (!from) {
      return NextResponse.json({ error: "Missing sender info" }, { status: 400 });
    }

    // Classify with Gemini if available
    const apiKey = process.env.GEMINI_API_KEY;
    let category = "GENERAL";
    let notes = `Subject: ${subject || "No subject"}\n${snippet || ""}`;

    if (apiKey) {
      const prompt = `Analyze this email and classify it. Is it a "WARM_LEAD" (interested in architecture services, quotes, consultations) or "GENERAL" (generic, spam, unrelated)?

From: ${from}
Subject: ${subject}
Body: ${snippet}

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
    }

    // Save warm leads to database
    if (category === "WARM_LEAD") {
      await supabase.from("leads").insert({
        name: from.split("<")[0].trim() || "Email Lead",
        email: from.match(/<(.+)>/)?.[1] || from,
        source: "EMAIL",
        status: "NEW",
        notes: `[Gmail] ${notes}`,
      });
      console.log("✅ New Warm Lead Saved from Gmail!");
    }

    return NextResponse.json({
      message: `Email processed. Category: ${category}`,
      category,
    });
  } catch (error) {
    console.error("Gmail Webhook Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
