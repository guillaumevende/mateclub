import { json } from "@sveltejs/kit";
import { k as getUserRecordings, l as getUserRecordingsCount } from "../../../../../chunks/db.js";
const GET = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = parseInt(url.searchParams.get("limit") || "5", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  try {
    const recordings = getUserRecordings(locals.user.id, limit, offset);
    const total = getUserRecordingsCount(locals.user.id);
    return json({
      recordings,
      total,
      hasMore: offset + recordings.length < total
    });
  } catch (error) {
    console.error("Error fetching user recordings:", error);
    return json({ error: "Internal error" }, { status: 500 });
  }
};
export {
  GET
};
