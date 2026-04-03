/**
 * Google Drive Integration
 *
 * Connects to the user's Google Drive to:
 * 1. List available media files (videos, images) from a designated folder
 * 2. Get shareable/downloadable links for content pairing
 * 3. Organize media by date, type, and usage status
 *
 * Requires: GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_OAUTH_REFRESH_TOKEN in .env
 */

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

// Media types the content engine cares about
const SUPPORTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "image/gif",
];

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink?: string;
  thumbnailLink?: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
}

interface DriveListResponse {
  files: DriveFile[];
  nextPageToken?: string;
}

/**
 * Get an access token from a service account JSON key or OAuth refresh token.
 */
async function getAccessToken(): Promise<string> {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      "Missing Google Drive credentials. Set GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_CLIENT_ID, and GOOGLE_CLIENT_SECRET in .env"
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token refresh failed: ${err}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * List media files from a specific Google Drive folder.
 * If no folderId is provided, uses the GOOGLE_DRIVE_MEDIA_FOLDER_ID env var.
 */
export async function listMediaFiles(
  folderId?: string,
  pageSize = 50
): Promise<DriveFile[]> {
  const token = await getAccessToken();
  const folder = folderId || process.env.GOOGLE_DRIVE_MEDIA_FOLDER_ID;

  if (!folder) {
    throw new Error(
      "No Google Drive folder ID specified. Set GOOGLE_DRIVE_MEDIA_FOLDER_ID in .env"
    );
  }

  const mimeQuery = SUPPORTED_MIME_TYPES.map(
    (m) => `mimeType='${m}'`
  ).join(" or ");

  const query = `'${folder}' in parents and (${mimeQuery}) and trashed=false`;

  const params = new URLSearchParams({
    q: query,
    fields:
      "files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime,modifiedTime),nextPageToken",
    pageSize: String(pageSize),
    orderBy: "createdTime desc",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive list failed: ${err}`);
  }

  const data: DriveListResponse = await res.json();
  return data.files || [];
}

/**
 * Get a direct download link for a file (makes it publicly viewable temporarily).
 */
export async function getFileDownloadUrl(fileId: string): Promise<string> {
  const token = await getAccessToken();

  // Create a shareable link
  await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone",
    }),
  });

  // Return the direct download link
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Get file metadata by ID
 */
export async function getFileMetadata(
  fileId: string
): Promise<DriveFile | null> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    fields:
      "id,name,mimeType,webViewLink,webContentLink,thumbnailLink,size,createdTime,modifiedTime",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}

/**
 * List subfolders in a Drive folder (for organizing by campaign/date)
 */
export async function listSubfolders(
  parentFolderId: string
): Promise<{ id: string; name: string }[]> {
  const token = await getAccessToken();

  const query = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const params = new URLSearchParams({
    q: query,
    fields: "files(id,name)",
    orderBy: "name",
  });

  const res = await fetch(`${DRIVE_API_BASE}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.files || [];
}

/**
 * Pick the best unused media files for the AI content plan.
 * Prefers recently added files that haven't been used in content_queue yet.
 */
export async function pickUnusedMedia(
  folderId: string,
  count: number,
  usedMediaUrls: string[]
): Promise<DriveFile[]> {
  const allFiles = await listMediaFiles(folderId, 100);

  // Filter out already-used files
  const unused = allFiles.filter(
    (f) =>
      !usedMediaUrls.some(
        (url) => url.includes(f.id) || url.includes(f.name)
      )
  );

  return unused.slice(0, count);
}
