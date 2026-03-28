import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  await prisma.user.upsert({
    where: { email: "admin@conceptsdesign.com" },
    update: {},
    create: {
      email: "admin@conceptsdesign.com",
      password: hashedPassword,
      name: "Concepts & Design Admin",
      role: "ADMIN",
    },
  });

  // Seed content items
  const contentItems = [
    {
      title: "Modern Villa Showcase — Drone Aerial Tour",
      type: "REEL",
      status: "PENDING",
      body: "Stunning aerial footage of our latest modern villa project in Goa. Features infinity pool, cantilevered decks, and floor-to-ceiling glazing. Perfect for Instagram Reels engagement.",
      platform: "INSTAGRAM",
    },
    {
      title: "Sustainable Architecture: Bamboo & Rammed Earth",
      type: "POST",
      status: "PENDING",
      body: "Deep dive into our sustainable building practices. How we integrate bamboo framing, rammed earth walls, and passive cooling techniques into luxury residential design.",
      platform: "LINKEDIN",
    },
    {
      title: "Behind the Blueprint — Design Process Timelapse",
      type: "STORY",
      status: "APPROVED",
      body: "24-hour timelapse showing the evolution of a client's floor plan from initial sketch to final CAD render. Great for showcasing our process to potential clients.",
      platform: "INSTAGRAM",
    },
    {
      title: "Client Testimonial: The Sharma Residence",
      type: "POST",
      status: "APPROVED",
      body: "Mr. & Mrs. Sharma share their experience working with Concepts & Design on their 4,500 sq ft contemporary home. Video testimonial with project walkthrough.",
      platform: "FACEBOOK",
    },
    {
      title: "Minimalist Interiors — Before & After",
      type: "REEL",
      status: "REJECTED",
      body: "Before and after transformation of a dated 1990s apartment into a sleek minimalist space. Needs re-edit — lighting in the 'before' shots is too dark.",
      platform: "INSTAGRAM",
    },
    {
      title: "Architecture Trends 2026: What's Next",
      type: "POST",
      status: "PENDING",
      body: "Our take on the top architecture trends for 2026: biophilic design, AI-assisted planning, modular luxury homes, and net-zero energy buildings.",
      platform: "LINKEDIN",
    },
  ];

  for (const item of contentItems) {
    await prisma.contentItem.create({ data: item });
  }

  // Seed leads
  const leads = [
    {
      name: "Arjun Mehta",
      email: "arjun.mehta@gmail.com",
      phone: "+91 98765 43210",
      source: "INSTAGRAM",
      status: "NEW",
      notes: "Interested in a weekend farmhouse near Lonavala. Budget: ₹2-3 Cr. Saw our drone reel.",
    },
    {
      name: "Priya Kapoor",
      email: "priya.kapoor@outlook.com",
      phone: "+91 87654 32109",
      source: "WEBSITE",
      status: "CONTACTED",
      notes: "Submitted inquiry for office space redesign. 5,000 sq ft commercial in BKC Mumbai. Follow-up call scheduled.",
    },
    {
      name: "Rajesh & Sunita Patel",
      email: "rajeshpatel@yahoo.com",
      phone: "+91 76543 21098",
      source: "FACEBOOK",
      status: "QUALIFIED",
      notes: "Referred by the Sharma family. Looking for a 3BHK duplex in Pune. Ready to proceed with consultation.",
    },
    {
      name: "Ananya Iyer",
      email: "ananya.iyer@gmail.com",
      phone: "+91 65432 10987",
      source: "EMAIL",
      status: "NEW",
      notes: "Interior designer wanting to collaborate on a boutique hotel project in Jaipur. Sent portfolio.",
    },
    {
      name: "Mohammed Khan",
      email: "m.khan@business.com",
      phone: "+91 54321 09876",
      source: "INSTAGRAM",
      status: "CONVERTED",
      notes: "Signed contract for luxury penthouse in Gurgaon. ₹5 Cr project. Construction begins Q2 2026.",
    },
  ];

  for (const lead of leads) {
    await prisma.lead.create({ data: lead });
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
