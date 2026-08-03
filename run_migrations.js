const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to DB.");
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
  console.log("Done.");
}
run().catch(console.error);
