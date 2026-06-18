import pg from 'pg';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

function normalizeEnvValue(value) {
  if (!value) return value;
  let normalized = value.trim();
  if (normalized.startsWith('"') && normalized.endsWith('"')) {
    normalized = normalized.slice(1, -1);
  }
  return normalized.replace(/^\uFEFF/, '').trim();
}

const DATABASE_URL = normalizeEnvValue(process.env.DATABASE_URL);

// PostgreSQL — Vercel/Neon (produção e remoto)
export const pgPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// MySQL — desenvolvimento local
export const mysqlDb = mysql
  .createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    connectionLimit: 10,
  })
  .promise();

// Exportação padrão: usa PostgreSQL se DATABASE_URL estiver definido (Vercel/Neon)
export const db = process.env.DATABASE_URL ? pgPool : mysqlDb;