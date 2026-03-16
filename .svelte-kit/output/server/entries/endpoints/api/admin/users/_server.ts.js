import { json } from "@sveltejs/kit";
import { g as getUserByPseudo, c as createUser } from "../../../../../chunks/db.js";
const POST = async ({ request, locals }) => {
  if (!locals.user || !locals.user.is_admin) {
    return json({ error: "Accès refusé" }, { status: 403 });
  }
  const data = await request.formData();
  const pseudo = data.get("pseudo")?.toString();
  const password = data.get("password")?.toString();
  if (!pseudo || !password) {
    return json({ error: "Pseudo et mot de passe requis" }, { status: 400 });
  }
  const existing = getUserByPseudo(pseudo);
  if (existing) {
    return json({ error: "Ce pseudo est déjà utilisé" }, { status: 400 });
  }
  const user = createUser(pseudo, password, false);
  return json({ success: true, user: { id: user.id, pseudo: user.pseudo } });
};
export {
  POST
};
