<script lang="ts">
	import imageCompression from 'browser-image-compression';
	import { onMount } from 'svelte';
	import { playerStore, getAudioElement, updateMediaSessionMetadata, type Recording, type DayRecordings } from '$lib/stores/player';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { triggerHaptic } from '$lib/utils/haptics';
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
	let isCompressingImage = $state(false);
	let compressionProgress = $state(0);
	let error = $state<string | null>(null);
	let success = $state(false);
	let isDragging = $state(false);

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
	});

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
		recordingsOffset += RECORDINGS_LOAD_MORE;
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
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	async function startRecording() {
		triggerHaptic('success');
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
				console.log('MediaRecorder démarré');
			};

			mediaRecorder.start(1000);
			isRecording = true;
			showRecordingsList = false;
			timer = 0;
			
			timerInterval = setInterval(() => {
				timer++;
				if (timer >= MAX_DURATION) {
					stopRecording();
				}
			}, 1000);

			// Collecter les chunks
			mediaRecorder.ondataavailable = (e) => {
				if (e.data.size > 0) {
					chunks.push(e.data);
				}
			};

			mediaRecorder.onstop = () => {
				console.log('MediaRecorder stopped - chunks:', chunks.length);
				const isMp4 = mimeType.startsWith('audio/mp4') || mimeType.startsWith('audio/x-m4a');
				const type = isMp4 ? 'audio/mp4' : 'audio/webm';
				
				if (chunks.length === 0) {
					console.error('Aucun chunk audio collecté');
					error = 'Erreur d\'enregistrement - veuillez réessayer';
					return;
				}
				
				console.log('Chunks collectés:', chunks.length, 'Taille totale:', chunks.reduce((acc, chunk) => acc + chunk.size, 0));
				
				recordedBlob = new Blob(chunks, { type });
				audioUrl = URL.createObjectURL(recordedBlob);
				stream.getTracks().forEach(track => track.stop());
			};
		} catch (e) {
			error = 'Impossible d\'accéder au micro';
		}
	}

