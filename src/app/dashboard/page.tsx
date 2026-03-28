"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Stats {
  pendingContent: number;
  approvedContent: number;
  totalLeads: number;
  newLeads: number;
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

  const statCards = [
    {
      label: "Pending Approvals",
      value: stats?.pendingContent ?? "—",
      icon: "⏳",
      color: "amber",
    },
    {
      label: "Approved Content",
      value: stats?.approvedContent ?? "—",
      icon: "✅",
      color: "emerald",
    },
    {
      label: "Total Leads",
      value: stats?.totalLeads ?? "—",
      icon: "👥",
      color: "blue",
    },
    {
      label: "New Leads",
      value: stats?.newLeads ?? "—",
      icon: "🔥",
      color: "rose",
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, {session?.user?.name?.split(" ")[0] || "Admin"}
          </h1>
          <p className="page-subtitle">
            Here&apos;s what&apos;s happening across your marketing ecosystem
          </p>
        </div>
        <div className="page-header-badge">
          <span className="status-dot status-dot-live" />
          System Online
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card) => (
          <div key={card.label} className={`stat-card stat-card-${card.color}`}>
            <div className="stat-card-icon">{card.icon}</div>
            <div className="stat-card-info">
              <span className="stat-card-value">{card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="section-header">
        <h2 className="section-title">Quick Actions</h2>
      </div>
      <div className="quick-actions">
        <a href="/dashboard/content" className="quick-action-card">
          <div className="quick-action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12l2 2 4-4" />
              <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <span className="quick-action-label">Review Content</span>
          <span className="quick-action-desc">Approve or reject pending posts</span>
        </a>
        <a href="/dashboard/leads" className="quick-action-card">
          <div className="quick-action-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <span className="quick-action-label">Manage Leads</span>
          <span className="quick-action-desc">Track and convert incoming leads</span>
        </a>
      </div>
    </div>
  );
}
