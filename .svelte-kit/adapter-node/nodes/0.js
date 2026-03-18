import * as server from '../entries/pages/_layout.server.ts.js';

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/+layout.server.ts";
export const imports = ["_app/immutable/nodes/0.BasfBuUi.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/kx5WZEdS.js","_app/immutable/chunks/Co_kV0OJ.js","_app/immutable/chunks/-spvDIef.js","_app/immutable/chunks/DAFaPsCg.js","_app/immutable/chunks/BtGKlgia.js","_app/immutable/chunks/CqmdMmoI.js"];
export const stylesheets = ["_app/immutable/assets/0.C_3mAHdw.css"];
export const fonts = [];
