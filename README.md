# Concepts & Design: AI Marketing & Sales Ecosystem

This project is a fully autonomous, intelligent marketing and sales command center built for **Concepts & Design**, a luxury architecture firm. 

The ecosystem handles everything from generative video content creation to multi-channel lead tracking, utilizing Large Language Models (Gemini), vector databases (Pinecone), and native Next.js API integrations.

---

## 🏗 System Architecture & Workflows

The platform is divided into four main phases, functioning as a seamless multi-agent system:

### Phase 1: The Command Center (Next.js Dashboard)
A premium, dark-themed dashboard providing a unified interface to govern the AI agents.
- **Content Approvals**: Review, approve, or reject AI-generated social media content (Reels, Posts) before they are published.
- **Lead Tracking**: A CRM tracking incoming inquiries from all sources (Meta, Email, Website) with statuses ranging from *New* to *Converted*.
- **Tech Stack**: Next.js 16 (App Router), Tailwind CSS v4, Prisma ORM, SQLite.

### Phase 2: The Communication Agents (Inbound Routing)
Autonomous agents that read, categorize, and route incoming communications using Gemini 2.5 Flash.
- **Meta Integrations (`/api/webhooks/meta`)**: Listens to Instagram and Facebook Messenger webhooks. It classifies messages as "Warm Leads" (adds them to the CRM) or "General" (generates and sends a smart auto-reply).
- **Gmail Polling (`/api/webhooks/gmail`)**: Periodically fetches unread emails, parses them for lead potential, adds hot leads to the dashboard, and marks the emails as read.

### Phase 3: The Content Engine & "Trend Brain"
Twin agents dedicated to scraping industry news and generating viral content.
- **Agent B: Trend Analyst (`/api/agents/trend-scraper`)**: A weekly Puppeteer script that scrapes architecture news (e.g. ArchDaily) and stores the extracted trends as vector embeddings in a **Pinecone** database (The "Trend Brain").
- **Agent A: Video SEO Captioner (`/api/agents/video-seo`)**: Accepts a long architectural render, uses **Cloudinary** to slice it into a 15-second reel, queries Pinecone for current trends ("Biophilic design", "Rammed earth"), and uses Gemini to write a viral, trend-jacking SEO caption. It pushes the reel to the dashboard for human approval.

### Phase 4: The Telegram Watchdog (Global Error Handling)
A global reliability layer to ensure the AI doesn't fail silently.
- **Telegram Module (`/src/lib/telegram.ts`)**: Pushes error stacks directly to the Admin's Telegram chat.
- **Enforced Skill**: Agents are strictly mandated (via `rule.md` and custom `.agent/skills`) to wrap all third-party API executions (Meta, Cloudinary, Pinecone, Gemini) in `try/catch` blocks and route failures to the Watchdog.

---

## 🚀 Setup & Installation

**1. Clone the repository and install dependencies:**
\`\`\`bash
npm install
\`\`\`

**2. Setup Environment Variables:**
Rename \`.env.example\` to \`.env\` (or create one) and add your keys:
\`\`\`env
# Database & Auth
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI & External Services
GEMINI_API_KEY="your-gemini-key"
PINECONE_API_KEY="your-pinecone-key"
CLOUDINARY_API_KEY="your-cloudinary-key"
CLOUDINARY_API_SECRET="your-cloudinary-secret"

# Telegram Watchdog
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"
\`\`\`

**3. Initialize Database:**
\`\`\`bash
# Generate the Prisma Client
npx prisma generate

# Push the schema to SQLite
npx prisma db push

# Seed the database with demo users, leads, and content
npx tsx prisma/seed.ts
\`\`\`

**4. Run Development Server:**
\`\`\`bash
npm run dev
\`\`\`

---

## 🤖 Manual Testing of Agents

While running locally (`npm run dev`), you can trigger the background agents manually to test their RAG and API interactions:

- **Run Trend Scraper (Agent B):** 
  \`Invoke-RestMethod -Uri "http://localhost:3000/api/agents/trend-scraper" -Method POST\`
- **Run Video Slicer (Agent A):**
  \`Invoke-RestMethod -Uri "http://localhost:3000/api/agents/video-seo" -Method POST -Body '{"videoUrl":"your-video-link","contextInfo":"Luxury Villa"}' -ContentType "application/json"\`
- **Trigger Gmail Polling:**
  \`Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/gmail" -Headers @{ "Authorization" = "Bearer dev-secret" }\`

---

*Built with ♥ for Concepts & Design.*
