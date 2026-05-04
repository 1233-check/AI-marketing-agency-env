import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendTelegramAlert } from "@/lib/telegram";

// GET: List contacts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const list = searchParams.get("list") || "";
    const tag = searchParams.get("tag") || "";
    const subscribed = searchParams.get("subscribed");
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";

    let query = supabase
      .from("email_contacts")
      .select("*");

    // Filter by list
    if (list) {
      query = query.eq("list_name", list);
    }

    // Filter by subscription status
    if (subscribed === "true") {
      query = query.eq("subscribed", true);
    } else if (subscribed === "false") {
      query = query.eq("subscribed", false);
    }

    // Filter by tag (partial match inside comma-separated tags)
    if (tag) {
      query = query.ilike("tags", `%${tag}%`);
    }

    // Search across name, email, company
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Sort
    const ascending = order === "asc";
    query = query.order(sort, { ascending });

    const { data, error } = await query;

    if (error) throw error;

    // Extract unique lists and tags for filter options
    const allContacts = data || [];
    const lists = [...new Set(allContacts.map((c) => c.list_name).filter(Boolean))];
    const allTags = [...new Set(
      allContacts
        .flatMap((c) => (c.tags || "").split(",").map((t: string) => t.trim()))
        .filter(Boolean)
    )];

    return NextResponse.json({
      contacts: allContacts,
      meta: {
        total: allContacts.length,
        lists,
        tags: allTags,
      },
    });
  } catch (error) {
    await sendTelegramAlert("Email contacts GET error", error);
    console.error("Email contacts error:", error);
    return NextResponse.json({ contacts: [], meta: { total: 0, lists: [], tags: [] } }, { status: 500 });
  }
}

// POST: Add contacts (single, bulk JSON, or parsed Excel/CSV rows)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const contacts = Array.isArray(body) ? body : [body];

    const insertData = contacts.map((c: {
      name?: string;
      email: string;
      phone?: string;
      company?: string;
      tags?: string;
      list_name?: string;
      source?: string;
      notes?: string;
    }) => ({
      name: (c.name || "").trim(),
      email: (c.email || "").trim().toLowerCase(),
      phone: (c.phone || "").trim(),
      company: (c.company || "").trim(),
      tags: (c.tags || "").trim(),
      list_name: (c.list_name || "General").trim(),
      source: (c.source || "manual").trim(),
      notes: (c.notes || "").trim(),
    })).filter((c) => c.email && c.email.includes("@"));

    if (insertData.length === 0) {
      return NextResponse.json({ error: "No valid contacts found" }, { status: 400 });
    }

    // Upsert to handle duplicates gracefully (update existing, insert new)
    const { data, error } = await supabase
      .from("email_contacts")
      .upsert(insertData, { onConflict: "email", ignoreDuplicates: false })
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      message: `${data?.length || 0} contact(s) imported successfully`,
    });
  } catch (error) {
    await sendTelegramAlert("Email contact bulk import error", error);
    console.error("Email contact create error:", error);
    return NextResponse.json({ error: "Failed to add contacts" }, { status: 500 });
  }
}

// PATCH: Update a contact
export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing contact ID" }, { status: 400 });

    const { error } = await supabase
      .from("email_contacts")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    await sendTelegramAlert("Email contact update error", error);
    console.error("Email contact update error:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

// DELETE: Delete one or many contacts
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [body.id];

    const { error } = await supabase
      .from("email_contacts")
      .delete()
      .in("id", ids);

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    await sendTelegramAlert("Email contact delete error", error);
    console.error("Email contact delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
