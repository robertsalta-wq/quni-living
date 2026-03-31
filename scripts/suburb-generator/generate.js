import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicApiKey) {
  console.error("❌ Missing ANTHROPIC_API_KEY in scripts/suburb-generator/.env");
  process.exit(1);
}

const anthropic = new Anthropic({ apiKey: anthropicApiKey });
const outputDir = path.join(__dirname, "output");

const suburbs = [
  {
    suburb: "Kensington",
    university: "UNSW",
    travelTime: "5-10 min walk",
    rentRange: "$280-$380 per week for a share room",
    landmarks: ["Anzac Parade", "Randwick Racecourse"],
  },
  {
    suburb: "Randwick",
    university: "UNSW",
    travelTime: "10-20 min walk or bus",
    rentRange: "$270-$370 per week",
    landmarks: ["Randwick Racecourse", "Coogee Beach nearby"],
  },
  {
    suburb: "Maroubra",
    university: "UNSW",
    travelTime: "15-25 min bus",
    rentRange: "$240-$330 per week",
    landmarks: ["Maroubra Beach", "Maroubra Junction"],
  },
  {
    suburb: "Newtown",
    university: "USYD",
    travelTime: "10-20 min walk",
    rentRange: "$270-$370 per week",
    landmarks: ["King Street", "Camperdown Memorial Park"],
  },
  {
    suburb: "Glebe",
    university: "USYD",
    travelTime: "10-15 min walk",
    rentRange: "$280-$380 per week",
    landmarks: ["Glebe Point Road", "Glebe Markets", "Jubilee Park"],
  },
  {
    suburb: "Camperdown",
    university: "USYD",
    travelTime: "5-10 min walk",
    rentRange: "$290-$390 per week",
    landmarks: ["Camperdown Park", "Royal Prince Alfred Hospital"],
  },
  {
    suburb: "Macquarie Park",
    university: "Macquarie University",
    travelTime: "5-20 min walk or 2 min Metro",
    rentRange: "$250-$340 per week",
    landmarks: ["Macquarie Centre", "Lane Cove National Park"],
  },
  {
    suburb: "Ryde",
    university: "Macquarie University",
    travelTime: "15-25 min bus or Metro",
    rentRange: "$230-$320 per week",
    landmarks: ["Top Ryde City", "Parramatta River"],
  },
  {
    suburb: "Meadowbank",
    university: "Macquarie University",
    travelTime: "15 min Metro",
    rentRange: "$240-$330 per week",
    landmarks: ["Meadowbank Park", "Parramatta River Ferry"],
  },
];

function toSlug(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function extractFileNameFromTitle(title) {
  return title.replace(/^File:/i, "");
}

async function searchWikimediaImage(searchQuery) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", searchQuery);
  url.searchParams.set("srnamespace", "6");
  url.searchParams.set("srlimit", "3");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "QuniLiving/1.0 (hello@quni.com.au)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia API failed (${response.status}) for query: ${searchQuery}`);
  }

  const data = await response.json();
  const firstResult = data?.query?.search?.[0];

  if (!firstResult?.title) {
    throw new Error(`No Wikimedia image results for query: ${searchQuery}`);
  }

  const fileName = extractFileNameFromTitle(firstResult.title);

  return {
    url: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`,
    title: firstResult.title,
  };
}

function createClaudePrompt(suburbData) {
  const keyword = `student accommodation ${suburbData.suburb} ${suburbData.university}`;

  return `You are writing high-quality, locally specific, SEO landing page copy for Quni Living (Australian student accommodation marketplace).

Return ONLY valid JSON. Do not include markdown, prose, or code fences.

Target keyword: "${keyword}"
Suburb: ${suburbData.suburb}
University: ${suburbData.university}
Typical commute: ${suburbData.travelTime}
Rent range: ${suburbData.rentRange}
Local landmarks to reference naturally: ${suburbData.landmarks.join(", ")}

Rules:
1) Content must feel specific to ${suburbData.suburb}, Sydney (not generic).
2) Mention realistic transport and lifestyle details for students.
3) Write clear, natural Australian English.
4) Avoid keyword stuffing; include the target keyword naturally in meta title, intro, and at least one section.
5) FAQs must be practical and specific for students comparing this suburb.
6) Keep all text unique for this suburb.
7) No placeholders.

Return this exact JSON structure with all keys present:
{
  "metaTitle": "string",
  "metaDescription": "string",
  "h1": "string",
  "intro": "string",
  "livingSection": { "heading": "string", "body": "string" },
  "transportSection": { "heading": "string", "body": "string" },
  "costSection": { "heading": "string", "body": "string" },
  "tipsSection": { "heading": "string", "tips": ["string", "string", "string"] },
  "faqs": [
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" }
  ],
  "ctaText": "string"
}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function is529OverloadedError(error) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = error.status ?? error.statusCode ?? error.code;
  if (status === 529 || status === "529") {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /\b529\b/.test(message) && /overload|overloaded/i.test(message);
}

async function generateSuburbContent(suburbData) {
  const prompt = createClaudePrompt(suburbData);
  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock) {
    throw new Error("Claude response missing text block");
  }

  try {
    return JSON.parse(textBlock.text);
  } catch {
    throw new Error("Claude returned non-JSON content");
  }
}

async function generateSuburbContentWithRetry(suburbData) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await generateSuburbContent(suburbData);
    } catch (error) {
      if (!is529OverloadedError(error) || attempt === maxAttempts) {
        throw error;
      }

      const nextAttempt = attempt + 1;
      console.log(`🔄 Retrying ${suburbData.suburb} (attempt ${nextAttempt}/${maxAttempts})...`);
      await sleep(15000);
    }
  }

  throw new Error(`Unexpected retry flow failure for ${suburbData.suburb}`);
}

async function run() {
  await fs.mkdir(outputDir, { recursive: true });
  const results = [];

  console.log("🚀 Starting suburb SEO content generation...\n");

  for (const suburbData of suburbs) {
    const label = `${suburbData.suburb} / ${suburbData.university}`;
    console.log(`🟡 Generating: ${label}`);

    try {
      const landmarkQuery = `${suburbData.suburb} Sydney ${suburbData.landmarks[0]} photograph Wikimedia Commons`;
      const campusQuery = `${suburbData.university} Sydney campus Wikimedia Commons`;

      const [content, landmarkImage, campusImage] = await Promise.all([
        generateSuburbContentWithRetry(suburbData),
        searchWikimediaImage(landmarkQuery),
        searchWikimediaImage(campusQuery),
      ]);

      const output = {
        suburb: suburbData.suburb,
        university: suburbData.university,
        images: {
          landmark: landmarkImage,
          campus: campusImage,
        },
        content,
      };

      const outputPath = path.join(outputDir, `${toSlug(suburbData.suburb)}.json`);
      await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf8");

      results.push({ suburb: suburbData.suburb, status: "success", error: "" });
      console.log(`✅ Saved: ${path.relative(__dirname, outputPath)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ suburb: suburbData.suburb, status: "failed", error: message });
      console.error(`❌ Failed: ${label} - ${message}\n`);
    }
  }

  console.log("📊 Generation summary:");
  console.table(results);

  const successCount = results.filter((result) => result.status === "success").length;
  const failCount = results.length - successCount;
  console.log(`Finished. Success: ${successCount}, Failed: ${failCount}`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`💥 Fatal error: ${message}`);
  process.exit(1);
});
