import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.CKy9RBnh.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/Co_kV0OJ.js","_app/immutable/chunks/B59kVc6D.js","_app/immutable/chunks/-spvDIef.js","_app/immutable/chunks/BtGKlgia.js","_app/immutable/chunks/A7bLVN5l.js","_app/immutable/chunks/0_VOOkFC.js","_app/immutable/chunks/kx5WZEdS.js","_app/immutable/chunks/BQR-LPmn.js","_app/immutable/chunks/CqmdMmoI.js"];
export const stylesheets = ["_app/immutable/assets/ImageViewer.caezNq26.css","_app/immutable/assets/2.Ds_jtfjf.css","_app/immutable/assets/shared.I7StIyDY.css"];
export const fonts = [];
