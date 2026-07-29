const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let connectionString = process.env.DATABASE_URL;

// Automatically fix the postgres hostname for local development if not in Docker
if (!process.env.IS_DOCKER && connectionString && connectionString.includes('@postgres:')) {
  connectionString = connectionString.replace('@postgres:', '@localhost:');
}

console.log('--- DB INIT ---');
console.log('IS_DOCKER:', process.env.IS_DOCKER);
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('connectionString resolved to:', connectionString);

const isSupabase = connectionString && connectionString.includes('supabase');

const pool = new Pool({
  connectionString,
  ...(isSupabase && { ssl: { rejectUnauthorized: false } })
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
