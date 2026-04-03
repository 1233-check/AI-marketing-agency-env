import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET: List templates
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Email templates error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Create template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        name: body.name,
        subject: body.subject,
        html_body: body.html_body,
        from_name: body.from_name || "Concepts & Design",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Email template create error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const { error } = await supabase.from("email_templates").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email template delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
