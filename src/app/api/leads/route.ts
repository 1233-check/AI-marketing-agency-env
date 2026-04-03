import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Leads API error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: body.name,
        email: body.email || "",
        phone: body.phone || "",
        source: body.source || "WEBSITE",
        channel: body.channel || "",
        status: body.status || "NEW",
        score: body.score || 0,
        notes: body.notes || "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lead create error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.status) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.score !== undefined) updateData.score = updates.score;

    const { data, error } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Lead update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
