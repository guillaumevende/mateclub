import webpush from 'web-push';
import {
	disablePushSubscription,
	getActivePushSubscriptionsForUser,
	getAvailableUnreadCount,
	getConfiguredPushCheckWindowMinutes,
	getUsersWithPushNotificationsEnabled,
	hasPushDeliveryLog,
	markPushSubscriptionFailure,
	markPushSubscriptionSuccess,
	recordPushDeliveryLog
} from '$lib/server/db';

export type PushRuntimeConfig = {
	configured: boolean;
	publicKey: string | null;
	subject: string | null;
	missingKeys: string[];
};

const PUSH_NOTIFICATION_TYPE = 'daily_delivery';
const PUSH_NOTIFICATION_BODY = "C'est l'heure de venir profiter de ton Yerba Maté !";
const PUSH_NOTIFICATION_TITLE = 'Maté Club';

let vapidConfigured = false;
let schedulerInitialized = false;
let schedulerRunning = false;

function getCurrentDateInTimezone(timezone: string): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

function getCurrentMinutesInTimezone(timezone: string): number {
	const parts = new Intl.DateTimeFormat('en-GB', {
		timeZone: timezone,
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).formatToParts(new Date());

	const hour = Number.parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10);
	const minute = Number.parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10);
	return hour * 60 + minute;
}

export function getPushRuntimeConfig(): PushRuntimeConfig {
	const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() || null;
	const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || null;
	const subject = process.env.VAPID_SUBJECT?.trim() || null;
	const missingKeys = [
		!publicKey ? 'VAPID_PUBLIC_KEY' : null,
		!privateKey ? 'VAPID_PRIVATE_KEY' : null,
		!subject ? 'VAPID_SUBJECT' : null
	].filter((value): value is string => Boolean(value));

	return {
		configured: missingKeys.length === 0,
		publicKey,
		subject,
		missingKeys
	};
}

function ensureVapidConfiguration(): PushRuntimeConfig {
	const config = getPushRuntimeConfig();
	if (!config.configured || vapidConfigured) {
		return config;
	}

	webpush.setVapidDetails(config.subject!, config.publicKey!, process.env.VAPID_PRIVATE_KEY!.trim());
	vapidConfigured = true;
	return config;
}

function buildPushPayload(unreadCount: number) {
	return JSON.stringify({
		title: PUSH_NOTIFICATION_TITLE,
		body: PUSH_NOTIFICATION_BODY,
		tag: 'mateclub-daily-delivery',
		data: {
			url: '/',
			type: PUSH_NOTIFICATION_TYPE,
			unreadCount
		},
		icon: '/icon-192x192.png',
		badge: '/icon-192x192.png'
	});
}

async function sendDailyPushToUser(userId: number, unreadCount: number): Promise<boolean> {
	const config = ensureVapidConfiguration();
	if (!config.configured) return false;

	const subscriptions = getActivePushSubscriptionsForUser(userId);
	if (subscriptions.length === 0) return false;

	const payload = buildPushPayload(unreadCount);
	let delivered = false;

	for (const subscription of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: {
						p256dh: subscription.p256dh,
						auth: subscription.auth
					}
				},
				payload
			);
			markPushSubscriptionSuccess(subscription.endpoint);
			delivered = true;
		} catch (error) {
			markPushSubscriptionFailure(subscription.endpoint);
			const statusCode = typeof error === 'object' && error && 'statusCode' in error
				? Number((error as { statusCode?: number }).statusCode)
				: null;
			if (statusCode === 404 || statusCode === 410) {
				disablePushSubscription(subscription.endpoint);
			}
			console.error('Push notification failed:', error);
		}
	}

	return delivered;
}

export async function processDailyPushNotifications(): Promise<void> {
	if (schedulerRunning) return;
	schedulerRunning = true;

	try {
		const config = ensureVapidConfiguration();
		if (!config.configured) return;

		const users = getUsersWithPushNotificationsEnabled();
		const checkWindowMinutes = getConfiguredPushCheckWindowMinutes();

		for (const user of users) {
			const timezone = user.timezone || 'Europe/Paris';
			const currentMinutes = getCurrentMinutesInTimezone(timezone);
			const thresholdMinutes = user.daily_notification_hour;

			if (currentMinutes < thresholdMinutes || currentMinutes > thresholdMinutes + checkWindowMinutes) {
				continue;
			}

			const deliveryDate = getCurrentDateInTimezone(timezone);
			if (hasPushDeliveryLog(user.id, deliveryDate, PUSH_NOTIFICATION_TYPE)) {
				continue;
			}

			const unreadStats = getAvailableUnreadCount(user.id);
			if (unreadStats.count === 0) {
				recordPushDeliveryLog(user.id, deliveryDate, false, PUSH_NOTIFICATION_TYPE);
				continue;
			}

			const sent = await sendDailyPushToUser(user.id, unreadStats.count);
			recordPushDeliveryLog(user.id, deliveryDate, sent, PUSH_NOTIFICATION_TYPE);
		}
	} finally {
		schedulerRunning = false;
	}
}

export function initializePushScheduler(): void {
	if (schedulerInitialized) return;
	schedulerInitialized = true;

	if (!getPushRuntimeConfig().configured) {
		return;
	}

	void processDailyPushNotifications();

	const interval = setInterval(() => {
		void processDailyPushNotifications();
	}, 60 * 1000);

	interval.unref?.();
}
