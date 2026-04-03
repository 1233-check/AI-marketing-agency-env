"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "/dashboard/instagram",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Content AI",
    href: "/dashboard/content",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
        <path d="M8.56 9.8A4 4 0 1 1 15.56 12" />
        <path d="M12 18v4" /><path d="M8 22h8" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    name: "WhatsApp",
    href: "/dashboard/whatsapp",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
      </svg>
    ),
  },
  {
    name: "Email",
    href: "/dashboard/email",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polyline points="22,4 12,13 2,4" />
      </svg>
    ),
  },
  {
    name: "Leads",
    href: "/dashboard/leads",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="dashboard-shell">
      <aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2L38 14V30L20 38L2 30V14L20 2Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M20 8L32 16V28L20 34L8 28V16L20 8Z" stroke="currentColor" strokeWidth="1" opacity="0.5" fill="none" />
              <path d="M20 14L26 18V26L20 30L14 26V18L20 14Z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">C&D</span>
              <span className="sidebar-brand-sub">Marketing Hub</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
                title={item.name}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {!sidebarCollapsed && <span className="sidebar-link-text">{item.name}</span>}
                {isActive && <span className="sidebar-link-indicator" />}
              </a>
            );
          })}
        </nav>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: sidebarCollapsed ? "rotate(180deg)" : "none", transition: "transform 0.3s ease" }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {session?.user?.name?.charAt(0) || "A"}
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{session?.user?.name || "Admin"}</span>
              <span className="sidebar-user-role">Administrator</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-logout"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
}
