import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: Fetch contacts
export async function GET() {
  try {
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("id")
      .limit(1)
      .single();

    if (!config) return NextResponse.json([]);

    const { data, error } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .eq("config_id", config.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("WA contacts error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Add contacts (single or bulk CSV)
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

    // Support both single contact and bulk import
    const contacts = Array.isArray(body) ? body : [body];

    const insertData = contacts.map((c: { name: string; phone: string; email?: string; tags?: string }) => ({
      config_id: config.id,
      name: c.name,
      phone: c.phone,
      email: c.email || "",
      tags: c.tags || "",
    }));

    const { data, error } = await supabase
      .from("whatsapp_contacts")
      .insert(insertData)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (error) {
    console.error("WA contact create error:", error);
    return NextResponse.json({ error: "Failed to add contacts" }, { status: 500 });
  }
}

// DELETE: Remove contact
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("WA contact delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
