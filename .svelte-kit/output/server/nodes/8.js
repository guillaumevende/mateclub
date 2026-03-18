import * as server from '../entries/pages/setup/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/setup/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/setup/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.BFqRiez7.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/-spvDIef.js"];
export const stylesheets = ["_app/immutable/assets/8.BbGmIFLl.css","_app/immutable/assets/shared.I7StIyDY.css"];
export const fonts = [];
