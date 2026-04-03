import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const IG_API = "https://graph.instagram.com/v21.0";

// GET: Fetch all media/posts from connected Instagram account
export async function GET() {
  try {
    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("*")
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    if (!account?.access_token) {
      return NextResponse.json({ posts: [], synced: false });
    }

    // Fetch media from Graph API
    try {
      const res = await fetch(
        `${IG_API}/${account.ig_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${account.access_token}`
      );

      if (res.ok) {
        const data = await res.json();
        const posts = data.data || [];

        // Sync to database
        for (const post of posts) {
          await supabase.from("instagram_posts").upsert(
            {
              ig_media_id: post.id,
              account_id: account.id,
              media_type: post.media_type || "IMAGE",
              media_url: post.media_url || "",
              thumbnail_url: post.thumbnail_url || "",
              caption: post.caption || "",
              permalink: post.permalink || "",
              timestamp: post.timestamp,
              like_count: post.like_count || 0,
              comments_count: post.comments_count || 0,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "ig_media_id" }
          );
        }

        return NextResponse.json({ posts, synced: true, total: posts.length });
      }
    } catch {
      // Fallback to cached posts from DB
    }

    // Return from DB cache if API fails
    const { data: cachedPosts } = await supabase
      .from("instagram_posts")
      .select("*")
      .eq("account_id", account.id)
      .order("timestamp", { ascending: false });

    return NextResponse.json({ posts: cachedPosts || [], synced: false });
  } catch (error) {
    console.error("Instagram media error:", error);
    return NextResponse.json({ error: "Failed to fetch media" }, { status: 500 });
  }
}
