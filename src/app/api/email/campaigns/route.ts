import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { supabase } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";

// Create Gmail SMTP transporter
function createTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// GET: List campaigns
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    await sendTelegramAlert("Email campaigns GET error", error);
    console.error("Email campaigns error:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// POST: Create and send email campaign via Gmail SMTP
export async function POST(request: NextRequest) {
  try {
    const { template_id, contact_ids, campaign_name } = await request.json();

    const transporter = createTransporter();
    if (!transporter) {
      return NextResponse.json(
        { error: "Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ error: "No subscribed contacts selected" }, { status: 400 });
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("email_campaigns")
      .insert({
        template_id,
        name: campaign_name || `Campaign — ${new Date().toLocaleDateString("en-IN")}`,
        status: "SENDING",
        total_recipients: contacts.length,
        sent_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    let sentCount = 0;
    let failedCount = 0;
    const gmailUser = process.env.GMAIL_USER!;
    const fromName = template.from_name || "Concepts & Design";

    // Send emails one by one (Gmail rate limit: ~20/sec, safe at 1/sec for bulk)
    for (const contact of contacts) {
      try {
        const personalizedHtml = (template.html_body || "")
          .replace(/\{\{name\}\}/g, contact.name || "there")
          .replace(/\{\{email\}\}/g, contact.email || "")
          .replace(/\{\{company\}\}/g, contact.company || "");

        await transporter.sendMail({
          from: `"${fromName}" <${gmailUser}>`,
          to: contact.email,
          subject: template.subject,
          html: personalizedHtml,
        });
        sentCount++;
      } catch (err) {
        failedCount++;
        console.error(`Failed to send to ${contact.email}:`, err);
      }

      // Small delay to avoid Gmail rate limits
      if (contacts.length > 10) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // Update campaign status
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
      message: `${sentCount} email(s) sent, ${failedCount} failed`,
    });
  } catch (error) {
    await sendTelegramAlert("Email campaign send error", error);
    console.error("Email campaign error:", error);
    return NextResponse.json({ error: "Failed to send campaign" }, { status: 500 });
  }
}
