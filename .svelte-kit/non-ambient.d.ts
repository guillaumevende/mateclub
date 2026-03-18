
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/admin" | "/api" | "/api/admin" | "/api/admin/users" | "/api/admin/users/[id]" | "/api/auth" | "/api/auth/login" | "/api/auth/logout" | "/api/auth/me" | "/api/avatar" | "/api/avatar/restore" | "/api/debug" | "/api/recordings" | "/api/recordings/by-date" | "/api/recordings/dates" | "/api/recordings/mine" | "/api/recordings/[id]" | "/api/recordings/[id]/listen" | "/favicon.ico" | "/login" | "/logout" | "/record" | "/settings" | "/setup" | "/uploads" | "/uploads/avatars" | "/uploads/avatars/[[path]]" | "/uploads/[file]" | "/uploads/[...file]";
		RouteParams(): {
			"/api/admin/users/[id]": { id: string };
			"/api/recordings/[id]": { id: string };
			"/api/recordings/[id]/listen": { id: string };
			"/uploads/avatars/[[path]]": { path?: string };
			"/uploads/[file]": { file: string };
			"/uploads/[...file]": { file: string }
		};
		LayoutParams(): {
			"/": { id?: string; path?: string; file?: string };
			"/admin": Record<string, never>;
			"/api": { id?: string };
			"/api/admin": { id?: string };
			"/api/admin/users": { id?: string };
			"/api/admin/users/[id]": { id: string };
			"/api/auth": Record<string, never>;
			"/api/auth/login": Record<string, never>;
			"/api/auth/logout": Record<string, never>;
			"/api/auth/me": Record<string, never>;
			"/api/avatar": Record<string, never>;
			"/api/avatar/restore": Record<string, never>;
			"/api/debug": Record<string, never>;
			"/api/recordings": { id?: string };
			"/api/recordings/by-date": Record<string, never>;
			"/api/recordings/dates": Record<string, never>;
			"/api/recordings/mine": Record<string, never>;
			"/api/recordings/[id]": { id: string };
			"/api/recordings/[id]/listen": { id: string };
			"/favicon.ico": Record<string, never>;
			"/login": Record<string, never>;
			"/logout": Record<string, never>;
			"/record": Record<string, never>;
			"/settings": Record<string, never>;
			"/setup": Record<string, never>;
			"/uploads": { path?: string; file?: string };
			"/uploads/avatars": { path?: string };
			"/uploads/avatars/[[path]]": { path?: string };
			"/uploads/[file]": { file: string };
			"/uploads/[...file]": { file: string }
		};
		Pathname(): "/" | "/admin" | "/api/admin/users" | `/api/admin/users/${string}` & {} | "/api/auth/login" | "/api/auth/logout" | "/api/auth/me" | "/api/avatar" | "/api/avatar/restore" | "/api/debug" | "/api/recordings" | "/api/recordings/" | "/api/recordings/by-date" | "/api/recordings/dates" | "/api/recordings/mine" | `/api/recordings/${string}` & {} | `/api/recordings/${string}/listen` & {} | "/favicon.ico" | "/login" | "/logout" | "/record" | "/settings" | "/setup" | `/uploads/avatars${string}` & {} | `/uploads/${string}` & {};
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/.DS_Store" | "/apple-touch-icon.png" | "/favicon-16x16.png" | "/favicon-32x32.png" | "/favicon.ico" | "/icon-192x192.png" | "/icon-512x512.png" | "/jingle-intro.mp3" | "/jingle-transition.mp3" | "/logo512px.png" | "/logoHD.png" | "/manifest.json" | "/silence.mp3" | "/sw.js" | string & {};
	}
}