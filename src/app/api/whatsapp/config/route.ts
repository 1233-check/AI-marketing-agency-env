import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// WhatsApp Cloud API base
const WA_API = "https://graph.facebook.com/v21.0";

// GET: Fetch WhatsApp config
export async function GET() {
  try {
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("*")
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({ connected: !!config, config: config || null });
  } catch (error) {
    console.error("WhatsApp config error:", error);
    return NextResponse.json({ connected: false, config: null });
  }
}

// POST: Save WhatsApp Business config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data: adminUser } = await supabase
      .from("users")
      .select("id")
      .limit(1)
      .single();

    // Verify the token works
    if (body.access_token && body.phone_number_id) {
      try {
        const res = await fetch(
          `${WA_API}/${body.phone_number_id}?access_token=${body.access_token}`
        );
        if (res.ok) {
          const phoneData = await res.json();
          body.display_phone = phoneData.display_phone_number || "";
          body.business_name = phoneData.verified_name || "";
        }
      } catch {
        // Continue even if verification fails
      }
    }

    const { data, error } = await supabase
      .from("whatsapp_config")
      .upsert({
        user_id: adminUser?.id || null,
        phone_number_id: body.phone_number_id,
        business_account_id: body.business_account_id || "",
        access_token: body.access_token,
        display_phone: body.display_phone || "",
        business_name: body.business_name || "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, config: data });
  } catch (error) {
    console.error("WhatsApp config save error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
