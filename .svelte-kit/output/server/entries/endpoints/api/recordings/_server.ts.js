import { redirect, json } from "@sveltejs/kit";
import { h as getRecentRecordingByUser, s as saveRecording } from "../../../../chunks/db.js";
const POST = async ({ request, locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }
  const formData = await request.formData();
  const audio = formData.get("audio");
  const duration = formData.get("duration")?.toString();
  const image = formData.get("image");
  if (!audio || audio.size === 0) {
    return json({ error: "Audio requis" }, { status: 400 });
  }
  const durationSeconds = parseInt(duration || "0", 10);
  if (durationSeconds > 180) {
    return json({ error: "Durée maximale: 3 minutes" }, { status: 400 });
  }
  const recentRecording = getRecentRecordingByUser(locals.user.id, durationSeconds, 5);
  if (recentRecording) {
    return json({
      id: recentRecording.id,
      duplicate: true,
      message: "Enregistrement déjà existant"
    });
  }
  const buffer = Buffer.from(await audio.arrayBuffer());
  let imageBuffer;
  if (image && image.size > 0) {
    imageBuffer = Buffer.from(await image.arrayBuffer());
  }
  const recording = saveRecording(locals.user.id, buffer, durationSeconds, imageBuffer);
  return json({ id: recording.id });
};
export {
  POST
};
