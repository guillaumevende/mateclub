import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import Database from 'better-sqlite3';

const db = new Database('./data/mateclub.db');
mkdirSync('./uploads', { recursive: true });

const users = db.prepare('SELECT id, pseudo FROM users').all();

if (users.length === 0) {
	console.log('Aucun utilisateur trouvé. Lancez d\'abord l\'app.');
	process.exit(1);
}

const now = new Date();
const recordings = [];

function createDemoAudio(filename, durationSeconds, variantIndex) {
	const baseFrequency = 240 + ((variantIndex * 53) % 180);
	const endFadeStart = Math.max(durationSeconds - 0.35, 0.1);

	execFileSync(
		'ffmpeg',
		[
			'-y',
			'-f',
			'lavfi',
			'-i',
			`sine=frequency=${baseFrequency}:duration=${durationSeconds}:sample_rate=48000`,
			'-af',
			`volume=0.08,lowpass=f=900,afade=t=in:st=0:d=0.05,afade=t=out:st=${endFadeStart.toFixed(2)}:d=0.3`,
			'-c:a',
			'libopus',
			'-b:a',
			'96k',
			`./uploads/${filename}`
		],
		{ stdio: 'ignore' }
	);
}

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
		const durationSeconds = Math.floor(Math.random() * 9) + 4;
		const filename = `demo-${dayOffset}-${i}.webm`;
		
		recordings.push({
			user_id: user.id,
			filename,
			duration_seconds: durationSeconds,
			recorded_at: recordDate.toISOString()
		});

		createDemoAudio(filename, durationSeconds, dayOffset * 10 + i);
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
console.log('Les fichiers audio de démo ont été générés dans ./uploads avec de petites durées variables.');
