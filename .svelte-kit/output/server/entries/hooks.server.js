import { J as getSession, K as refreshSession, L as generateCSRFToken, M as validateCSRFToken, I as hasAdmin } from "../chunks/db.js";
const handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session");
  if (sessionId) {
    const user = getSession(sessionId);
    if (user) {
      event.locals.user = user;
      refreshSession(sessionId);
    }
  }
  const csrfToken = generateCSRFToken(sessionId);
  event.locals.csrfToken = csrfToken;
  if (event.request.method === "POST" && !event.url.pathname.startsWith("/api")) {
    const formData = await event.request.clone().formData().catch(() => null);
    if (formData) {
      const token = formData.get("csrf_token")?.toString();
      if (!token || !validateCSRFToken(token, sessionId)) {
        return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
  }
  const isSetupPage = event.url.pathname === "/setup";
  const isApi = event.url.pathname.startsWith("/api");
  const isStatic = event.url.pathname.startsWith("/uploads") || event.url.pathname.startsWith("/static") || event.url.pathname.includes(".");
  if (!isSetupPage && !isApi && !isStatic && !hasAdmin()) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/setup" }
    });
  }
  const response = await resolve(event);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://*;");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return response;
};
async function handleError({ error, status }) {
  return {
    message: "Une erreur est survenue",
    status
  };
}
export {
  handle,
  handleError
};
