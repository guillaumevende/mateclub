import { fail, redirect } from "@sveltejs/kit";
import { t as toggleSuperPowers, w as updateUserHour, d as deleteUser, c as createUser, r as getAllUsers, a as getUserById } from "../../../chunks/db.js";
const load = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  if (!locals.user.is_admin) {
    throw redirect(303, "/");
  }
  const users = getAllUsers();
  const currentUser = getUserById(locals.user.id);
  return { users, currentUser };
};
const actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const pseudo = data.get("pseudo")?.toString();
    const password = data.get("password")?.toString();
    const isAdmin = data.get("is_admin") === "on";
    if (!pseudo || !password) {
      return fail(400, { error: "Pseudo et mot de passe requis" });
    }
    try {
      createUser(pseudo, password, isAdmin);
      return { success: true };
    } catch (e) {
      return fail(400, { error: "Pseudo déjà utilisé" });
    }
  },
  delete: async ({ request }) => {
    const data = await request.formData();
    const userId = data.get("user_id")?.toString();
    if (userId) {
      deleteUser(parseInt(userId, 10));
    }
    return { success: true };
  },
  updateHour: async ({ request }) => {
    const data = await request.formData();
    const userId = data.get("user_id")?.toString();
    const hour = data.get("hour")?.toString();
    if (userId && hour) {
      updateUserHour(parseInt(userId, 10), parseInt(hour, 10));
    }
    return { success: true };
  },
  toggleSuperPowers: async ({ request, locals }) => {
    const data = await request.formData();
    const enabled = data.get("enabled") === "true";
    if (locals.user && locals.user.id) {
      toggleSuperPowers(locals.user.id, enabled);
    }
    return { success: true };
  }
};
export {
  actions,
  load
};
