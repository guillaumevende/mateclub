import { json } from "@sveltejs/kit";
import { g as getUserByPseudo, v as verifyPassword, b as createSession } from "../../../../../chunks/db.js";
const POST = async ({ request, cookies }) => {
  const data = await request.formData();
  const pseudo = data.get("pseudo")?.toString();
  const password = data.get("password")?.toString();
  if (!pseudo || !password) {
    return json({ error: "Pseudo et mot de passe requis" }, { status: 400 });
  }
  const user = getUserByPseudo(pseudo);
  if (!user || !verifyPassword(user.password_hash, password)) {
    return json({ error: "Identifiants invalides" }, { status: 401 });
  }
  const sessionId = createSession(user.id);
  cookies.set("session", sessionId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 24 * 30
  });
  return json({ success: true, user: { id: user.id, pseudo: user.pseudo, is_admin: user.is_admin } });
};
export {
  POST
};
