import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log("Running database migration...");

  // Read the schema file
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  // Split by semicolons and run each statement
  // Filter out comments and empty statements
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.length === 0) continue;

    console.log(`Running: ${statement.substring(0, 50)}...`);

    const { error } = await supabase.rpc("exec_sql", { sql: statement + ";" }).single();

    if (error) {
      // Try direct query for DDL statements
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql: statement + ";" }),
      });

      if (!response.ok) {
        console.warn(`Warning: ${statement.substring(0, 30)}... - may need manual execution`);
      }
    }
  }

  console.log("Migration complete! Please run the schema.sql manually in Supabase SQL Editor if needed.");
}

runMigration().catch(console.error);
