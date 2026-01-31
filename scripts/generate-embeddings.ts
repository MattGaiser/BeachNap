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

async function main() {
  console.log("Fetching messages without embeddings...");

  // Get messages without embeddings
  const { data: messages, error } = await supabase
    .from("messages")
    .select("id, content")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching messages:", error);
    return;
  }

  console.log(`Found ${messages?.length || 0} messages without embeddings`);

  if (!messages || messages.length === 0) {
    console.log("All messages already have embeddings!");
    return;
  }

  for (const msg of messages) {
    try {
      console.log(`Generating embedding for: "${msg.content.substring(0, 40)}..."`);
      const embedding = await generateEmbedding(msg.content);

      const { error: updateError } = await supabase
        .from("messages")
        .update({ embedding })
        .eq("id", msg.id);

      if (updateError) {
        console.error(`  Error updating message ${msg.id}:`, updateError.message);
      } else {
        console.log(`  Done!`);
      }
    } catch (err) {
      console.error(`  Error generating embedding:`, err);
    }
  }

  console.log("Embedding generation complete!");
}

main().catch(console.error);
