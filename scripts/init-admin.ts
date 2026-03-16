import { createUser } from '$lib/server/db';

const adminPseudo = process.env.ADMIN_PSEUDO || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

try {
	const admin = createUser(adminPseudo, adminPassword, true);
	console.log(`Admin created: ${admin.pseudo} (ID: ${admin.id})`);
} catch (e) {
	console.log('Admin already exists or error:', e);
}
