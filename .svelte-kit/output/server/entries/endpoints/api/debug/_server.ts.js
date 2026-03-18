import { json } from "@sveltejs/kit";
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 1e3;
const MAX_LOGS_PER_MINUTE = 10;
const LOG_HISTORY = [];
function rateLimitCheck() {
  const now = Date.now();
  const oneMinuteAgo = now - 6e4;
  while (LOG_HISTORY.length > 0 && LOG_HISTORY[0].timestamp < oneMinuteAgo) {
    LOG_HISTORY.shift();
  }
  if (LOG_HISTORY.length >= MAX_LOGS_PER_MINUTE) {
    return false;
  }
  LOG_HISTORY.push({ timestamp: now });
  return true;
}
const POST = async ({ request, locals }) => {
  if (!rateLimitCheck()) {
    return json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const body = await request.json();
    const message = String(body.message || "").slice(0, MAX_MESSAGE_LENGTH);
    const stack = String(body.stack || "").slice(0, MAX_STACK_LENGTH);
    const context = body.context || {};
    const userId = locals.user?.id || "anonymous";
    const logEntry = {
      level: "ERROR",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      userId,
      message,
      stack: stack.length > 0 ? stack : void 0,
      context: {
        url: context.url?.slice(0, 200),
        audioSize: context.audioSize,
        audioType: context.audioType?.slice(0, 50),
        duration: context.duration,
        userAgent: context.userAgent?.slice(0, 200),
        timestamp: context.timestamp
      }
    };
    console.error("[CLIENT ERROR]", JSON.stringify(logEntry));
    return json({ success: true });
  } catch (e) {
    return json({ error: "Invalid request" }, { status: 400 });
  }
};
export {
  POST
};
