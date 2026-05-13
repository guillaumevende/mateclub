import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	countActivePushSubscriptionsForUser,
	disableAllPushSubscriptionsForUser,
	disablePushSubscriptionForUser,
	togglePushNotificationsEnabled,
	upsertPushSubscription
} from '$lib/server/db';
import { getPushRuntimeConfig } from '$lib/server/push';

type SubscriptionPayload = {
	endpoint?: string;
	keys?: {
		p256dh?: string;
		auth?: string;
	};
};

type ValidSubscriptionPayload = {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
};

function isValidSubscription(subscription: SubscriptionPayload | null | undefined): subscription is ValidSubscriptionPayload {
	return Boolean(
		subscription?.endpoint &&
		subscription.keys?.p256dh &&
		subscription.keys?.auth
	);
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const pushConfig = getPushRuntimeConfig();
	if (!pushConfig.configured) {
		return json({ error: 'Notifications push non configurées sur ce serveur' }, { status: 503 });
	}

	const payload = await request.json().catch(() => null) as { subscription?: SubscriptionPayload } | null;
	const subscription = payload?.subscription;

	if (!isValidSubscription(subscription)) {
		return json({ error: 'Abonnement push invalide' }, { status: 400 });
	}

	upsertPushSubscription(locals.user.id, {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth
		}
	}, request.headers.get('user-agent'));
	togglePushNotificationsEnabled(locals.user.id, true);

	return json({ success: true });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const payload = await request.json().catch(() => null) as { endpoint?: string | null } | null;
	const endpoint = payload?.endpoint?.trim();

	if (endpoint) {
		disablePushSubscriptionForUser(locals.user.id, endpoint);
	} else {
		disableAllPushSubscriptionsForUser(locals.user.id);
	}

	togglePushNotificationsEnabled(locals.user.id, countActivePushSubscriptionsForUser(locals.user.id) > 0);

	return json({ success: true });
};
