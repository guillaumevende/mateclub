import * as server from '../entries/pages/record/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/record/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/record/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.ChM44V4S.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/x3vsgxFd.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/8Qby7n89.js","_app/immutable/chunks/BbIEIe4D.js","_app/immutable/chunks/pMVJWxHy.js","_app/immutable/chunks/DILJcqf6.js","_app/immutable/chunks/p4ioXQUF.js"];
export const stylesheets = ["_app/immutable/assets/6.C6SKFU-m.css"];
export const fonts = [];
