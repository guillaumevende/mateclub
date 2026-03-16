import { createUser } from '../src/lib/server/db.js';

const adminPseudo = process.env.ADMIN_PSEUDO || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

try {
  console.log(`Creating admin user: ${adminPseudo}`);
  const admin = createUser(adminPseudo, adminPassword, true);
  console.log(`Admin created successfully! ID: ${admin.id}`);
  console.log(`Password: ${adminPassword}`);
} catch (e) {
  console.log('Admin user may already exist');
  process.exit(0);
}
