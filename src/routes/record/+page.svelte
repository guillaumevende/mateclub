	<script lang="ts">
	import { beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { playerStore, getAudioElement, updateMediaSessionMetadata, closePlayer, debugLogs, logsEnabled, type DayRecordings } from '$lib/stores/player';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import {
		clearRecordingDraftQueue,
		loadRecordingDraftQueue,
		saveRecordingDraftQueue,
		type StoredRecordingDraft
	} from '$lib/client/recordingDraftQueue';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { triggerHaptic } from '$lib/utils/haptics';
	import { debug } from '$lib/debug';
	import '$lib/shared.css';
	
	type UserRecording = {
		id: number;
		user_id: number;
		filename: string;
		image_filename: string | null;
		url: string | null;
		duration_seconds: number;
		recorded_at: string;
		avatar?: string;
		pseudo?: string;
	};

	type VisualizerBar = {
		style: string;
	};

	type RecordingDraft = {
		id: string;
		audioBlob: Blob;
		audioUrl: string;
		audioMimeType: string;
		durationSeconds: number;
		imageBlob: Blob | null;
		imagePreview: string | null;
		recordingUrl: string;
		createdAt: string;
		error: string | null;
		isUploading: boolean;
		uploadProgress: number;
	};

	const MAX_DURATION = 180;
	const RECORDING_WARNING_OFFSETS = [15, 10, 5] as const;
	type RecordingWarningOffset = typeof RECORDING_WARNING_OFFSETS[number];
	const RECORDING_WARNING_SOUNDS: Record<RecordingWarningOffset, string> = {
		15: '/achievement1.mp3',
		10: '/achievement2.mp3',
		5: '/achievement3.mp3'
	};
	const RECORDINGS_LIMIT = 5;
	const VISUALIZER_BAR_COUNT = 8;
	const VISUALIZER_MIN_HEIGHT = 12;
	const VISUALIZER_MAX_HEIGHT = 82;
	const VISUALIZER_BASE_COLOR = '#8cd8c1';
	const VISUALIZER_WARM_COLOR = '#f1ca90';
	const VISUALIZER_HOT_COLOR = '#f0a56b';
	const VISUALIZER_WARM_THRESHOLD = 0.68;
	const VISUALIZER_HOT_THRESHOLD = 0.87;

	let isRecording = $state(false);
	let isPaused = $state(false);
	let isProcessing = $state(false); // Indique que l'enregistrement est en cours de finalisation
	let mediaRecorder: MediaRecorder | null = $state(null);
	let activeRecordingMimeType = '';
	let chunks: Blob[] = []; // Non-réactif : évite les problèmes de closure
	let recordingStopTimeout: ReturnType<typeof setTimeout> | null = null;
	let timer = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = $state(null);
	let error = $state<string | null>(null);
	let queueNotice = $state<string | null>(null);
	let isRestoringDrafts = $state(true);
	let isSending = $state(false);
	let sendAllProgress = $state<{ current: number; total: number; percent: number } | null>(null);
	let draftQueue = $state<RecordingDraft[]>([]);
	let selectedDraftId = $state<string | null>(null);
	let draftPersistenceReady = false;
	let draftPersistenceTimeout: ReturnType<typeof setTimeout> | null = null;
	let recorderSection: HTMLDivElement | null = null;

	// Recordings list state
	let userRecordings = $state<UserRecording[]>([]);
	let recordingsOffset = $state(0);
	let hasMoreRecordings = $state(true);
	let isLoadingRecordings = $state(false);
	let showRecordingsList = $state(true);

	// Delete modal state
	let showDeleteModal = $state(false);
	let recordingToDelete = $state<UserRecording | null>(null);
	let isDeleting = $state(false);

	let player = $state({ ...$playerStore });

	// Image viewer state
	let selectedImageUrl = $state<string | null>(null);

	// Mic permission state
	let micPermissionState = $state<'prompt' | 'granted' | 'denied' | 'unknown'>('prompt');
	let showMicPrompt = $state(false);

	// Wake Lock state
	let wakeLock: WakeLockSentinel | null = $state(null);
	let wakeLockSupported = $state(false);
	let wakeLockFailed = $state(false);

	// Recording stop flag to prevent recursive calls
	let isStopping = false;
	let warningAudios: Partial<Record<RecordingWarningOffset, HTMLAudioElement>> = {};
	let startAudio: HTMLAudioElement | null = null;
	let playedRecordingWarnings = new Set<number>();

	// Audio visualizer state
	let audioContext: globalThis.AudioContext | null = $state(null);
	let audioAnalyser: globalThis.AnalyserNode | null = $state(null);
	let visualizerData = $state<VisualizerBar[]>(createIdleVisualizerData());
	let animationFrameId: ReturnType<typeof window.requestAnimationFrame> | null = null;
	let selectedDraft = $derived(draftQueue.find((draft) => draft.id === selectedDraftId) ?? draftQueue.at(-1) ?? null);

	$effect(() => {
		const unsubscribe = playerStore.subscribe(state => {
			player = state;
		});
		return unsubscribe;
	});

	$effect(() => {
		if (draftQueue.length === 0) {
			selectedDraftId = null;
			return;
		}

		if (!selectedDraftId || !draftQueue.some((draft) => draft.id === selectedDraftId)) {
			selectedDraftId = draftQueue.at(-1)?.id ?? null;
		}
	});

	// Load recordings on mount
	onMount(() => {
		loadRecordings();
		checkMicPermission();
		checkWakeLockSupport();
		void restoreDraftQueue();

		const flushDrafts = () => {
			void persistDraftQueueNow();
		};
		window.addEventListener('pagehide', flushDrafts);
		window.addEventListener('beforeunload', flushDrafts);

		return () => {
			window.removeEventListener('pagehide', flushDrafts);
			window.removeEventListener('beforeunload', flushDrafts);
			void persistDraftQueueNow();
			for (const draft of draftQueue) {
				revokeDraftUrls(draft);
			}
		};
	});

	$effect(() => {
		if (!draftPersistenceReady) return;
		if (isSending) return;

		const persistedDrafts = getPersistedDrafts();

		if (draftPersistenceTimeout) {
			clearTimeout(draftPersistenceTimeout);
		}

		draftPersistenceTimeout = setTimeout(() => {
			void saveRecordingDraftQueue(persistedDrafts);
		}, 180);

		return () => {
			if (draftPersistenceTimeout) {
				clearTimeout(draftPersistenceTimeout);
				draftPersistenceTimeout = null;
			}
		};
	});

	beforeNavigate(() => {
		void persistDraftQueueNow();
	});

	function getPersistedDrafts(): StoredRecordingDraft[] {
		return draftQueue.map(({ audioUrl: _audioUrl, imagePreview: _imagePreview, error: _error, isUploading: _isUploading, uploadProgress: _uploadProgress, ...draft }) => draft);
	}

	async function persistDraftQueueNow() {
		if (!draftPersistenceReady || isSending) return;

		if (draftPersistenceTimeout) {
			clearTimeout(draftPersistenceTimeout);
			draftPersistenceTimeout = null;
		}

		await saveRecordingDraftQueue(getPersistedDrafts());
	}

	function checkWakeLockSupport() {
		wakeLockSupported = 'wakeLock' in navigator && navigator.wakeLock !== null;
	}

	async function acquireWakeLock() {
		if (!wakeLockSupported || wakeLock) return;

		try {
			wakeLock = await navigator.wakeLock.request('screen');
			wakeLockFailed = false;
			debug.wakeLock.log('Acquis avec succès');

			wakeLock.addEventListener('release', () => {
				debug.wakeLock.log('Libéré par le système');
				wakeLock = null;
			});
		} catch (err) {
			debug.wakeLock.error('Échec:', err);
			wakeLockFailed = true;
			wakeLock = null;
		}
	}

	async function releaseWakeLock() {
		if (wakeLock) {
			await wakeLock.release();
			wakeLock = null;
		}
	}

	function handleVisibilityChange() {
		logMic(`Visibility -> ${document.visibilityState}`);
		if (document.visibilityState === 'visible' && isRecording && wakeLockSupported) {
			acquireWakeLock();
		}
	}

	function logMic(message: string) {
		if (!get(logsEnabled)) return;

		const timestamp = new Date().toLocaleTimeString();
		debugLogs.update((logs) => [...logs, `[${timestamp}] 🎙️ ${message}`].slice(-30));
	}

	async function reportMicError(message: string, extra: Record<string, unknown> = {}) {
		try {
			await fetch('/api/debug', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message,
					context: {
						url: window.location.href,
						userAgent: navigator.userAgent,
						timestamp: new Date().toISOString(),
						standalone: window.matchMedia('(display-mode: standalone)').matches,
						visibilityState: document.visibilityState,
						micPermissionState,
						...extra
					}
				})
			});
		} catch (err) {
			debug.recording.error('Impossible de remonter le log micro', err);
		}
	}

	async function checkMicPermission() {
		const standalone = window.matchMedia('(display-mode: standalone)').matches;
		logMic(`Vérification micro (standalone=${standalone ? 'oui' : 'non'}, secure=${window.isSecureContext ? 'oui' : 'non'})`);

		if (!navigator.permissions || !navigator.permissions.query) {
			micPermissionState = 'unknown';
			logMic('Permissions API indisponible');
			return;
		}
		
		try {
			const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			micPermissionState = result.state;
			showMicPrompt = result.state === 'prompt';
			logMic(`Permissions API -> ${result.state}`);
			
			result.addEventListener('change', () => {
				micPermissionState = result.state;
				showMicPrompt = result.state === 'prompt';
				logMic(`Permission micro modifiée -> ${result.state}`);
			});
		} catch (err) {
			micPermissionState = 'unknown';
			logMic(`Erreur Permissions API: ${err instanceof Error ? err.name : 'unknown'}`);
		}
	}

	async function requestMicAccess() {
		try {
			logMic('Demande explicite d’accès micro');
			await navigator.mediaDevices.getUserMedia({ audio: true });
			micPermissionState = 'granted';
			showMicPrompt = false;
			logMic('Accès micro accordé');
		} catch (err) {
			console.error('Mic access denied:', err);
			micPermissionState = 'denied';
			const errorName = err instanceof Error ? err.name : 'UnknownError';
			const errorMessage = err instanceof Error ? err.message : String(err);
			logMic(`Accès micro refusé (${errorName})`);
			await reportMicError('Mic access denied', { errorName, errorMessage });
		}
	}

	async function loadRecordings() {
		if (isLoadingRecordings) return;
		isLoadingRecordings = true;
		
		try {
			const res = await fetch(`/api/recordings/mine?limit=${RECORDINGS_LIMIT}&offset=${recordingsOffset}`);
			const data = await res.json();
			
			if (recordingsOffset === 0) {
				userRecordings = data.recordings || [];
			} else {
				userRecordings = [...userRecordings, ...(data.recordings || [])];
			}
			hasMoreRecordings = data.hasMore || false;
		} catch (e) {
			console.error('Failed to load recordings:', e);
		} finally {
			isLoadingRecordings = false;
		}
	}

	async function loadMoreRecordings() {
		recordingsOffset += RECORDINGS_LIMIT;
		await loadRecordings();
	}

	async function deleteRecording() {
		if (!recordingToDelete) return;
		
		isDeleting = true;
		try {
			const res = await fetch(`/api/recordings/${recordingToDelete.id}`, { method: 'DELETE' });
			if (res.ok) {
				// Remove from list
				userRecordings = userRecordings.filter(r => r.id !== recordingToDelete!.id);
				// Reload to get proper count
				recordingsOffset = 0;
				await loadRecordings();
			}
		} catch (e) {
			console.error('Failed to delete recording:', e);
		} finally {
			isDeleting = false;
			showDeleteModal = false;
			recordingToDelete = null;
		}
	}

	function confirmDelete(recording: UserRecording) {
		recordingToDelete = recording;
		showDeleteModal = true;
	}

	function cancelDelete() {
		showDeleteModal = false;
		recordingToDelete = null;
	}

	function formatDate(dateStr: string): string {
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	function formatTime(dateStr: string): string {
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
	}

	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getAudioFilename(mimeType: string) {
		if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'recording.m4a';
		if (mimeType.includes('ogg')) return 'recording.ogg';
		if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'recording.mp3';
		return 'recording.webm';
	}

	function getImageFilename(blob: Blob) {
		if (blob.type.includes('png')) return 'image.png';
		if (blob.type.includes('webp')) return 'image.webp';
		if (blob.type.includes('heic') || blob.type.includes('heif')) return 'image.heic';
		return 'image.jpg';
	}

	function createDraftId() {
		if (typeof globalThis.crypto !== 'undefined' && 'randomUUID' in globalThis.crypto) {
			return globalThis.crypto.randomUUID();
		}
		return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
	}

	function createDraftFromStored(draft: StoredRecordingDraft): RecordingDraft {
		return {
			...draft,
			audioUrl: URL.createObjectURL(draft.audioBlob),
			imagePreview: draft.imageBlob ? URL.createObjectURL(draft.imageBlob) : null,
			error: null,
			isUploading: false,
			uploadProgress: 0
		};
	}

	function revokeDraftUrls(draft: RecordingDraft) {
		URL.revokeObjectURL(draft.audioUrl);
		if (draft.imagePreview) {
			URL.revokeObjectURL(draft.imagePreview);
		}
	}

	function updateDraft(id: string, updater: (draft: RecordingDraft) => RecordingDraft) {
		draftQueue = draftQueue.map((draft) => (draft.id === id ? updater(draft) : draft));
	}

	function setDraftImage(id: string, blob: Blob | null, preview: string | null) {
		draftQueue = draftQueue.map((draft) => {
			if (draft.id !== id) return draft;
			if (draft.imagePreview && draft.imagePreview !== preview) {
				URL.revokeObjectURL(draft.imagePreview);
			}
			return {
				...draft,
				imageBlob: blob,
				imagePreview: preview,
				error: null
			};
		});
	}

	function updateDraftUrl(id: string, value: string) {
		draftQueue = draftQueue.map((draft) => (draft.id === id ? { ...draft, recordingUrl: value, error: null } : draft));
	}

	function selectDraft(id: string) {
		selectedDraftId = id;
	}

	function scrollToRecorder() {
		recorderSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	async function handleAddDraftClick() {
		if (isRecording || isProcessing || isSending) return;

		await startRecording();
	}

	function removeDraft(id: string) {
		const draft = draftQueue.find((item) => item.id === id);
		if (draft) {
			revokeDraftUrls(draft);
		}
		draftQueue = draftQueue.filter((item) => item.id !== id);
	}

	async function restoreDraftQueue() {
		try {
			const storedDrafts = await loadRecordingDraftQueue();
			draftQueue = storedDrafts.map(createDraftFromStored);
			queueNotice = null;
		} catch (err) {
			debug.recording.error('Impossible de restaurer les brouillons locaux:', err);
			queueNotice = 'Impossible de restaurer les brouillons locaux sur cet appareil.';
		} finally {
			isRestoringDrafts = false;
			draftPersistenceReady = true;
		}
	}

	function createIdleVisualizerData(): VisualizerBar[] {
		return Array.from({ length: VISUALIZER_BAR_COUNT }, () => ({
			style: buildVisualizerBarStyle(0.12)
		}));
	}

	function buildVisualizerBarStyle(intensity: number): string {
		const clamped = Math.max(0.12, Math.min(intensity, 0.92));
		const height = Math.round(VISUALIZER_MIN_HEIGHT + clamped * (VISUALIZER_MAX_HEIGHT - VISUALIZER_MIN_HEIGHT));
		const opacity = (0.72 + clamped * 0.24).toFixed(3);
		let background = VISUALIZER_BASE_COLOR;
		const haloStrength = Math.max(0, (clamped - 0.62) / 0.3);
		const haloSpread = (haloStrength * 22).toFixed(1);
		const haloBlur = (haloStrength * 32).toFixed(1);
		const haloOpacity = (haloStrength * 0.3).toFixed(3);
		const innerGlowBlur = (haloStrength * 13).toFixed(1);
		const innerGlowOpacity = (haloStrength * 0.22).toFixed(3);

		if (clamped >= VISUALIZER_HOT_THRESHOLD) {
			background = `linear-gradient(180deg, ${VISUALIZER_HOT_COLOR} 0%, ${VISUALIZER_HOT_COLOR} 12%, ${VISUALIZER_WARM_COLOR} 12%, ${VISUALIZER_WARM_COLOR} 30%, ${VISUALIZER_BASE_COLOR} 30%, ${VISUALIZER_BASE_COLOR} 100%)`;
		} else if (clamped >= VISUALIZER_WARM_THRESHOLD) {
			background = `linear-gradient(180deg, ${VISUALIZER_WARM_COLOR} 0%, ${VISUALIZER_WARM_COLOR} 18%, ${VISUALIZER_BASE_COLOR} 18%, ${VISUALIZER_BASE_COLOR} 100%)`;
		}

		return [
			`height: ${height}px`,
			`opacity: ${opacity}`,
			`background: ${background}`,
			`box-shadow:
				0 0 ${haloBlur}px rgba(240, 165, 107, ${haloOpacity}),
				0 0 ${haloSpread}px rgba(140, 216, 193, ${innerGlowOpacity}),
				0 0 ${innerGlowBlur}px rgba(255, 255, 255, ${innerGlowOpacity}),
				0 10px 20px rgba(0, 0, 0, 0.16)`
		].join('; ');
	}

	function getWaveformRms(timeDomainData: Uint8Array): number {
		let sum = 0;
		for (let i = 0; i < timeDomainData.length; i++) {
			const normalized = (timeDomainData[i] - 128) / 128;
			sum += normalized * normalized;
		}
		return Math.sqrt(sum / timeDomainData.length);
	}

	function buildVisualizerBars(
		frequencyData: Uint8Array,
		timeDomainData: Uint8Array,
		sampleRate: number
	): VisualizerBar[] {
		const nyquist = sampleRate / 2;
		const ranges: [number, number][] = [
			[40, 110],
			[110, 220],
			[220, 420],
			[420, 780],
			[780, 1400],
			[1400, 2600],
			[2600, 4200],
			[4200, 7200]
		];
		const rms = getWaveformRms(timeDomainData);
		const globalLift = Math.min(0.26, rms * 1.35);

		return ranges.map(([low, high], index) => {
			const start = Math.max(0, Math.floor((low / nyquist) * frequencyData.length));
			const end = Math.min(frequencyData.length - 1, Math.ceil((high / nyquist) * frequencyData.length));
			let sum = 0;
			let count = 0;

			for (let i = start; i <= end; i++) {
				sum += frequencyData[i];
				count++;
			}

			const average = count > 0 ? sum / count : 0;
			const normalized = average / 255;
			const emphasis = 1 + Math.max(0, 3 - index) * 0.08;
			const redistributed = normalized * emphasis + globalLift * Math.max(0.24, 0.56 - index * 0.04);
			const floor = Math.min(0.22, 0.08 + rms * (0.55 - index * 0.04));
			return { style: buildVisualizerBarStyle(Math.max(redistributed, floor)) };
		});
	}

	function startTimer() {
		if (timerInterval) clearInterval(timerInterval);
		timerInterval = setInterval(() => {
			timer++;
			maybePlayRecordingWarning();
			if (timer >= getRecordingDurationLimit() && !isStopping) {
				isStopping = true;
				stopRecording();
			}
		}, 1000);
	}

	function stopTimer() {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function getRecordingDurationLimit() {
		return MAX_DURATION;
	}

	function maybePlayRecordingWarning() {
		const remainingSeconds = Math.max(0, getRecordingDurationLimit() - timer);
		const warningOffset = RECORDING_WARNING_OFFSETS.find(
			(offset) => remainingSeconds === offset && !playedRecordingWarnings.has(offset)
		);

		if (!warningOffset) return;

		playedRecordingWarnings.add(warningOffset);
		playRecordingWarningSound(warningOffset);
	}

	function playRecordingWarningSound(offset: RecordingWarningOffset) {
		const warningAudio = ensureWarningAudio(offset);

		warningAudio.currentTime = 0;
		void warningAudio.play().catch((err) => {
			debug.recording.error('Impossible de jouer le son d’avertissement:', err);
		});
	}

	function ensureWarningAudio(offset: RecordingWarningOffset) {
		if (!warningAudios[offset]) {
			warningAudios[offset] = new window.Audio(RECORDING_WARNING_SOUNDS[offset]);
			warningAudios[offset].preload = 'auto';
		}

		return warningAudios[offset];
	}

	function ensureStartAudio() {
		if (!startAudio) {
			startAudio = new window.Audio('/start.mp3');
			startAudio.preload = 'auto';
		}

		return startAudio;
	}

	function primeRecordingCueAudio() {
		const warnings = RECORDING_WARNING_OFFSETS.map((offset) => ensureWarningAudio(offset));
		for (const warning of warnings) {
			warning.load();
		}

		const start = ensureStartAudio();
		start.load();

		debug.recording.log('Recording cue audios preloaded');
	}

	function playRecordingStartSound() {
		const start = ensureStartAudio();
		start.currentTime = 0;

		void start.play().catch((err) => {
			debug.recording.error('Impossible de jouer le son de démarrage:', err);
		});
	}

	async function startRecording() {
		if (isRecording || isProcessing || (mediaRecorder && mediaRecorder.state !== 'inactive')) return;

		triggerHaptic('success');
		primeRecordingCueAudio();
		
		// Fermer le player s'il est ouvert
		closePlayer();
		
		// Réinitialiser le flag d'arrêt
		isStopping = false;
		
		// Activer le wake lock pour empêcher la veille pendant l'enregistrement
		acquireWakeLock();
		
		// Écouter les changements de visibilité pour réacquérir le wake lock
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		try {
			logMic('Démarrage enregistrement : getUserMedia');
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			logMic('getUserMedia OK');
			
			let mimeType = 'audio/mp4';
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = 'audio/webm;codecs=opus';
			}
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = 'audio/webm';
			}
			
			mediaRecorder = new MediaRecorder(stream, { mimeType });
			activeRecordingMimeType = mimeType;
			chunks.length = 0; // Vider sans changer la référence

			mediaRecorder.onstart = () => {
				debug.recording.log('MediaRecorder démarré');
				playRecordingStartSound();
			};

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunks.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				if (recordingStopTimeout) {
					clearTimeout(recordingStopTimeout);
					recordingStopTimeout = null;
				}

				debug.recording.log('MediaRecorder stopped - chunks:', chunks.length);
				const isMp4 = mimeType.startsWith('audio/mp4') || mimeType.startsWith('audio/x-m4a');
				const type = isMp4 ? 'audio/mp4' : 'audio/webm';
				
				if (chunks.length === 0) {
					debug.recording.error('Aucun chunk audio collecté');
					error = 'Erreur d\'enregistrement - veuillez réessayer';
				} else {
					const recordedBlob = new Blob(chunks, { type });
					addDraftToQueue(recordedBlob, type, timer);
				}
				
				stream.getTracks().forEach(track => track.stop());
				isRecording = false;
				isPaused = false;
				isProcessing = false;
				activeRecordingMimeType = '';
				mediaRecorder = null;
			};

			const shouldUseTimeslice = !mimeType.startsWith('audio/mp4') && !mimeType.startsWith('audio/x-m4a');
			if (shouldUseTimeslice) {
				mediaRecorder.start(1000);
				debug.recording.log('MediaRecorder start avec timeslice 1000ms');
			} else {
				mediaRecorder.start();
				debug.recording.log('MediaRecorder start sans timeslice pour préserver le conteneur MP4');
			}
			isRecording = true;
			isPaused = false;
			showRecordingsList = false;
			timer = 0;
			playedRecordingWarnings = new Set<number>();
			error = null;
			queueNotice = null;

			// Initialize audio visualizer
			try {
				audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
				if (audioContext.state === 'suspended') {
					await audioContext.resume();
				}
				audioAnalyser = audioContext.createAnalyser();
				audioAnalyser.fftSize = 256;
				audioAnalyser.smoothingTimeConstant = 0.72;
				
				const source = audioContext.createMediaStreamSource(stream);
				source.connect(audioAnalyser);
				
				startVisualizerAnimation();
			} catch (err) {
				debug.recording.error('Erreur initialisation visualiseur:', err);
			}
			
			startTimer();
		} catch (err) {
			error = 'Impossible d\'accéder au micro';
			const errorName = err instanceof Error ? err.name : 'UnknownError';
			const errorMessage = err instanceof Error ? err.message : String(err);
			logMic(`Échec démarrage enregistrement (${errorName})`);
			await reportMicError('Recording start failed', { errorName, errorMessage });
		}
	}

	function pauseRecording() {
		if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

		mediaRecorder.pause();
		isPaused = true;
		stopTimer();

		if (animationFrameId) {
			window.cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
	}

	async function resumeRecording() {
		if (!mediaRecorder || mediaRecorder.state !== 'paused') return;

		mediaRecorder.resume();
		isPaused = false;
		startTimer();

		if (audioContext?.state === 'suspended') {
			await audioContext.resume().catch(() => {});
		}
		startVisualizerAnimation();
	}

	function stopRecording() {
		debug.recording.log('stopRecording appelé - state:', mediaRecorder?.state, 'chunks:', chunks.length);
		isProcessing = true;
		playedRecordingWarnings = new Set<number>();
		
		releaseWakeLock();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
		stopTimer();
	
	if (mediaRecorder && mediaRecorder.state !== 'inactive') {
		if (mediaRecorder.state === 'paused') {
			mediaRecorder.resume();
		}

		const recorderMimeType = mediaRecorder.mimeType || activeRecordingMimeType;
		const isMp4Recording = recorderMimeType.startsWith('audio/mp4') || recorderMimeType.startsWith('audio/x-m4a');
		
		// Timeout de secours au cas où onstop ne serait pas appelé
		recordingStopTimeout = setTimeout(() => {
			debug.recording.log('Timeout de secours - forçage arrêt');
			if (mediaRecorder && mediaRecorder.state !== 'inactive') {
				try {
					mediaRecorder.stop();
				} catch {
					// Ignorer l'erreur si déjà arrêté
				}
			}
			// Forcer la réinitialisation si onstop n'a pas été appelé
			if (isRecording) {
				isRecording = false;
				isPaused = false;
				isStopping = false;
				isProcessing = false;
				if (chunks.length === 0) {
					error = 'Erreur d\'enregistrement - veuillez réessayer';
				}
			}
		}, 5000); // 5 secondes de timeout
		
		if (isMp4Recording) {
			debug.recording.log('stop() direct sans requestData pour préserver le conteneur MP4');
			mediaRecorder.stop();
		} else {
			mediaRecorder.requestData();
			debug.recording.log('requestData() appelé');
			setTimeout(() => {
				debug.recording.log('Timeout stop - state:', mediaRecorder?.state, 'chunks:', chunks.length);
				if (mediaRecorder && mediaRecorder.state !== 'inactive') {
					mediaRecorder.stop();
					debug.recording.log('stop() appelé');
				}
				if (recordingStopTimeout) {
					clearTimeout(recordingStopTimeout);
					recordingStopTimeout = null;
				}
			}, 300);
		}
	} else {
		// MediaRecorder déjà inactif ou inexistant
		debug.recording.log('MediaRecorder déjà inactif - réinitialisation forcée');
		isRecording = false;
		isPaused = false;
		isStopping = false;
		isProcessing = false;
		if (chunks.length === 0) {
			error = 'Erreur d\'enregistrement - veuillez réessayer';
		}
	}
	
	isStopping = false;
	
	// Stop audio visualizer
	if (animationFrameId) {
		window.cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
	if (audioContext) {
		audioContext.close().catch(() => {});
		audioContext = null;
	}
	audioAnalyser = null;
	visualizerData = createIdleVisualizerData();
}

	function startVisualizerAnimation() {
		if (!audioAnalyser) return;
		
		const frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
		const timeDomainData = new Uint8Array(audioAnalyser.fftSize);
		
		function updateVisualizer() {
			if (!audioAnalyser || !isRecording || isPaused) return;
			
			audioAnalyser.getByteFrequencyData(frequencyData);
			audioAnalyser.getByteTimeDomainData(timeDomainData);
			visualizerData = buildVisualizerBars(
				frequencyData,
				timeDomainData,
				audioContext?.sampleRate ?? 44100
			);
			animationFrameId = window.requestAnimationFrame(updateVisualizer);
		}
		
		updateVisualizer();
	}

	function addDraftToQueue(audioBlob: Blob, audioMimeType: string, durationSeconds: number) {
		const draft: RecordingDraft = {
			id: createDraftId(),
			audioBlob,
			audioUrl: URL.createObjectURL(audioBlob),
			audioMimeType,
			durationSeconds,
			imageBlob: null,
			imagePreview: null,
			recordingUrl: '',
			createdAt: new Date().toISOString(),
			error: null,
			isUploading: false,
			uploadProgress: 0
		};

		draftQueue = [...draftQueue, draft];
		selectedDraftId = draft.id;
		queueNotice = null;
		timer = 0;
		showRecordingsList = true;
		triggerHaptic('success');
		void loadRecordings();
	}

	function formatTimeSeconds(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function validateDraftUrl(value: string): string | null {
		if (!value.trim()) return null;

		try {
			const parsed = new URL(value.trim());
			if (parsed.protocol !== 'https:') {
				return 'L\'URL doit commencer par https://';
			}
		} catch {
			return 'URL invalide';
		}

		return null;
	}

	async function uploadDraft(draft: RecordingDraft, progress?: (percent: number) => void) {
		const urlErrorMessage = validateDraftUrl(draft.recordingUrl);
		if (urlErrorMessage) {
			throw new Error(urlErrorMessage);
		}

		const formData = new FormData();
		formData.append('audio', draft.audioBlob, getAudioFilename(draft.audioMimeType));
		formData.append('duration', draft.durationSeconds.toString());

		if (draft.imageBlob) {
			formData.append('image', draft.imageBlob, getImageFilename(draft.imageBlob));
		}

		if (draft.recordingUrl.trim()) {
			formData.append('url', draft.recordingUrl.trim());
		}

		return await new Promise<{ duplicate?: boolean; error?: string }>((resolve, reject) => {
			const xhr = new globalThis.XMLHttpRequest();
			xhr.open('POST', '/api/recordings');
			xhr.responseType = 'json';
			xhr.timeout = 60000;

			xhr.upload.onprogress = (event) => {
				if (!event.lengthComputable || !progress) return;
				progress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
			};

			xhr.onload = () => {
				const data = xhr.response && typeof xhr.response === 'object'
					? xhr.response
					: JSON.parse(xhr.responseText || '{}');

				if (xhr.status >= 200 && xhr.status < 300) {
					resolve(data);
					return;
				}

				reject(new Error(data?.error || 'Erreur lors de l\'envoi'));
			};

			xhr.onerror = () => reject(new Error('Erreur réseau lors de l\'envoi'));
			xhr.ontimeout = () => reject(new Error('Le serveur met trop de temps à répondre. Veuillez réessayer.'));
			xhr.onabort = () => reject(new Error('Envoi interrompu.'));
			xhr.send(formData);
		});
	}

	async function sendDraftById(id: string, queuePosition?: { current: number; total: number }) {
		const draft = draftQueue.find((item) => item.id === id);
		if (!draft) return false;

		updateDraft(id, (item) => ({ ...item, isUploading: true, uploadProgress: 0, error: null }));

		try {
			const response = await uploadDraft(draft, (percent) => {
				updateDraft(id, (item) => ({ ...item, uploadProgress: percent }));
				if (queuePosition) {
					sendAllProgress = { ...queuePosition, percent };
				}
			});

			if (response.duplicate) {
				queueNotice = 'Une capsule déjà existante a été retirée de la file locale.';
			}

			removeDraft(id);
			triggerHaptic('success');
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
			updateDraft(id, (item) => ({ ...item, isUploading: false, uploadProgress: 0, error: message }));
			sendErrorToServer('SEND_RECORDING_ERROR', {
				message,
				audioSize: draft.audioBlob.size,
				audioType: draft.audioMimeType,
				duration: draft.durationSeconds,
				url: window.location.href
			});
			return false;
		}
	}

	async function sendSingleDraft(id: string) {
		isSending = true;
		queueNotice = null;
		const succeeded = await sendDraftById(id);
		if (succeeded) {
			queueNotice = 'Capsule envoyée avec succès.';
			await loadRecordings();
		}
		isSending = false;
		sendAllProgress = null;
	}

	async function sendAllDrafts() {
		if (draftQueue.length === 0) return;

		isSending = true;
		queueNotice = null;
		const ids = draftQueue.map((draft) => draft.id);
		let successCount = 0;

		for (const [index, id] of ids.entries()) {
			const succeeded = await sendDraftById(id, {
				current: index + 1,
				total: ids.length
			});
			if (succeeded) successCount++;
		}

		if (successCount > 0) {
			queueNotice = successCount === ids.length
				? `${successCount} capsule${successCount > 1 ? 's ont' : ' a'} été envoyée${successCount > 1 ? 's' : ''}.`
				: `${successCount} capsule${successCount > 1 ? 's ont' : ' a'} été envoyée${successCount > 1 ? 's' : ''}. Les autres restent sauvegardées localement.`;
			await loadRecordings();
		}

		sendAllProgress = null;
		isSending = false;
	}

	async function clearDraftQueue() {
		for (const draft of draftQueue) {
			revokeDraftUrls(draft);
		}
		draftQueue = [];
		await clearRecordingDraftQueue();
		queueNotice = 'Les brouillons locaux ont été supprimés.';
	}

	async function sendErrorToServer(type: string, context: any) {
		try {
			await fetch('/api/debug', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: `${type}: ${context.message || 'Unknown error'}`,
					stack: context.stack || '',
					context
				})
			});
		} catch {
			// Silencieux - on ne veut pas d'erreur sur l'erreur
		}
	}

	async function playRecording(recording: UserRecording) {
		const audioElement = getAudioElement();
		
		const fakeDayData: DayRecordings = {
			date: recording.recorded_at.split('T')[0],
			recordings: [{
				id: recording.id,
				user_id: recording.user_id,
				filename: recording.filename,
				image_filename: recording.image_filename,
				url: recording.url || null,
				duration_seconds: recording.duration_seconds,
				recorded_at: recording.recorded_at,
				listened_by_user: 0,
				pseudo: recording.pseudo || 'Ma capsule',
				avatar: recording.avatar || ''
			}],
			available: true
		};

		playerStore.update(s => ({
			...s,
			isLoading: true,
			currentRecording: fakeDayData.recordings[0],
			currentDayData: fakeDayData,
			currentDay: fakeDayData.date,
			currentIndex: 0
		}));

		updateMediaSessionMetadata(fakeDayData.recordings[0]);

		audioElement.src = `/api/recordings/${recording.id}`;
		try {
			await audioElement.play();
			playerStore.update(s => ({ ...s, isPlaying: true, isLoading: false }));
		} catch (e) {
			console.error('Playback failed:', e);
			playerStore.update(s => ({ ...s, isPlaying: false, isLoading: false }));
		}
	}
