import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("content_queue")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Content API error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("content_queue")
      .insert({
        content_type: body.content_type || "POST",
        caption: body.caption,
        hashtags: body.hashtags || "",
        suggested_media_prompt: body.suggested_media_prompt || "",
        media_url: body.media_url || "",
        scheduled_for: body.scheduled_for || null,
        status: body.status || "PENDING_APPROVAL",
        performance_reasoning: body.performance_reasoning || "",
        account_id: body.account_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Content create error:", error);
    return NextResponse.json({ error: "Failed to create content" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status) updateData.status = updates.status;
    if (updates.caption) updateData.caption = updates.caption;
    if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for;
    if (updates.media_url) updateData.media_url = updates.media_url;

    const { data, error } = await supabase
      .from("content_queue")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Content update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
