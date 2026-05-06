"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

interface Contact {
  id: string; name: string; email: string; phone: string; company: string;
  tags: string; list_name: string; source: string; subscribed: boolean;
  notes: string; created_at: string;
}
interface Template { id: string; name: string; subject: string; html_body: string; from_name: string; created_at: string; }
interface Campaign { id: string; name: string; template_id: string; status: string; total_recipients: number; sent_count: number; failed_count: number; completed_at: string; created_at: string; }
interface Meta { total: number; lists: string[]; tags: string[]; }

export default function EmailPage() {
  const [activeTab, setActiveTab] = useState<"contacts" | "templates" | "campaigns">("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, lists: [], tags: [] });
  const [loading, setLoading] = useState(true);

  // Filters & search
  const [search, setSearch] = useState("");
  const [filterList, setFilterList] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");

  // UI states
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploadResult, setUploadResult] = useState<{ type: string; msg: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Single contact form
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", tags: "", list_name: "General", notes: "" });

  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: "", template_id: "", contact_ids: [] as string[] });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: string; msg: string } | null>(null);
  const [campaignContactMode, setCampaignContactMode] = useState<"all" | "selected">("all");

  // Template form
  const [showTplForm, setShowTplForm] = useState(false);
  const [tplForm, setTplForm] = useState({ name: "", subject: "", html_body: "", from_name: "Concepts & Design" });

  const fetchContacts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterList) params.set("list", filterList);
      if (filterTag) params.set("tag", filterTag);
      if (filterSub) params.set("subscribed", filterSub);
      params.set("sort", sortBy);
      params.set("order", sortOrder);
      const res = await fetch(`/api/email/contacts?${params}`);
      const json = await res.json();
      setContacts(json.contacts || []);
      setMeta(json.meta || { total: 0, lists: [], tags: [] });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterList, filterTag, filterSub, sortBy, sortOrder]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/email/templates");
      setTemplates(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/email/campaigns");
      setCampaigns(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchContacts(); fetchTemplates(); fetchCampaigns(); }, [fetchContacts]);

  // Send campaign
  const sendCampaign = async () => {
    if (!campaignForm.template_id) return;
    setSending(true);
    setSendResult(null);
    try {
      const ids = campaignContactMode === "all"
        ? contacts.filter((c) => c.subscribed).map((c) => c.id)
        : campaignForm.contact_ids;
      if (ids.length === 0) {
        setSendResult({ type: "error", msg: "No subscribed contacts selected." });
        setSending(false);
        return;
      }
      const res = await fetch("/api/email/campaigns", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: campaignForm.template_id, contact_ids: ids, campaign_name: campaignForm.name }),
      });
      const result = await res.json();
      if (res.ok) {
        setSendResult({ type: "success", msg: `✅ ${result.sent} email(s) sent, ${result.failed} failed` });
        setCampaignForm({ name: "", template_id: "", contact_ids: [] });
        setShowCampaignForm(false);
        fetchCampaigns();
      } else {
        setSendResult({ type: "error", msg: result.error || "Failed to send" });
      }
    } catch (err) { console.error(err); setSendResult({ type: "error", msg: "Network error" }); }
    setSending(false);
  };

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Add single contact
  const addContact = async () => {
    if (!form.email) return;
    await fetch("/api/email/contacts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "manual" }),
    });
    setForm({ name: "", email: "", phone: "", company: "", tags: "", list_name: "General", notes: "" });
    setShowAddForm(false);
    fetchContacts();
  };

  // Excel/CSV upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setUploadResult(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      if (rows.length === 0) {
        setUploadResult({ type: "error", msg: "File is empty or has no valid rows." });
        setImporting(false);
        return;
      }

      // Map columns flexibly
      const mapped = rows.map((row) => {
        const get = (keys: string[]) => {
          for (const k of keys) {
            const found = Object.keys(row).find((rk) => rk.toLowerCase().trim() === k.toLowerCase());
            if (found && row[found]) return String(row[found]).trim();
          }
          return "";
        };
        return {
          name: get(["name", "full name", "full_name", "contact name", "first name"]),
          email: get(["email", "email address", "e-mail", "mail"]),
          phone: get(["phone", "phone number", "mobile", "tel", "contact"]),
          company: get(["company", "organization", "org", "business"]),
          tags: get(["tags", "tag", "labels", "category"]),
          list_name: get(["list", "list_name", "group", "segment"]) || "General",
          notes: get(["notes", "note", "comment", "comments"]),
          source: "excel_import",
        };
      }).filter((c) => c.email && c.email.includes("@"));

      if (mapped.length === 0) {
        setUploadResult({ type: "error", msg: "No valid emails found. Make sure your file has an 'Email' column." });
        setImporting(false);
        return;
      }

      const res = await fetch("/api/email/contacts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mapped),
      });
      const result = await res.json();

      if (res.ok) {
        setUploadResult({ type: "success", msg: `${result.count} contact(s) imported from "${file.name}"` });
        fetchContacts();
      } else {
        setUploadResult({ type: "error", msg: result.error || "Import failed" });
      }
    } catch (err) {
      setUploadResult({ type: "error", msg: "Failed to parse file. Ensure it's a valid .xlsx, .xls, or .csv" });
      console.error(err);
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Bulk delete
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} contact(s)?`)) return;
    await fetch("/api/email/contacts", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selectedIds] }),
    });
    setSelectedIds(new Set());
    fetchContacts();
  };

  // Toggle subscription
  const toggleSub = async (c: Contact) => {
    await fetch("/api/email/contacts", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, subscribed: !c.subscribed }),
    });
    fetchContacts();
  };

  // Select all/none
  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(contacts.map((c) => c.id)));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  // Create template
  const createTemplate = async () => {
    await fetch("/api/email/templates", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tplForm),
    });
    setTplForm({ name: "", subject: "", html_body: "", from_name: "Concepts & Design" });
    setShowTplForm(false);
    fetchTemplates();
  };

  // Download sample Excel
  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Name", "Email", "Phone", "Company", "Tags", "List", "Notes"],
      ["John Doe", "john@example.com", "+91 99999 00000", "Acme Corp", "vip, architect", "Clients", "Met at expo"],
      ["Jane Smith", "jane@example.com", "+91 88888 00000", "Design Co", "lead", "Prospects", ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    XLSX.writeFile(wb, "contacts_template.xlsx");
  };

  if (loading) {
    return <div className="page-container"><div className="loading-state"><span className="login-spinner" /><p>Loading Email...</p></div></div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Email Marketing</h1>
          <p className="page-subtitle">Manage contacts, templates & campaigns — all in one place</p>
        </div>
        {activeTab === "contacts" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="em-btn em-btn-outline" onClick={() => { setShowUpload(!showUpload); setShowAddForm(false); }}>
              <span>📁</span> Import Excel
            </button>
            <button className="em-btn em-btn-primary" onClick={() => { setShowAddForm(!showAddForm); setShowUpload(false); }}>
              <span>+</span> Add Contact
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="filter-bar">
        <button className={`filter-btn ${activeTab === "contacts" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("contacts")}>
          Contacts ({meta.total})
        </button>
        <button className={`filter-btn ${activeTab === "templates" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("templates")}>
          Templates ({templates.length})
        </button>
        <button className={`filter-btn ${activeTab === "campaigns" ? "filter-btn-active" : ""}`} onClick={() => setActiveTab("campaigns")}>
          Campaigns
        </button>
      </div>

      {/* ── CONTACTS TAB ── */}
      {activeTab === "contacts" && (
        <div>
          {/* Upload Panel */}
          {showUpload && (
            <div className="em-panel em-panel-upload">
              <div className="em-panel-header">
                <div>
                  <h3 className="em-panel-title">📊 Import Contacts from Excel / CSV</h3>
                  <p className="em-panel-desc">Upload a .xlsx, .xls, or .csv file. We auto-detect columns like Name, Email, Phone, Company, Tags.</p>
                </div>
                <button className="em-btn em-btn-ghost" onClick={downloadSample}>⬇ Download Template</button>
              </div>

              <div className="em-upload-zone" onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
                {importing ? (
                  <div className="em-upload-content"><span className="login-spinner" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} /><p>Importing...</p></div>
                ) : (
                  <div className="em-upload-content">
                    <span style={{ fontSize: 32 }}>📎</span>
                    <p><strong>Click to upload</strong> or drag & drop</p>
                    <p className="em-upload-hint">.xlsx, .xls, .csv — Max 10,000 rows</p>
                  </div>
                )}
              </div>

              {uploadResult && (
                <div className={`em-result ${uploadResult.type === "success" ? "em-result-success" : "em-result-error"}`}>
                  {uploadResult.type === "success" ? "✅" : "❌"} {uploadResult.msg}
                </div>
              )}

              <div className="em-col-guide">
                <p className="em-col-guide-title">Supported columns:</p>
                <div className="em-col-chips">
                  {["Name", "Email*", "Phone", "Company", "Tags", "List", "Notes"].map((c) => (
                    <span key={c} className={`em-chip ${c.includes("*") ? "em-chip-required" : ""}`}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Add Single Contact */}
          {showAddForm && (
            <div className="em-panel">
              <h3 className="em-panel-title">Add Contact</h3>
              <div className="em-form-grid">
                <input className="connect-input" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input className="connect-input" placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input className="connect-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <input className="connect-input" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                <input className="connect-input" placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                <select className="connect-input" value={form.list_name} onChange={(e) => setForm({ ...form, list_name: e.target.value })}>
                  <option value="General">General</option>
                  {meta.lists.filter((l) => l !== "General").map((l) => <option key={l} value={l}>{l}</option>)}
                  <option value="__new">+ New List...</option>
                </select>
              </div>
              <textarea className="connect-input" placeholder="Notes" rows={2} style={{ marginTop: 12, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="em-btn em-btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button className="em-btn em-btn-primary" onClick={addContact} disabled={!form.email}>Save Contact</button>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="em-toolbar">
            <div className="em-search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input placeholder="Search by name, email, or company..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <div className="em-filters">
              <select className="em-filter-select" value={filterList} onChange={(e) => setFilterList(e.target.value)}>
                <option value="">All Lists</option>
                {meta.lists.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="em-filter-select" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                <option value="">All Tags</option>
                {meta.tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="em-filter-select" value={filterSub} onChange={(e) => setFilterSub(e.target.value)}>
                <option value="">All Status</option>
                <option value="true">Subscribed</option>
                <option value="false">Unsubscribed</option>
              </select>
              <select className="em-filter-select" value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [s, o] = e.target.value.split(":"); setSortBy(s); setSortOrder(o); }}>
                <option value="created_at:desc">Newest First</option>
                <option value="created_at:asc">Oldest First</option>
                <option value="name:asc">Name A→Z</option>
                <option value="name:desc">Name Z→A</option>
                <option value="email:asc">Email A→Z</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.size > 0 && (
            <div className="em-bulk-bar">
              <span>{selectedIds.size} selected</span>
              <button className="em-btn em-btn-danger-sm" onClick={deleteSelected}>🗑 Delete Selected</button>
            </div>
          )}

          {/* Contacts Table */}
          {contacts.length > 0 ? (
            <div className="em-table-wrap">
              <table className="em-table">
                <thead>
                  <tr>
                    <th><input type="checkbox" checked={selectedIds.size === contacts.length && contacts.length > 0} onChange={toggleSelectAll} /></th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>List</th>
                    <th>Tags</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.id} className={selectedIds.has(c.id) ? "em-row-selected" : ""}>
                      <td><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                      <td>
                        <div className="em-cell-contact">
                          <div className="em-avatar" style={{ background: c.subscribed ? "var(--accent)" : "var(--text-muted)" }}>
                            {(c.name || c.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="em-contact-name">{c.name || "—"}</div>
                            {c.company && <div className="em-contact-company">{c.company}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="em-cell-email">{c.email}</td>
                      <td className="em-cell-dim">{c.phone || "—"}</td>
                      <td><span className="em-list-badge">{c.list_name}</span></td>
                      <td>
                        <div className="em-tags-cell">
                          {c.tags ? c.tags.split(",").slice(0, 3).map((t) => (
                            <span key={t.trim()} className="em-tag">{t.trim()}</span>
                          )) : <span className="em-cell-dim">—</span>}
                        </div>
                      </td>
                      <td><span className={`em-source em-source-${c.source}`}>{c.source === "excel_import" ? "📊 Excel" : c.source === "manual" ? "✏️ Manual" : c.source}</span></td>
                      <td>
                        <button className={`em-sub-toggle ${c.subscribed ? "em-sub-active" : "em-sub-inactive"}`} onClick={() => toggleSub(c)}>
                          {c.subscribed ? "Subscribed" : "Unsubscribed"}
                        </button>
                      </td>
                      <td className="em-cell-dim">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p style={{ fontSize: 28, marginBottom: 8 }}>📭</p>
              <p>No contacts yet. Add contacts manually or import from an Excel file.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TEMPLATES TAB ── */}
      {activeTab === "templates" && (
        <div>
          <button className="em-btn em-btn-primary" style={{ marginBottom: 16 }} onClick={() => setShowTplForm(!showTplForm)}>
            {showTplForm ? "Cancel" : "+ New Template"}
          </button>
          {showTplForm && (
            <div className="em-panel" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input className="connect-input" placeholder="Template name" value={tplForm.name} onChange={(e) => setTplForm({ ...tplForm, name: e.target.value })} />
                <input className="connect-input" placeholder="Subject line" value={tplForm.subject} onChange={(e) => setTplForm({ ...tplForm, subject: e.target.value })} />
                <textarea className="connect-input" placeholder="HTML body (use {{name}} for personalization)" rows={6} style={{ resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={tplForm.html_body} onChange={(e) => setTplForm({ ...tplForm, html_body: e.target.value })} />
                <button className="em-btn em-btn-primary" style={{ alignSelf: "flex-end" }} onClick={createTemplate}>Create Template</button>
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
            {templates.length === 0 && <div className="empty-state"><p>No email templates yet.</p></div>}
          </div>
        </div>
      )}

      {/* ── CAMPAIGNS TAB ── */}
      {activeTab === "campaigns" && (
        <div>
          <button className="em-btn em-btn-primary" style={{ marginBottom: 16 }} onClick={() => { setShowCampaignForm(!showCampaignForm); setSendResult(null); }}>
            {showCampaignForm ? "Cancel" : "🚀 New Campaign"}
          </button>

          {sendResult && (
            <div className={`em-result ${sendResult.type === "success" ? "em-result-success" : "em-result-error"}`} style={{ marginBottom: 16 }}>
              {sendResult.msg}
            </div>
          )}

          {showCampaignForm && (
            <div className="em-panel" style={{ marginBottom: 20 }}>
              <h3 className="em-panel-title">📧 Send Email Campaign</h3>
              <p className="em-panel-desc" style={{ marginBottom: 16 }}>Emails will be sent from <strong>conceptsndesigns8@gmail.com</strong> via Gmail.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="em-label">Campaign Name</label>
                  <input className="connect-input" placeholder="e.g. May Newsletter" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} />
                </div>

                <div>
                  <label className="em-label">Select Template *</label>
                  <select className="connect-input" value={campaignForm.template_id} onChange={(e) => setCampaignForm({ ...campaignForm, template_id: e.target.value })}>
                    <option value="">— Choose a template —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name} — "{t.subject}"</option>)}
                  </select>
                  {templates.length === 0 && <p style={{ fontSize: 12, color: "var(--danger)", marginTop: 4 }}>No templates yet. Create one in the Templates tab first.</p>}
                </div>

                <div>
                  <label className="em-label">Recipients</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className={`em-btn ${campaignContactMode === "all" ? "em-btn-primary" : "em-btn-outline"}`} onClick={() => setCampaignContactMode("all")} style={{ fontSize: 12, padding: "6px 14px" }}>
                      All Subscribed ({contacts.filter((c) => c.subscribed).length})
                    </button>
                    <button className={`em-btn ${campaignContactMode === "selected" ? "em-btn-primary" : "em-btn-outline"}`} onClick={() => setCampaignContactMode("selected")} style={{ fontSize: 12, padding: "6px 14px" }}>
                      Pick Contacts
                    </button>
                  </div>
                </div>

                {campaignContactMode === "selected" && (
                  <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12 }}>
                    {contacts.filter((c) => c.subscribed).map((c) => (
                      <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={campaignForm.contact_ids.includes(c.id)} onChange={(e) => {
                          const ids = e.target.checked ? [...campaignForm.contact_ids, c.id] : campaignForm.contact_ids.filter((id) => id !== c.id);
                          setCampaignForm({ ...campaignForm, contact_ids: ids });
                        }} style={{ accentColor: "var(--accent)" }} />
                        <span>{c.name || c.email}</span>
                        <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: "auto" }}>{c.email}</span>
                      </label>
                    ))}
                    {contacts.filter((c) => c.subscribed).length === 0 && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No subscribed contacts.</p>}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                  <button className="em-btn em-btn-ghost" onClick={() => setShowCampaignForm(false)}>Cancel</button>
                  <button className="em-btn em-btn-primary" onClick={sendCampaign} disabled={sending || !campaignForm.template_id}>
                    {sending ? "Sending..." : `🚀 Send to ${campaignContactMode === "all" ? contacts.filter((c) => c.subscribed).length : campaignForm.contact_ids.length} contact(s)`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Campaign History */}
          <h3 style={{ fontSize: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)", marginBottom: 12 }}>Campaign History</h3>
          {campaigns.length > 0 ? (
            <div className="content-list">
              {campaigns.map((c) => (
                <div key={c.id} className="content-card">
                  <div className="content-card-header">
                    <h3 className="content-card-title" style={{ fontSize: 15 }}>{c.name}</h3>
                    <span className={`badge ${c.status === "COMPLETED" ? "badge-status-approved" : c.status === "SENDING" ? "badge-status-pending" : "badge-type"}`}>{c.status}</span>
                  </div>
                  <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
                    <span>📨 <strong>{c.sent_count}</strong> sent</span>
                    {c.failed_count > 0 && <span style={{ color: "var(--danger)" }}>❌ <strong>{c.failed_count}</strong> failed</span>}
                    <span style={{ color: "var(--text-muted)" }}>👥 {c.total_recipients} recipients</span>
                  </div>
                  <div className="content-card-footer">
                    <span className="content-card-date">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state"><p>No campaigns sent yet. Create a template, add contacts, and send your first campaign.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
