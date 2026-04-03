import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Instagram Graph API base
const IG_API = "https://graph.instagram.com/v21.0";
const FB_API = "https://graph.facebook.com/v21.0";

// GET: Fetch connected account data from Instagram Graph API
export async function GET() {
  try {
    const { data: account, error } = await supabase
      .from("instagram_accounts")
      .select("*")
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !account) {
      return NextResponse.json({ connected: false, account: null });
    }

    // Refresh data from Instagram API
    if (account.access_token) {
      try {
        const res = await fetch(
          `${IG_API}/${account.ig_user_id}?fields=id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count&access_token=${account.access_token}`
        );
        
        if (res.ok) {
          const igData = await res.json();
          
          // Update local record
          await supabase
            .from("instagram_accounts")
            .update({
              username: igData.username || account.username,
              name: igData.name || account.name,
              profile_picture_url: igData.profile_picture_url || "",
              bio: igData.biography || "",
              followers_count: igData.followers_count ?? account.followers_count,
              following_count: igData.follows_count ?? account.following_count,
              media_count: igData.media_count ?? account.media_count,
              updated_at: new Date().toISOString(),
            })
            .eq("id", account.id);

          return NextResponse.json({
            connected: true,
            account: {
              ...account,
              username: igData.username || account.username,
              name: igData.name || account.name,
              profile_picture_url: igData.profile_picture_url || account.profile_picture_url,
              bio: igData.biography || account.bio,
              followers_count: igData.followers_count ?? account.followers_count,
              following_count: igData.follows_count ?? account.following_count,
              media_count: igData.media_count ?? account.media_count,
            },
          });
        }
      } catch {
        // If API call fails, return cached data
      }
    }

    return NextResponse.json({ connected: true, account });
  } catch (error) {
    console.error("Instagram account error:", error);
    return NextResponse.json({ error: "Failed to fetch account" }, { status: 500 });
  }
}

// POST: Connect a new Instagram account
export async function POST(request: NextRequest) {
  try {
    const { access_token, ig_user_id } = await request.json();

    if (!access_token) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    // If ig_user_id not provided, fetch it from the token
    let userId = ig_user_id;
    if (!userId) {
      const res = await fetch(`${IG_API}/me?fields=id,username&access_token=${access_token}`);
      if (!res.ok) {
        return NextResponse.json({ error: "Invalid access token" }, { status: 400 });
      }
      const data = await res.json();
      userId = data.id;
    }

    // Fetch full profile
    const profileRes = await fetch(
      `${IG_API}/${userId}?fields=id,username,name,profile_picture_url,biography,followers_count,follows_count,media_count&access_token=${access_token}`
    );

    if (!profileRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Instagram profile" }, { status: 400 });
    }

    const profile = await profileRes.json();

    // Get admin user
    const { data: adminUser } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();

    // Upsert the account
    const { data, error } = await supabase
      .from("instagram_accounts")
      .upsert(
        {
          ig_user_id: profile.id,
          user_id: adminUser?.id || null,
          username: profile.username || "",
          name: profile.name || "",
          profile_picture_url: profile.profile_picture_url || "",
          bio: profile.biography || "",
          followers_count: profile.followers_count || 0,
          following_count: profile.follows_count || 0,
          media_count: profile.media_count || 0,
          access_token,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ig_user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, account: data });
  } catch (error) {
    console.error("Instagram connect error:", error);
    return NextResponse.json({ error: "Failed to connect account" }, { status: 500 });
  }
}
