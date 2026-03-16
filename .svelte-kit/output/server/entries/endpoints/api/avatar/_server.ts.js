import { redirect, json } from "@sveltejs/kit";
import { f as getUserAvatar, u as updateUserAvatarImage } from "../../../../chunks/db.js";
import { existsSync, unlinkSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
const uploadsDir = join(process.cwd(), "uploads", "avatars");
const POST = async ({ request, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  try {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!image || image.size === 0) {
      return json({ error: "Image requise" }, { status: 400 });
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(image.type)) {
      return json({ error: "Format accepté: JPG, PNG, WEBP" }, { status: 400 });
    }
    const maxSize = 10 * 1024 * 1024;
    if (image.size > maxSize) {
      return json({ error: "Taille maximale: 10 Mo" }, { status: 400 });
    }
    const userDir = join(uploadsDir, locals.user.id.toString());
    if (!existsSync(userDir)) {
      mkdirSync(userDir, { recursive: true });
    }
    try {
      const files = readdirSync(userDir);
      for (const file of files) {
        if (file.startsWith("avatar_")) {
          unlinkSync(join(userDir, file));
        }
      }
    } catch (e) {
    }
    const timestamp = Date.now();
    const filename = `avatar_${timestamp}_${crypto.randomUUID()}.jpg`;
    const filepath = join(userDir, filename);
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    writeFileSync(filepath, buffer);
    const dbPath = `${locals.user.id}/${filename}`;
    updateUserAvatarImage(locals.user.id, dbPath);
    return json({ success: true, filename: dbPath });
  } catch (error) {
    console.error("Erreur upload avatar:", error);
    return json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
};
const DELETE = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  try {
    const currentAvatar = getUserAvatar(locals.user.id);
    if (currentAvatar && currentAvatar.includes("/")) {
      const filepath = join(uploadsDir, currentAvatar);
      if (existsSync(filepath)) {
        unlinkSync(filepath);
      }
    }
    return json({ success: true });
  } catch (error) {
    console.error("Erreur suppression avatar:", error);
    return json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
};
export {
  DELETE,
  POST
};
