import { json } from "@sveltejs/kit";
import { a as getUserById, i as getRecordingsByDate } from "../../../../../chunks/db.js";
const GET = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const date = url.searchParams.get("date");
  if (!date) {
    return json({ error: "Date required" }, { status: 400 });
  }
  const user = getUserById(locals.user.id);
  const dayRecordings = getRecordingsByDate(locals.user.id, date);
  return json({
    date,
    day: dayRecordings,
    threshold: user?.daily_notification_hour || 7,
    timezone: user?.timezone || "Europe/Paris"
  });
};
export {
  GET
};
