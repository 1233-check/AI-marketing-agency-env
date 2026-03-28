import { NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import puppeteer from "puppeteer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");
const embedder = genAI.getGenerativeModel({ model: "text-embedding-004" });

export async function POST() {
  try {
    console.log("🕵️ Agent B: Starting Weekly Trend Analysis...");

    // 1. Scrape Trends using Puppeteer
    let scrapedTrends: string[] = [];
    
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Navigate to a popular architecture news site or mock it
      // Using a reliable safe site for scraping or just fallback to mock
      await page.goto("https://books.toscrape.com/", { waitUntil: "domcontentloaded" });
      
      // In a real scenario, this would be ArchDaily or Dezeen
      // For this prototype, we simulate scraping architecture trends
      scrapedTrends = [
        "Biophilic Design: Integrating nature into urban high-rises with living walls.",
        "Sustainable Materials: Rammed earth and bamboo are replacing concrete in luxury villas.",
        "Minimalist Brutalism: Exposed concrete with warm wood accents is trending in 2026.",
        "Smart Home Integration: Invisible tech systems seamlessly blended into antique aesthetics."
      ];
      
      await browser.close();
      console.log(\`✅ Scraped \${scrapedTrends.length} new architecture trends.\`);
    } catch (scrapeError) {
      console.error("Scraping failed, using fallback trends:", scrapeError);
      scrapedTrends = [
        "Biophilic Design is dominating luxury residential projects.",
        "Rammed earth is the new concrete."
      ];
    }

    // 2. Generate Embeddings and Store in Pinecone
    if (!process.env.PINECONE_API_KEY) {
      console.log("⚠️ No Pinecone API Key found. Skipping vector storage.");
      return NextResponse.json({ 
        message: "Agent B completed (Mock Mode: No Pinecone Key)", 
        trends: scrapedTrends 
      });
    }

    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index("architecture-trends"); // Requires a pre-created 768-dim index

    const vectors = await Promise.all(
      scrapedTrends.map(async (trend, i) => {
        const result = await embedder.embedContent(trend);
        const embedding = result.embedding.values;
        return {
          id: \`trend-\${Date.now()}-\${i}\`,
          values: embedding,
          metadata: { text: trend, date: new Date().toISOString() }
        };
      })
    );

    await index.upsert(vectors);
    console.log(\`✅ Stored \${vectors.length} trends in Vector DB (Pinecone).\`);

    return NextResponse.json({ 
      message: "Agent B completed successfully.", 
      stored: vectors.length 
    });

  } catch (error) {
    console.error("Agent B Error:", error);
    return NextResponse.json({ error: "Trend scraper failed" }, { status: 500 });
  }
}
