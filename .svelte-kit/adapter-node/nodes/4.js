import * as server from '../entries/pages/login/_page.server.ts.js';

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/login/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/login/+page.server.ts";
export const imports = ["_app/immutable/nodes/4.COtUOHFg.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CZxRZpgK.js","_app/immutable/chunks/BbIEIe4D.js"];
export const stylesheets = ["_app/immutable/assets/4.BfnkOpA-.css"];
export const fonts = [];
