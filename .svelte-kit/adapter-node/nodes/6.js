import * as server from '../entries/pages/record/_page.server.ts.js';

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/record/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/record/+page.server.ts";
export const imports = ["_app/immutable/nodes/6.CmM2MTFx.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/kx5WZEdS.js","_app/immutable/chunks/Co_kV0OJ.js","_app/immutable/chunks/B59kVc6D.js","_app/immutable/chunks/-spvDIef.js","_app/immutable/chunks/Drsoh5NJ.js","_app/immutable/chunks/CqmdMmoI.js","_app/immutable/chunks/BQR-LPmn.js"];
export const stylesheets = ["_app/immutable/assets/ImageViewer.caezNq26.css","_app/immutable/assets/6.vRwnuRDM.css","_app/immutable/assets/shared.I7StIyDY.css"];
export const fonts = [];
