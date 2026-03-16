import { fail, redirect } from "@sveltejs/kit";
import { g as getUserByPseudo, v as verifyPassword, b as createSession } from "../../../chunks/db.js";
const load = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, "/");
  }
  return {};
};
const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const pseudo = data.get("pseudo")?.toString();
    const password = data.get("password")?.toString();
    if (!pseudo || !password) {
      return fail(400, { error: "Pseudo et mot de passe requis" });
    }
    const user = getUserByPseudo(pseudo);
    if (!user || !verifyPassword(user.password_hash, password)) {
      return fail(401, { error: "Identifiants invalides" });
    }
    const sessionId = createSession(user.id);
    cookies.set("session", sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 24 * 30
    });
    throw redirect(303, "/");
  }
};
export {
  actions,
  load
};
