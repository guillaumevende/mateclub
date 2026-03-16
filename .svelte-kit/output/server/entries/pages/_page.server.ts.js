import { redirect } from "@sveltejs/kit";
import { j as getUserTimezone, q as getRecordingsGroupedByDay, a as getUserById, r as getAllUsers } from "../../chunks/db.js";
const load = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = 7;
  const timezone = getUserTimezone(locals.user.id);
  const days = getRecordingsGroupedByDay(locals.user.id, limit, page, timezone);
  const user = getUserById(locals.user.id);
  const allUsers = getAllUsers();
  return {
    days,
    threshold: user?.daily_notification_hour || 7,
    user,
    allUsers,
    page
  };
};
export {
  load
};
