import { WebHaptics } from 'web-haptics';

let haptics: WebHaptics | null = null;

export function initHaptics() {
	if (typeof window === 'undefined') return;
	
	haptics = new WebHaptics();
}

export function triggerHaptic(pattern: Parameters<WebHaptics['trigger']>[0] = 'nudge') {
	if (!haptics || typeof window === 'undefined') return;
	
	try {
		void haptics.trigger(pattern);
	} catch (e) {
		console.warn('Haptic feedback failed:', e);
	}
}

export function triggerLockedHaptic() {
	if (!haptics || typeof window === 'undefined') return;
	
	try {
		void haptics.trigger('error');
	} catch (e) {
		console.warn('Locked haptic feedback failed:', e);
	}
}

export function destroyHaptics() {
	if (haptics) {
		haptics.destroy();
		haptics = null;
	}
}
