<script lang="ts">
	import { onMount } from 'svelte';
	import { playerStore, getAudioElement, updateMediaSessionMetadata, closePlayer, type Recording, type DayRecordings } from '$lib/stores/player';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import ImageUpload from '$lib/components/ImageUpload.svelte';
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

	let isRecording = $state(false);
	let mediaRecorder: MediaRecorder | null = $state(null);
	let chunks: Blob[] = $state([]);
	let timer = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = $state(null);
	let audioUrl: string | null = $state(null);
	let recordedBlob: Blob | null = $state(null);
	let imageBlob: Blob | null = $state(null);
	let imagePreview: string | null = $state(null);
	let recordingUrl: string = $state('');
	let isSending = $state(false);
	let error = $state<string | null>(null);
	let urlError = $state<string | null>(null);
	let imageWarning = $state<string | null>(null);
	let success = $state(false);

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

	// Audio visualizer state
	let audioContext: AudioContext | null = $state(null);
	let audioAnalyser: AnalyserNode | null = $state(null);
	let visualizerData = $state<number[]>([5, 5, 5, 5, 5, 5, 5, 5]);
	let animationFrameId: number | null = null;

	$effect(() => {
		const unsubscribe = playerStore.subscribe(state => {
			player = state;
		});
		return unsubscribe;
	});

	const MAX_DURATION = 180;
	const RECORDINGS_LIMIT = 5;
	const RECORDINGS_LOAD_MORE = 10;

	// Load recordings on mount
	onMount(() => {
		loadRecordings();
		checkMicPermission();
		checkWakeLockSupport();
	});

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
		if (document.visibilityState === 'visible' && isRecording && wakeLockSupported) {
			acquireWakeLock();
		}
	}

	function canDisplayHeic(): boolean {
		const ua = navigator.userAgent;
		const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Edg');
		const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		return isSafari || isIOS;
	}

	async function checkMicPermission() {
		if (!navigator.permissions || !navigator.permissions.query) {
			micPermissionState = 'unknown';
			return;
		}
		
		try {
			const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			micPermissionState = result.state;
			showMicPrompt = result.state === 'prompt';
			
			result.addEventListener('change', () => {
				micPermissionState = result.state;
				showMicPrompt = result.state === 'prompt';
			});
		} catch {
			micPermissionState = 'unknown';
		}
	}

	async function requestMicAccess() {
		try {
			await navigator.mediaDevices.getUserMedia({ audio: true });
			micPermissionState = 'granted';
			showMicPrompt = false;
		} catch (err) {
			console.error('Mic access denied:', err);
			micPermissionState = 'denied';
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

	async function startRecording() {
		triggerHaptic('success');
		
		// Fermer le player s'il est ouvert
		closePlayer();
		
		// Réinitialiser le flag d'arrêt
		isStopping = false;
		
		// Activer le wake lock pour empêcher la veille pendant l'enregistrement
		acquireWakeLock();
		
		// Écouter les changements de visibilité pour réacquérir le wake lock
		document.addEventListener('visibilitychange', handleVisibilityChange);
		
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			let mimeType = 'audio/mp4';
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = 'audio/webm;codecs=opus';
			}
			if (!MediaRecorder.isTypeSupported(mimeType)) {
				mimeType = 'audio/webm';
			}
			
			mediaRecorder = new MediaRecorder(stream, { mimeType });
			chunks = [];

			mediaRecorder.onstart = () => {
				debug.recording.log('MediaRecorder démarré');
			};

			mediaRecorder.start(1000);
			isRecording = true;
			showRecordingsList = false;
			timer = 0;

			// Initialize audio visualizer
			try {
				audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
				audioAnalyser = audioContext.createAnalyser();
				audioAnalyser.fftSize = 64;
				audioAnalyser.smoothingTimeConstant = 0.85;
				
				const source = audioContext.createMediaStreamSource(stream);
				source.connect(audioAnalyser);
				
				startVisualizerAnimation();
			} catch (err) {
				debug.recording.error('Erreur initialisation visualiseur:', err);
			}
			
			timerInterval = setInterval(() => {
				timer++;
				if (timer >= MAX_DURATION && !isStopping) {
					isStopping = true;
					stopRecording();
				}
			}, 1000);

			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunks.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				debug.recording.log('MediaRecorder stopped - chunks:', chunks.length);
				const isMp4 = mimeType.startsWith('audio/mp4') || mimeType.startsWith('audio/x-m4a');
				const type = isMp4 ? 'audio/mp4' : 'audio/webm';
				
				if (chunks.length === 0) {
					debug.recording.error('Aucun chunk audio collecté');
					error = 'Erreur d\'enregistrement - veuillez réessayer';
					return;
				}
				
				recordedBlob = new Blob(chunks, { type });
				audioUrl = URL.createObjectURL(recordedBlob);
				stream.getTracks().forEach(track => track.stop());
			};
		} catch (e) {
			error = 'Impossible d\'accéder au micro';
		}
	}

	function stopRecording() {
		debug.recording.log('stopRecording appelé - state:', mediaRecorder?.state, 'chunks:', chunks.length);
		
		releaseWakeLock();
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
	isRecording = false;
	
	if (mediaRecorder && mediaRecorder.state !== 'inactive') {
		mediaRecorder.requestData();
		debug.recording.log('requestData() appelé');
		
		setTimeout(() => {
			debug.recording.log('Timeout stop - state:', mediaRecorder?.state, 'chunks:', chunks.length);
			if (mediaRecorder && mediaRecorder.state !== 'inactive') {
				mediaRecorder.stop();
				debug.recording.log('stop() appelé');
			}
		}, 300);
	}
	
	isStopping = false;
	
	// Stop audio visualizer
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
	if (audioContext) {
		audioContext.close().catch(() => {});
		audioContext = null;
	}
	audioAnalyser = null;
	visualizerData = [5, 5, 5, 5, 5, 5, 5, 5];
}

	function startVisualizerAnimation() {
		if (!audioAnalyser) return;
		
		const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
		
		function updateVisualizer() {
			if (!audioAnalyser || !isRecording) return;
			
			audioAnalyser.getByteFrequencyData(dataArray);
			
			// Divide into 8 frequency bands
			const bars: number[] = [];
			const step = Math.floor(dataArray.length / 8);
			
			for (let i = 0; i < 8; i++) {
				let sum = 0;
				for (let j = 0; j < step; j++) {
					sum += dataArray[i * step + j];
				}
				const average = sum / step;
				const height = Math.max(5, (average / 255) * 100);
				bars.push(height);
			}
			
			visualizerData = bars;
			animationFrameId = requestAnimationFrame(updateVisualizer);
		}
		
		updateVisualizer();
	}


	function reset() {
		audioUrl = null;
		recordedBlob = null;
		imageBlob = null;
		imagePreview = null;
		timer = 0;
		success = false;
		error = null;
		showRecordingsList = true;
		loadRecordings();
	}

	function stayOnPage() {
		recordedBlob = null;
		audioUrl = null;
		imageBlob = null;
		imagePreview = null;
		timer = 0;
		success = false;
		error = null;
		recordingUrl = '';
		isSending = false;
	}

	function formatTimeSeconds(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	async function sendRecording() {
		if (!recordedBlob) {
			debug.send.error('ERREUR: recordedBlob est null!');
			return;
		}
		
		debug.send.log('Début sendRecording - recordedBlob size:', recordedBlob.size, 'type:', recordedBlob.type, 'URL:', recordingUrl);
		
		isSending = true;
		error = null;
		urlError = null;
		
		if (recordingUrl.trim()) {
			try {
				const parsed = new URL(recordingUrl);
				debug.send.log('URL parsée:', parsed.protocol, parsed.hostname);
				if (parsed.protocol !== 'https:') {
					urlError = 'L\'URL doit commencer par https://';
					debug.send.log('Erreur URL: protocole non https');
					isSending = false;
					return;
				}
			} catch (err) {
				urlError = 'URL invalide';
				debug.send.log('Erreur URL:', err instanceof Error ? err.message : err);
				isSending = false;
				return;
			}
		}
		
		debug.send.log('Validation OK, envoi de la requête...');
		
		try {
			const formData = new FormData();
			formData.append('audio', recordedBlob, 'recording.m4a');
			formData.append('duration', timer.toString());
			
			if (imageBlob) {
				formData.append('image', imageBlob, 'image.jpg');
			}

			if (recordingUrl.trim()) {
				formData.append('url', recordingUrl.trim());
			}

			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				debug.send.log('Timeout déclenché après 60s');
				controller.abort();
			}, 60000);

			const res = await fetch('/api/recordings', {
				method: 'POST',
				body: formData,
				signal: controller.signal
			});
			
			clearTimeout(timeoutId);

			const data = await res.json();

			if (data.duplicate) {
				error = 'Enregistrement déjà existant (probablement identique dans les 30 dernières secondes)';
				isSending = false;
				return;
			}

			if (!res.ok) {
				const errorMessage = data.error || 'Erreur lors de l\'envoi';
				debug.send.error('Erreur serveur:', errorMessage);
				
				isSending = false;
				sendErrorToServer('SEND_RECORDING_ERROR', {
					message: errorMessage,
					audioSize: recordedBlob?.size,
					audioType: recordedBlob?.type,
					duration: timer,
					url: window.location.href
				});
				error = errorMessage;
				return;
			}

			success = true;
			triggerHaptic('success');
		} catch (err: unknown) {
			const isAbort = err instanceof Error && err.name === 'AbortError';
			const errorMessage = isAbort 
				? 'Le serveur met trop de temps à répondre. Veuillez réessayer.' 
				: 'Erreur lors de l\'envoi';
			debug.send.error('Erreur envoi:', err);
			
			sendErrorToServer('SEND_RECORDING_ERROR', {
				message: errorMessage,
				audioSize: recordedBlob?.size,
				audioType: recordedBlob?.type,
				duration: timer,
				url: window.location.href,
				isAbort
			});
			error = errorMessage;
		} finally {
			isSending = false;
		}
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
		} catch (e) {
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

	{#if success}
		<div class="success-container">
			<div class="success-icon">✓</div>
			<p class="success-title">Enregistrement envoyé !</p>
			<p class="success-question">Vous avez tout dit ou vous voulez compléter par un autre message ?</p>
			<div class="success-actions">
				<button class="primary" onclick={stayOnPage}>Enregistrer un autre</button>
				<button class="secondary" onclick={() => window.location.href = '/'}>Aller à l'accueil</button>
			</div>
		</div>
	{:else if audioUrl}
		<div class="preview">
		<ImageUpload
			onImageChange={(blob, preview) => { imageBlob = blob; imagePreview = preview; }}
			onWarning={(warning) => imageWarning = warning}
		/>
 			
 			<input 
 				type="url" 
 				class="url-input" 
 				placeholder="Lien URL (https://...)" 
 				bind:value={recordingUrl}
 				onfocus={() => urlError = null}
 			/>
 			{#if urlError}
 				<p class="url-error">{urlError}</p>
 			{/if}
			
			<div class="audio-preview">
			<audio controls preload="auto" src={audioUrl}></audio>
		</div>
		<p class="duration">Durée: {formatTimeSeconds(timer)}</p>
			
			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="actions">
				<button class="secondary" onclick={reset} disabled={isSending}>Recommencer</button>
				<button onclick={sendRecording} disabled={isSending || urlError !== null}>
					{isSending ? 'Envoi...' : 'Envoyer'}
				</button>
			</div>
		</div>
	{:else}
		<div class="recorder">
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

				{#if error}
					<p class="error">{error}</p>
				{/if}

				{#if isRecording}
					<button class="stop" onclick={stopRecording}>Arrêter</button>

					<!-- Audio Visualizer -->
					<div class="audio-visualizer">
						{#each visualizerData as height, i}
						<div
							class="visualizer-bar"
							style="height: {height}%"
						></div>
						{/each}
					</div>
				{:else}
					<button class="record" onclick={startRecording}>Commencer l'enregistrement</button>
				{/if}
			{/if}
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
					<div class="recording-actions">
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
		gap: 2px;
		height: 150px;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 8px;
		margin-top: 1rem;
		width: 100%;
		max-width: 300px;
	}

	.visualizer-bar {
		flex: 1;
		min-width: 8px;
		max-width: 30px;
		border-radius: 2px 2px 0 0;
		background: linear-gradient(to top,
			#22c55e 0%,
			#22c55e 60%,
			#eab308 60%,
			#eab308 85%,
			#ef4444 85%,
			#ef4444 100%
		);
		transition: height 0.05s ease-out;
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

	.url-error {
		color: #ff6b6b;
		font-size: 0.85rem;
		margin-top: -0.5rem;
		margin-bottom: 0.5rem;
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

	.preview {
		width: 100%;
		min-width: 320px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		gap: 1rem;
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

	.duration {
		text-align: center;
		color: #888;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.secondary {
		background: #2a2a4e;
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

	.actions button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 3rem 1rem;
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

	.success-icon {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		background: linear-gradient(135deg, #4ade80, #22c55e);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2.5rem;
		color: white;
		box-shadow: 0 8px 32px rgba(74, 222, 128, 0.3);
	}

	.success-title {
		color: #4ade80;
		font-size: 1.75rem;
		font-weight: 600;
		margin: 0;
	}

	.success-question {
		color: #a0a0c0;
		font-size: 1.1rem;
		margin: 0;
		max-width: 400px;
	}

	.success-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 1rem;
	}

	.success-actions button {
		min-width: 200px;
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

	.recording-actions {
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
</style>

<ImageViewer 
	imageUrl={selectedImageUrl} 
	isOpen={selectedImageUrl !== null} 
	onClose={() => selectedImageUrl = null} 
/>
