import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const WA_API = "https://graph.facebook.com/v21.0";

// POST: Send bulk messages (create campaign + send)
export async function POST(request: NextRequest) {
  try {
    const { template_id, contact_ids, campaign_name } = await request.json();

    // Get config
    const { data: config } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .single();

    if (!config) {
      return NextResponse.json({ error: "WhatsApp not configured" }, { status: 400 });
    }

    // Get template
    const { data: template } = await supabase
      .from("whatsapp_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get contacts
    const { data: contacts } = await supabase
      .from("whatsapp_contacts")
      .select("*")
      .in("id", contact_ids);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts selected" }, { status: 400 });
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        config_id: config.id,
        template_id,
        name: campaign_name || `Campaign ${new Date().toLocaleDateString()}`,
        status: "SENDING",
        total_contacts: contacts.length,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    let sentCount = 0;
    let failedCount = 0;

    // Send messages to each contact
    for (const contact of contacts) {
      try {
        const res = await fetch(
          `${WA_API}/${config.phone_number_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${config.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: contact.phone.replace(/[^0-9]/g, ""),
              type: "template",
              template: {
                name: template.name,
                language: { code: template.language },
              },
            }),
          }
        );

        const result = await res.json();

        if (res.ok && result.messages?.[0]?.id) {
          await supabase.from("whatsapp_messages").insert({
            campaign_id: campaign.id,
            contact_id: contact.id,
            wa_message_id: result.messages[0].id,
            status: "SENT",
            sent_at: new Date().toISOString(),
          });
          sentCount++;
        } else {
          await supabase.from("whatsapp_messages").insert({
            campaign_id: campaign.id,
            contact_id: contact.id,
            status: "FAILED",
            error_message: result.error?.message || "Unknown error",
          });
          failedCount++;
        }
      } catch (sendError) {
        await supabase.from("whatsapp_messages").insert({
          campaign_id: campaign.id,
          contact_id: contact.id,
          status: "FAILED",
          error_message: sendError instanceof Error ? sendError.message : "Send failed",
        });
        failedCount++;
      }
    }

    // Update campaign
    await supabase
      .from("whatsapp_campaigns")
      .update({
        status: "COMPLETED",
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);

    return NextResponse.json({
      success: true,
      campaign_id: campaign.id,
      sent: sentCount,
      failed: failedCount,
      total: contacts.length,
    });
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: "Failed to send messages" }, { status: 500 });
  }
}
