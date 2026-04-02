import Database from 'better-sqlite3';
import { hashSync, compareSync } from 'bcrypt';
import { writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { debug } from '$lib/debug';

const projectRoot = process.cwd();
const dbPath = process.env.DATABASE_PATH || join(projectRoot, 'data/mateclub.db');
const uploadsDir = join(projectRoot, 'uploads');

if (!existsSync(dbPath)) {
	const dataDir = dirname(dbPath);
	if (!existsSync(dataDir)) {
		mkdirSync(dataDir, { recursive: true });
	}
}
if (!existsSync(uploadsDir)) {
	mkdirSync(uploadsDir, { recursive: true });
}

export const db = new Database(dbPath);

// No automatic admin creation - first admin must be created via /setup page

	db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		pseudo TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		avatar TEXT DEFAULT '☕',
		is_admin INTEGER DEFAULT 0,
		super_powers INTEGER DEFAULT 0,
		daily_notification_hour INTEGER DEFAULT 420,
		timezone TEXT DEFAULT 'Europe/Paris',
		created_at DATETIME DEFAULT (datetime('now')),
		last_login DATETIME
	);

	CREATE TABLE IF NOT EXISTS recordings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		filename TEXT NOT NULL,
		image_filename TEXT,
		url TEXT,
		duration_seconds INTEGER NOT NULL,
		recorded_at DATETIME DEFAULT (datetime('now')),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS listening_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		recording_id INTEGER NOT NULL,
		listened_at DATETIME DEFAULT (datetime('now')),
		FOREIGN KEY (user_id) REFERENCES users(id),
		FOREIGN KEY (recording_id) REFERENCES recordings(id),
		UNIQUE(user_id, recording_id)
	);

	CREATE TABLE IF NOT EXISTS sessions (
		id TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY (user_id) REFERENCES users(id)
	);
	
	CREATE TABLE IF NOT EXISTS csrf_tokens (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		token TEXT NOT NULL,
		session_id TEXT,
		expires_at DATETIME NOT NULL,
		FOREIGN KEY (session_id) REFERENCES sessions(id)
	);
