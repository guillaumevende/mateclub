import { redirect, json } from "@sveltejs/kit";
import { m as getRecentRecordingByHash, s as saveRecording } from "../../../../chunks/db.js";
import { a as isValidAudioBuffer, i as isValidImageBuffer } from "../../../../chunks/fileValidation.js";
import crypto from "crypto";
import sharp from "sharp";
const DUPLICATE_THRESHOLD_SECONDS = 30;
const POST = async ({ request, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  console.log("[RECORDINGS] POST reçu - user:", locals.user.id);
  const formData = await request.formData();
  const audio = formData.get("audio");
  const duration = formData.get("duration")?.toString();
  const image = formData.get("image");
  const url = formData.get("url")?.toString();
  console.log("[RECORDINGS] Audio:", audio?.size, "bytes, URL:", url);
  if (!audio || audio.size === 0) {
    console.error("[RECORDINGS] Audio vide ou absent, user:", locals.user.id);
    return json({ error: "Audio requis" }, { status: 400 });
  }
  console.log("[RECORDINGS] après check audio vide");
  if (url && url.trim() !== "") {
    try {
      const parsed = new URL(url);
      console.log("[RECORDINGS] URL validée:", parsed.href);
      if (parsed.protocol !== "https:") {
        console.error("[RECORDINGS] URL non https, user:", locals.user.id);
        return json({ error: "L'URL doit commencer par https://" }, { status: 400 });
      }
    } catch {
      console.error("[RECORDINGS] URL invalide:", url, "user:", locals.user.id);
      return json({ error: "URL invalide" }, { status: 400 });
    }
  }
  console.log("[RECORDINGS] après validation URL");
  const durationSeconds = parseInt(duration || "0", 10);
  console.log("[RECORDINGS] duration parsed:", durationSeconds);
  if (durationSeconds > 180) {
    console.error("[RECORDINGS] Durée trop longue:", durationSeconds, "user:", locals.user.id);
    return json({ error: "Durée maximale: 3 minutes" }, { status: 400 });
  }
  const maxAudioSize = 20 * 1024 * 1024;
  if (audio.size > maxAudioSize) {
    console.error("[RECORDINGS] Fichier trop volumineux:", audio.size, "user:", locals.user.id);
    return json({ error: "Fichier audio trop volumineux (max 20 Mo)" }, { status: 400 });
  }
  console.log("[RECORDINGS] avant lecture audio buffer, audio.size:", audio.size);
  const audioBuffer = Buffer.from(await audio.arrayBuffer());
  console.log("[RECORDINGS] après lecture audio buffer, taille:", audioBuffer.length);
  const isValid = isValidAudioBuffer(audioBuffer);
  console.log("[RECORDINGS] isValidAudioBuffer:", isValid);
  if (!isValid) {
    const firstBytes = audioBuffer.slice(0, 12).toString("hex").slice(0, 24);
    console.error("[RECORDINGS] Format audio invalide, user:", locals.user.id, "size:", audio.size, "firstBytes:", firstBytes);
    return json({ error: "Format audio non valide. Utilisez WebM, MP4/M4A, OGG ou MP3." }, { status: 400 });
  }
  console.log("[RECORDINGS] calcul du hash SHA-256...");
  const audioHash = crypto.createHash("sha256").update(audioBuffer).digest("hex");
  console.log("[RECORDINGS] hash:", audioHash.slice(0, 16) + "...");
  console.log("[RECORDINGS] avant déduplication par hash (seuil:", DUPLICATE_THRESHOLD_SECONDS, "secondes)");
  const recentRecording = getRecentRecordingByHash(locals.user.id, audioHash, DUPLICATE_THRESHOLD_SECONDS);
  console.log("[RECORDINGS] recentRecording:", recentRecording?.id || "aucun");
  if (recentRecording) {
    return json({
      id: recentRecording.id,
      duplicate: true,
      message: "Enregistrement déjà existant"
    });
  }
  const buffer = audioBuffer;
  let imageBuffer;
  if (image && image.size > 0) {
    const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const isHeic = image.type === "image/heic" || image.type === "image/heif";
    if (!validImageTypes.includes(image.type)) {
      console.error("[RECORDINGS] Type d'image non autorisé:", image.type, "user:", locals.user.id);
      return json({ error: "Type d'image non autorisé. Utilisez JPEG, PNG, WebP ou HEIC/HEIF." }, { status: 400 });
    }
    imageBuffer = Buffer.from(await image.arrayBuffer());
    if (isHeic) {
      try {
        imageBuffer = await sharp(imageBuffer).resize(1200, 1200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
        console.log("[RECORDINGS] HEIC converti en JPEG, nouvelle taille:", imageBuffer.length, "user:", locals.user.id);
      } catch (err) {
        console.error("[RECORDINGS] Erreur conversion HEIC:", err, "user:", locals.user.id);
        return json({ error: "Impossible de convertir l'image HEIC." }, { status: 400 });
      }
    } else {
      if (!isValidImageBuffer(imageBuffer)) {
        const firstBytes = imageBuffer.slice(0, 12).toString("hex").slice(0, 24);
        console.error("[RECORDINGS] Image invalide (magic numbers):", image.type, "user:", locals.user.id, "size:", image.size, "firstBytes:", firstBytes);
        return json({ error: "Le fichier ne semble pas être une image valide." }, { status: 400 });
      }
    }
    const maxImageSize = 10 * 1024 * 1024;
    if (imageBuffer.length > maxImageSize) {
      console.error("[RECORDINGS] Image trop volumineuse:", imageBuffer.length, "user:", locals.user.id);
      return json({ error: "Image trop volumineuse (max 10 Mo)" }, { status: 400 });
    }
  }
  console.log("[RECORDINGS] buffer size:", buffer.length, "imageBuffer:", imageBuffer?.length || "none");
  const recording = saveRecording(locals.user.id, buffer, durationSeconds, imageBuffer, url || null, audioHash);
  console.log("[RECORDINGS] Succès - id:", recording.id, "user:", locals.user.id, "URL:", url);
  return json({ id: recording.id });
};
export {
  POST
};
