import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { listMediaFiles, getFileDownloadUrl } from "@/lib/google-drive";

/**
 * AI Content Generation Cron Endpoint
 *
 * Triggered every 3 days (via external cron or Vercel Cron).
 * 
 * Workflow:
 * 1. Fetch top-performing posts from Instagram analytics
 * 2. Pull available media from Google Drive
 * 3. Send performance data + media list to Gemini
 * 4. Gemini generates content plans (captions, hashtags, scheduling)
 * 5. Pairs each content piece with a Drive media file
 * 6. Saves everything to content_queue as PENDING_APPROVAL
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface PerformanceData {
  avg_likes: number;
  avg_comments: number;
  avg_saves: number;
  top_content_types: string[];
  top_hashtags: string[];
  best_posting_hours: number[];
  total_followers: number;
  engagement_rate: number;
}

interface ContentPlan {
  content_type: string;
  caption: string;
  hashtags: string;
  performance_reasoning: string;
  scheduling_day: number; // 1, 2, or 3
  scheduling_hour: number;
  media_suggestion: string; // description of ideal media
}

/**
 * GET: Trigger content generation (called by cron)
 * POST: Manual trigger with custom parameters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await generateContentPlan();
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Content Generation error:", error);
    return NextResponse.json(
      { error: "Content generation failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await generateContentPlan(body.days || 3);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Content Generation error:", error);
    return NextResponse.json(
      { error: "Content generation failed", details: String(error) },
      { status: 500 }
    );
  }
}

async function generateContentPlan(days = 3) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Step 1: Gather performance data from Supabase
  const perfData = await gatherPerformanceData();

  // Step 2: List available media from Google Drive
  let driveMedia: { id: string; name: string; type: string; url: string }[] = [];
  try {
    const files = await listMediaFiles();
    driveMedia = await Promise.all(
      files.slice(0, 20).map(async (f) => ({
        id: f.id,
        name: f.name,
        type: f.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
        url: await getFileDownloadUrl(f.id),
      }))
    );
  } catch (e) {
    console.warn("Google Drive not configured, generating text-only content:", e);
  }

  // Step 3: Get already-used media URLs to avoid repeats
  const { data: existingContent } = await supabase
    .from("content_queue")
    .select("media_url")
    .not("media_url", "eq", "");

  const usedUrls = (existingContent || []).map((c) => c.media_url).filter(Boolean);

  // Filter out already-used drive files
  const availableMedia = driveMedia.filter(
    (m) => !usedUrls.some((url) => url.includes(m.id))
  );

  // Step 4: Build the Gemini prompt
  const prompt = buildGeminiPrompt(perfData, availableMedia, days);

  // Step 5: Call Gemini
  const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!geminiRes.ok) {
    const err = await geminiRes.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const geminiData = await geminiRes.json();
  const responseText =
    geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

  let contentPlans: ContentPlan[];
  try {
    contentPlans = JSON.parse(responseText);
  } catch {
    throw new Error(`Failed to parse Gemini response: ${responseText}`);
  }

  // Step 6: Pair with Drive media and save to content_queue
  const now = new Date();
  const savedItems = [];

  for (let i = 0; i < contentPlans.length; i++) {
    const plan = contentPlans[i];

    // Calculate scheduled date
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + (plan.scheduling_day - 1));
    scheduledDate.setHours(plan.scheduling_hour || 10, 0, 0, 0);

    // Pair with a Drive media file if available
    let mediaUrl = "";
    if (availableMedia.length > i) {
      mediaUrl = availableMedia[i].url;
    }

    const { data, error } = await supabase
      .from("content_queue")
      .insert({
        content_type: plan.content_type || "POST",
        caption: plan.caption,
        hashtags: plan.hashtags || "",
        suggested_media_prompt: plan.media_suggestion || "",
        media_url: mediaUrl,
        scheduled_for: scheduledDate.toISOString(),
        status: "PENDING_APPROVAL",
        performance_reasoning: plan.performance_reasoning || "",
        account_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save content item:", error);
      continue;
    }

    savedItems.push(data);
  }

  return {
    success: true,
    generated: savedItems.length,
    items: savedItems,
    driveMediaAvailable: availableMedia.length,
    performanceSummary: {
      engagement_rate: perfData.engagement_rate,
      avg_likes: perfData.avg_likes,
      top_types: perfData.top_content_types,
    },
  };
}

async function gatherPerformanceData(): Promise<PerformanceData> {
  // Get Instagram media performance
  const { data: media } = await supabase
    .from("instagram_media")
    .select("media_type, like_count, comments_count, timestamp")
    .order("timestamp", { ascending: false })
    .limit(50);

  // Get Instagram account stats
  const { data: accounts } = await supabase
    .from("instagram_accounts")
    .select("followers_count, media_count")
    .limit(1)
    .single();

  const posts = media || [];
  const totalLikes = posts.reduce((s, p) => s + (p.like_count || 0), 0);
  const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
  const avgLikes = posts.length ? Math.round(totalLikes / posts.length) : 0;
  const avgComments = posts.length ? Math.round(totalComments / posts.length) : 0;
  const followers = accounts?.followers_count || 0;

  // Identify top content types
  const typeMap: Record<string, number> = {};
  posts.forEach((p) => {
    const type = p.media_type || "IMAGE";
    typeMap[type] = (typeMap[type] || 0) + (p.like_count || 0) + (p.comments_count || 0);
  });
  const topTypes = Object.entries(typeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => type);

  // Calculate engagement rate
  const engagementRate = followers > 0
    ? parseFloat(((totalLikes + totalComments) / (posts.length * followers) * 100).toFixed(2))
    : 0;

  return {
    avg_likes: avgLikes,
    avg_comments: avgComments,
    avg_saves: 0,
    top_content_types: topTypes.length ? topTypes : ["IMAGE", "CAROUSEL_ALBUM"],
    top_hashtags: [],
    best_posting_hours: [10, 14, 19],
    total_followers: followers,
    engagement_rate: engagementRate,
  };
}

function buildGeminiPrompt(
  perf: PerformanceData,
  availableMedia: { id: string; name: string; type: string }[],
  days: number
): string {
  const mediaList = availableMedia.length
    ? `\n\nAVAILABLE MEDIA FILES FROM GOOGLE DRIVE:\n${availableMedia
        .map((m, i) => `${i + 1}. "${m.name}" (${m.type})`)
        .join("\n")}\n\nWhen suggesting content, reference these specific files by name where appropriate. Match the file name/type to the content you're creating.`
    : "\n\nNo pre-rendered media files available. Generate text-only content with media prompts describing ideal visuals.";

  return `You are an expert social media marketing strategist for "Concepts & Design", a premium architecture and interior design firm.

PERFORMANCE DATA:
- Average Likes per post: ${perf.avg_likes}
- Average Comments per post: ${perf.avg_comments}
- Total Followers: ${perf.total_followers}
- Engagement Rate: ${perf.engagement_rate}%
- Top performing content types: ${perf.top_content_types.join(", ")}
- Best posting hours (IST): ${perf.best_posting_hours.join(", ")}
${mediaList}

TASK:
Generate exactly ${days * 2} content pieces for the next ${days} days (2 posts per day). 
Each piece should be optimized based on the performance data above.

For each content piece, provide:
1. content_type: "POST", "REEL", "CAROUSEL", or "STORY"
2. caption: Engaging caption with brand voice (premium, sophisticated)
3. hashtags: 15-20 relevant hashtags as a single string
4. performance_reasoning: Why this content will perform well based on the data
5. scheduling_day: Which day (1, 2, or 3) to post this
6. scheduling_hour: Best hour to post (24h format, IST)
7. media_suggestion: Description of ideal visual/video or reference to a specific Drive file

Respond as a JSON array of objects with the above fields. No markdown, just valid JSON.`;
}
