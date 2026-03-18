import { json } from "@sveltejs/kit";
import { a as getUserById, n as getRecordingsByDate } from "../../../../../chunks/db.js";
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
  const thresholdMinutes = user?.daily_notification_hour ?? 420;
  const hours = Math.floor(thresholdMinutes / 60);
  const mins = thresholdMinutes % 60;
  const threshold = mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, "0")}`;
  return json({
    date,
    day: dayRecordings,
    threshold,
    timezone: user?.timezone || "Europe/Paris"
  });
};
export {
  GET
};
