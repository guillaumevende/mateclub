import * as server from '../entries/pages/settings/_page.server.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/settings/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/settings/+page.server.ts";
export const imports = ["_app/immutable/nodes/7.CJ7Zu4BE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/BbIEIe4D.js","_app/immutable/chunks/pMVJWxHy.js","_app/immutable/chunks/DvgFkYBv.js","_app/immutable/chunks/x3vsgxFd.js","_app/immutable/chunks/Bauhmg--.js","_app/immutable/chunks/DILJcqf6.js"];
export const stylesheets = ["_app/immutable/assets/7.CZkabktm.css","_app/immutable/assets/shared.CB3-sXx_.css"];
export const fonts = [];
