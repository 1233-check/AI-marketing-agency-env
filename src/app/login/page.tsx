"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const features = [
  {
    icon: "📸",
    title: "Instagram Management",
    desc: "Full account analytics, post tracking, and engagement insights",
  },
  {
    icon: "🤖",
    title: "AI Content Engine",
    desc: "Gemini-powered auto-generation every 3 days with performance learning",
  },
  {
    icon: "💬",
    title: "WhatsApp Business",
    desc: "Bulk messaging, template management, and lead tracking",
  },
  {
    icon: "✉️",
    title: "Email Campaigns",
    desc: "Template builder, contact lists, and campaign analytics via Resend",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid credentials. Please try again.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="login-page-split">
      {/* Left Panel — Brand */}
      <div className="login-brand-panel">
        <div className="login-brand-bg" />
        <div className="login-brand-content">
          <div className={`login-brand-top ${mounted ? "login-fade-in" : ""}`}>
            <div className="login-brand-logo">
              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 2L44 16V36L24 46L4 36V16L24 2Z" stroke="white" strokeWidth="1.5" />
                <path d="M24 10L38 20V34L24 42L10 34V20L24 10Z" stroke="white" strokeWidth="1" opacity="0.4" />
                <path d="M24 18L31 22V30L24 34L17 30V22L24 18Z" fill="white" opacity="0.25" />
              </svg>
            </div>
            <h1 className="login-brand-title">Concepts & Design</h1>
            <p className="login-brand-tagline">Marketing Hub</p>
          </div>

          <p className="login-brand-desc">
            Your all-in-one AI-powered marketing command center.
            Manage Instagram, WhatsApp, Email campaigns, and let AI 
            generate optimized content — all from one dashboard.
          </p>

          <div className="login-features">
            {features.map((f, i) => (
              <div
                key={f.title}
                className={`login-feature ${mounted ? "login-feature-visible" : ""}`}
                style={{ transitionDelay: `${0.3 + i * 0.1}s` }}
              >
                <span className="login-feature-icon">{f.icon}</span>
                <div>
                  <h3 className="login-feature-title">{f.title}</h3>
                  <p className="login-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="login-brand-footer">
            © 2026 Concepts & Design · v2.0
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="login-form-panel">
        <div className={`login-form-card ${mounted ? "login-card-visible" : ""}`}>
          <div className="login-form-header">
            <h2 className="login-form-title">Welcome back</h2>
            <p className="login-form-sub">Sign in to your marketing dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form-body">
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 10.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM8.75 4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 1.5 0v-3.5Z" />
                </svg>
                {error}
              </div>
            )}

            <div className="login-field">
              <label className="login-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@conceptsdesign.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="login-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? <span className="login-spinner" /> : "Sign In"}
            </button>
          </form>

          <div className="login-form-footer">
            <p>Autonomous Marketing & Sales Ecosystem</p>
            <div className="login-trust">
              <span className="login-trust-dot" />
              Secured with end-to-end encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
