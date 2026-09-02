import { version } from '../../../package.json';

type NavigatorWithConnection = Navigator & {
	connection?: {
		effectiveType?: string;
		downlink?: number;
		rtt?: number;
		saveData?: boolean;
	};
	standalone?: boolean;
};

export type ClientDiagnosticsContext = {
	appVersion: string;
	url: string;
	userAgent: string;
	platform: string;
	language: string;
	online: boolean;
	visibilityState: DocumentVisibilityState;
	standalone: boolean;
	serviceWorkerControlled: boolean;
	viewport: {
		width: number;
		height: number;
		visualWidth?: number;
		visualHeight?: number;
		visualOffsetTop?: number;
	};
	connection?: {
		effectiveType?: string;
		downlink?: number;
		rtt?: number;
		saveData?: boolean;
	};
};

export function getClientDiagnosticsContext(): ClientDiagnosticsContext {
	const nav = navigator as NavigatorWithConnection;
	const standaloneMediaQuery = window.matchMedia?.('(display-mode: standalone)').matches ?? false;

	return {
		appVersion: version,
		url: window.location.href,
		userAgent: nav.userAgent,
		platform: nav.platform,
		language: nav.language,
		online: nav.onLine,
		visibilityState: document.visibilityState,
		standalone: standaloneMediaQuery || nav.standalone === true,
		serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller),
		viewport: {
			width: window.innerWidth,
			height: window.innerHeight,
			visualWidth: window.visualViewport?.width,
			visualHeight: window.visualViewport?.height,
			visualOffsetTop: window.visualViewport?.offsetTop
		},
		connection: nav.connection
			? {
				effectiveType: nav.connection.effectiveType,
				downlink: nav.connection.downlink,
				rtt: nav.connection.rtt,
				saveData: nav.connection.saveData
			}
			: undefined
	};
}

export async function sendClientDiagnosticError(
	message: string,
	context: Record<string, unknown> = {},
	stack = ''
) {
	try {
		await fetch('/api/debug', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				message,
				stack,
				context: {
					...getClientDiagnosticsContext(),
					...context
				}
			})
		});
	} catch {
		// Le diagnostic ne doit jamais ajouter une erreur par-dessus l'erreur initiale.
	}
}

