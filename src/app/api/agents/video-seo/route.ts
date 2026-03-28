import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");
const llm = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const embedder = genAI.getGenerativeModel({ model: "text-embedding-004" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const { videoUrl, contextInfo } = await request.json();

    console.log("🎬 Agent A: Processing new video content...");

    // 1. Cloudinary Video Manipulation (Slicing 15s clip)
    let clipUrl = videoUrl;
    if (process.env.CLOUDINARY_API_KEY) {
      // Example: Create a 15-second reel from a longer video
      clipUrl = cloudinary.url(videoUrl, {
        resource_type: "video",
        transformation: [
          { width: 1080, height: 1920, crop: "fill" },
          { start_offset: "0", end_offset: "15" } // Slice first 15 seconds
        ]
      });
      console.log("✅ Video sliced via Cloudinary:", clipUrl);
    } else {
      console.log("⚠️ No Cloudinary keys. Using raw video URL constraint.");
    }

    // 2. Query Agent B's Trend Memory (Pinecone)
    let relevantTrends = ["Biophilic design", "Sustainable materials"]; // Fallback
    
    if (process.env.PINECONE_API_KEY && process.env.GEMINI_API_KEY !== "dummy-key") {
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index("architecture-trends");
      
      const queryEmbedding = await embedder.embedContent(contextInfo || "Luxury modern architecture");
      
      const queryResponse = await index.query({
        vector: queryEmbedding.embedding.values,
        topK: 2,
        includeMetadata: true
      });

      if (queryResponse.matches.length > 0) {
        relevantTrends = queryResponse.matches.map(m => m.metadata?.text as string);
      }
      console.log("🧠 Retrieved Context from Trend Brain:", relevantTrends);
    }

    // 3. Generate SEO Caption with Gemini
    const prompt = \`You are an expert social media manager for "Concepts & Design" luxury architecture firm.
Write a highly engaging, viral Instagram Reel caption for a video about: \${contextInfo}

CRITICAL: You MUST incorporate these current architecture trends naturally into the caption to boost algorithm visibility:
- \${relevantTrends.join("\\n- ")}

Keep it punchy, luxurious, and use appropriate spacing. Include 5-7 highly targeted SEO hashtags at the end.
Do not wrap the caption in quotes or JSON.\`;

    let caption = "Check out our latest luxury architectural masterpiece! 🏡✨ #Architecture #LuxuryHomes #ConceptsAndDesign";
    
    if (process.env.GEMINI_API_KEY !== "dummy-key") {
      const result = await llm.generateContent(prompt);
      caption = result.response.text();
    }
    console.log("✍️ Generated SEO Caption.");

    // 4. Send to Phase 1 Dashboard (Prisma)
    const contentItem = await prisma.contentItem.create({
      data: {
        title: \`Auto-Generated Reel: \${contextInfo.substring(0, 30)}...\`,
        type: "REEL",
        status: "PENDING",
        body: caption,
        platform: "INSTAGRAM",
      }
    });

    console.log("✅ Passed to Dashboard for Human Approval!");

    return NextResponse.json({ 
      message: "Agent A completed successfully.",
      clipUrl,
      itemId: contentItem.id,
      caption: caption
    });

  } catch (error) {
    console.error("Agent A Error:", error);
    return NextResponse.json({ error: "Video processing failed" }, { status: 500 });
  }
}
