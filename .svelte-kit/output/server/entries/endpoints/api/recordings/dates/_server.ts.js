import { json } from "@sveltejs/kit";
import { o as getUserTimezone, a as getUserById } from "../../../../../chunks/db.js";
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
  const thresholdMinutes = user?.daily_notification_hour ?? 420;
  const hours = Math.floor(thresholdMinutes / 60);
  const mins = thresholdMinutes % 60;
  mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, "0")}`;
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
    const hourMinFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      hour: "2-digit",
      hour12: false,
      minute: "2-digit"
    });
    const today = dateFormatter.format(/* @__PURE__ */ new Date());
    const grouped = {};
    for (const row of results) {
      const parts = hourMinFormatter.formatToParts(new Date(row.recorded_at));
      const hourRecorded = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minuteRecorded = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const recordedMinutes = hourRecorded * 60 + minuteRecorded;
      let effectiveDate = dateFormatter.format(new Date(row.recorded_at));
      if (recordedMinutes < thresholdMinutes) {
        const recordedDate = new Date(row.recorded_at);
        recordedDate.setDate(recordedDate.getDate() - 1);
        effectiveDate = dateFormatter.format(recordedDate);
      }
      if (!grouped[effectiveDate]) {
        grouped[effectiveDate] = { total_count: 0, listened_count: 0, has_available: false };
      }
      grouped[effectiveDate].total_count += 1;
      if (row.listened_id) grouped[effectiveDate].listened_count += 1;
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = dateFormatter.format(yesterday);
      const nowParts = hourMinFormatter.formatToParts(/* @__PURE__ */ new Date());
      const currentMinutes = parseInt(nowParts.find((p) => p.type === "hour")?.value || "0", 10) * 60 + parseInt(nowParts.find((p) => p.type === "minute")?.value || "0", 10);
      const isAvailable = effectiveDate < yesterdayStr || effectiveDate === yesterdayStr && currentMinutes >= thresholdMinutes || effectiveDate === today && recordedMinutes < thresholdMinutes;
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
      threshold: user?.daily_notification_hour || 420,
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
