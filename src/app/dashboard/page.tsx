"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Stats {
  pendingContent: number;
  approvedContent: number;
  totalLeads: number;
  newLeads: number;
  igConnected: boolean;
  igFollowers: number;
  igPosts: number;
  igUsername: string | null;
  waCampaigns: number;
  emailCampaigns: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const channels = [
    {
      name: "Instagram",
      icon: "📸",
      connected: stats?.igConnected,
      stats: stats?.igConnected
        ? `${(stats?.igFollowers ?? 0).toLocaleString()} followers · ${stats?.igPosts ?? 0} posts`
        : "Not connected",
      href: "/dashboard/instagram",
      color: "#E1306C",
    },
    {
      name: "WhatsApp Business",
      icon: "💬",
      connected: false,
      stats: stats?.waCampaigns ? `${stats.waCampaigns} campaigns` : "Not connected",
      href: "/dashboard/whatsapp",
      color: "#25D366",
    },
    {
      name: "Email Marketing",
      icon: "✉️",
      connected: false,
      stats: stats?.emailCampaigns ? `${stats.emailCampaigns} campaigns` : "Not configured",
      href: "/dashboard/email",
      color: "#4F46E5",
    },
  ];

  const quickStats = [
    { label: "AI Content Queue", value: stats?.pendingContent ?? "—", icon: "🤖", sublabel: "Pending approval", href: "/dashboard/content" },
    { label: "Approved Content", value: stats?.approvedContent ?? "—", icon: "✅", sublabel: "Ready to publish" },
    { label: "Total Leads", value: stats?.totalLeads ?? "—", icon: "👥", sublabel: "All channels", href: "/dashboard/leads" },
    { label: "New Leads", value: stats?.newLeads ?? "—", icon: "🔥", sublabel: "Needs attention" },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="page-subtitle">
            Your marketing command center — all channels, one view.
          </p>
        </div>
        <div className="page-header-badge">
          <span className="status-dot status-dot-live" />
          System Online
        </div>
      </div>

      {/* Channel Cards */}
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 className="section-title">Channels</h2>
      </div>
      <div className="channels-grid">
        {channels.map((ch) => (
          <a key={ch.name} href={ch.href} className="channel-card">
            <div className="channel-card-top">
              <span className="channel-card-icon">{ch.icon}</span>
              <span className={`channel-status ${ch.connected ? "channel-status-active" : ""}`}>
                {ch.connected ? "Connected" : "Setup"}
              </span>
            </div>
            <h3 className="channel-card-name">{ch.name}</h3>
            <p className="channel-card-stats">{ch.stats}</p>
          </a>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="section-header" style={{ marginTop: 32, marginBottom: 12 }}>
        <h2 className="section-title">Overview</h2>
      </div>
      <div className="stats-grid">
        {quickStats.map((s) => (
          <a key={s.label} href={s.href || "#"} className="stat-card" style={{ textDecoration: "none" }}>
            <div className="stat-card-icon">{s.icon}</div>
            <div className="stat-card-info">
              <span className="stat-card-value">{s.value}</span>
              <span className="stat-card-label">{s.label}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
