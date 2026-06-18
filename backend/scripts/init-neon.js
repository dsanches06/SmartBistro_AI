import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.resolve(__dirname, "../../database/neon_vercel/schema_neon.sql");
const seedPath = path.resolve(__dirname, "../../database/neon_vercel/seed_default_neon.sql");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not defined. Cannot initialize Neon database.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runSqlFile(filePath) {
  const sql = await fs.readFile(filePath, "utf8");
  console.log(`Running SQL file: ${path.basename(filePath)}`);
  await pool.query(sql);
}

async function shouldSeed() {
  const result = await pool.query("SELECT COUNT(*) AS count FROM roles");
  return Number(result.rows[0].count) === 0;
}

async function main() {
  try {
    await runSqlFile(schemaPath);
    const seed = await shouldSeed();
    if (seed) {
      await runSqlFile(seedPath);
      console.log("Seed completed.");
    } else {
      console.log("Seed skipped because roles table already contains data.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to initialize Neon database:", error);
  process.exit(1);
});
