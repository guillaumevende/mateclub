import { redirect, json } from "@sveltejs/kit";
import { m as getRecordingById, o as markAsListened } from "../../../../../../chunks/db.js";
const POST = async ({ params, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  const recordingId = parseInt(params.id);
  const recording = getRecordingById(recordingId);
  if (!recording) {
    return json({ error: "Fichier non trouvé" }, { status: 404 });
  }
  markAsListened(recordingId, locals.user.id);
  return json({ success: true });
};
export {
  POST
};
