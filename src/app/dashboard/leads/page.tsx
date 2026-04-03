"use client";

import { useEffect, useState } from "react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  channel: string;
  status: string;
  score: number;
  notes: string;
  created_at: string;
}

const sourceIcons: Record<string, string> = {
  INSTAGRAM: "📸",
  FACEBOOK: "📘",
  EMAIL: "✉️",
  WEBSITE: "🌐",
  WHATSAPP: "💬",
};

const statusFlow = ["NEW", "CONTACTED", "QUALIFIED", "CONVERTED"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = async () => {
    try {
      const url = filter === "ALL" ? "/api/leads" : `/api/leads?status=${filter}`;
      const res = await fetch(url);
      setLeads(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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
    } catch (e) { console.error(e); }
    finally { setUpdating(null); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Lead Tracking</h1>
          <p className="page-subtitle">Cross-channel leads from Instagram, WhatsApp, Email, and Web</p>
        </div>
        <div className="page-header-badge">
          {leads.length} Total Leads
        </div>
      </div>

      <div className="filter-bar">
        {["ALL", ...statusFlow].map((f) => (
          <button key={f} className={`filter-btn ${filter === f ? "filter-btn-active" : ""}`} onClick={() => setFilter(f)}>
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-state"><span className="login-spinner" /><p>Loading leads...</p></div>
      ) : leads.length === 0 ? (
        <div className="empty-state"><p>No leads found. Leads will appear here as they come in from your connected channels.</p></div>
      ) : (
        <div className="leads-grid">
          {leads.map((lead) => (
            <div key={lead.id} className="lead-card">
              <div className="lead-card-header">
                <div className="lead-card-avatar">{lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                <div className="lead-card-identity">
                  <h3 className="lead-card-name">{lead.name}</h3>
                  <span className="lead-card-source">{sourceIcons[lead.source] || "🌐"} {lead.source}{lead.channel ? ` · ${lead.channel}` : ""}</span>
                </div>
                <span className={`badge badge-status badge-status-${lead.status.toLowerCase()}`}>{lead.status}</span>
              </div>

              <div className="lead-card-details">
                {lead.email && <div className="lead-detail"><span className="lead-detail-label">Email</span><span className="lead-detail-value">{lead.email}</span></div>}
                {lead.phone && <div className="lead-detail"><span className="lead-detail-label">Phone</span><span className="lead-detail-value">{lead.phone}</span></div>}
                {lead.score > 0 && <div className="lead-detail"><span className="lead-detail-label">Score</span><span className="lead-detail-value">{lead.score}/100</span></div>}
              </div>

              {lead.notes && <p className="lead-card-notes">{lead.notes}</p>}

              <div className="lead-card-footer">
                <span className="lead-card-date">{new Date(lead.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                {lead.status !== "CONVERTED" && (
                  <select className="lead-status-select" value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value)} disabled={updating === lead.id}>
                    {statusFlow.map((s) => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
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
