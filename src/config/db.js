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

const isLocal = !connectionString || connectionString.includes('localhost') || connectionString.includes('127.0.0.1') || connectionString.includes('@postgres:');
const useSSL = !isLocal || (connectionString && (connectionString.includes('sslmode=require') || connectionString.includes('supabase') || connectionString.includes('rlwy.net')));

const pool = new Pool({
  connectionString,
  ...(useSSL && { ssl: { rejectUnauthorized: false } })
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
