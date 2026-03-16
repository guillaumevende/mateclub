import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.DQ9PyVBb.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/x3vsgxFd.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/BbIEIe4D.js","_app/immutable/chunks/pMVJWxHy.js","_app/immutable/chunks/DvgFkYBv.js","_app/immutable/chunks/Bauhmg--.js","_app/immutable/chunks/OurJ5lWO.js","_app/immutable/chunks/DHdrjZc8.js","_app/immutable/chunks/8Qby7n89.js","_app/immutable/chunks/p4ioXQUF.js"];
export const stylesheets = ["_app/immutable/assets/2.D2p3KpYl.css"];
export const fonts = [];
