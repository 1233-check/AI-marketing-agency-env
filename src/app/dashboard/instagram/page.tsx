"use client";

import { useEffect, useState } from "react";

interface IgAccount {
  username: string;
  name: string;
  profile_picture_url: string;
  bio: string;
  followers_count: number;
  following_count: number;
  media_count: number;
}

interface IgPost {
  id: string;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  caption: string;
  permalink: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
}

export default function InstagramPage() {
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "posts">("overview");

  useEffect(() => {
    fetchAccount();
  }, []);

  const fetchAccount = async () => {
    try {
      const res = await fetch("/api/instagram/account");
      const data = await res.json();
      setConnected(data.connected);
      setAccount(data.account);
      if (data.connected) fetchPosts();
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/instagram/media");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) { console.error(e); }
  };

  const connectAccount = async () => {
    if (!tokenInput.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/instagram/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenInput }),
      });
      const data = await res.json();
      if (data.success) {
        setTokenInput("");
        fetchAccount();
      }
    } catch (e) { console.error(e); }
    finally { setConnecting(false); }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <span className="login-spinner" />
          <p>Loading Instagram...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Instagram</h1>
          <p className="page-subtitle">
            {connected ? `@${account?.username} — Manage your Instagram presence` : "Connect your Instagram Business account"}
          </p>
        </div>
        {connected && (
          <div className="page-header-badge">
            <span className="status-dot status-dot-live" />
            Connected
          </div>
        )}
      </div>

      {!connected ? (
        /* Connect Account */
        <div className="connect-card">
          <div className="connect-card-icon">📸</div>
          <h2 className="connect-card-title">Connect Instagram</h2>
          <p className="connect-card-desc">
            Enter your Instagram Graph API access token to connect your Business account.
            You can get this from the <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Meta Graph API Explorer</a>.
          </p>
          <div className="connect-form">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Paste your access token here..."
              className="connect-input"
            />
            <button
              onClick={connectAccount}
              disabled={connecting || !tokenInput.trim()}
              className="connect-btn"
            >
              {connecting ? "Connecting..." : "Connect Account"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-card-left">
              {account?.profile_picture_url ? (
                <img src={account.profile_picture_url} alt={account.username} className="profile-avatar" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {account?.username?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="profile-info">
                <h2 className="profile-name">{account?.name || account?.username}</h2>
                <p className="profile-username">@{account?.username}</p>
                {account?.bio && <p className="profile-bio">{account.bio}</p>}
              </div>
            </div>
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-value">{(account?.followers_count ?? 0).toLocaleString()}</span>
                <span className="profile-stat-label">Followers</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{(account?.following_count ?? 0).toLocaleString()}</span>
                <span className="profile-stat-label">Following</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{(account?.media_count ?? 0).toLocaleString()}</span>
                <span className="profile-stat-label">Posts</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="filter-bar" style={{ marginTop: 24 }}>
            <button className={`filter-btn ${activeTab === "overview" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("overview")}>Overview</button>
            <button className={`filter-btn ${activeTab === "posts" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("posts")}>Posts ({posts.length})</button>
          </div>

          {activeTab === "overview" && (
            <div className="stats-grid" style={{ marginTop: 16 }}>
              <div className="stat-card stat-card-rose">
                <div className="stat-card-icon">❤️</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{posts.reduce((a, p) => a + (p.like_count || 0), 0).toLocaleString()}</span>
                  <span className="stat-card-label">Total Likes</span>
                </div>
              </div>
              <div className="stat-card stat-card-blue">
                <div className="stat-card-icon">💬</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{posts.reduce((a, p) => a + (p.comments_count || 0), 0).toLocaleString()}</span>
                  <span className="stat-card-label">Total Comments</span>
                </div>
              </div>
              <div className="stat-card stat-card-emerald">
                <div className="stat-card-icon">📊</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">
                    {posts.length > 0
                      ? ((posts.reduce((a, p) => a + (p.like_count || 0) + (p.comments_count || 0), 0) / posts.length / (account?.followers_count || 1)) * 100).toFixed(2) + "%"
                      : "—"
                    }
                  </span>
                  <span className="stat-card-label">Engagement Rate</span>
                </div>
              </div>
              <div className="stat-card stat-card-amber">
                <div className="stat-card-icon">📅</div>
                <div className="stat-card-info">
                  <span className="stat-card-value">{posts.length}</span>
                  <span className="stat-card-label">Recent Posts</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "posts" && (
            <div className="ig-posts-grid">
              {posts.map((post) => (
                <a key={post.id} href={post.permalink} target="_blank" rel="noopener noreferrer" className="ig-post-card">
                  <div className="ig-post-media">
                    <img
                      src={post.media_type === "VIDEO" ? (post.thumbnail_url || post.media_url) : post.media_url}
                      alt={post.caption?.slice(0, 50) || "Post"}
                      loading="lazy"
                    />
                    {post.media_type === "VIDEO" && <span className="ig-post-video-badge">▶ Video</span>}
                    {post.media_type === "CAROUSEL_ALBUM" && <span className="ig-post-video-badge">⊞ Album</span>}
                  </div>
                  <div className="ig-post-info">
                    <div className="ig-post-stats">
                      <span>❤️ {post.like_count}</span>
                      <span>💬 {post.comments_count}</span>
                    </div>
                    {post.caption && (
                      <p className="ig-post-caption">{post.caption.slice(0, 100)}{post.caption.length > 100 ? "..." : ""}</p>
                    )}
                    <span className="ig-post-date">
                      {new Date(post.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </a>
              ))}
              {posts.length === 0 && (
                <div className="empty-state">
                  <p>No posts found. Your posts will appear here once synced from Instagram.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
