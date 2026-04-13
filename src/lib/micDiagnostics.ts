export type MicPermissionState = 'prompt' | 'granted' | 'denied' | 'unknown';

export type MicDiagnosticEntry = {
	timestamp: string;
	event: string;
	details?: string;
};

const STORAGE_KEY = 'mateclub:mic-diagnostics';
const MAX_ENTRIES = 100;

function hasStorage() {
	return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getMicExecutionContext() {
	if (typeof window === 'undefined') {
		return {
			isStandalone: false,
			isIos: false,
			isSafari: false,
			isSecureContext: false,
			userAgent: ''
		};
	}

	const userAgent = navigator.userAgent;
	const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isSafari = /Safari/i.test(userAgent) && !/CriOS|Chrome|EdgiOS|FxiOS|Edg/i.test(userAgent);
	const standaloneMediaQuery = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
	const navigatorStandalone = typeof (navigator as Navigator & { standalone?: boolean }).standalone === 'boolean'
		? Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
		: false;

	return {
		isStandalone: standaloneMediaQuery || navigatorStandalone,
		isIos,
		isSafari,
		isSecureContext: window.isSecureContext,
		userAgent
	};
}

export function readMicDiagnostics(): MicDiagnosticEntry[] {
	if (!hasStorage()) return [];

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed as MicDiagnosticEntry[] : [];
	} catch {
		return [];
	}
}

export function writeMicDiagnostic(event: string, details?: string) {
	if (!hasStorage()) return;

	const entries = readMicDiagnostics();
	entries.push({
		timestamp: new Date().toISOString(),
		event,
		details
	});

	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
}

export function clearMicDiagnostics() {
	if (!hasStorage()) return;
	window.localStorage.removeItem(STORAGE_KEY);
}
