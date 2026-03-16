import { B as getSession } from "../chunks/db.js";
const handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get("session");
  if (sessionId) {
    const user = getSession(sessionId);
    if (user) {
      event.locals.user = user;
    }
  }
  const response = await resolve(event);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
};
export {
  handle
};
