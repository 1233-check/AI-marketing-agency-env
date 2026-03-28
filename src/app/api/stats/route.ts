import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [pendingContent, approvedContent, totalLeads, newLeads] =
      await Promise.all([
        prisma.contentItem.count({ where: { status: "PENDING" } }),
        prisma.contentItem.count({ where: { status: "APPROVED" } }),
        prisma.lead.count(),
        prisma.lead.count({ where: { status: "NEW" } }),
      ]);

    return NextResponse.json({
      pendingContent,
      approvedContent,
      totalLeads,
      newLeads,
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
