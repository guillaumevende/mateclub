import { json } from "@sveltejs/kit";
import { e as deleteSession } from "../../../../../chunks/db.js";
const POST = async ({ cookies }) => {
  const sessionId = cookies.get("session");
  if (sessionId) {
    deleteSession(sessionId);
  }
  cookies.delete("session", { path: "/" });
  return json({ success: true });
};
export {
  POST
};
