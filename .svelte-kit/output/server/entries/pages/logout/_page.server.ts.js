import { redirect } from "@sveltejs/kit";
import { e as deleteSession } from "../../../chunks/db.js";
const load = async ({ cookies }) => {
  const sessionId = cookies.get("session");
  if (sessionId) {
    deleteSession(sessionId);
    cookies.delete("session", { path: "/" });
  }
  throw redirect(303, "/login");
};
export {
  load
};
