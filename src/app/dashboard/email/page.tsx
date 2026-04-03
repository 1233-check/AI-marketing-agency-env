"use client";

import { useEffect, useState } from "react";

interface Template { id: string; name: string; subject: string; html_body: string; from_name: string; created_at: string; }
interface Contact { id: string; name: string; email: string; tags: string; subscribed: boolean; created_at: string; }

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<"templates" | "contacts" | "campaigns">("templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApiKey] = useState(!!process.env.NEXT_PUBLIC_RESEND_KEY);

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", html_body: "", from_name: "Concepts & Design" });

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", tags: "" });

  useEffect(() => {
    fetchTemplates();
    fetchContacts();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/email/templates");
      setTemplates(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/email/contacts");
      setContacts(await res.json());
    } catch (e) { console.error(e); }
  };

  const createTemplate = async () => {
    await fetch("/api/email/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(templateForm),
    });
    setTemplateForm({ name: "", subject: "", html_body: "", from_name: "Concepts & Design" });
    setShowTemplateForm(false);
    fetchTemplates();
  };

  const addContact = async () => {
    await fetch("/api/email/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    setContactForm({ name: "", email: "", tags: "" });
    setShowContactForm(false);
    fetchContacts();
  };

  if (loading) {
    return <div className="page-container"><div className="loading-state"><span className="login-spinner" /><p>Loading Email...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Marketing</h1>
          <p className="page-subtitle">Create templates, manage contacts, and send campaigns via Resend</p>
        </div>
      </div>

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
                <input className="connect-input" placeholder="Subject line" value={templateForm.subject} onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })} />
                <textarea className="connect-input" placeholder="HTML body (use {{name}} for personalization)" rows={6} style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={templateForm.html_body} onChange={(e) => setTemplateForm({ ...templateForm, html_body: e.target.value })} />
                <button className="connect-btn" style={{ width: "auto", padding: "8px 20px" }} onClick={createTemplate}>Create Template</button>
              </div>
            </div>
          )}
          <div className="content-list">
            {templates.map((t) => (
              <div key={t.id} className="content-card">
                <h3 className="content-card-title" style={{ fontSize: 15 }}>{t.name}</h3>
                <p className="content-card-body" style={{ fontWeight: 500 }}>Subject: {t.subject}</p>
                <div className="content-card-footer">
                  <span className="content-card-date">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="badge badge-type">From: {t.from_name}</span>
                </div>
              </div>
            ))}
            {templates.length === 0 && <div className="empty-state"><p>No email templates. Create one to start sending campaigns.</p></div>}
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
                <input className="connect-input" placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                <input className="connect-input" placeholder="Tags (comma separated)" value={contactForm.tags} onChange={(e) => setContactForm({ ...contactForm, tags: e.target.value })} />
                <button className="connect-btn" style={{ width: "auto", padding: "8px 20px" }} onClick={addContact}>Add Contact</button>
              </div>
            </div>
          )}
          <div className="leads-grid">
            {contacts.map((c) => (
              <div key={c.id} className="lead-card">
                <div className="lead-card-header">
                  <div className="lead-card-avatar" style={{ background: "#4F46E5" }}>{c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</div>
                  <div className="lead-card-identity">
                    <h3 className="lead-card-name">{c.name}</h3>
                    <span className="lead-card-source">{c.email}</span>
                  </div>
                  <span className={`badge ${c.subscribed ? "badge-status-approved" : "badge-status-rejected"}`}>{c.subscribed ? "Subscribed" : "Unsubscribed"}</span>
                </div>
                {c.tags && <p className="lead-card-source" style={{ marginTop: 8 }}>Tags: {c.tags}</p>}
              </div>
            ))}
            {contacts.length === 0 && <div className="empty-state"><p>No contacts yet. Add subscribers to your email list.</p></div>}
          </div>
        </div>
      )}

      {activeTab === "campaigns" && (
        <div className="empty-state">
          <p>{hasApiKey ? "Create templates and add contacts to send campaigns." : "Add your Resend API key in .env to enable email sending."}</p>
        </div>
      )}
    </div>
  );
}
