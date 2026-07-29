const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log("Connected to DB.");
  const files = ['001_initial_schema.sql', '002_user_profile.sql', '003_birth_date.sql', '004_username_gender_age.sql'];
  for (const file of files) {
    const p = path.join(__dirname, 'migrations', file);
    const sql = fs.readFileSync(p, 'utf8');
    console.log(`Running ${file}...`);
    await client.query(sql);
  }
  await client.end();
  console.log("Done.");
}
run().catch(console.error);
