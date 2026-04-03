import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * POST /api/drive/connect
 * 
 * Saves Google Drive credentials to the .env file and validates the connection
 * by attempting to list files from the specified folder.
 */
export async function POST(request: NextRequest) {
  try {
    const { folderId, clientId, clientSecret, refreshToken } = await request.json();

    if (!folderId) {
      return NextResponse.json({ error: "Google Drive Folder ID is required" }, { status: 400 });
    }

    // Update .env file
    const envPath = path.resolve(process.cwd(), ".env");
    let envContent = await fs.readFile(envPath, "utf-8");

    const updates: Record<string, string> = {
      GOOGLE_DRIVE_MEDIA_FOLDER_ID: folderId,
    };
    if (clientId) updates.GOOGLE_CLIENT_ID = clientId;
    if (clientSecret) updates.GOOGLE_CLIENT_SECRET = clientSecret;
    if (refreshToken) updates.GOOGLE_OAUTH_REFRESH_TOKEN = refreshToken;

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}="${value}"`);
      } else {
        envContent += `\n${key}="${value}"`;
      }

      // Also set in current process
      process.env[key] = value;
    }

    await fs.writeFile(envPath, envContent, "utf-8");

    // Try to validate the connection by listing files
    let fileCount = 0;
    let files: { id: string; name: string; type: string }[] = [];

    if (clientId && clientSecret && refreshToken) {
      try {
        // Attempt to get an access token
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }),
        });

        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          const accessToken = tokenData.access_token;

          // List files in the folder
          const mimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "image/gif"];
          const mimeQuery = mimeTypes.map((m) => `mimeType='${m}'`).join(" or ");
          const query = `'${folderId}' in parents and (${mimeQuery}) and trashed=false`;

          const params = new URLSearchParams({
            q: query,
            fields: "files(id,name,mimeType)",
            pageSize: "20",
            orderBy: "createdTime desc",
          });

          const listRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?${params}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (listRes.ok) {
            const listData = await listRes.json();
            fileCount = listData.files?.length || 0;
            files = (listData.files || []).map((f: { id: string; name: string; mimeType: string }) => ({
              id: f.id,
              name: f.name,
              type: f.mimeType.startsWith("video/") ? "VIDEO" : "IMAGE",
            }));
          }
        }
      } catch (e) {
        console.warn("Drive validation failed (credentials may be invalid):", e);
      }
    }

    return NextResponse.json({
      success: true,
      fileCount,
      files,
      message: fileCount > 0
        ? `Connected! Found ${fileCount} media files in your Drive folder.`
        : "Credentials saved. Drive connection will be validated on next use.",
    });
  } catch (error) {
    console.error("Drive connect error:", error);
    return NextResponse.json(
      { error: "Failed to save Drive configuration", details: String(error) },
      { status: 500 }
    );
  }
}
