import Database from 'better-sqlite3';

const db = new Database('./data/mateclub.db');

const users = db.prepare('SELECT id, pseudo FROM users').all();

if (users.length === 0) {
	console.log('Aucun utilisateur trouvé. Lancez d\'abord l\'app.');
	process.exit(1);
}

const avatars = ['☕', '😀', '😎', '🤠', '🥳', '😇', '🤩', '😈', '🎸', '🎮', '🚀', '🍕', '🍺', '🌈', '🔥'];

const now = new Date();
const recordings = [];

for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
	const date = new Date(now);
	date.setDate(date.getDate() - dayOffset);
	
	const numRecordings = Math.floor(Math.random() * 5) + 1;
	
	for (let i = 0; i < numRecordings; i++) {
		const user = users[Math.floor(Math.random() * users.length)];
		const hour = Math.floor(Math.random() * 12) + 8;
		const minute = Math.floor(Math.random() * 60);
		
		const recordDate = new Date(date);
		recordDate.setHours(hour, minute, 0, 0);
		
		recordings.push({
			user_id: user.id,
			filename: `demo-${dayOffset}-${i}.webm`,
			duration_seconds: Math.floor(Math.random() * 150) + 30,
			recorded_at: recordDate.toISOString()
		});
	}
}

const stmt = db.prepare(`
	INSERT INTO recordings (user_id, filename, duration_seconds, recorded_at) 
	VALUES (?, ?, ?, ?)
`);

for (const rec of recordings) {
	stmt.run(rec.user_id, rec.filename, rec.duration_seconds, rec.recorded_at);
}

console.log(`${recordings.length} enregistrements de demo créés pour ${users.length} utilisateur(s).`);
console.log('Les fichiers audio sont factices et ne seront pas lisibles, mais l\'UI s\'affichera correctement.');
