# Global Project Rules

## 1. The Telegram Watchdog Mandate
Always wrap third-party API calls in try/catch blocks and route failures to the Telegram alert module (`src/lib/telegram.ts`) to ping the admin.

### Explanation:
We rely on numerous external services (Meta, Google, Gemini, Pinecone, Cloudinary). If any of these fail, the admin must be notified immediately.

### Enforcement:
When writing API routes or scripts:
- Import `import { sendTelegramAlert } from "@/lib/telegram";`
- Inside the catch block of external API transactions, execute `await sendTelegramAlert("Descriptive message", error);`

## 2. General Architecture Rules
- Use Prisma as the ORM (`@prisma/adapter-better-sqlite3` for Prisma v7+ SQLite compatibility).
- Build internal dashboard APIs in `/src/app/api/...`.
- All CSS should use Tailwind v4 in `globals.css` with dark theme styling.
