const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("No DATABASE_URL found, skipping migrations.");
    return;
  }
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('@postgres:');
  const useSSL = !isLocal || connectionString.includes('sslmode=require') || connectionString.includes('supabase') || connectionString.includes('rlwy.net');

  const client = new Client({
    connectionString,
    ...(useSSL && { ssl: { rejectUnauthorized: false } })
  });

  try {
    await client.connect();
    console.log("Connected to DB for migrations.");
    const files = fs.readdirSync(path.join(__dirname, 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const p = path.join(__dirname, 'migrations', file);
      const sql = fs.readFileSync(p, 'utf8');
      console.log(`Running ${file}...`);
      try {
        await client.query(sql);
      } catch (e) {
        console.warn(`Warning running ${file}:`, e.message);
      }
    }
    await client.end();
    console.log("Migrations done.");
  } catch (err) {
    console.error("Migration runner connection error:", err.message);
  }
}

run().catch(err => console.error("Migration error:", err.message));
