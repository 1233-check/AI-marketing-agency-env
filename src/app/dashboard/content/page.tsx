"use client";

import { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  content_type: string;
  caption: string;
  hashtags: string;
  status: string;
  scheduled_for: string | null;
  performance_reasoning: string;
  media_url: string;
  suggested_media_prompt: string;
  created_at: string;
}

interface DriveStatus {
  configured: boolean;
  fileCount: number;
  error?: string;
}

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<DriveStatus>({ configured: false, fileCount: 0 });
  const [showDriveSetup, setShowDriveSetup] = useState(false);
  const [driveForm, setDriveForm] = useState({ folderId: "", clientId: "", clientSecret: "", refreshToken: "" });
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveFiles, setDriveFiles] = useState<{ id: string; name: string; type: string }[]>([]);

  const fetchItems = async () => {
    try {
      const url = filter === "ALL" ? "/api/content" : `/api/content?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const checkDriveStatus = async () => {
    try {
      const res = await fetch("/api/drive");
      const data = await res.json();
      setDriveStatus({
        configured: data.configured !== false,
        fileCount: data.files?.length || 0,
        error: data.error,
      });
      if (data.files?.length) {
        setDriveFiles(data.files.slice(0, 8));
      }
    } catch {
      setDriveStatus({ configured: false, fileCount: 0 });
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
    checkDriveStatus();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await fetch("/api/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await fetchItems();
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  const triggerGeneration = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 3 }),
      });
      const data = await res.json();
      if (data.success) {
        setGenResult(`✅ Generated ${data.generated} content pieces (${data.driveMediaAvailable} Drive media paired)`);
        await fetchItems();
      } else {
        setGenResult(`❌ ${data.error || "Generation failed"}`);
      }
    } catch (e) {
      setGenResult(`❌ Error: ${String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const saveDriveConfig = async () => {
    setDriveSaving(true);
    try {
      const res = await fetch("/api/drive/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(driveForm),
      });
      const data = await res.json();
      if (data.success) {
        setDriveStatus({ configured: true, fileCount: data.fileCount || 0 });
        setShowDriveSetup(false);
        if (data.files?.length) setDriveFiles(data.files.slice(0, 8));
      } else {
        alert(data.error || "Failed to connect Google Drive");
      }
    } catch (e) {
      alert(`Error: ${String(e)}`);
    } finally {
      setDriveSaving(false);
    }
  };

  const filters = ["ALL", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "REJECTED"];
  const filterLabels: Record<string, string> = {
    ALL: "All",
    PENDING_APPROVAL: "Pending",
    APPROVED: "Approved",
    PUBLISHED: "Published",
    REJECTED: "Rejected",
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content AI</h1>
          <p className="page-subtitle">
            AI-generated content queue — review, approve, and schedule for publishing
          </p>
        </div>
      </div>

      {/* AI Engine Controls */}
      <div className="content-engine-panel">
        <div className="engine-info">
          <div className="engine-info-row">
            <div className="engine-status-item">
              <span className="engine-label">AI Engine</span>
              <span className="engine-value">
                <span className="status-dot status-dot-active" /> Gemini 2.0 Flash
              </span>
            </div>
            <div className="engine-status-item">
              <span className="engine-label">Cycle</span>
              <span className="engine-value">Every 3 days</span>
            </div>
            <div className="engine-status-item">
              <span className="engine-label">Google Drive</span>
              <span className="engine-value">
                {driveStatus.configured ? (
                  <><span className="status-dot status-dot-active" /> {driveStatus.fileCount} media files</>
                ) : (
                  <><span className="status-dot status-dot-inactive" /> Not configured</>
                )}
              </span>
            </div>
          </div>
          <button
            className="action-btn action-btn-generate"
            onClick={triggerGeneration}
            disabled={generating}
          >
            {generating ? (
              <><span className="login-spinner" style={{ width: 14, height: 14 }} /> Generating...</>
            ) : (
              "🤖 Generate Content Now"
            )}
          </button>
        </div>
        {genResult && (
          <div className={`gen-result ${genResult.startsWith("✅") ? "gen-result-success" : "gen-result-error"}`}>
            {genResult}
          </div>
        )}

        {/* Google Drive Connection Section */}
        {!driveStatus.configured ? (
          <div className="drive-connect-section">
            <div className="drive-connect-header">
              <div className="drive-connect-info">
                <span style={{ fontSize: 20 }}>📁</span>
                <div>
                  <h4 className="drive-connect-title">Connect Google Drive</h4>
                  <p className="drive-connect-desc">
                    Link your Drive folder to pair rendered videos & images with AI-generated content
                  </p>
                </div>
              </div>
              <button
                className="action-btn action-btn-generate"
                onClick={() => setShowDriveSetup(!showDriveSetup)}
                style={{ background: showDriveSetup ? "var(--text-muted)" : undefined }}
              >
                {showDriveSetup ? "Cancel" : "⚙️ Setup Connection"}
              </button>
            </div>

            {showDriveSetup && (
              <div className="drive-setup-form">
                <div className="drive-form-grid">
                  <div className="drive-form-field">
                    <label className="login-label">Google Drive Folder ID</label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder="e.g. 1AbCd2EfGhIj3KlMnOpQr"
                      value={driveForm.folderId}
                      onChange={(e) => setDriveForm({ ...driveForm, folderId: e.target.value })}
                    />
                    <span className="drive-form-hint">Found in your Google Drive folder URL after /folders/</span>
                  </div>
                  <div className="drive-form-field">
                    <label className="login-label">Google Client ID</label>
                    <input
                      className="login-input"
                      type="text"
                      placeholder="xxxxxxxx.apps.googleusercontent.com"
                      value={driveForm.clientId}
                      onChange={(e) => setDriveForm({ ...driveForm, clientId: e.target.value })}
                    />
                  </div>
                  <div className="drive-form-field">
                    <label className="login-label">Google Client Secret</label>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="••••••••••••"
                      value={driveForm.clientSecret}
                      onChange={(e) => setDriveForm({ ...driveForm, clientSecret: e.target.value })}
                    />
                  </div>
                  <div className="drive-form-field">
                    <label className="login-label">OAuth Refresh Token</label>
                    <input
                      className="login-input"
                      type="password"
                      placeholder="••••••••••••"
                      value={driveForm.refreshToken}
                      onChange={(e) => setDriveForm({ ...driveForm, refreshToken: e.target.value })}
                    />
                  </div>
                </div>
                <div className="drive-form-actions">
                  <button
                    className="action-btn action-btn-generate"
                    onClick={saveDriveConfig}
                    disabled={driveSaving || !driveForm.folderId}
                  >
                    {driveSaving ? "Connecting..." : "🔗 Connect Google Drive"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="drive-connected-section">
            <div className="drive-connect-header">
              <div className="drive-connect-info">
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <h4 className="drive-connect-title">Google Drive Connected</h4>
                  <p className="drive-connect-desc">
                    {driveStatus.fileCount} media files available for content pairing
                  </p>
                </div>
              </div>
              <button
                className="filter-btn"
                onClick={() => checkDriveStatus()}
              >
                🔄 Refresh
              </button>
            </div>
            {driveFiles.length > 0 && (
              <div className="drive-file-preview">
                {driveFiles.map((f) => (
                  <div key={f.id} className="drive-file-chip">
                    <span>{f.type === "VIDEO" ? "🎬" : "🖼️"}</span>
                    <span className="drive-file-name">{f.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "filter-btn-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {filterLabels[f] || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <span className="login-spinner" />
          <p>Loading content...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No content in queue. Click <strong>"Generate Content Now"</strong> above or wait for the automatic 3-day cycle.</p>
        </div>
      ) : (
        <div className="content-list">
          {items.map((item) => (
            <div key={item.id} className="content-card">
              <div className="content-card-header">
                <div className="content-card-meta">
                  <span className={`badge badge-type badge-type-${item.content_type.toLowerCase()}`}>
                    {item.content_type}
                  </span>
                  {item.scheduled_for && (
                    <span className="content-card-platform">
                      📅 {new Date(item.scheduled_for).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
                <span className={`badge badge-status badge-status-${item.status.toLowerCase().replace("_", "-")}`}>
                  {item.status.replace("_", " ")}
                </span>
              </div>

              <p className="content-card-body">{item.caption}</p>
              
              {item.hashtags && (
                <p className="content-card-body" style={{ color: "var(--accent)", marginTop: 8, fontSize: 12 }}>
                  {item.hashtags}
                </p>
              )}

              {item.media_url && (
                <div className="content-media-link">
                  <a href={item.media_url} target="_blank" rel="noopener noreferrer">
                    📁 View attached media
                  </a>
                </div>
              )}

              {item.suggested_media_prompt && !item.media_url && (
                <div className="content-media-suggestion">
                  <strong>🎨 Media suggestion:</strong> {item.suggested_media_prompt}
                </div>
              )}

              {item.performance_reasoning && (
                <div className="lead-card-notes" style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 11, color: "var(--text-muted)" }}>🤖 AI REASONING:</strong><br />
                  {item.performance_reasoning}
                </div>
              )}

              <div className="content-card-footer">
                <span className="content-card-date">
                  {new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>

                {item.status === "PENDING_APPROVAL" && (
                  <div className="content-card-actions">
                    <button
                      className="action-btn action-btn-approve"
                      onClick={() => updateStatus(item.id, "APPROVED")}
                      disabled={updating === item.id}
                    >
                      {updating === item.id ? "..." : "✓ Approve"}
                    </button>
                    <button
                      className="action-btn action-btn-reject"
                      onClick={() => updateStatus(item.id, "REJECTED")}
                      disabled={updating === item.id}
                    >
                      {updating === item.id ? "..." : "✗ Reject"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
