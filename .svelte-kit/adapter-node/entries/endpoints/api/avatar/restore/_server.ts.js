import { redirect, json } from "@sveltejs/kit";
import { u as updateUserAvatarImage } from "../../../../../chunks/db.js";
import { existsSync } from "fs";
import { join } from "path";
const uploadsDir = join(process.cwd(), "uploads", "avatars");
const POST = async ({ request, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  try {
    const { filename } = await request.json();
    if (!filename || !filename.includes("/")) {
      return json({ error: "Nom de fichier invalide" }, { status: 400 });
    }
    const userIdFromPath = filename.split("/")[0];
    if (userIdFromPath !== locals.user.id.toString()) {
      return json({ error: "Accès non autorisé" }, { status: 403 });
    }
    const filepath = join(uploadsDir, filename);
    if (!existsSync(filepath)) {
      return json({ error: "Image introuvable" }, { status: 404 });
    }
    updateUserAvatarImage(locals.user.id, filename);
    return json({ success: true, filename });
  } catch (error) {
    console.error("Erreur restauration avatar:", error);
    return json({ error: "Erreur lors de la restauration" }, { status: 500 });
  }
};
export {
  POST
};
