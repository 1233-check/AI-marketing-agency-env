"use client";

import { useEffect, useState } from "react";

interface Template { id: string; name: string; body: string; category: string; language: string; meta_status: string; created_at: string; }
interface Contact { id: string; name: string; phone: string; email: string; tags: string; created_at: string; }

export default function WhatsAppPage() {
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"templates" | "contacts" | "campaigns">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Config form
  const [configForm, setConfigForm] = useState({ phone_number_id: "", business_account_id: "", access_token: "" });
  const [saving, setSaving] = useState(false);

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", body: "", category: "MARKETING" });

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config");
      const data = await res.json();
      setConnected(data.connected);
      if (data.connected) {
        fetchTemplates();
        fetchContacts();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (data.success) { setConnected(true); fetchTemplates(); fetchContacts(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const fetchTemplates = async () => {
    const res = await fetch("/api/whatsapp/templates");
    setTemplates(await res.json());
  };

  const fetchContacts = async () => {
    const res = await fetch("/api/whatsapp/contacts");
    setContacts(await res.json());
  };

  const createTemplate = async () => {
    await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templateForm),
    });
    setTemplateForm({ name: "", body: "", category: "MARKETING" });
    setShowTemplateForm(false);
    fetchTemplates();
  };

  const addContact = async () => {
    await fetch("/api/whatsapp/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    setContactForm({ name: "", phone: "", email: "" });
    setShowContactForm(false);
    fetchContacts();
  };

  if (loading) {
    return <div className="page-container"><div className="loading-state"><span className="login-spinner" /><p>Loading WhatsApp...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Business</h1>
          <p className="page-subtitle">{connected ? "Manage templates, contacts, and campaigns" : "Connect your WhatsApp Business API"}</p>
        </div>
        {connected && <div className="page-header-badge"><span className="status-dot status-dot-live" />Connected</div>}
      </div>

      {!connected ? (
        <div className="connect-card">
          <div className="connect-card-icon">💬</div>
          <h2 className="connect-card-title">Connect WhatsApp Business</h2>
          <p className="connect-card-desc">Enter your WhatsApp Cloud API credentials from <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Meta Business Suite</a>.</p>
          <div className="connect-form" style={{ flexDirection: "column" }}>
            <input className="connect-input" placeholder="Phone Number ID" value={configForm.phone_number_id} onChange={(e) => setConfigForm({ ...configForm, phone_number_id: e.target.value })} />
            <input className="connect-input" placeholder="Business Account ID" value={configForm.business_account_id} onChange={(e) => setConfigForm({ ...configForm, business_account_id: e.target.value })} />
            <input className="connect-input" type="password" placeholder="Access Token" value={configForm.access_token} onChange={(e) => setConfigForm({ ...configForm, access_token: e.target.value })} />
            <button className="connect-btn" onClick={saveConfig} disabled={saving || !configForm.phone_number_id || !configForm.access_token}>
              {saving ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="filter-bar">
            <button className={`filter-btn ${activeTab === "templates" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("templates")}>Templates ({templates.length})</button>
            <button className={`filter-btn ${activeTab === "contacts" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("contacts")}>Contacts ({contacts.length})</button>
            <button className={`filter-btn ${activeTab === "campaigns" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("campaigns")}>Campaigns</button>
          </div>

          {activeTab === "templates" && (
            <div>
              <button className="connect-btn" style={{ marginBottom: 16, width: "auto", padding: "8px 20px" }} onClick={() => setShowTemplateForm(!showTemplateForm)}>
                {showTemplateForm ? "Cancel" : "+ New Template"}
              </button>
              {showTemplateForm && (
                <div className="content-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input className="connect-input" placeholder="Template name" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
                    <textarea className="connect-input" placeholder="Message body (use {{1}}, {{2}} for variables)" rows={4} style={{ resize: "vertical" }} value={templateForm.body} onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })} />
                    <select className="lead-status-select" value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                    <button className="connect-btn" style={{ width: "auto", padding: "8px 20px" }} onClick={createTemplate}>Create Template</button>
                  </div>
                </div>
              )}
              <div className="content-list">
                {templates.map((t) => (
                  <div key={t.id} className="content-card">
                    <div className="content-card-header">
                      <span className="badge badge-type">{t.category}</span>
                      <span className={`badge ${t.meta_status === "APPROVED" ? "badge-status-approved" : "badge-status-pending"}`}>{t.meta_status || "LOCAL"}</span>
                    </div>
                    <h3 className="content-card-title" style={{ fontSize: 15 }}>{t.name}</h3>
                    <p className="content-card-body">{t.body}</p>
                  </div>
                ))}
                {templates.length === 0 && <div className="empty-state"><p>No templates yet. Create one to get started with campaigns.</p></div>}
              </div>
            </div>
          )}

          {activeTab === "contacts" && (
            <div>
              <button className="connect-btn" style={{ marginBottom: 16, width: "auto", padding: "8px 20px" }} onClick={() => setShowContactForm(!showContactForm)}>
                {showContactForm ? "Cancel" : "+ Add Contact"}
              </button>
              {showContactForm && (
                <div className="content-card" style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <input className="connect-input" placeholder="Name" value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} />
                    <input className="connect-input" placeholder="Phone (with country code, e.g. +91...)" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} />
                    <input className="connect-input" placeholder="Email (optional)" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                    <button className="connect-btn" style={{ width: "auto", padding: "8px 20px" }} onClick={addContact}>Add Contact</button>
                  </div>
                </div>
              )}
              <div className="leads-grid">
                {contacts.map((c) => (
                  <div key={c.id} className="lead-card">
                    <div className="lead-card-header">
                      <div className="lead-card-avatar">{c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                      <div className="lead-card-identity">
                        <h3 className="lead-card-name">{c.name}</h3>
                        <span className="lead-card-source">{c.phone}</span>
                      </div>
                    </div>
                    {c.email && <div className="lead-detail"><span className="lead-detail-label">Email</span><span className="lead-detail-value">{c.email}</span></div>}
                  </div>
                ))}
                {contacts.length === 0 && <div className="empty-state"><p>No contacts yet. Add contacts to start sending campaigns.</p></div>}
              </div>
            </div>
          )}

          {activeTab === "campaigns" && (
            <div className="empty-state">
              <p>Create templates and add contacts first, then you can send bulk campaigns from here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
