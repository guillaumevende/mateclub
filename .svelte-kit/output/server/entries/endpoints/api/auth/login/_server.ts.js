import { json } from "@sveltejs/kit";
import { f as canAttemptLogin, h as getRemainingLockoutTime, r as recordLoginAttempt, g as getUserByPseudo, v as verifyPassword, i as createSession } from "../../../../../chunks/db.js";
const POST = async ({ request, cookies, getClientAddress }) => {
  const clientIp = getClientAddress();
  if (!canAttemptLogin(clientIp)) {
    const remainingMinutes = getRemainingLockoutTime(clientIp);
    return json({
      error: `Trop de tentatives. Réessayez dans ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.`,
      lockout: true
    }, { status: 429 });
  }
  const data = await request.formData();
  const pseudo = data.get("pseudo")?.toString();
  const password = data.get("password")?.toString();
  if (!pseudo || !password) {
    recordLoginAttempt(clientIp);
    return json({ error: "Pseudo et mot de passe requis" }, { status: 400 });
  }
  const user = getUserByPseudo(pseudo);
  if (!user || !verifyPassword(user.password_hash, password)) {
    recordLoginAttempt(clientIp, user?.id);
    return json({ error: "Identifiants invalides" }, { status: 401 });
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
  return json({ success: true, user: { id: user.id, pseudo: user.pseudo, is_admin: user.is_admin } });
};
export {
  POST
};
