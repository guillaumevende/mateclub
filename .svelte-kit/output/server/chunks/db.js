import Database from "better-sqlite3";
import { hashSync, compareSync } from "bcrypt";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { join, dirname } from "path";
const projectRoot = process.cwd();
const dbPath = process.env.DATABASE_PATH || join(projectRoot, "data/mateclub.db");
const uploadsDir = join(projectRoot, "uploads");
if (!existsSync(dbPath)) {
  const dataDir = dirname(dbPath);
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}
const db = new Database(dbPath);
const adminPseudo = process.env.ADMIN_PSEUDO || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const existingAdmin = db.prepare("SELECT id FROM users WHERE is_admin = 1").get();
if (!existingAdmin) {
  const hashpwd = hashSync(adminPassword, 10);
  db.prepare("INSERT INTO users (pseudo, password_hash, is_admin) VALUES (?, ?, 1)").run(adminPseudo, hashpwd);
  console.log(`Admin user created: ${adminPseudo}`);
}
db.exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		pseudo TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		avatar TEXT DEFAULT '☕',
		is_admin INTEGER DEFAULT 0,
		super_powers INTEGER DEFAULT 0,
		daily_notification_hour INTEGER DEFAULT 7,
		timezone TEXT DEFAULT 'Europe/Paris',
		created_at DATETIME DEFAULT (datetime('now', 'localtime'))
	);

	CREATE TABLE IF NOT EXISTS recordings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		filename TEXT NOT NULL,
		image_filename TEXT,
		duration_seconds INTEGER NOT NULL,
		recorded_at DATETIME DEFAULT (datetime('now', 'localtime')),
		FOREIGN KEY (user_id) REFERENCES users(id)
	);

	CREATE TABLE IF NOT EXISTS listening_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL,
		recording_id INTEGER NOT NULL,
		listened_at DATETIME DEFAULT (datetime('now', 'localtime')),
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
`);
try {
  db.exec('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT "☕"');
} catch (e) {
}
try {
  db.exec('ALTER TABLE users ADD COLUMN timezone TEXT DEFAULT "Europe/Paris"');
} catch (e) {
}
try {
  db.exec("ALTER TABLE users ADD COLUMN super_powers INTEGER DEFAULT 0");
} catch (e) {
}
try {
  db.exec("ALTER TABLE recordings ADD COLUMN image_filename TEXT");
} catch (e) {
}
function getDateWithThreshold(recordedAt, thresholdHour, timezone) {
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  });
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const hour = parseInt(hourFormatter.format(new Date(recordedAt)), 10);
  let effectiveDate = new Date(recordedAt);
  if (hour < thresholdHour) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }
  return dateFormatter.format(effectiveDate);
}
function getCurrentDateInTimezone(timezone) {
  const now = /* @__PURE__ */ new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(now);
}
function getUserTimezone(userId) {
  const user = getUserById(userId);
  return user?.timezone || "Europe/Paris";
}
function getRecordingsByDate(userId, date) {
  const user = getUserById(userId);
  if (!user) return null;
  const timezone = user.timezone || "Europe/Paris";
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
  const results = stmt.all(userId, date);
  if (results.length === 0) return null;
  const isAvailable = results.some(
    (r) => isDateAvailable(r.recorded_at, user.super_powers === 1, user.daily_notification_hour, timezone)
  );
  return {
    date,
    recordings: results,
    available: isAvailable
  };
}
function isDateAvailable(recordedAt, superPowers, thresholdHour, timezone) {
  if (superPowers) return true;
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const hourFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false
  });
  const recordedDate = dateFormatter.format(new Date(recordedAt));
  const recordedHour = parseInt(hourFormatter.format(new Date(recordedAt)), 10);
  const today = dateFormatter.format(/* @__PURE__ */ new Date());
  if (recordedDate < today) return true;
  if (recordedDate === today) {
    return recordedHour < thresholdHour;
  }
  return false;
}
function getRecordingsGroupedByDay(userId, limit = 7, page = 1, timezone) {
  const user = getUserById(userId);
  if (!user) return [];
  const userTimezone = timezone;
  const threshold = user.daily_notification_hour;
  const offset = (page - 1) * limit;
  const stmt = db.prepare(`
		SELECT 
			r.id, r.user_id, r.filename, r.image_filename, r.duration_seconds, r.recorded_at,
			u.pseudo, u.avatar,
			CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as listened_by_user
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
		ORDER BY r.recorded_at DESC
		LIMIT ? OFFSET ?
	`);
  const results = stmt.all(userId, limit * 3, offset);
  const grouped = {};
  for (const row of results) {
    const date = getDateWithThreshold(row.recorded_at, threshold, userTimezone);
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(row);
  }
  getCurrentDateInTimezone(userTimezone);
  const days = [];
  for (const [date, recordings] of Object.entries(grouped)) {
    const isAvailable = recordings.some(
      (r) => isDateAvailable(r.recorded_at, user.super_powers === 1, threshold, userTimezone)
    );
    days.push({
      date,
      recordings: recordings.sort(
        (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ),
      available: isAvailable
    });
  }
  return days.slice(0, limit);
}
function createUser(pseudo, password, isAdmin = false) {
  const hashpwd = hashSync(password, 10);
  const stmt = db.prepare("INSERT INTO users (pseudo, password_hash, is_admin) VALUES (?, ?, ?)");
  const result = stmt.run(pseudo, hashpwd, isAdmin ? 1 : 0);
  return getUserById(result.lastInsertRowid);
}
function getUserByPseudo(pseudo) {
  const stmt = db.prepare("SELECT * FROM users WHERE pseudo = ?");
  return stmt.get(pseudo);
}
function getUserById(id) {
  const stmt = db.prepare("SELECT id, pseudo, avatar, is_admin, super_powers, daily_notification_hour, timezone, created_at FROM users WHERE id = ?");
  return stmt.get(id);
}
function verifyPassword(hash, password) {
  return compareSync(password, hash);
}
function getAllUsers() {
  const threeMonthsAgo = /* @__PURE__ */ new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const stmt = db.prepare(`
		SELECT 
			u.id, u.pseudo, u.avatar, u.is_admin, u.super_powers, u.daily_notification_hour, u.timezone, u.created_at,
			COALESCE((
				SELECT COUNT(*) 
				FROM recordings r 
				WHERE r.user_id = u.id 
				AND r.recorded_at >= ?
			), 0) as recording_count
		FROM users u
		ORDER BY recording_count DESC, u.pseudo ASC
	`);
  return stmt.all(threeMonthsAgo.toISOString());
}
function deleteUser(id) {
  const recordingsStmt = db.prepare("SELECT filename, image_filename FROM recordings WHERE user_id = ?");
  const recordings = recordingsStmt.all(id);
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
  const deleteHistoryStmt = db.prepare(`
		DELETE FROM listening_history 
		WHERE recording_id IN (SELECT id FROM recordings WHERE user_id = ?)
	`);
  deleteHistoryStmt.run(id);
  const deleteRecordingsStmt = db.prepare("DELETE FROM recordings WHERE user_id = ?");
  deleteRecordingsStmt.run(id);
  const stmt = db.prepare("DELETE FROM users WHERE id = ?");
  stmt.run(id);
}
function updateUserHour(userId, hour) {
  const stmt = db.prepare("UPDATE users SET daily_notification_hour = ? WHERE id = ?");
  stmt.run(hour, userId);
}
function updateUserAvatar(userId, avatar) {
  const stmt = db.prepare("UPDATE users SET avatar = ? WHERE id = ?");
  stmt.run(avatar, userId);
}
function updateUserTimezone(userId, timezone) {
  const stmt = db.prepare("UPDATE users SET timezone = ? WHERE id = ?");
  stmt.run(timezone, userId);
}
function updateUserPassword(userId, passwordHash) {
  const stmt = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?");
  stmt.run(passwordHash, userId);
}
function updateUserPseudo(userId, pseudo) {
  const stmt = db.prepare("UPDATE users SET pseudo = ? WHERE id = ?");
  stmt.run(pseudo, userId);
}
function updateUserAvatarImage(userId, imageFilename) {
  const stmt = db.prepare("UPDATE users SET avatar = ? WHERE id = ?");
  stmt.run(imageFilename, userId);
}
function getUserAvatar(userId) {
  const stmt = db.prepare("SELECT avatar FROM users WHERE id = ?");
  const result = stmt.get(userId);
  return result?.avatar;
}
function toggleSuperPowers(userId, enabled) {
  const stmt = db.prepare("UPDATE users SET super_powers = ? WHERE id = ?");
  stmt.run(enabled ? 1 : 0, userId);
}
function createSession(userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString();
  const stmt = db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)");
  stmt.run(sessionId, userId, expiresAt);
  return sessionId;
}
function getSession(sessionId) {
  const stmt = db.prepare(`
		SELECT u.id, u.pseudo, u.avatar, u.is_admin, u.super_powers, u.daily_notification_hour, u.timezone, u.created_at 
		FROM sessions s 
		JOIN users u ON s.user_id = u.id 
		WHERE s.id = ? AND s.expires_at > datetime('now')
	`);
  return stmt.get(sessionId);
}
function deleteSession(sessionId) {
  const stmt = db.prepare("DELETE FROM sessions WHERE id = ?");
  stmt.run(sessionId);
}
function saveRecording(userId, audioData, durationSeconds, imageData) {
  const filename = `${Date.now()}-${crypto.randomUUID()}.m4a`;
  const filepath = join(uploadsDir, filename);
  writeFileSync(filepath, audioData);
  let imageFilename = null;
  if (imageData) {
    imageFilename = `${Date.now()}-${crypto.randomUUID()}.jpg`;
    const imagePath = join(uploadsDir, imageFilename);
    writeFileSync(imagePath, imageData);
  }
  const stmt = db.prepare("INSERT INTO recordings (user_id, filename, image_filename, duration_seconds) VALUES (?, ?, ?, ?)");
  const result = stmt.run(userId, filename, imageFilename, durationSeconds);
  return getRecordingById(result.lastInsertRowid);
}
function getRecordingById(id) {
  const stmt = db.prepare(`
		SELECT r.*, u.pseudo, u.avatar
		FROM recordings r 
		JOIN users u ON r.user_id = u.id 
		WHERE r.id = ?
	`);
  return stmt.get(id);
}
function getRecentRecordingByUser(userId, durationSeconds, secondsThreshold = 5) {
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
  return stmt.get(userId, durationSeconds, secondsThreshold);
}
function deleteRecording(recordingId) {
  const recording = getRecordingById(recordingId);
  if (!recording) return;
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
  const deleteHistoryStmt = db.prepare("DELETE FROM listening_history WHERE recording_id = ?");
  deleteHistoryStmt.run(recordingId);
  const deleteStmt = db.prepare("DELETE FROM recordings WHERE id = ?");
  deleteStmt.run(recordingId);
}
function getUserRecordings(userId, limit = 5, offset = 0) {
  const threeMonthsAgo = /* @__PURE__ */ new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const stmt = db.prepare(`
		SELECT r.id, r.user_id, r.filename, r.image_filename, r.duration_seconds, r.recorded_at, u.pseudo, u.avatar
		FROM recordings r
		JOIN users u ON r.user_id = u.id
		WHERE r.user_id = ? AND r.recorded_at >= ?
		ORDER BY r.recorded_at DESC
		LIMIT ? OFFSET ?
	`);
  return stmt.all(userId, threeMonthsAgo.toISOString(), limit, offset);
}
function getUserRecordingsCount(userId) {
  const threeMonthsAgo = /* @__PURE__ */ new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const stmt = db.prepare(`
		SELECT COUNT(*) as count
		FROM recordings
		WHERE user_id = ? AND recorded_at >= ?
	`);
  const result = stmt.get(userId, threeMonthsAgo.toISOString());
  return result.count;
}
function markAsListened(recordingId, userId) {
  const stmt = db.prepare(`
		INSERT OR IGNORE INTO listening_history (user_id, recording_id) 
		VALUES (?, ?)
	`);
  stmt.run(userId, recordingId);
}
function getRecordingFilePath(filename) {
  return join(uploadsDir, filename);
}
export {
  updateUserTimezone as A,
  getSession as B,
  getUserById as a,
  createSession as b,
  createUser as c,
  deleteUser as d,
  deleteSession as e,
  getUserAvatar as f,
  getUserByPseudo as g,
  getRecentRecordingByUser as h,
  getRecordingsByDate as i,
  getUserTimezone as j,
  getUserRecordings as k,
  getUserRecordingsCount as l,
  getRecordingById as m,
  deleteRecording as n,
  markAsListened as o,
  getRecordingFilePath as p,
  getRecordingsGroupedByDay as q,
  getAllUsers as r,
  saveRecording as s,
  toggleSuperPowers as t,
  updateUserAvatarImage as u,
  verifyPassword as v,
  updateUserHour as w,
  updateUserPseudo as x,
  updateUserPassword as y,
  updateUserAvatar as z
};
