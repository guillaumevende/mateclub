import { readFileSync } from "fs";
import { join } from "path";
const GET = async () => {
  const faviconPath = join(process.cwd(), "static", "favicon.ico");
  const favicon = readFileSync(faviconPath);
  return new Response(favicon, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=604800"
    }
  });
};
export {
  GET
};
