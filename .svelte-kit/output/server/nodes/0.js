import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.DYY9ilDE.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/x3vsgxFd.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/8Qby7n89.js","_app/immutable/chunks/BbIEIe4D.js","_app/immutable/chunks/pMVJWxHy.js","_app/immutable/chunks/DvgFkYBv.js","_app/immutable/chunks/Bauhmg--.js","_app/immutable/chunks/p4ioXQUF.js","_app/immutable/chunks/OurJ5lWO.js","_app/immutable/chunks/DHdrjZc8.js"];
export const stylesheets = ["_app/immutable/assets/0.CrCQnsZB.css"];
export const fonts = [];
