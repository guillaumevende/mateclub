import * as server from '../entries/pages/admin/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/admin/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.F9g-vbRP.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/Co_kV0OJ.js","_app/immutable/chunks/B59kVc6D.js","_app/immutable/chunks/-spvDIef.js","_app/immutable/chunks/BWOxfgLi.js","_app/immutable/chunks/BtGKlgia.js","_app/immutable/chunks/A7bLVN5l.js","_app/immutable/chunks/0_VOOkFC.js","_app/immutable/chunks/kx5WZEdS.js"];
export const stylesheets = ["_app/immutable/assets/3.Bo3nKo_Q.css","_app/immutable/assets/shared.I7StIyDY.css"];
export const fonts = [];
