import pg from 'pg';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// PostgreSQL — Vercel/Neon (produção e remoto)
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
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