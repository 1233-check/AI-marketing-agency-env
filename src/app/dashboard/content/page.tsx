"use client";

import { useEffect, useState } from "react";

interface ContentItem {
  id: string;
  title: string;
  type: string;
  status: string;
  body: string;
  platform: string;
  createdAt: string;
}

const platformIcons: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  LINKEDIN: "💼",
};

const typeLabels: Record<string, string> = {
  POST: "Post",
  REEL: "Reel",
  STORY: "Story",
};

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      const url =
        filter === "ALL" ? "/api/content" : `/api/content?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchItems();
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
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const filters = ["ALL", "PENDING", "APPROVED", "REJECTED"];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content Approvals</h1>
          <p className="page-subtitle">
            Review, approve, or reject content before it goes live
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "filter-btn-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading ? (
        <div className="loading-state">
          <span className="login-spinner" />
          <p>Loading content…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No content items found.</p>
        </div>
      ) : (
        <div className="content-list">
          {items.map((item) => (
            <div key={item.id} className="content-card">
              <div className="content-card-header">
                <div className="content-card-meta">
                  <span className={`badge badge-type badge-type-${item.type.toLowerCase()}`}>
                    {typeLabels[item.type] || item.type}
                  </span>
                  <span className="content-card-platform">
                    {platformIcons[item.platform] || "🌐"} {item.platform}
                  </span>
                </div>
                <span
                  className={`badge badge-status badge-status-${item.status.toLowerCase()}`}
                >
                  {item.status}
                </span>
              </div>

              <h3 className="content-card-title">{item.title}</h3>
              <p className="content-card-body">{item.body}</p>

              <div className="content-card-footer">
                <span className="content-card-date">
                  {new Date(item.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                {item.status === "PENDING" && (
                  <div className="content-card-actions">
                    <button
                      className="action-btn action-btn-approve"
                      onClick={() => updateStatus(item.id, "APPROVED")}
                      disabled={updating === item.id}
                    >
                      {updating === item.id ? "…" : "✓ Approve"}
                    </button>
                    <button
                      className="action-btn action-btn-reject"
                      onClick={() => updateStatus(item.id, "REJECTED")}
                      disabled={updating === item.id}
                    >
                      {updating === item.id ? "…" : "✗ Reject"}
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
