import { json } from "@sveltejs/kit";
import { a as getUserById, d as deleteUser } from "../../../../../../chunks/db.js";
const DELETE = async ({ params, locals }) => {
  if (!locals.user || !locals.user.is_admin) {
    return json({ error: "Accès refusé" }, { status: 403 });
  }
  const userId = parseInt(params.id);
  const targetUser = getUserById(userId);
  if (!targetUser) {
    return json({ error: "Utilisateur non trouvé" }, { status: 404 });
  }
  if (targetUser.is_admin) {
    return json({ error: "Impossible de supprimer un administrateur" }, { status: 400 });
  }
  deleteUser(userId);
  return json({ success: true });
};
export {
  DELETE
};
