import pg from 'pg';

const uris = [
  // 1. Direct connection
  "postgresql://postgres:%5BPreetham123%26Bhara%5D@db.rgizgoaicixtvqkuevfk.supabase.co:5432/postgres",
  // 2. Pooler with port 6543
  "postgresql://postgres.rgizgoaicixtvqkuevfk:%5BPreetham123%26Bhara%5D@aws-0-ap-south-1.pooler.supabase.com:6543/postgres",
  // 3. Pooler with port 5432
  "postgresql://postgres.rgizgoaicixtvqkuevfk:%5BPreetham123%26Bhara%5D@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
];

async function testConnection(uri, index) {
  console.log(`Testing URI ${index + 1}...`);
  const pool = new pg.Pool({
    connectionString: uri,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await pool.query('SELECT 1');
    console.log(`✅ URI ${index + 1} SUCCESSFUL!`);
    return true;
  } catch (err) {
    console.log(`❌ URI ${index + 1} FAILED: ${err.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  for (let i = 0; i < uris.length; i++) {
    const success = await testConnection(uris[i], i);
    if (success) {
      console.log(`\nUse URI ${i + 1} in your .env file!`);
      process.exit(0);
    }
  }
  console.log("\nAll connections failed.");
  process.exit(1);
}

run();
