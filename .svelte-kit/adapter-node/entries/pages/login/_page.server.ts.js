import { fail, redirect } from "@sveltejs/kit";
import { f as canAttemptLogin, h as getRemainingLockoutTime, r as recordLoginAttempt, g as getUserByPseudo, v as verifyPassword, i as createSession } from "../../../chunks/db.js";
const load = async ({ locals }) => {
  if (locals.user) {
    throw redirect(303, "/");
  }
  return {
    csrfToken: locals.csrfToken
  };
};
const actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const clientIp = getClientAddress();
    if (!canAttemptLogin(clientIp)) {
      const remainingMinutes = getRemainingLockoutTime(clientIp);
      return fail(429, {
        error: `Trop de tentatives. Réessayez dans ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.`,
        lockout: true
      });
    }
    const data = await request.formData();
    const pseudo = data.get("pseudo")?.toString();
    const password = data.get("password")?.toString();
    if (!pseudo || !password) {
      recordLoginAttempt(clientIp);
      return fail(400, { error: "Pseudo et mot de passe requis" });
    }
    const user = getUserByPseudo(pseudo);
    if (!user || !verifyPassword(user.password_hash, password)) {
      recordLoginAttempt(clientIp, user?.id);
      return fail(401, { error: "Identifiants invalides" });
    }
    const sessionId = createSession(user.id);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isBehindProxy = forwardedProto === "https";
    cookies.set("session", sessionId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: isBehindProxy,
      maxAge: 60 * 60 * 24 * 30
    });
    throw redirect(303, "/");
  }
};
export {
  actions,
  load
};
