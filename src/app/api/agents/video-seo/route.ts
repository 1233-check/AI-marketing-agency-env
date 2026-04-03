import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, contextInfo } = await request.json();
    console.log("🎬 Agent A: Processing new video content...");

    // 1. Generate SEO Caption with Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    let caption = "Check out our latest luxury architectural masterpiece! 🏡✨ #Architecture #LuxuryHomes #ConceptsAndDesign";

    if (apiKey) {
      const prompt = `You are an expert social media manager for "Concepts & Design" luxury architecture firm.
Write a highly engaging, viral Instagram Reel caption for a video about: ${contextInfo || "luxury architecture"}

Keep it punchy, luxurious, and use appropriate spacing. Include 5-7 highly targeted SEO hashtags at the end.
Do not wrap the caption in quotes or JSON.`;

      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        caption = data.candidates?.[0]?.content?.parts?.[0]?.text || caption;
      }
    }
    console.log("✍️ Generated SEO Caption.");

    // 2. Save to content queue
    const { data: contentItem, error } = await supabase
      .from("content_queue")
      .insert({
        content_type: "REEL",
        caption,
        status: "PENDING_APPROVAL",
        media_url: videoUrl || "",
        suggested_media_prompt: contextInfo || "",
      })
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Passed to Dashboard for Human Approval!");

    return NextResponse.json({
      message: "Agent A completed successfully.",
      clipUrl: videoUrl,
      itemId: contentItem?.id,
      caption,
    });
  } catch (error) {
    console.error("Agent A Error:", error);
    return NextResponse.json({ error: "Video processing failed" }, { status: 500 });
  }
}
