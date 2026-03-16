import * as server from '../entries/pages/admin/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.6GVcKDFG.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/x3vsgxFd.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/BbIEIe4D.js","_app/immutable/chunks/pMVJWxHy.js","_app/immutable/chunks/Bauhmg--.js","_app/immutable/chunks/OurJ5lWO.js","_app/immutable/chunks/DHdrjZc8.js","_app/immutable/chunks/8Qby7n89.js"];
export const stylesheets = ["_app/immutable/assets/3.Cn0V3kJz.css","_app/immutable/assets/shared.CB3-sXx_.css"];
export const fonts = [];
