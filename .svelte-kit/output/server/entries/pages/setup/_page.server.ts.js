import { fail, redirect } from "@sveltejs/kit";
import { I as hasAdmin, D as isPseudoAvailable, c as createUser } from "../../../chunks/db.js";
const load = async ({ locals }) => {
  if (hasAdmin()) {
    throw redirect(303, "/");
  }
  return { csrfToken: locals.csrfToken };
};
const actions = {
  default: async ({ request }) => {
    if (hasAdmin()) {
      return fail(400, { error: "Un administrateur existe déjà" });
    }
    const data = await request.formData();
    const pseudo = data.get("pseudo")?.toString()?.trim();
    const password = data.get("password")?.toString();
    const confirmPassword = data.get("confirm_password")?.toString();
    if (!pseudo || !password) {
      return fail(400, { error: "Pseudo et mot de passe requis" });
    }
    if (password !== confirmPassword) {
      return fail(400, { error: "Les mots de passe ne correspondent pas" });
    }
    if (password.length < 12) {
      return fail(400, { error: "Le mot de passe doit contenir au moins 12 caractères" });
    }
    if (!isPseudoAvailable(pseudo)) {
      return fail(400, { error: "Ce pseudo est déjà utilisé" });
    }
    try {
      createUser(pseudo, password, true);
      return { success: true };
    } catch (e) {
      return fail(400, { error: "Erreur lors de la création du compte" });
    }
  }
};
export {
  actions,
  load
};
