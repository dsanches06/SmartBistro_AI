import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env.local primeiro, depois .env
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const schemaPath = path.resolve(__dirname, "../../database/neon_vercel/schema_neon.sql");
const seedPath = path.resolve(__dirname, "../../database/neon_vercel/seed_default_neon.sql");

function normalizeEnvValue(value) {
  if (!value) return value;
  let normalized = value.trim();
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/^\uFEFF/, '').trim();
}

const DATABASE_URL = normalizeEnvValue(process.env.DATABASE_URL);

if (!DATABASE_URL) {
  console.error("DATABASE_URL is not defined or is invalid. Cannot initialize Neon database.");
  process.exit(1);
}

try {
  const parsed = new URL(DATABASE_URL);
  console.log(`Parsed DATABASE_URL host=${parsed.hostname}, protocol=${parsed.protocol}`);
} catch (error) {
  console.error("DATABASE_URL cannot be parsed as a URL:", error.message);
  console.error(`DATABASE_URL length=${DATABASE_URL.length}`);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
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