</script>

<div class="container">
	<h1>Enregistrer</h1>

	<div class="recorder" bind:this={recorderSection}>
		{#if showMicPrompt && micPermissionState === 'prompt'}
			<div class="mic-prompt">
				<p class="mic-prompt-text">Pour enregistrer un message vocal, j'ai besoin d'accéder à votre microphone.</p>
				<button class="primary" onclick={requestMicAccess}>
					Autoriser le micro
				</button>
			</div>
		{:else if micPermissionState === 'denied'}
			<div class="mic-denied">
				<p>Accès au microphone refusé. Veuillez l'activer dans les paramètres de votre navigateur pour utiliser cette fonctionnalité.</p>
			</div>
		{:else}
			{#if isRecording && (wakeLock || wakeLockFailed)}
				<div class="wake-lock-badge">
					Laissez cet écran actif durant l'enregistrement
				</div>
			{/if}
			
			<div class="timer {isRecording ? 'recording' : ''} {isRecording && timer >= 160 ? 'warning' : ''}">
				{formatTimeSeconds(timer)} / 3:00
			</div>

			{#if isPaused}
				<p class="pause-notice">Enregistrement en pause. Vous pouvez le reprendre ou l’arrêter.</p>
			{/if}

			{#if error}
				<p class="error">{error}</p>
			{/if}

			{#if queueNotice}
				<p class="queue-notice">{queueNotice}</p>
			{/if}

			{#if isProcessing}
				<div class="processing-indicator">
					<span class="processing-spinner"></span>
					<span>Ajout de la capsule aux brouillons...</span>
				</div>
			{:else if isRecording}
				<div class="recording-actions">
					{#if isPaused}
						<button class="resume" onclick={resumeRecording}>Reprendre</button>
					{:else}
						<button class="pause" onclick={pauseRecording}>Mettre en pause</button>
					{/if}
					<button class="stop" onclick={stopRecording}>Terminer</button>
				</div>

				<div class="audio-visualizer">
					{#each visualizerData as bar}
						<div class="visualizer-bar" style={bar.style}></div>
					{/each}
				</div>
			{:else}
				<button class="record" onclick={startRecording}>Enregistrer</button>
			{/if}
		{/if}
	</div>

	{#if isRestoringDrafts}
		<div class="drafts-loading">
			<span class="processing-spinner"></span>
			<span>Restauration des brouillons locaux…</span>
		</div>
	{:else if draftQueue.length > 0}
		<div class="drafts-section">
			<div class="drafts-header">
				<div class="drafts-header-actions">
					<button class="draft-action-btn draft-action-btn-primary send-all-btn" onclick={sendAllDrafts} disabled={isSending || draftQueue.length === 0}>
						<span class="send-all-content">
							<svg viewBox="3 4 19 19" aria-hidden="true" class="send-icon">
								<path d="M3.4 11.6 19.9 4.7c.9-.4 1.8.5 1.4 1.4l-6.9 16.5c-.4.9-1.7 1-2.1.1l-2.2-5.2-5.2-2.2c-.9-.4-.8-1.7.1-2.1Z"></path>
								<path d="M10.6 13.4 21 5"></path>
							</svg>
							<span class="send-all-label">{isSending ? 'Envoi en cours…' : 'Tout envoyer'}</span>
							<span class="send-all-spacer" aria-hidden="true"></span>
						</span>
					</button>
				</div>
			</div>

			{#if sendAllProgress}
				<div class="upload-progress-panel">
					<div class="upload-progress-meta">
						<span>Envoi {sendAllProgress.current}/{sendAllProgress.total}</span>
						<span>{sendAllProgress.percent}%</span>
					</div>
					<div class="progress-bar-container large">
						<div class="progress-bar-fill" style={`width: ${sendAllProgress.percent}%`}></div>
					</div>
				</div>
			{/if}

			<div class="draft-slider-layout">
				<div class="draft-slider-side" aria-label="Sélection des capsules prêtes à envoyer">
					<button class="mini-card add-card" type="button" onclick={handleAddDraftClick}>
						<span class="add-card-icon">＋</span>
						<span>Ajouter</span>
					</button>

					{#each draftQueue as draft, index (draft.id)}
						<button
							type="button"
							class="mini-card media-card"
							class:active={selectedDraft?.id === draft.id}
							onclick={() => selectDraft(draft.id)}
						>
							<div class="card-index">Capsule {index + 1}</div>
							<div class="thumb" class:no-media={!draft.imagePreview}>
								{#if draft.imagePreview}
									<img src={draft.imagePreview} alt="" />
								{:else}
									<span>🎙️</span>
								{/if}
							</div>
							<div class="card-duration">{formatDuration(draft.durationSeconds)}</div>
							{#if draft.recordingUrl.trim()}
								<div class="link-badge">Lien</div>
							{/if}
						</button>
					{/each}

					<button class="mini-card delete-all-card" type="button" onclick={clearDraftQueue} disabled={isSending}>
						<svg viewBox="0 0 24 24" aria-hidden="true" class="trash-icon">
							<path d="M9 4.5h6"></path>
							<path d="M5.5 7.5h13"></path>
							<path d="m8 7.5.8 10.2a1.7 1.7 0 0 0 1.7 1.6h3a1.7 1.7 0 0 0 1.7-1.6L16 7.5"></path>
							<path d="M10 10.5v5.3"></path>
							<path d="M14 10.5v5.3"></path>
						</svg>
						Tout supprimer
					</button>
				</div>

				{#if selectedDraft}
					<div class="draft-slider-main" class:uploading={selectedDraft.isUploading}>
						<audio controls preload="auto" src={selectedDraft.audioUrl}></audio>

						{#key selectedDraft.id}
							<ImageUpload
								initialPreview={selectedDraft.imagePreview}
								onImageChange={(blob, preview) => setDraftImage(selectedDraft.id, blob, preview)}
								onWarning={(warning) => updateDraft(selectedDraft.id, (item) => ({ ...item, error: warning }))}
							/>
						{/key}

						<input
							type="url"
							class="url-input"
							placeholder="Lien URL pour cette capsule (https://...)"
							value={selectedDraft.recordingUrl}
							oninput={(event) => updateDraftUrl(selectedDraft.id, (event.currentTarget as HTMLInputElement).value)}
						/>

						{#if selectedDraft.error}
							<p class="error draft-error">{selectedDraft.error}</p>
						{/if}

						{#if selectedDraft.isUploading}
							<div class="upload-progress-panel compact">
								<div class="upload-progress-meta">
									<span>Envoi en cours</span>
									<span>{selectedDraft.uploadProgress}%</span>
								</div>
								<div class="progress-bar-container">
									<div class="progress-bar-fill" style={`width: ${selectedDraft.uploadProgress}%`}></div>
								</div>
							</div>
						{/if}

						<div class="draft-card-actions">
							<button class="draft-action-btn draft-action-btn-secondary" onclick={() => removeDraft(selectedDraft.id)} disabled={isSending || selectedDraft.isUploading}>
								Supprimer
							</button>
							<button class="draft-action-btn draft-action-btn-primary" onclick={() => sendSingleDraft(selectedDraft.id)} disabled={isSending || selectedDraft.isUploading}>
								{selectedDraft.isUploading ? 'Envoi…' : 'Envoyer'}
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Recordings List -->
{#if showRecordingsList && userRecordings.length > 0}
	<div class="recordings-section">
		<h2>Mes enregistrements</h2>
		<div class="recordings-list">
			{#each userRecordings as recording}
				{@const isCurrentlyPlaying = player.currentRecording?.id === recording.id && player.isPlaying}
				<div class="recording-item">
					{#if recording.image_filename}
						<button 
							class="recording-thumb" 
							onclick={() => selectedImageUrl = `/uploads/${recording.image_filename}`}
							aria-label="Voir l'image"
						>
							<img src="/uploads/{recording.image_filename}" alt="" />
						</button>
					{:else}
						<div class="recording-thumb recording-thumb-empty">🎙️</div>
					{/if}
				<div class="recording-info">
					<span class="recording-date">{formatDate(recording.recorded_at)} ({formatTime(recording.recorded_at)})</span>
					<span class="recording-duration">{formatDuration(recording.duration_seconds)}</span>
				</div>
					<div class="recording-item-actions">
						{#if recording.url}
							<a 
								href={recording.url}
								target="_blank"
								rel="noopener noreferrer"
								class="url-btn"
								aria-label="Ouvrir le lien"
							>
								🔗
							</a>
						{:else}
							<span class="url-placeholder"></span>
						{/if}
						<button 
							class="listen-btn" 
							onclick={() => playRecording(recording)}
							aria-label="Écouter"
						>
							{isCurrentlyPlaying ? '⏸️' : '▶️'}
						</button>
						<button class="delete-btn" onclick={() => confirmDelete(recording)} aria-label="Supprimer">
							🗑️
						</button>
					</div>
				</div>
			{/each}
		</div>
		
		{#if hasMoreRecordings}
			<button class="btn" onclick={loadMoreRecordings} disabled={isLoadingRecordings}>
				{isLoadingRecordings ? 'Chargement...' : 'Charger plus'}
			</button>
		{/if}
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteModal}
	<div
		class="modal-overlay"
		use:scrollLock={showDeleteModal}
		onclick={cancelDelete}
		onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
		role="button"
		tabindex="0"
		aria-label="Fermer la modale"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && cancelDelete()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-modal-title"
			tabindex="-1"
		>
			<h3 id="delete-modal-title">Confirmer la suppression</h3>
			<p>Êtes-vous sûr de vouloir supprimer cet enregistrement ? Cette action est irréversible.</p>
			<div class="modal-actions">
				<button class="cancel-btn" onclick={cancelDelete}>Annuler</button>
				<button class="confirm-delete-btn" onclick={deleteRecording} disabled={isDeleting}>
					{isDeleting ? 'Suppression...' : 'Confirmer'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding-top: 2rem;
	}

	h1 {
		color: #e94560;
	}

	.recorder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	.audio-visualizer {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		gap: 6px;
		height: 116px;
		padding: 18px 10px 14px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
			linear-gradient(180deg, rgba(27, 31, 53, 0.82), rgba(18, 22, 38, 0.86));
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 18px;
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.04),
			0 10px 24px rgba(0, 0, 0, 0.12);
		margin-top: 1rem;
		width: 100%;
		max-width: 320px;
		position: relative;
		overflow: hidden;
	}

	.audio-visualizer::before {
		content: '';
		position: absolute;
		inset: -24% 18% auto;
		height: 48px;
		border-radius: 999px;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.05), transparent 72%);
		opacity: 0.45;
		pointer-events: none;
	}

	.audio-visualizer::after {
		content: '';
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: 16px;
		height: 1px;
		border-radius: 999px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
	}

	.visualizer-bar {
		flex: 1;
		min-width: 14px;
		max-width: 20px;
		height: 12px;
		border-radius: 999px;
		background: #8cd8c1;
		transition:
			height 0.07s ease-out,
			opacity 0.09s ease-out,
			box-shadow 0.12s ease-out;
	}

	.timer {
		font-size: 3rem;
		font-weight: bold;
		color: #888;
		font-variant-numeric: tabular-nums;
	}

	.timer.recording {
		color: #e94560;
		animation: pulse 1s infinite;
	}

	.timer.warning {
		color: #ff69b4;
		animation: flash-pink-white 0.5s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	@keyframes flash-pink-white {
		0%, 100% { color: #ff69b4; }
		50% { color: #fff; }
	}

	.error {
		color: #ff6b6b;
		text-align: center;
	}

	button {
		padding: 1rem 2rem;
		font-size: 1.25rem;
		border-radius: 50px;
	}

	button.record {
		background: #e94560;
	}

	button.stop {
		background: #ff6b6b;
	}

	button.pause,
	button.resume {
		background: #2a2a4e;
	}

	.processing-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		color: #fff;
		font-size: 1rem;
	}

	.processing-spinner {
		display: inline-block;
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.pause-notice,
	.queue-notice {
		max-width: 420px;
		text-align: center;
		color: #a0a0c0;
		margin: 0;
	}

	.recording-actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.drafts-loading,
	.drafts-section {
		width: min(100%, 760px);
		box-sizing: border-box;
	}

	.drafts-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		color: #a0a0c0;
	}

	.drafts-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: #1f2140;
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 20px;
		padding: 1rem;
	}

	.drafts-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.drafts-header-actions,
	.draft-card-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.drafts-header-actions {
		width: 100%;
		justify-content: center;
	}

	.draft-card-actions {
		justify-content: center;
	}

	.draft-action-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		min-height: 52px;
		padding: 0.9rem 1.35rem;
		border-radius: 999px;
		font-size: 1rem;
		font-weight: 800;
		line-height: 1;
		letter-spacing: -0.01em;
		text-align: center;
		box-shadow: 0 12px 26px rgba(11, 11, 24, 0.2);
	}

	.draft-action-btn-primary {
		background: linear-gradient(135deg, #f05271, #ff667d);
		color: #fff;
	}

	.draft-action-btn-secondary {
		background: #2a2a4e;
		color: #fff4f6;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.send-all-btn {
		position: relative;
		min-width: 220px;
	}

	.send-all-content {
		display: inline-grid;
		grid-template-columns: 18px auto 12px;
		align-items: center;
		justify-content: center;
		column-gap: 0.65rem;
	}

	.send-all-label {
		display: inline-block;
		text-align: center;
	}

	.send-icon {
		width: 18px;
		height: 18px;
		display: block;
		flex-shrink: 0;
	}

	.send-all-spacer {
		display: block;
		width: 12px;
		height: 18px;
	}

	.send-icon path:first-child {
		fill: currentColor;
		opacity: 0.18;
	}

	.send-icon path:last-child {
		fill: none;
		stroke: currentColor;
		stroke-width: 2.1;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.draft-slider-layout {
		display: flex;
		flex-direction: column;
		gap: 0.95rem;
	}

	.draft-slider-side {
		display: flex;
		flex-direction: row;
		gap: 0.75rem;
		overflow-x: auto;
		padding-bottom: 0.3rem;
		scroll-snap-type: x proximity;
		-webkit-overflow-scrolling: touch;
	}

	.draft-slider-side::-webkit-scrollbar {
		height: 6px;
	}

	.draft-slider-side::-webkit-scrollbar-thumb {
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.14);
	}

	.draft-slider-main {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		background: #15162b;
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 18px;
		padding: 1rem;
	}

	.draft-slider-main.uploading {
		border-color: rgba(74, 222, 128, 0.4);
		box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.18);
	}

	.mini-card {
		min-width: 116px;
		flex: 0 0 116px;
		min-height: 138px;
		padding: 12px 8px 10px;
		border-radius: 18px;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.06);
		text-align: center;
		color: #d8d3e2;
		font-size: 0.8rem;
		line-height: 1.35;
		scroll-snap-align: start;
	}

	.mini-card.active {
		background: rgba(240, 82, 113, 0.16);
		color: white;
		border-color: rgba(240, 82, 113, 0.35);
	}

	.mini-card.media-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 8px;
	}

	.card-index {
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}

	.thumb {
		width: 54px;
		height: 54px;
		border-radius: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
		background:
			linear-gradient(135deg, rgba(240, 82, 113, 0.4), rgba(255, 160, 122, 0.32)),
			radial-gradient(circle at 30% 28%, rgba(255, 255, 255, 0.28), transparent 36%),
			#2f315c;
		border: 1px solid rgba(255, 255, 255, 0.14);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
		overflow: hidden;
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb.no-media {
		background: #292b4f;
		border-style: dashed;
		border-color: rgba(255, 255, 255, 0.12);
		box-shadow: none;
	}

	.card-duration {
		font-size: 0.84rem;
		font-weight: 800;
		color: inherit;
	}

	.link-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.28rem 0.6rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #fff4f6;
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.add-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.03);
		border-style: dashed;
		color: #d8d3e2;
	}

	.add-card-icon {
		font-size: 1.4rem;
		line-height: 1;
	}

	.delete-all-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.55rem;
		background: rgba(240, 82, 113, 0.08);
		border-style: solid;
		border-color: rgba(240, 82, 113, 0.2);
		color: #ffd7df;
		font-weight: 700;
		line-height: 1.2;
	}

	.trash-icon {
		width: 22px;
		height: 22px;
		display: block;
	}

	.trash-icon path {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.9;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.url-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #444;
		border-radius: 8px;
		background: #2a2a4e;
		color: #ccc;
		font-size: 0.9rem;
	}

	.url-input::placeholder {
		color: #666;
	}

	.mic-prompt {
		text-align: center;
		padding: 2rem;
	}

	.mic-prompt-text {
		color: #a0a0c0;
		margin-bottom: 1.5rem;
		font-size: 1.1rem;
	}

	.mic-denied {
		text-align: center;
		padding: 2rem;
		background: rgba(233, 69, 96, 0.1);
		border-radius: 12px;
		margin: 1rem;
	}

	.mic-denied p {
		color: #e94560;
		font-size: 0.95rem;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.upload-progress-panel {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.85rem 1rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
	}

	.upload-progress-panel.compact {
		padding: 0.65rem 0.8rem;
	}

	.upload-progress-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: #fff4f6;
		font-size: 0.9rem;
	}

	.progress-bar-container {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 999px;
		overflow: hidden;
	}

	.progress-bar-container.large {
		height: 10px;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 999px;
		transition: width 0.2s ease;
	}

	/* Fix curseur audio */
	audio {
		width: 100%;
		display: block;
		min-height: 40px;
	}
	
	audio::-webkit-media-controls-enclosure {
		width: 100%;
		max-width: none;
	}
	
	audio::-webkit-media-controls-panel {
		display: flex;
		align-items: center;
	}
	
	audio::-webkit-media-controls-timeline-container {
		flex: 1;
		display: flex;
		align-items: center;
	}
	
	audio::-webkit-media-controls-timeline {
		flex: 1;
		min-width: 0;
	}
	
	audio::-webkit-media-controls-current-time-display,
	audio::-webkit-media-controls-time-remaining-display {
		min-width: fit-content;
	}

	/* Firefox - support limité mais on s'assure que l'audio prend toute la largeur */
	@-moz-document url-prefix() {
		audio {
			width: 100%;
			min-width: 300px;
		}
	}

	@keyframes pulse-scale {
		0%, 100% { transform: scale(1); opacity: 1; }
		50% { transform: scale(1.3); opacity: 0.7; }
	}

	/* Recordings List */
	.recordings-section {
		width: 100%;
		max-width: 400px;
		margin: 2rem auto 0;
		padding: 1rem;
		box-sizing: border-box;
	}

	.recordings-section h2 {
		font-size: 1.2rem;
		color: #e94560;
		margin-bottom: 1rem;
		text-align: center;
	}

	.recordings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recording-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #1a1a2e;
		border-radius: 12px;
	}

	.recording-thumb {
		width: 45px;
		height: 60px;
		object-fit: cover;
		border-radius: 8px;
		flex-shrink: 0;
		border: none;
		padding: 0;
		background: transparent;
	}

	.recording-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 8px;
	}

	.recording-thumb-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #2a2a4e;
		font-size: 1.5rem;
	}

	.recording-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.recording-date {
		color: #fff;
		font-size: 0.95rem;
	}

	.recording-duration {
		color: #888;
		font-size: 0.85rem;
	}

	.recording-item-actions {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.url-placeholder {
		width: 1.25rem;
		height: 1.25rem;
		margin: 0.5rem;
	}

	.listen-btn {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.5rem;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.listen-btn:hover {
		opacity: 1;
	}

	.delete-btn {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.5rem;
		opacity: 0.7;
		transition: opacity 0.2s;
	}

	.delete-btn:hover {
		opacity: 1;
	}

	.url-btn {
		background: transparent;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.5rem;
		opacity: 0.7;
		transition: opacity 0.2s;
		text-decoration: none;
	}

	.url-btn:hover {
		opacity: 1;
	}

	.btn {
		display: block;
		width: 100%;
		margin-top: 1rem;
		margin-bottom: 3rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		background: #e94560;
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}

	/* Delete Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal {
		background: #1a1a2e;
		padding: 1.5rem;
		border-radius: 16px;
		max-width: 320px;
		width: 90%;
		text-align: center;
	}

	.modal h3 {
		color: #e94560;
		margin-bottom: 1rem;
	}

	.modal p {
		color: #aaa;
		margin-bottom: 1.5rem;
		font-size: 0.95rem;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.cancel-btn {
		padding: 0.75rem 1.5rem;
		background: #2a2a4e;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}

	.confirm-delete-btn {
		padding: 0.75rem 1.5rem;
		background: #e94560;
		color: #fff;
		border: none;
		border-radius: 8px;
		cursor: pointer;
	}

	.confirm-delete-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.wake-lock-badge {
		font-size: 0.875rem;
		color: #f97316;
		text-decoration: none;
		padding: 0.35rem 0.75rem;
		border-radius: 20px;
		background: rgba(249, 115, 22, 0.2);
		font-weight: 600;
		text-align: center;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 640px) {
		.container {
			padding-inline: 1rem;
		}

		.timer {
			font-size: 2.5rem;
		}

		.recording-actions,
		.drafts-header-actions,
		.draft-card-actions {
			width: 100%;
		}

		.recording-actions button,
		.drafts-header-actions button,
		.draft-card-actions button {
			width: 100%;
		}

		.drafts-header {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>

<ImageViewer 
	imageUrl={selectedImageUrl} 
	isOpen={selectedImageUrl !== null} 
	onClose={() => selectedImageUrl = null} 
/>
