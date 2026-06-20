import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
};

async function restoreDatabase() {
  let connection;
  try {
    console.log(`Conectando a MySQL (${config.user}@${config.host})...`);
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado!');

    const schemaPath = path.join(__dirname, '../database/mysql/schema.sql');
    console.log('Executando schema.sql...');
    await connection.query(fs.readFileSync(schemaPath, 'utf8'));
    console.log('✅ Schema criado com sucesso!');

    const seedPath = path.join(__dirname, '../database/mysql/seed_default.sql');
    console.log('Executando seed_default.sql...');
    await connection.query(fs.readFileSync(seedPath, 'utf8'));
    console.log('✅ Dados iniciais inseridos com sucesso!');

    console.log('\n========================================');
    console.log('BD restaurada com sucesso!');
    console.log('========================================');
    console.log('\nCredenciais de teste:');
    console.log('Username: admin   | Password: admin123');
    console.log('Username: manager | Password: manager123');
    console.log('========================================\n');

    await connection.end();
  } catch (error) {
    console.error('Erro ao restaurar BD:', error.message);
    process.exit(1);
  }
}

restoreDatabase();
