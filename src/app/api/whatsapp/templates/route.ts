import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: Fetch all templates
export async function GET() {
  try {
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("id")
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json([]);
    }

    const { data, error } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("config_id", config.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("WA templates error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Create new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("id")
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({
        config_id: config.id,
        name: body.name,
        language: body.language || "en",
        category: body.category || "MARKETING",
        body: body.body,
        header: body.header || "",
        footer: body.footer || "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("WA template create error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

// DELETE: Remove template
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WA template delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
