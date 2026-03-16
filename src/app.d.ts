import type { User } from '$lib/server/db';

declare global {
	namespace App {
		interface Locals {
			user?: User;
			csrfToken?: string;
		}
	}
}

export {};
