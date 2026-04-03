import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: List contacts
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("email_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Email contacts error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Add contacts (single or bulk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contacts = Array.isArray(body) ? body : [body];

    const insertData = contacts.map((c: { name: string; email: string; tags?: string }) => ({
      name: c.name,
      email: c.email,
      tags: c.tags || "",
    }));

    const { data, error } = await supabase
      .from("email_contacts")
      .insert(insertData)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, count: data?.length || 0 });
  } catch (error) {
    console.error("Email contact create error:", error);
    return NextResponse.json({ error: "Failed to add contacts" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from("email_contacts").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email contact delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
