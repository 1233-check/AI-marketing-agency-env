import { NextRequest, NextResponse } from "next/server";
import { listMediaFiles, listSubfolders } from "@/lib/google-drive";

/**
 * Google Drive API — browse and manage media files for content pairing
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const folderId = searchParams.get("folderId") || undefined;

    if (action === "folders") {
      const parentId = folderId || process.env.GOOGLE_DRIVE_MEDIA_FOLDER_ID;
      if (!parentId) {
        return NextResponse.json({ error: "No folder ID configured" }, { status: 400 });
      }
      const folders = await listSubfolders(parentId);
      return NextResponse.json({ folders });
    }

    // Default: list media files
    const files = await listMediaFiles(folderId);
    return NextResponse.json({
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
        mimeType: f.mimeType,
        size: f.size,
        thumbnail: f.thumbnailLink,
        viewLink: f.webViewLink,
        created: f.createdTime,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // If Google Drive isn't configured, return a helpful message
    if (message.includes("Missing Google Drive credentials")) {
      return NextResponse.json({
        configured: false,
        error: "Google Drive not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN, and GOOGLE_DRIVE_MEDIA_FOLDER_ID to .env",
        files: [],
      });
    }

    console.error("Drive API error:", error);
    return NextResponse.json({ error: message, files: [] }, { status: 500 });
  }
}
