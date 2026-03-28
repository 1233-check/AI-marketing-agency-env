---
name: telegram_alert
description: "Global error-reporting skill that forces the agent to wrap third-party API calls in try/catch blocks and route failures to the Telegram Watchdog."
---

# Telegram Watchdog Skill

This skill enforces reliable error reporting across the Concepts & Design ecosystem. 

## Requirements

Whenever you write or refactor code that makes a **third-party API call** (e.g., Gemini LLM, Prisma, Meta Graph API, Gmail API, Cloudinary, Pinecone), you MUST follow this pattern:

1. Wrap the execution in a \`try/catch\` block.
2. If an error is caught, call the Telegram alert module (\`sendTelegramAlert\`) before returning a 500 status code.
3. Import the module from \`@/lib/telegram\`.

## Implementation Example

\`\`\`typescript
import { sendTelegramAlert } from "@/lib/telegram";

export async function POST(request: Request) {
  try {
    // 1. Make third party call
    const result = await someThirdPartyApiCall();
    return Response.json(result);
  } catch (error) {
    // 2. Route failure to Telegram alert module
    await sendTelegramAlert("Failed to execute someThirdPartyApiCall", error);
    
    // 3. Gracefully degrade or return 500
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
\`\`\`

## When to apply this skill
Apply this any time you are adding external service integrations, fetching remote resources via \`fetch\`, or working with SDKs that abstract network requests.
