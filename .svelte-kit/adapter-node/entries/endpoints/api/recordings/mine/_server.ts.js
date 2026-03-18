import { json } from "@sveltejs/kit";
import { p as getUserRecordings, q as getUserRecordingsCount } from "../../../../../chunks/db.js";
const GET = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const limit = parseInt(url.searchParams.get("limit") || "5", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  console.log("[MINE] userId:", locals.user.id, "limit:", limit, "offset:", offset);
  try {
    const recordings = getUserRecordings(locals.user.id, limit, offset);
    const total = getUserRecordingsCount(locals.user.id);
    console.log("[MINE] recordings.length:", recordings.length, "total:", total);
    console.log("[MINE] recordings:", recordings.map((r) => ({ id: r.id, duration: r.duration_seconds, url: r.url })));
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
