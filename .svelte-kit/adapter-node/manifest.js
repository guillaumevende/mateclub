export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","apple-touch-icon.png","favicon-16x16.png","favicon-32x32.png","favicon.ico","icon-192x192.png","icon-512x512.png","jingle-intro.mp3","jingle-transition.mp3","logo512px.png","logoHD.png","manifest.json","silence.mp3","sw.js"]),
	mimeTypes: {".png":"image/png",".mp3":"audio/mpeg",".json":"application/json",".js":"text/javascript"},
	_: {
		client: {start:"_app/immutable/entry/start.Bj_QgWLx.js",app:"_app/immutable/entry/app.22J5voVh.js",imports:["_app/immutable/entry/start.Bj_QgWLx.js","_app/immutable/chunks/BtGKlgia.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/entry/app.22J5voVh.js","_app/immutable/chunks/ColMeKsp.js","_app/immutable/chunks/BSwoSVdI.js","_app/immutable/chunks/DfIw3lH-.js","_app/immutable/chunks/0_VOOkFC.js","_app/immutable/chunks/kx5WZEdS.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js')),
			__memo(() => import('./nodes/4.js')),
			__memo(() => import('./nodes/5.js')),
			__memo(() => import('./nodes/6.js')),
			__memo(() => import('./nodes/7.js')),
			__memo(() => import('./nodes/8.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/admin/users",
				pattern: /^\/api\/admin\/users\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/users/_server.ts.js'))
			},
			{
				id: "/api/admin/users/[id]",
				pattern: /^\/api\/admin\/users\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/admin/users/_id_/_server.ts.js'))
			},
			{
				id: "/api/auth/login",
				pattern: /^\/api\/auth\/login\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/login/_server.ts.js'))
			},
			{
				id: "/api/auth/logout",
				pattern: /^\/api\/auth\/logout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/logout/_server.ts.js'))
			},
			{
				id: "/api/auth/me",
				pattern: /^\/api\/auth\/me\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/auth/me/_server.ts.js'))
			},
			{
				id: "/api/avatar",
				pattern: /^\/api\/avatar\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/avatar/_server.ts.js'))
			},
			{
				id: "/api/avatar/restore",
				pattern: /^\/api\/avatar\/restore\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/avatar/restore/_server.ts.js'))
			},
			{
				id: "/api/debug",
				pattern: /^\/api\/debug\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/debug/_server.ts.js'))
			},
			{
				id: "/api/recordings",
				pattern: /^\/api\/recordings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/_server.ts.js'))
			},
			{
				id: "/api/recordings/by-date",
				pattern: /^\/api\/recordings\/by-date\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/by-date/_server.ts.js'))
			},
			{
				id: "/api/recordings/dates",
				pattern: /^\/api\/recordings\/dates\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/dates/_server.ts.js'))
			},
			{
				id: "/api/recordings/mine",
				pattern: /^\/api\/recordings\/mine\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/mine/_server.ts.js'))
			},
			{
				id: "/api/recordings/[id]",
				pattern: /^\/api\/recordings\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/_id_/_server.ts.js'))
			},
			{
				id: "/api/recordings/[id]/listen",
				pattern: /^\/api\/recordings\/([^/]+?)\/listen\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/recordings/_id_/listen/_server.ts.js'))
			},
			{
				id: "/favicon.ico",
				pattern: /^\/favicon\.ico\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/favicon.ico/_server.ts.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/logout",
				pattern: /^\/logout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/record",
				pattern: /^\/record\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/setup",
				pattern: /^\/setup\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/uploads/avatars/[[path]]",
				pattern: /^\/uploads\/avatars(?:\/([^/]+))?\/?$/,
				params: [{"name":"path","optional":true,"rest":false,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/uploads/avatars/__path__/_server.ts.js'))
			},
			{
				id: "/uploads/[file]",
				pattern: /^\/uploads\/([^/]+?)\/?$/,
				params: [{"name":"file","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/uploads/_file_/_server.ts.js'))
			},
			{
				id: "/uploads/[...file]",
				pattern: /^\/uploads(?:\/([^]*))?\/?$/,
				params: [{"name":"file","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/uploads/_...file_/_server.ts.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base = "";