import { json, redirect } from "@sveltejs/kit";
import { w as getRecordingById, x as deleteRecording, y as markAsListened, z as getRecordingFilePath } from "../../../../../chunks/db.js";
import { existsSync, readFileSync } from "fs";
const GET = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  const recordingId = parseInt(params.id);
  const recording = getRecordingById(recordingId);
  if (!recording) {
    return json({ error: "Fichier non trouvé" }, { status: 404 });
  }
  markAsListened(recordingId, locals.user.id);
  const filepath = getRecordingFilePath(recording.filename);
  if (!existsSync(filepath)) {
    return json({ error: "Fichier non trouvé" }, { status: 404 });
  }
  const fileBuffer = readFileSync(filepath);
  const isM4A = recording.filename.endsWith(".m4a");
  const contentType = isM4A ? "audio/mp4" : "audio/webm";
  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": fileBuffer.length.toString(),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache"
    }
  });
};
const DELETE = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const recordingId = parseInt(params.id);
  const recording = getRecordingById(recordingId);
  if (!recording) {
    return json({ error: "Enregistrement non trouvé" }, { status: 404 });
  }
  if (recording.user_id !== locals.user.id) {
    return json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    deleteRecording(recordingId);
    return json({ success: true });
  } catch (error) {
    console.error("Error deleting recording:", error);
    return json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
};
export {
  DELETE,
  GET
};
