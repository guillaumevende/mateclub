import { json } from "@sveltejs/kit";
import { j as deleteSession } from "../../../../../chunks/db.js";
const POST = async ({ cookies }) => {
  try {
    const sessionId = cookies.get("session");
    if (sessionId) {
      deleteSession(sessionId);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la session:", error);
  }
  cookies.delete("session", { path: "/" });
  return json({ success: true });
};
export {
  POST
};
