import * as server from '../entries/pages/settings/_page.server.ts.js';

export const index = 7;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/settings/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/settings/+page.server.ts";
export const imports = ["_app/immutable/nodes/7.B5j1d-XR.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/Co_kV0OJ.js","_app/immutable/chunks/B59kVc6D.js","_app/immutable/chunks/-spvDIef.js","_app/immutable/chunks/Drsoh5NJ.js","_app/immutable/chunks/BWOxfgLi.js","_app/immutable/chunks/BtGKlgia.js","_app/immutable/chunks/DfIw3lH-.js"];
export const stylesheets = ["_app/immutable/assets/7.g3tNlWmI.css","_app/immutable/assets/shared.I7StIyDY.css"];
export const fonts = [];
