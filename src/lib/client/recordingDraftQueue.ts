export type StoredRecordingDraft = {
	id: string;
	audioBlob: Blob;
	audioMimeType: string;
	durationSeconds: number;
	imageBlob: Blob | null;
	recordingUrl: string;
	createdAt: string;
};

const DB_NAME = 'mateclub-recording-drafts';
const STORE_NAME = 'draft-queue';
const QUEUE_KEY = 'current';

function isIndexedDbAvailable() {
	return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDraftQueueDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!isIndexedDbAvailable()) {
			reject(new Error('IndexedDB indisponible'));
			return;
		}

		const request = window.indexedDB.open(DB_NAME, 1);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME);
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Impossible d’ouvrir IndexedDB'));
	});
}

export async function loadRecordingDraftQueue(): Promise<StoredRecordingDraft[]> {
	if (!isIndexedDbAvailable()) return [];

	const db = await openDraftQueueDb();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.get(QUEUE_KEY);

		request.onsuccess = () => {
			const result = request.result;
			resolve(Array.isArray(result) ? result : []);
		};
		request.onerror = () => reject(request.error ?? new Error('Impossible de charger les brouillons'));
		transaction.oncomplete = () => db.close();
		transaction.onerror = () => reject(transaction.error ?? new Error('Erreur de lecture IndexedDB'));
	});
}

export async function saveRecordingDraftQueue(drafts: StoredRecordingDraft[]): Promise<void> {
	if (!isIndexedDbAvailable()) return;

	const db = await openDraftQueueDb();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.put(drafts, QUEUE_KEY);

		request.onsuccess = () => undefined;
		request.onerror = () => reject(request.error ?? new Error('Impossible de sauvegarder les brouillons'));
		transaction.oncomplete = () => {
			db.close();
			resolve();
		};
		transaction.onerror = () => reject(transaction.error ?? new Error('Erreur d’écriture IndexedDB'));
	});
}

export async function clearRecordingDraftQueue(): Promise<void> {
	if (!isIndexedDbAvailable()) return;

	const db = await openDraftQueueDb();

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(QUEUE_KEY);

		request.onsuccess = () => undefined;
		request.onerror = () => reject(request.error ?? new Error('Impossible de supprimer les brouillons'));
		transaction.oncomplete = () => {
			db.close();
			resolve();
		};
		transaction.onerror = () => reject(transaction.error ?? new Error('Erreur de suppression IndexedDB'));
	});
}