`);

try {
	db.exec('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT "☕"');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT "Europe/Paris"');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('ALTER TABLE users ADD COLUMN super_powers INTEGER DEFAULT 0');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('ALTER TABLE recordings ADD COLUMN image_filename TEXT');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('ALTER TABLE recordings ADD COLUMN audio_hash TEXT');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('CREATE INDEX IF NOT EXISTS idx_audio_hash ON recordings(user_id, audio_hash)');
} catch (e) {
	// Index déjà existant
}

try {
	db.exec('ALTER TABLE users ADD COLUMN logs_enabled INTEGER DEFAULT 0');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec('ALTER TABLE users ADD COLUMN jingles_enabled INTEGER DEFAULT 1');
} catch (e) {
	// Colonne déjà existante
}

try {
	db.exec(`
		CREATE TABLE IF NOT EXISTS login_attempts (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ip TEXT NOT NULL,
			user_id INTEGER,
			attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id)
		)
	`);
} catch (e) {
	// Table déjà existante
}

try {
	db.exec(`
		CREATE TABLE IF NOT EXISTS pending_registrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			pseudo TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			avatar TEXT DEFAULT '☕',
			timezone TEXT DEFAULT 'Europe/Paris',
			is_admin INTEGER DEFAULT 0,
			requested_at DATETIME DEFAULT (datetime('now')),
			status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected'))
		)
	`);
} catch (e) {
	// Table déjà existante
}

try {
	db.exec(`
		CREATE TABLE IF NOT EXISTS app_config (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)
	`);
	// Initialiser la configuration par défaut
	const stmt = db.prepare('INSERT OR IGNORE INTO app_config (key, value) VALUES (?, ?)');
	stmt.run('allow_registration', 'false');
} catch (e) {
	// Table déjà existante
}

export type User = {
	id: number;
	pseudo: string;
	avatar: string;
	is_admin: number;
	super_powers: number;
	daily_notification_hour: number;
	timezone: string;
	created_at: string;
	last_login: string | null;
	logs_enabled?: number;
	jingles_enabled?: number;
};

export type Recording = {
	id: number;
	user_id: number;
	filename: string;
	image_filename: string | null;
	url: string | null;
	duration_seconds: number;
	recorded_at: string;
	listened_by_user: number;
	pseudo: string;
	avatar: string;
	audio_hash?: string | null;
};

export type DayRecordings = {
	date: string;
	recordings: Recording[];
	available: boolean;
};

function getDateInTimezone(dateStr: string, timezone: string): string {
	const date = new Date(dateStr);
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	return formatter.format(date);
}

function getDateWithThreshold(recordedAt: string, thresholdMinutes: number, timezone: string): string {
	// Formatter pour extraire l'heure et les minutes dans le fuseau utilisateur
	const hourMinFormatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: timezone,
		hour: '2-digit',
		hour12: false,
		minute: '2-digit'
	});
	
	// Formatter pour la date
	const dateFormatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	
	// Extraire l'heure et les minutes dans le fuseau utilisateur
	const parts = hourMinFormatter.formatToParts(new Date(recordedAt));
	const hourPart = parts.find(p => p.type === 'hour')?.value || '00';
	const minutePart = parts.find(p => p.type === 'minute')?.value || '00';
	const recordedMinutes = parseInt(hourPart, 10) * 60 + parseInt(minutePart, 10);
	
	// Calculer la date effective
	let effectiveDate = new Date(recordedAt);
	
	// Si minutes >= seuil → groupe = aujourd'hui (verrouillé)
	// Si minutes < seuil → groupe = hier (disponible)
	if (recordedMinutes < thresholdMinutes) {
		effectiveDate.setDate(effectiveDate.getDate() - 1);
	}
	
	return dateFormatter.format(effectiveDate);
}

function getCurrentDateInTimezone(timezone: string): string {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	return formatter.format(now);
}

function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number } {
	const now = new Date();
	const formatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	});
	const parts = formatter.formatToParts(now);
	const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
	const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
	return { hour, minute };
}

export function getUserTimezone(userId: number): string {
	const user = getUserById(userId);
	return user?.timezone || 'Europe/Paris';
}

export function getRecordingsByDate(userId: number, date: string): DayRecordings | null {
	const user = getUserById(userId);
	if (!user) return null;

	const timezone = user.timezone || 'Europe/Paris';
	const stmt = db.prepare(`
		SELECT 
			r.id, r.user_id, r.filename, r.image_filename, r.duration_seconds, r.recorded_at,
			u.pseudo, u.avatar,
			CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as listened_by_user
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
		WHERE date(r.recorded_at) = ?
		ORDER BY r.recorded_at ASC
	`);
	const results = stmt.all(userId, date) as Recording[];

	if (results.length === 0) return null;

	// Vérifier chaque enregistrement individuellement
	const isAvailable = results.some(r => 
		isDateAvailable(r.recorded_at, user.super_powers === 1, user.daily_notification_hour, timezone)
	);

	return {
		date,
		recordings: results,
		available: isAvailable
	};
}

function isDateAvailable(recordedAt: string, superPowers: boolean, thresholdMinutes: number, timezone: string): boolean {
	if (superPowers) return true;

	const now = new Date();
	
	const dateFormatter = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	
	const hourMinFormatter = new Intl.DateTimeFormat('en-GB', {
		timeZone: timezone,
		hour: '2-digit',
		hour12: false,
		minute: '2-digit'
	});

	// Extraire l'heure et minute de l'enregistrement
	const partsRecorded = hourMinFormatter.formatToParts(new Date(recordedAt));
	const hourRecorded = parseInt(partsRecorded.find(p => p.type === 'hour')?.value || '0', 10);
	const minuteRecorded = parseInt(partsRecorded.find(p => p.type === 'minute')?.value || '0', 10);
	const recordedMinutes = hourRecorded * 60 + minuteRecorded;

	// Calculer la date effective (après application du seuil)
	const effectiveDate = getDateWithThreshold(recordedAt, thresholdMinutes, timezone);

	// Extraire l'heure et minute actuelle
	const partsNow = hourMinFormatter.formatToParts(now);
	const hourNow = parseInt(partsNow.find(p => p.type === 'hour')?.value || '0', 10);
	const minuteNow = parseInt(partsNow.find(p => p.type === 'minute')?.value || '0', 10);
	const currentMinutes = hourNow * 60 + minuteNow;

	const today = dateFormatter.format(now);
	
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = dateFormatter.format(yesterday);

	// Enregistrements d'avant-hier ou avant → disponibles
	if (effectiveDate < yesterdayStr) return true;
	
	// Enregistrements d'hier → disponibles seulement si on a passé le seuil (en minutes)
	if (effectiveDate === yesterdayStr) {
		return currentMinutes >= thresholdMinutes;
	}
	
	// Enregistrements d'aujourd'hui → disponibles seulement si l'heure d'enregistrement < seuil (en minutes)
	if (effectiveDate === today) {
		return recordedMinutes < thresholdMinutes;
	}
	
	// Enregistrements de demain ou plus → verrouillés
	return false;
}

export function getRecordingsGroupedByDay(userId: number, limit = 7, page = 1, timezone?: string): DayRecordings[] {
	const user = getUserById(userId);
	if (!user) return [];

	const userTimezone = timezone || user.timezone || 'Europe/Paris';
	const threshold = user.daily_notification_hour;

	const offset = (page - 1) * limit;

	const stmt = db.prepare(`
		SELECT 
			r.id, r.user_id, r.filename, r.image_filename, r.url, r.duration_seconds, r.recorded_at,
			u.pseudo, u.avatar,
			CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as listened_by_user
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
		ORDER BY r.recorded_at DESC
		LIMIT ? OFFSET ?
	`);
	const results = stmt.all(userId, limit * 3, offset) as Recording[];

	const grouped: Record<string, Recording[]> = {};
	for (const row of results) {
		const date = getDateWithThreshold(row.recorded_at, threshold, userTimezone);
		if (!grouped[date]) grouped[date] = [];
		grouped[date].push(row);
	}

	const today = getCurrentDateInTimezone(userTimezone);

	const days: DayRecordings[] = [];
	for (const [date, recordings] of Object.entries(grouped)) {
		// Vérifier chaque enregistrement individuellement
		// Si AU MOINS un enregistrement est disponible, le groupe est disponible
		const isAvailable = recordings.some(r => 
			isDateAvailable(r.recorded_at, user.super_powers === 1, threshold, userTimezone)
		);
		
		days.push({
			date,
			recordings: recordings.sort((a, b) => 
				new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
			),
			available: isAvailable
		});
	}

	return days.slice(0, limit);
}

export function getRecordingsGroupedByDayWithHasMore(
	userId: number,
	limit = 7,
	page = 1,
	timezone?: string
): { days: DayRecordings[]; hasMore: boolean } {
	const user = getUserById(userId);
	if (!user) return { days: [], hasMore: false };

	const userTimezone = timezone || user.timezone || 'Europe/Paris';
	const threshold = user.daily_notification_hour;

	// Filtrer sur les 3 derniers mois
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	const threeMonthsAgoStr = threeMonthsAgo.toISOString();

	const offset = (page - 1) * limit;

	// Calculer la date de début pour cette page (pour vérifier s'il y a plus de jours)
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - (page * limit * 1)); // Approximation

	// Requête principale : récupérer les enregistrements des 3 derniers mois
	const stmt = db.prepare(`
		SELECT
			r.id, r.user_id, r.filename, r.image_filename, r.url, r.duration_seconds, r.recorded_at,
			u.pseudo, u.avatar,
			CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as listened_by_user
		FROM recordings r
		JOIN users u ON r.user_id = u.id
		LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
		WHERE r.recorded_at >= ?
		ORDER BY r.recorded_at DESC
		LIMIT ? OFFSET ?
	`);
	// Demander enough records pour avoir tous les jours (limit * 10 par sécurité)
	const results = stmt.all(userId, threeMonthsAgoStr, limit * 10, offset) as Recording[];

	const grouped: Record<string, Recording[]> = {};
	for (const row of results) {
		const date = getDateWithThreshold(row.recorded_at, threshold, userTimezone);
		if (!grouped[date]) grouped[date] = [];
		grouped[date].push(row);
	}

	// Trier les dates par ordre décroissant (plus récent au plus ancien)
	const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

	// Prendre seulement 'limit' jours
	const selectedDates = sortedDates.slice(0, limit);

	const days: DayRecordings[] = [];
	for (const date of selectedDates) {
		const recordings = grouped[date];
		const isAvailable = recordings.some(r =>
			isDateAvailable(r.recorded_at, user.super_powers === 1, threshold, userTimezone)
		);

		days.push({
			date,
			recordings: recordings.sort((a, b) =>
				new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
			),
			available: isAvailable
		});
	}

	// Vérifier s'il y a plus de jours au-delà de ceux affichés
	const hasMore = sortedDates.length > limit;

	return {
		days,
		hasMore
	};
}

export function getUnreadCount(userId: number): { count: number; totalSeconds: number } {
	// Filtrer sur les 3 derniers mois pour correspondre à l'affichage
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	const threeMonthsAgoStr = threeMonthsAgo.toISOString();
	
	const stmt = db.prepare(`
		SELECT 
			COUNT(*) as count,
			COALESCE(SUM(r.duration_seconds), 0) as totalSeconds
		FROM recordings r
		LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
		WHERE l.id IS NULL AND r.user_id != ? AND r.recorded_at >= ?
	`);
	const result = stmt.get(userId, userId, threeMonthsAgoStr) as { count: number; totalSeconds: number };
	return result;
}

export function createUser(pseudo: string, password: string, isAdmin = false, avatar = '☕'): User {
	const hashpwd = hashSync(password, 10);
	const stmt = db.prepare('INSERT INTO users (pseudo, password_hash, is_admin, avatar) VALUES (?, ?, ?, ?)');
	const result = stmt.run(pseudo, hashpwd, isAdmin ? 1 : 0, avatar);
	return getUserById(result.lastInsertRowid as number)!;
}

export function getUserByPseudo(pseudo: string): (User & { password_hash: string }) | undefined {
	const stmt = db.prepare('SELECT * FROM users WHERE pseudo = ?');
	return stmt.get(pseudo) as (User & { password_hash: string }) | undefined;
}

export function hasAdmin(): boolean {
	const stmt = db.prepare('SELECT id FROM users WHERE is_admin = 1 LIMIT 1');
	return !!stmt.get();
}

export function getUserById(id: number): User | undefined {
	const stmt = db.prepare('SELECT id, pseudo, avatar, is_admin, super_powers, daily_notification_hour, timezone, created_at, last_login, logs_enabled, jingles_enabled FROM users WHERE id = ?');
	return stmt.get(id) as User | undefined;
}

export function verifyPassword(hash: string, password: string): boolean {
	return compareSync(password, hash);
}

export type UserWithCount = User & { recording_count: number };

export function getAllUsers(): UserWithCount[] {
	// Get all users with their recording count in the last 3 months
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	
	const stmt = db.prepare(`
		SELECT 
			u.id, u.pseudo, u.avatar, u.is_admin, u.super_powers, u.daily_notification_hour, u.timezone, u.created_at, u.last_login,
			COALESCE((
				SELECT COUNT(*) 
				FROM recordings r 
				WHERE r.user_id = u.id 
				AND r.recorded_at >= ?
			), 0) as recording_count
		FROM users u
		ORDER BY recording_count DESC, u.pseudo ASC
	`);
	return stmt.all(threeMonthsAgo.toISOString()) as UserWithCount[];
}

export function deleteUser(id: number): void {
	// First get all recordings to delete their files
	const recordingsStmt = db.prepare('SELECT filename, image_filename FROM recordings WHERE user_id = ?');
	const recordings = recordingsStmt.all(id) as { filename: string; image_filename: string | null }[];
	
	// Delete audio and image files
	for (const recording of recordings) {
		const audioPath = join(uploadsDir, recording.filename);
		if (existsSync(audioPath)) {
			unlinkSync(audioPath);
		}
		if (recording.image_filename) {
			const imagePath = join(uploadsDir, recording.image_filename);
			if (existsSync(imagePath)) {
				unlinkSync(imagePath);
			}
		}
	}
	
	// Delete listening history for this user's recordings
	const deleteHistoryStmt = db.prepare(`
		DELETE FROM listening_history 
		WHERE recording_id IN (SELECT id FROM recordings WHERE user_id = ?)
	`);
	deleteHistoryStmt.run(id);
	
	// Delete all recordings for this user
	const deleteRecordingsStmt = db.prepare('DELETE FROM recordings WHERE user_id = ?');
	deleteRecordingsStmt.run(id);
	
	// Delete the user
	const stmt = db.prepare('DELETE FROM users WHERE id = ?');
	stmt.run(id);
}

export function updateUserHour(userId: number, minutesFromMidnight: number): void {
	// minutesFromMidnight doit être entre 0 et 1439 (24h * 60min - 1)
	if (minutesFromMidnight < 0 || minutesFromMidnight > 1439) {
		return; // Valeur invalide, on ne met pas à jour
	}
	const stmt = db.prepare('UPDATE users SET daily_notification_hour = ? WHERE id = ?');
	stmt.run(minutesFromMidnight, userId);
}

export function updateUserAvatar(userId: number, avatar: string): void {
	const stmt = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
	stmt.run(avatar, userId);
}

export function updateUserTimezone(userId: number, timezone: string): void {
	// Valider que le timezone est reconnu par le moteur JavaScript
	try {
		Intl.DateTimeFormat(undefined, { timeZone: timezone });
	} catch {
		return; // Timezone invalide, on ne met pas à jour
	}
	const stmt = db.prepare('UPDATE users SET timezone = ? WHERE id = ?');
	stmt.run(timezone, userId);
}

export function updateUserPassword(userId: number, passwordHash: string): void {
	const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
	stmt.run(passwordHash, userId);
}

export function updateUserPseudo(userId: number, pseudo: string): void {
	const stmt = db.prepare('UPDATE users SET pseudo = ? WHERE id = ?');
	stmt.run(pseudo, userId);
}

export function isPseudoAvailable(pseudo: string, excludeUserId?: number): boolean {
	if (excludeUserId) {
		const stmt = db.prepare('SELECT id FROM users WHERE LOWER(pseudo) = LOWER(?) AND id != ?');
		const result = stmt.get(pseudo, excludeUserId);
		return !result;
	} else {
		const stmt = db.prepare('SELECT id FROM users WHERE LOWER(pseudo) = LOWER(?)');
		const result = stmt.get(pseudo);
		return !result;
	}
}

export function updateUserAvatarImage(userId: number, imageFilename: string): void {
	const stmt = db.prepare('UPDATE users SET avatar = ? WHERE id = ?');
	stmt.run(imageFilename, userId);
}

export function getUserAvatar(userId: number): string | undefined {
	const stmt = db.prepare('SELECT avatar FROM users WHERE id = ?');
	const result = stmt.get(userId) as { avatar: string } | undefined;
	return result?.avatar;
}

export function toggleSuperPowers(userId: number, enabled: boolean): void {
	const stmt = db.prepare('UPDATE users SET super_powers = ? WHERE id = ?');
	stmt.run(enabled ? 1 : 0, userId);
}

export function toggleLogsEnabled(userId: number, enabled: boolean): void {
	const stmt = db.prepare('UPDATE users SET logs_enabled = ? WHERE id = ?');
	stmt.run(enabled ? 1 : 0, userId);
}

export function toggleJinglesEnabled(userId: number, enabled: boolean): void {
	const stmt = db.prepare('UPDATE users SET jingles_enabled = ? WHERE id = ?');
	stmt.run(enabled ? 1 : 0, userId);
}

export function createSession(userId: number): string {
	const sessionId = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
	const stmt = db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
	stmt.run(sessionId, userId, expiresAt);
	return sessionId;
}

export function updateLastLogin(userId: number): void {
	const stmt = db.prepare('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?');
	stmt.run(userId);
}

export function getSession(sessionId: string): User | undefined {
	const stmt = db.prepare(`
		SELECT u.id, u.pseudo, u.avatar, u.is_admin, u.super_powers, u.daily_notification_hour, u.timezone, u.created_at, u.last_login, u.logs_enabled, u.jingles_enabled
		FROM sessions s 
		JOIN users u ON s.user_id = u.id 
		WHERE s.id = ? AND s.expires_at > datetime('now')
	`);
	return stmt.get(sessionId) as User | undefined;
}

export function refreshSession(sessionId: string): void {
	// Extend session expiration on each authenticated request (sliding expiration)
	const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
	const stmt = db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?');
	stmt.run(newExpiresAt, sessionId);
}

export function deleteSession(sessionId: string): void {
	const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
	stmt.run(sessionId);
}

export function cleanupExpiredSessions(): void {
	const stmt = db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')");
	stmt.run();
}

export function deleteUserSessions(userId: number, exceptSessionId?: string): void {
	if (exceptSessionId) {
		const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?');
		stmt.run(userId, exceptSessionId);
	} else {
		const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
		stmt.run(userId);
	}
}

export function saveRecording(userId: number, audioData: Buffer, durationSeconds: number, imageData?: Buffer, url?: string | null, audioHash?: string): Recording {
	debug.db.log('saveRecording - audioData:', audioData.length, 'bytes, imageData:', imageData?.length || 'none');
	
	const filename = `${Date.now()}-${crypto.randomUUID()}.m4a`;
	const filepath = join(uploadsDir, filename);
	debug.db.log('Écriture fichier audio:', filename);
	writeFileSync(filepath, audioData);

	let imageFilename: string | null = null;
	if (imageData) {
		imageFilename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
		const imagePath = join(uploadsDir, imageFilename);
		debug.db.log('Écriture fichier image:', imageFilename);
		writeFileSync(imagePath, imageData);
	}

	const stmt = db.prepare('INSERT INTO recordings (user_id, filename, image_filename, url, duration_seconds, audio_hash) VALUES (?, ?, ?, ?, ?, ?)');
	const result = stmt.run(userId, filename, imageFilename, url || null, durationSeconds, audioHash || null);
	debug.db.log('Enregistrement créé - id:', result.lastInsertRowid);

	return getRecordingById(result.lastInsertRowid as number)!;
}

export function getRecordingById(id: number): Recording | undefined {
	const stmt = db.prepare(`
		SELECT r.*, u.pseudo, u.avatar
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.id = ?
	`);
	return stmt.get(id) as Recording | undefined;
}

export function getRecentRecordingByUser(userId: number, durationSeconds: number, secondsThreshold: number = 5): Recording | undefined {
	const stmt = db.prepare(`
		SELECT r.*, u.pseudo, u.avatar
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.user_id = ? 
		AND r.duration_seconds = ?
		AND datetime(r.recorded_at) > datetime('now', '-' || ? || ' seconds')
		ORDER BY r.recorded_at DESC
		LIMIT 1
	`);
	return stmt.get(userId, durationSeconds, secondsThreshold) as Recording | undefined;
}

export function getRecentRecordingByHash(userId: number, audioHash: string, secondsThreshold: number = 30): Recording | undefined {
	const stmt = db.prepare(`
		SELECT r.*, u.pseudo, u.avatar
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.user_id = ? 
		AND r.audio_hash = ?
		AND datetime(r.recorded_at) > datetime('now', '-' || ? || ' seconds')
		ORDER BY r.recorded_at DESC
		LIMIT 1
	`);
	return stmt.get(userId, audioHash, secondsThreshold) as Recording | undefined;
}

export function deleteRecording(recordingId: number): void {
	const recording = getRecordingById(recordingId);
	if (!recording) return;
	
	// Supprimer les fichiers
	const audioPath = join(uploadsDir, recording.filename);
	if (existsSync(audioPath)) {
		unlinkSync(audioPath);
	}
	
	if (recording.image_filename) {
		const imagePath = join(uploadsDir, recording.image_filename);
		if (existsSync(imagePath)) {
			unlinkSync(imagePath);
		}
	}
	
	// Supprimer l'historique d'écoute
	const deleteHistoryStmt = db.prepare('DELETE FROM listening_history WHERE recording_id = ?');
	deleteHistoryStmt.run(recordingId);
	
	// Supprimer l'enregistrement
	const deleteStmt = db.prepare('DELETE FROM recordings WHERE id = ?');
	deleteStmt.run(recordingId);
}

export function getUserRecordings(userId: number, limit = 5, offset = 0): Recording[] {
	// Get recordings for a specific user within the last 3 months
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	
	const stmt = db.prepare(`
		SELECT r.id, r.user_id, r.filename, r.image_filename, r.duration_seconds, r.recorded_at, r.url, u.pseudo, u.avatar
		FROM recordings r
		JOIN users u ON r.user_id = u.id
		WHERE r.user_id = ? AND r.recorded_at >= ?
		ORDER BY r.recorded_at DESC
		LIMIT ? OFFSET ?
	`);
	
	return stmt.all(userId, threeMonthsAgo.toISOString(), limit, offset) as Recording[];
}

export function getUserRecordingsCount(userId: number): number {
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	
	const stmt = db.prepare(`
		SELECT COUNT(*) as count
		FROM recordings
		WHERE user_id = ? AND recorded_at >= ?
	`);
	
	const result = stmt.get(userId, threeMonthsAgo.toISOString()) as { count: number };
	return result.count;
}

export function getRecordingsForUser(userId: number): Recording[] {
	const user = getUserById(userId);
	if (!user) return [];

	const now = new Date();
	const today = now.getFullYear() + '-' + 
		String(now.getMonth() + 1).padStart(2, '0') + '-' + 
		String(now.getDate()).padStart(2, '0');
	
	const [hour, minute] = [now.getHours(), now.getMinutes()];
	const currentMinutes = hour * 60 + minute;
	const thresholdMinutes = user.daily_notification_hour;

	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStr = yesterday.getFullYear() + '-' + 
		String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
		String(yesterday.getDate()).padStart(2, '0');

	if (currentMinutes >= thresholdMinutes) {
		const stmt = db.prepare(`
			SELECT r.*, u.pseudo, u.avatar 
			FROM recordings r 
			JOIN users u ON r.user_id = u.id 
			WHERE date(r.recorded_at) = ?
			ORDER BY r.recorded_at DESC
		`);
		return stmt.all(today) as Recording[];
	} else {
		const stmt = db.prepare(`
			SELECT r.*, u.pseudo, u.avatar 
			FROM recordings r 
			JOIN users u ON r.user_id = u.id 
			WHERE date(r.recorded_at) = ?
			ORDER BY r.recorded_at DESC
		`);
		return stmt.all(yesterdayStr) as Recording[];
	}
}

export function markAsListened(recordingId: number, userId: number): void {
	const stmt = db.prepare(`
		INSERT OR IGNORE INTO listening_history (user_id, recording_id) 
		VALUES (?, ?)
	`);
	stmt.run(userId, recordingId);
}

export function getRecordingFilePath(filename: string): string {
	return join(uploadsDir, filename);
}

// Rate limiting functions
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MINUTES = 15;

export function recordLoginAttempt(ip: string, userId?: number): void {
	const stmt = db.prepare('INSERT INTO login_attempts (ip, user_id) VALUES (?, ?)');
	stmt.run(ip, userId || null);
}

export function canAttemptLogin(ip: string): boolean {
	const stmt = db.prepare(`
		SELECT COUNT(*) as count 
		FROM login_attempts 
		WHERE ip = ? 
		AND attempted_at > datetime('now', '-${LOGIN_WINDOW_MINUTES} minutes')
	`);
	const result = stmt.get(ip) as { count: number };
	return result.count < MAX_LOGIN_ATTEMPTS;
}

export function getRemainingLockoutTime(ip: string): number {
	const stmt = db.prepare(`
		SELECT MIN(attempted_at) as first_attempt
		FROM login_attempts 
		WHERE ip = ? 
		AND attempted_at > datetime('now', '-${LOGIN_WINDOW_MINUTES} minutes')
		ORDER BY attempted_at DESC
		LIMIT 1
		OFFSET ${MAX_LOGIN_ATTEMPTS - 1}
	`);
	const result = stmt.get(ip) as { first_attempt: string } | undefined;
	
	if (!result || !result.first_attempt) {
		return 0;
	}
	
	const firstAttempt = new Date(result.first_attempt);
	const unlockTime = new Date(firstAttempt.getTime() + LOGIN_WINDOW_MINUTES * 60 * 1000);
	const remaining = Math.ceil((unlockTime.getTime() - Date.now()) / 1000 / 60);
	
	return Math.max(0, remaining);
}

export function cleanupOldLoginAttempts(): void {
	const stmt = db.prepare(`
		DELETE FROM login_attempts 
		WHERE attempted_at < datetime('now', '-${LOGIN_WINDOW_MINUTES} minutes')
	`);
	stmt.run();
}

// CSRF Token functions
const CSRF_TOKEN_LIFETIME = 60 * 60 * 1000; // 1 hour

export function generateCSRFToken(sessionId?: string): string {
	const token = crypto.randomUUID();
	const expiresAt = new Date(Date.now() + CSRF_TOKEN_LIFETIME).toISOString();
	
	const stmt = db.prepare('INSERT INTO csrf_tokens (token, session_id, expires_at) VALUES (?, ?, ?)');
	stmt.run(token, sessionId || null, expiresAt);
	
	return token;
}

export function validateCSRFToken(token: string, sessionId?: string): boolean {
	const stmt = db.prepare(`
		SELECT * FROM csrf_tokens 
		WHERE token = ? 
		AND (session_id = ? OR session_id IS NULL)
		AND expires_at > datetime('now')
	`);
	const result = stmt.get(token, sessionId || null);
	
	return !!result;
}

export function consumeCSRFToken(token: string): void {
	const deleteStmt = db.prepare('DELETE FROM csrf_tokens WHERE token = ?');
	deleteStmt.run(token);
}

export function cleanupExpiredCSRF(): void {
	const stmt = db.prepare('DELETE FROM csrf_tokens WHERE expires_at < datetime(\'now\')');
	stmt.run();
}

let lastCleanup = 0;
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 heure

export function periodicCleanup(): void {
	const now = Date.now();
	if (now - lastCleanup < CLEANUP_INTERVAL) return;
	lastCleanup = now;

	cleanupExpiredSessions();
	cleanupExpiredCSRF();
	cleanupOldLoginAttempts();
}

// ============ REGISTRATION MANAGEMENT FUNCTIONS ============

export type PendingRegistration = {
	id: number;
	pseudo: string;
	password_hash: string;
	avatar: string;
	timezone: string;
	is_admin: number;
	requested_at: string;
	status: string;
};

export function createPendingRegistration(
	pseudo: string, 
	password: string, 
	avatar: string = '☕',
	timezone: string = 'Europe/Paris'
): PendingRegistration {
	const passwordHash = hashSync(password, 10);
	const stmt = db.prepare(`
		INSERT INTO pending_registrations (pseudo, password_hash, avatar, timezone)
		VALUES (?, ?, ?, ?)
		RETURNING *
	`);
	return stmt.get(pseudo, passwordHash, avatar, timezone) as PendingRegistration;
}

export function getPendingRegistrations(): PendingRegistration[] {
	const stmt = db.prepare(`
		SELECT * FROM pending_registrations 
		WHERE status = 'pending'
		ORDER BY requested_at DESC
	`);
	return stmt.all() as PendingRegistration[];
}

export function getPendingRegistrationsCount(): number {
	const stmt = db.prepare(`
		SELECT COUNT(*) as count FROM pending_registrations 
		WHERE status = 'pending'
	`);
	const result = stmt.get() as { count: number };
	return result.count;
}

export function isPendingRegistration(pseudo: string): boolean {
	const stmt = db.prepare('SELECT id FROM pending_registrations WHERE pseudo = ? AND status = ?');
	const result = stmt.get(pseudo, 'pending');
	return !!result;
}

export function isPseudoAvailableForRegistration(pseudo: string): boolean {
	// Vérifie que le pseudo n'est pas déjà utilisé dans users ni dans pending_registrations
	const userStmt = db.prepare('SELECT id FROM users WHERE pseudo = ?');
	const pendingStmt = db.prepare('SELECT id FROM pending_registrations WHERE pseudo = ? AND status = ?');
	
	const userExists = userStmt.get(pseudo);
	const pendingExists = pendingStmt.get(pseudo, 'pending');
	
	return !userExists && !pendingExists;
}

export function approveRegistration(id: number): User {
	// Récupère la demande
	const getStmt = db.prepare('SELECT * FROM pending_registrations WHERE id = ? AND status = ?');
	const registration = getStmt.get(id, 'pending') as PendingRegistration | undefined;
	
	if (!registration) {
		throw new Error('Registration not found or already processed');
	}
	
	// Crée l'utilisateur avec le même hash de mot de passe
	const insertUserStmt = db.prepare(`
		INSERT INTO users (pseudo, password_hash, avatar, timezone, is_admin, super_powers)
		VALUES (?, ?, ?, ?, 0, 0)
		RETURNING id, pseudo, avatar, is_admin, super_powers, daily_notification_hour, timezone, created_at, logs_enabled, jingles_enabled
	`);
	const user = insertUserStmt.get(
		registration.pseudo, 
		registration.password_hash, 
		registration.avatar, 
		registration.timezone
	) as User;
	
	// Met à jour le statut de la demande
	const updateStmt = db.prepare('UPDATE pending_registrations SET status = ? WHERE id = ?');
	updateStmt.run('approved', id);
	
	return user;
}

export function rejectRegistration(id: number): void {
	const stmt = db.prepare('DELETE FROM pending_registrations WHERE id = ? AND status = ?');
	stmt.run(id, 'pending');
}

export function getAppConfig(key: string): string | null {
	const stmt = db.prepare('SELECT value FROM app_config WHERE key = ?');
	const result = stmt.get(key) as { value: string } | undefined;
	return result?.value || null;
}

export function setAppConfig(key: string, value: string): void {
	const stmt = db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)');
	stmt.run(key, value);
}

export function isRegistrationAllowed(): boolean {
	const value = getAppConfig('allow_registration');
	return value === 'true';
}
