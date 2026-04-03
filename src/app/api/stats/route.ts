import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const [
      { count: pendingContent },
      { count: approvedContent },
      { count: totalLeads },
      { count: newLeads },
      { count: totalIgAccounts },
      { count: totalWaCampaigns },
      { count: totalEmailCampaigns },
    ] = await Promise.all([
      supabase.from("content_queue").select("*", { count: "exact", head: true }).eq("status", "PENDING_APPROVAL"),
      supabase.from("content_queue").select("*", { count: "exact", head: true }).eq("status", "APPROVED"),
      supabase.from("leads").select("*", { count: "exact", head: true }),
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "NEW"),
      supabase.from("instagram_accounts").select("*", { count: "exact", head: true }),
      supabase.from("whatsapp_campaigns").select("*", { count: "exact", head: true }),
      supabase.from("email_campaigns").select("*", { count: "exact", head: true }),
    ]);

    // Get latest IG account stats
    const { data: igAccount } = await supabase
      .from("instagram_accounts")
      .select("followers_count, media_count, username")
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      pendingContent: pendingContent ?? 0,
      approvedContent: approvedContent ?? 0,
      totalLeads: totalLeads ?? 0,
      newLeads: newLeads ?? 0,
      igConnected: (totalIgAccounts ?? 0) > 0,
      igFollowers: igAccount?.followers_count ?? 0,
      igPosts: igAccount?.media_count ?? 0,
      igUsername: igAccount?.username ?? null,
      waCampaigns: totalWaCampaigns ?? 0,
      emailCampaigns: totalEmailCampaigns ?? 0,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
