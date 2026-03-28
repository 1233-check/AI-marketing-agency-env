"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  notes: string;
  createdAt: string;
}

const sourceIcons: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  EMAIL: "✉️",
  WEBSITE: "🌐",
};

const statusFlow = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      const url =
        filter === "ALL" ? "/api/leads" : `/api/leads?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await fetchLeads();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const filters = ["ALL", ...statusFlow];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Tracking</h1>
          <p className="page-subtitle">
            Monitor and convert incoming leads from all channels
          </p>
        </div>
        <div className="page-header-badge">
          <span className="status-dot status-dot-live" />
          {leads.length} Total Leads
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

      {/* Leads Grid */}
      {loading ? (
        <div className="loading-state">
          <span className="login-spinner" />
          <p>Loading leads…</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="empty-state">
          <p>No leads found.</p>
        </div>
      ) : (
        <div className="leads-grid">
          {leads.map((lead) => (
            <div key={lead.id} className="lead-card">
              <div className="lead-card-header">
                <div className="lead-card-avatar">
                  {lead.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="lead-card-identity">
                  <h3 className="lead-card-name">{lead.name}</h3>
                  <span className="lead-card-source">
                    {sourceIcons[lead.source] || "🌐"} {lead.source}
                  </span>
                </div>
                <span
                  className={`badge badge-status badge-status-${lead.status.toLowerCase()}`}
                >
                  {lead.status}
                </span>
              </div>

              <div className="lead-card-details">
                <div className="lead-detail">
                  <span className="lead-detail-label">Email</span>
                  <span className="lead-detail-value">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="lead-detail">
                    <span className="lead-detail-label">Phone</span>
                    <span className="lead-detail-value">{lead.phone}</span>
                  </div>
                )}
              </div>

              {lead.notes && (
                <p className="lead-card-notes">{lead.notes}</p>
              )}

              <div className="lead-card-footer">
                <span className="lead-card-date">
                  {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                {lead.status !== "CONVERTED" && (
                  <select
                    className="lead-status-select"
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    disabled={updating === lead.id}
                  >
                    {statusFlow.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
