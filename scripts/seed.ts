import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join("=");
        }
      }
    }
  } catch {
    console.log("No .env.local found, using existing env vars");
  }
}
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiKey = process.env.OPENAI_API_KEY!;

if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

interface SeedMessage {
  username: string;
  content: string;
  channel: string;
  offsetMinutes: number;
}

const seedMessages: SeedMessage[] = [
  // Auth topic - fragmented across time
  { username: "alice", content: "the auth is weird", channel: "engineering", offsetMinutes: 0 },
  { username: "alice", content: "use bearer tokens", channel: "engineering", offsetMinutes: 1 },
  { username: "alice", content: "endpoint is /api/auth", channel: "engineering", offsetMinutes: 2 },
  { username: "bob", content: "thanks alice, trying it now", channel: "engineering", offsetMinutes: 5 },

  // Bob figures it out later (simulating 1 week = 10080 minutes, we'll use smaller offset)
  { username: "bob", content: "finally got auth working", channel: "engineering", offsetMinutes: 1000 },
  { username: "bob", content: "the secret was in .env.local", channel: "engineering", offsetMinutes: 1001 },
  { username: "bob", content: "make sure you have SUPABASE_SERVICE_ROLE_KEY set", channel: "engineering", offsetMinutes: 1002 },

  // Even later discovery
  { username: "bob", content: "heads up everyone", channel: "engineering", offsetMinutes: 2000 },
  { username: "bob", content: "auth tokens expire after 24 hours", channel: "engineering", offsetMinutes: 2001 },
  { username: "bob", content: "you need to refresh them", channel: "engineering", offsetMinutes: 2002 },

  // Deployment topic
  { username: "carol", content: "anyone know how to deploy?", channel: "engineering", offsetMinutes: 500 },
  { username: "dave", content: "just push to main", channel: "engineering", offsetMinutes: 501 },
  { username: "dave", content: "CI handles the rest", channel: "engineering", offsetMinutes: 502 },
  { username: "dave", content: "takes about 5 minutes", channel: "engineering", offsetMinutes: 503 },
  { username: "carol", content: "perfect, thanks!", channel: "engineering", offsetMinutes: 504 },

  // Database topic
  { username: "eve", content: "what db are we using", channel: "engineering", offsetMinutes: 300 },
  { username: "frank", content: "postgres", channel: "engineering", offsetMinutes: 301 },
  { username: "frank", content: "hosted on supabase", channel: "engineering", offsetMinutes: 302 },
  { username: "eve", content: "how do I connect?", channel: "engineering", offsetMinutes: 303 },
  { username: "frank", content: "check the env vars", channel: "engineering", offsetMinutes: 304 },
  { username: "frank", content: "NEXT_PUBLIC_SUPABASE_URL and the anon key", channel: "engineering", offsetMinutes: 305 },

  // General chat
  { username: "alice", content: "welcome to slackbrain everyone!", channel: "general", offsetMinutes: 0 },
  { username: "bob", content: "excited to try this out", channel: "general", offsetMinutes: 10 },
  { username: "carol", content: "the AI search feature looks cool", channel: "general", offsetMinutes: 20 },

  // Random fun
  { username: "dave", content: "anyone want to grab coffee?", channel: "random", offsetMinutes: 100 },
  { username: "eve", content: "sure, the place on 5th?", channel: "random", offsetMinutes: 101 },
  { username: "frank", content: "count me in", channel: "random", offsetMinutes: 102 },
];

async function seed() {
  console.log("Starting seed...");

  // Create users
  const usernames = Array.from(new Set(seedMessages.map((m) => m.username)));
  const userMap: Record<string, string> = {};

  console.log("Creating users...");
  for (const username of usernames) {
    const { data: existing } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (existing) {
      userMap[username] = existing.id;
      console.log(`  User ${username} already exists`);
    } else {
      const { data: created, error } = await supabase
        .from("profiles")
        .insert({ username })
        .select()
        .single();

      if (error) {
        console.error(`  Failed to create user ${username}:`, error.message);
      } else if (created) {
        userMap[username] = created.id;
        console.log(`  Created user ${username}`);
      }
    }
  }

  // Get channels
  const { data: channels } = await supabase.from("channels").select("*");
  const channelMap: Record<string, string> = {};
  channels?.forEach((c) => {
    channelMap[c.name] = c.id;
  });

  console.log("Channels:", Object.keys(channelMap));

  // Insert messages with embeddings
  const baseTime = new Date();
  baseTime.setDate(baseTime.getDate() - 7); // Start from 7 days ago

  console.log("Creating messages with embeddings...");
  for (const msg of seedMessages) {
    const channelId = channelMap[msg.channel];
    const userId = userMap[msg.username];

    if (!channelId || !userId) {
      console.log(`  Skipping message: channel=${msg.channel} user=${msg.username}`);
      continue;
    }

    const timestamp = new Date(baseTime.getTime() + msg.offsetMinutes * 60 * 1000);

    // Generate embedding
    let embedding: number[] | null = null;
    try {
      embedding = await generateEmbedding(msg.content);
      console.log(`  Generated embedding for: "${msg.content.substring(0, 30)}..."`);
    } catch (error) {
      console.error(`  Failed to generate embedding:`, error);
    }

    const { error } = await supabase.from("messages").insert({
      content: msg.content,
      channel_id: channelId,
      user_id: userId,
      embedding,
      created_at: timestamp.toISOString(),
    });

    if (error) {
      console.error(`  Failed to insert message:`, error.message);
    }
  }

  console.log("Seed complete!");
  console.log("\nTest queries to try:");
  console.log('  - "How does auth work?"');
  console.log('  - "How do I deploy?"');
  console.log('  - "What database do we use?"');
}

seed().catch(console.error);
