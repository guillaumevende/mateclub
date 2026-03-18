import { redirect } from "@sveltejs/kit";
import { j as deleteSession } from "../../../chunks/db.js";
const load = async ({ cookies, request }) => {
  try {
    const sessionId = cookies.get("session");
    if (sessionId) {
      deleteSession(sessionId);
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la session:", error);
  }
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isBehindProxy = forwardedProto === "https";
  cookies.delete("session", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isBehindProxy
  });
  throw redirect(303, "/login");
};
export {
  load
};
