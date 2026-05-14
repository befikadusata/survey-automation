import { Client } from 'pg';
import bcrypt from 'bcrypt';

async function run() {
  console.log('Starting user migration...');
  
  // Use the connection string from environment
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    console.log('Creating users table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUser || !adminPassword) {
      console.warn('ADMIN_USER or ADMIN_PASSWORD not set in env. Skipping admin creation.');
      return;
    }

    const res = await client.query('SELECT id FROM users WHERE username = $1', [adminUser]);
    if (res.rowCount === 0) {
      console.log(`Seeding initial admin user: ${adminUser}`);
      const hash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        [adminUser, hash, 'admin']
      );
      console.log('Admin user seeded successfully.');
    } else {
      console.log('Admin user already exists. Skipping seed.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
    console.log('Migration finished.');
  }
}

run();
