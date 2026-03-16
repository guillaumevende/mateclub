import { json } from "@sveltejs/kit";
import { j as getUserTimezone, a as getUserById } from "../../../../../chunks/db.js";
import Database from "better-sqlite3";
const projectRoot = process.cwd();
const dbPath = process.env.DATABASE_PATH || `${projectRoot}/data/mateclub.db`;
const db = new Database(dbPath);
const GET = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const timezone = getUserTimezone(locals.user.id);
  const user = getUserById(locals.user.id);
  const threshold = user?.daily_notification_hour || 7;
  const oneYearAgo = /* @__PURE__ */ new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  try {
    const stmt = db.prepare(`
			SELECT 
				r.recorded_at,
				l.id as listened_id
			FROM recordings r 
			LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
			WHERE r.recorded_at >= ?
			ORDER BY r.recorded_at ASC
		`);
    const results = stmt.all(locals.user.id, oneYearAgo.toISOString());
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
    const today = dateFormatter.format(/* @__PURE__ */ new Date());
    const grouped = {};
    for (const row of results) {
      const localDate = dateFormatter.format(new Date(row.recorded_at));
      const recordedHour = parseInt(hourFormatter.format(new Date(row.recorded_at)), 10);
      if (!grouped[localDate]) {
        grouped[localDate] = { total_count: 0, listened_count: 0, has_available: false };
      }
      grouped[localDate].total_count += 1;
      if (row.listened_id) grouped[localDate].listened_count += 1;
      const isAvailable = localDate < today || localDate === today && recordedHour < threshold;
      if (isAvailable) {
        grouped[localDate].has_available = true;
      }
    }
    const datesInfo = {};
    for (const [date, info] of Object.entries(grouped)) {
      if (info.has_available) {
        datesInfo[date] = {
          hasRecordings: info.total_count > 0,
          hasUnread: info.total_count > info.listened_count
        };
      }
    }
    return json({
      dates: datesInfo,
      timezone,
      threshold: user?.daily_notification_hour || 7,
      superPowers: user?.super_powers === 1
    });
  } catch (error) {
    console.error("Error in /api/recordings/dates:", error);
    return json({ error: "Internal error", message: String(error) }, { status: 500 });
  }
};
export {
  GET
};
