import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

// GET: List campaigns
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*, email_templates(name, subject)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Email campaigns error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Create and send email campaign
export async function POST(request: NextRequest) {
  try {
    const { template_id, contact_ids, campaign_name, from_email } = await request.json();

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 400 });
    }

    const resend = new Resend(resendKey);

    // Get template
    const { data: template } = await supabase
      .from("email_templates")
      .select("*")
      .eq("id", template_id)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get contacts
    const { data: contacts } = await supabase
      .from("email_contacts")
      .select("*")
      .in("id", contact_ids)
      .eq("subscribed", true);

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: "No subscribed contacts" }, { status: 400 });
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        template_id,
        name: campaign_name || `Email Campaign ${new Date().toLocaleDateString()}`,
        status: "SENDING",
        total_recipients: contacts.length,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    let sentCount = 0;
    let failedCount = 0;

    // Send emails
    for (const contact of contacts) {
      try {
        await resend.emails.send({
          from: from_email || `${template.from_name} <onboarding@resend.dev>`,
          to: [contact.email],
          subject: template.subject,
          html: template.html_body.replace(/\{\{name\}\}/g, contact.name),
        });
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    // Update campaign
    await supabase
      .from("email_campaigns")
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
    });
  } catch (error) {
    console.error("Email campaign error:", error);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