function stopRecording() {
	console.log('stopRecording appelé - state:', mediaRecorder?.state, 'chunks:', chunks.length);
	
	if (timerInterval) {
		clearInterval(timerInterval);
		timerInterval = null;
	}
	isRecording = false;
	
	if (mediaRecorder && mediaRecorder.state !== 'inactive') {
		mediaRecorder.requestData();
		console.log('requestData() appelé');
		
		// Attendre que les données soient collectées puis arrêter
		setTimeout(() => {
			console.log('Timeout stop - state:', mediaRecorder?.state, 'chunks:', chunks.length);
			if (mediaRecorder && mediaRecorder.state !== 'inactive') {
				mediaRecorder.stop();
				console.log('stop() appelé');
			}
		}, 300);
	}
}

	async function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const file = input.files[0];
			
			// Compression côté client (même approche que pour les avatars)
			isCompressingImage = true;
			compressionProgress = 0;
			
			try {
				const options = {
					maxWidthOrHeight: 1200,
					maxSizeMB: 1,
					initialQuality: 0.8,
					useWebWorker: true,
					onProgress: (progress: number) => {
						compressionProgress = Math.round(progress * 100);
					}
				};
				
				const compressedFile = await imageCompression(file, options);
				imageBlob = compressedFile;
				imagePreview = URL.createObjectURL(compressedFile);
			} catch (err) {
				console.error('Erreur compression:', err);
				// En cas d'erreur, utiliser l'image originale
				imageBlob = file;
				imagePreview = URL.createObjectURL(file);
			} finally {
				isCompressingImage = false;
				compressionProgress = 0;
			}
 		}
 	}

 	function handleDragOver(e: DragEvent) {
 		e.preventDefault();
 		isDragging = true;
 	}

 	function handleDragLeave(e: DragEvent) {
 		e.preventDefault();
 		isDragging = false;
 	}

 	function handleDrop(e: DragEvent) {
 		e.preventDefault();
 		isDragging = false;
 		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
 			const file = e.dataTransfer.files[0];
 			if (file.type.startsWith('image/')) {
 				handleImageFile(file);
 			}
 		}
 	}

 	async function handleImageFile(file: File) {
 		isCompressingImage = true;
 		compressionProgress = 0;
 		try {
 			const options = {
 				maxWidthOrHeight: 1200,
 				maxSizeMB: 1,
 				initialQuality: 0.8,
 				useWebWorker: true,
 				onProgress: (progress: number) => {
 					compressionProgress = Math.round(progress * 100);
 				}
 			};
 			const compressedFile = await imageCompression(file, options);
 			imageBlob = compressedFile;
 			imagePreview = URL.createObjectURL(compressedFile);
 		} catch (err) {
 			console.error('Erreur compression:', err);
 			imageBlob = file;
 			imagePreview = URL.createObjectURL(file);
 		} finally {
 			isCompressingImage = false;
 			compressionProgress = 0;
 		}
 	}
 
 	async function sendRecording() {
		if (!recordedBlob) return;
		
		isSending = true;
		error = null;
		
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

			const res = await fetch('/api/recordings', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Erreur lors de l\'envoi');
			}

			success = true;
			setTimeout(() => {
				window.location.href = '/';
			}, 1500);
		} catch (e: any) {
			error = e.message;
		} finally {
			isSending = false;
		}
	}

	function reset() {
		audioUrl = null;
		recordedBlob = null;
		imageBlob = null;
		imagePreview = null;
		timer = 0;
		success = false;
		// Automatically start recording again
		startRecording();
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
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
		<div class="success">
			<p>Enregistrement envoyé !</p>
		</div>
	{:else if audioUrl}
		<div class="preview">
			{#if imagePreview}
				<div class="image-preview">
					<img src={imagePreview} alt="Preview" />
					<button class="remove-image" onclick={() => { imageBlob = null; imagePreview = null; }} aria-label="Supprimer l'image">✕</button>
				</div>
			{:else}
				{#if isCompressingImage}
					<div class="compression-progress">
						<div class="progress-bar-container">
							<div class="progress-bar-fill" style="width: {compressionProgress}%"></div>
						</div>
						<span class="progress-text">Compression... {compressionProgress}%</span>
					</div>
				{/if}
			<label class="image-upload" class:disabled={isCompressingImage} class:dragging={isDragging}
 					ondragover={handleDragOver}
 					ondragleave={handleDragLeave}
 					ondrop={handleDrop}
 				>
 					<input type="file" accept="image/*" capture="environment" onchange={handleImageSelect} disabled={isCompressingImage} />
 					<span>📷 Ajouter une photo</span>
 				</label>
			{/if}
			
			<input 
				type="url" 
				class="url-input" 
				placeholder="Lien URL (https://...)" 
				bind:value={recordingUrl}
			/>
			
			<div class="audio-preview">
			<audio controls preload="auto" src={audioUrl}></audio>
		</div>
		<p class="duration">Durée: {formatTime(timer)}</p>
			
			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="actions">
				<button class="secondary" onclick={reset}>Recommencer</button>
				<button onclick={sendRecording} disabled={isSending}>
					{isSending ? 'Envoi...' : 'Envoyer'}
				</button>
			</div>
		</div>
	{:else}
		<div class="recorder">
			<div class="timer {isRecording ? 'recording' : ''} {isRecording && timer >= 160 ? 'warning' : ''}">
					{formatTime(timer)} / 3:00
				</div>

				{#if error}
					<p class="error">{error}</p>
				{/if}

				{#if isRecording}
					<button class="stop" onclick={stopRecording}>Arrêter</button>
				{:else}
					<button class="record" onclick={startRecording}>Commencer l'enregistrement</button>
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
						<span class="recording-date">{formatDate(recording.recorded_at)}</span>
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
	<div class="modal-overlay" use:scrollLock={showDeleteModal} onclick={cancelDelete}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<h3>Confirmer la suppression</h3>
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

	.image-preview {
		position: relative;
		width: 100%;
		aspect-ratio: 210 / 200;
		border-radius: 12px;
		overflow: hidden;
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.remove-image {
		position: absolute;
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
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

	.image-upload {
		width: 100%;
		aspect-ratio: 210 / 200;
		border: 2px dashed #444;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: border-color 0.2s, border-width 0.2s;
 	}

	.image-upload:hover {
		border-color: #e94560;
 	}

	.image-upload.dragging {
		border-color: #4ade80;
		border-width: 4px;
		background: rgba(74, 222, 128, 0.1);
	}

	.image-upload input {
		display: none;
	}

	.image-upload span {
		color: #888;
		font-size: 0.9rem;
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

	.success {
		text-align: center;
		color: #4ade80;
		font-size: 1.25rem;
	}

	/* Fix bouton suppression rond parfait */
	.remove-image {
		aspect-ratio: 1 / 1;
		min-width: 32px;
		min-height: 32px;
		padding: 0;
		line-height: 1;
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

	/* Compression progress bar (uniforme avec settings) */
	.compression-progress {
		margin: 1rem 0;
		width: 100%;
	}

	.progress-bar-container {
		width: 100%;
		height: 6px;
		background: #2a2a4e;
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.85rem;
		color: #888;
		text-align: center;
		display: block;
	}

	.image-upload.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.image-upload.disabled input {
		pointer-events: none;
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
</style>

<ImageViewer 
	imageUrl={selectedImageUrl} 
	isOpen={selectedImageUrl !== null} 
	onClose={() => selectedImageUrl = null} 
/>
