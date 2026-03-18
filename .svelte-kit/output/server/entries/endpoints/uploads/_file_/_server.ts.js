import { existsSync, readFileSync } from "fs";
import { join, normalize } from "path";
const UPLOADS_DIR = join(process.cwd(), "uploads");
const GET = async ({ params }) => {
  const filename = params.file;
  if (filename.includes("..") || filename.includes("//") || filename.startsWith("/")) {
    return new Response("Accès refusé", { status: 403 });
  }
  const filepath = normalize(join(UPLOADS_DIR, filename));
  if (!filepath.startsWith(UPLOADS_DIR)) {
    return new Response("Accès refusé", { status: 403 });
  }
  if (filename.includes("\\")) {
    return new Response("Accès refusé", { status: 403 });
  }
  if (!existsSync(filepath)) {
    return new Response("Not found", { status: 404 });
  }
  const fileBuffer = readFileSync(filepath);
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
  return new Response(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000"
    }
  });
};
export {
  GET
};
