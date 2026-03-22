import { createUser } from '../src/lib/server/db.js';

const adminPseudo = process.env.ADMIN_PSEUDO || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword) {
  console.error('Error: ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

if (adminPassword.length < 12) {
  console.error('Error: ADMIN_PASSWORD must be at least 12 characters long');
  process.exit(1);
}

try {
  console.log(`Creating admin user: ${adminPseudo}`);
  const admin = createUser(adminPseudo, adminPassword, true);
  console.log(`Admin created successfully! ID: ${admin.id}`);
} catch (e) {
  console.log('Admin user may already exist');
  process.exit(0);
}
