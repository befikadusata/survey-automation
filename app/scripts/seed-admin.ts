import { Pool } from 'pg';
import bcrypt from 'bcrypt';

async function seed() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const username = process.env.ADMIN_USER || 'admin';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('ADMIN_PASSWORD environment variable is required');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
    [username, passwordHash]
  );

  console.log(`Admin user '${username}' seeded successfully.`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
