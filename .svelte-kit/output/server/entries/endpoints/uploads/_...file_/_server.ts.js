import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { redirect } from "@sveltejs/kit";
const uploadsDir = join(process.cwd(), "uploads");
const GET = async ({ params, locals }) => {
  try {
    if (!locals.user) {
      console.log("[uploads] Accès refusé - utilisateur non authentifié");
      throw redirect(303, "/login");
    }
    const filePath = Array.isArray(params.file) ? join(uploadsDir, params.file.join("/")) : join(uploadsDir, params.file);
    console.log("[uploads] Chemin demandé:", filePath);
    console.log("[uploads] params.file:", params.file, "(type:", typeof params.file + ")");
    if (!existsSync(filePath)) {
      console.log("[uploads] Fichier non trouvé:", filePath);
      return new Response("Fichier non trouvé", { status: 404 });
    }
    console.log("[uploads] Lecture du fichier:", filePath);
    const buffer = readFileSync(filePath);
    console.log("[uploads] Fichier lu, taille:", buffer.length, "bytes");
    const ext = filePath.split(".").pop()?.toLowerCase();
    let contentType = getContentType(ext);
    if (buffer.length > 0) {
      const isPNG = buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71;
      const isJPEG = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
      if (isPNG && contentType !== "image/png") {
        console.log("[uploads] Fichier PNG détecté mais extension différente, correction du Content-Type");
        contentType = "image/png";
      } else if (isJPEG && contentType !== "image/jpeg") {
        console.log("[uploads] Fichier JPEG détecté mais extension différente, correction du Content-Type");
        contentType = "image/jpeg";
      }
    }
    console.log("[uploads] Content-Type:", contentType, "(extension:", ext + ")");
    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600"
      }
    });
  } catch (error) {
    console.error("[uploads] Erreur lors du traitement de la requête:", error);
    console.error("[uploads] Type d'erreur:", error.constructor.name);
    console.error("[uploads] Message:", error.message);
    if (error.status === 303 || error.location) {
      throw error;
    }
    return new Response(
      JSON.stringify({
        error: "Erreur lors de la lecture du fichier",
        details: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
function getContentType(ext) {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "m4a":
      return "audio/mp4";
    case "webm":
      return "audio/webm";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}
export {
  GET
};
