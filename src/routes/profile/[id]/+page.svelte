<script lang="ts">
	import ImageUpload from '$lib/components/ImageUpload.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import UserProfileAvatarLink from '$lib/components/UserProfileAvatarLink.svelte';
	import { getAudioElement, playerStore, updateMediaSessionMetadata, type DayRecordings } from '$lib/stores/player';

	type ProfileImage = {
		id: number;
		user_id: number;
		image_filename: string;
		recorded_at: string;
		duration_seconds: number;
		url: string | null;
		pseudo: string;
		avatar: string;
	};

	type ProfileRecording = {
		id: number;
		user_id: number;
		filename: string;
		processed_filename: string | null;
		image_filename: string | null;
		url: string | null;
		duration_seconds: number;
		recorded_at: string;
		processing_status?: 'ready' | 'processing' | 'failed';
		processing_mode?: 'none' | 'deepfilter';
		processing_error?: string | null;
		processing_started_at?: string | null;
		processed_at?: string | null;
		pseudo: string;
		avatar: string;
	};

	type ImageEditorState = {
		recordingId: number;
		imageBlob: Blob | null;
		imagePreview: string | null;
		error: string | null;
		isSaving: boolean;
	};

	type LinkEditorState = {
		recordingId: number;
		url: string;
		error: string | null;
		isSaving: boolean;
	};

	let { data } = $props<{
		data: {
			profileUser: { id: number; pseudo: string; avatar: string };
			currentUserId: number;
			images: ProfileImage[];
			totalImages: number;
			hasMoreImages: boolean;
			recordings: ProfileRecording[];
		};
	}>();

	let profileStateInitialized = false;
	let galleryImages = $state<ProfileImage[]>([]);
	let hasMoreImages = $state(false);
	let imageOffset = $state(0);
	let isLoadingMoreImages = $state(false);
	let recordings = $state<ProfileRecording[]>([]);
	let selectedImageUrl = $state<string | null>(null);
	let imageEditor = $state<ImageEditorState | null>(null);
	let linkEditor = $state<LinkEditorState | null>(null);
	let player = $state({ ...$playerStore });

	const isOwnProfile = $derived(data.currentUserId === data.profileUser.id);

	$effect(() => {
		const unsubscribe = playerStore.subscribe((state) => {
			player = state;
		});
		return unsubscribe;
	});

	$effect(() => {
		if (profileStateInitialized) return;
		galleryImages = data.images;
		hasMoreImages = data.hasMoreImages;
		imageOffset = data.images.length;
		recordings = data.recordings;
		profileStateInitialized = true;
	});

	function formatDate(dateStr: string): string {
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	function formatTime(dateStr: string): string {
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

	function getImageFilename(blob: Blob) {
		if (blob.type.includes('png')) return 'image.png';
		if (blob.type.includes('webp')) return 'image.webp';
		if (blob.type.includes('heic') || blob.type.includes('heif')) return 'image.heic';
		return 'image.jpg';
	}

	function isRecentEditable(recording: ProfileRecording) {
		const recordedAt = recording.recorded_at.includes('T')
			? new Date(recording.recorded_at)
			: new Date(`${recording.recorded_at.replace(' ', 'T')}Z`);

		if (Number.isNaN(recordedAt.getTime())) return false;
		return Date.now() - recordedAt.getTime() <= 24 * 60 * 60 * 1000;
	}

	function canAddImage(recording: ProfileRecording) {
		return isOwnProfile && !recording.image_filename && isRecentEditable(recording);
	}

	function canAddUrl(recording: ProfileRecording) {
		return isOwnProfile && !recording.url && isRecentEditable(recording);
	}

	function isServerProcessingRecording(recording: ProfileRecording) {
		return recording.processing_status === 'processing';
	}

	function hasServerProcessingFailed(recording: ProfileRecording) {
		return recording.processing_status === 'failed';
	}

	function canPlayRecording(recording: ProfileRecording) {
		return !recording.processing_status || recording.processing_status === 'ready';
	}

	function getRecordingStatusLabel(recording: ProfileRecording) {
		if (hasServerProcessingFailed(recording)) {
			return 'Traitement audio à relancer';
		}
		return null;
	}

	async function loadMoreImages() {
		if (isLoadingMoreImages || !hasMoreImages) return;
		isLoadingMoreImages = true;

		try {
			const res = await fetch(`/api/users/${data.profileUser.id}/images?limit=8&offset=${imageOffset}`);
			const payload = await res.json();
			if (!res.ok) throw new Error(payload.error || 'Impossible de charger plus d’images');
			galleryImages = [...galleryImages, ...(payload.images || [])];
			imageOffset += (payload.images || []).length;
			hasMoreImages = payload.hasMore || false;
		} catch (error) {
			console.error('Failed to load more images:', error);
		} finally {
			isLoadingMoreImages = false;
		}
	}

	async function playRecording(recording: ProfileRecording) {
		if (!canPlayRecording(recording)) {
			return;
		}

		const audioElement = getAudioElement();

		const fakeDayData: DayRecordings = {
			date: recording.recorded_at.split('T')[0],
			recordings: [
				{
					...recording,
					listened_by_user: 0
				}
			],
			available: true
		};

		playerStore.update((state) => ({
			...state,
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
			playerStore.update((state) => ({ ...state, isPlaying: true, isLoading: false }));
		} catch (error) {
			console.error('Playback failed:', error);
			playerStore.update((state) => ({ ...state, isPlaying: false, isLoading: false }));
		}
	}

	function openImageEditor(recording: ProfileRecording) {
		if (!canAddImage(recording)) return;

		if (imageEditor?.imagePreview) {
			URL.revokeObjectURL(imageEditor.imagePreview);
		}

		linkEditor = null;
		imageEditor = {
			recordingId: recording.id,
			imageBlob: null,
			imagePreview: null,
			error: null,
			isSaving: false
		};
	}

	function closeImageEditor() {
		if (imageEditor?.imagePreview) {
			URL.revokeObjectURL(imageEditor.imagePreview);
		}
		imageEditor = null;
	}

	function setImageDraft(blob: Blob | null, preview: string | null) {
		if (!imageEditor) return;
		if (imageEditor.imagePreview && imageEditor.imagePreview !== preview) {
			URL.revokeObjectURL(imageEditor.imagePreview);
		}
		imageEditor = { ...imageEditor, imageBlob: blob, imagePreview: preview, error: null };
	}

	async function saveImage() {
		if (!imageEditor?.imageBlob) {
			if (imageEditor) imageEditor = { ...imageEditor, error: 'Choisissez une image avant de continuer.' };
			return;
		}

		const editor = imageEditor as ImageEditorState & { imageBlob: Blob };
		imageEditor = { ...editor, isSaving: true, error: null };

		try {
			const formData = new FormData();
			formData.append('image', editor.imageBlob, getImageFilename(editor.imageBlob));

			const res = await fetch(`/api/recordings/${editor.recordingId}`, { method: 'PATCH', body: formData });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload.error || 'Impossible d’ajouter l’image');

			recordings = recordings.map((recording) =>
				recording.id === editor.recordingId
					? { ...recording, image_filename: payload.recording?.image_filename ?? recording.image_filename }
					: recording
			);

			if (payload.recording?.image_filename) {
				galleryImages = [
					{
						id: payload.recording.id,
						user_id: payload.recording.user_id,
						image_filename: payload.recording.image_filename,
						recorded_at: payload.recording.recorded_at,
						duration_seconds: payload.recording.duration_seconds,
						url: payload.recording.url,
						pseudo: payload.recording.pseudo,
						avatar: payload.recording.avatar
					},
					...galleryImages
				];
			}

			closeImageEditor();
		} catch (error) {
			if (imageEditor) {
				imageEditor = {
					...imageEditor,
					isSaving: false,
					error: error instanceof Error ? error.message : 'Impossible d’ajouter l’image'
				};
			}
		}
	}

	function openLinkEditor(recording: ProfileRecording) {
		if (!canAddUrl(recording)) return;

		closeImageEditor();
		linkEditor = {
			recordingId: recording.id,
			url: '',
			error: null,
			isSaving: false
		};
	}

	function closeLinkEditor() {
		linkEditor = null;
	}

	async function saveLink() {
		if (!linkEditor) return;
		const url = linkEditor.url.trim();
		if (!url) {
			linkEditor = { ...linkEditor, error: 'Entrez une URL avant de continuer.' };
			return;
		}

		const editor = linkEditor;
		linkEditor = { ...editor, isSaving: true, error: null };

		try {
			const formData = new FormData();
			formData.append('url', url);

			const res = await fetch(`/api/recordings/${editor.recordingId}`, { method: 'PATCH', body: formData });
			const payload = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(payload.error || 'Impossible d’ajouter le lien');

			recordings = recordings.map((recording) =>
				recording.id === editor.recordingId
					? { ...recording, url: payload.recording?.url ?? recording.url }
					: recording
			);
			closeLinkEditor();
		} catch (error) {
			linkEditor = {
				...editor,
				isSaving: false,
				error: error instanceof Error ? error.message : 'Impossible d’ajouter le lien'
			};
		}
	}
</script>

<svelte:head>
	<title>{data.profileUser.pseudo} · Profil Maté Club</title>
</svelte:head>

<div class="profile-page">
	<div class="profile-topbar">
		<a href="/" class="back-home-btn">← Retour à l’accueil</a>
	</div>

	<section class="profile-hero">
		<UserProfileAvatarLink
			userId={data.profileUser.id}
			avatar={data.profileUser.avatar}
			size="large"
			label={`Profil de ${data.profileUser.pseudo}`}
		/>
		<h1>{data.profileUser.pseudo}</h1>
		<p class="profile-subtitle">
			{galleryImages.length} image{galleryImages.length !== 1 ? 's' : ''} · {recordings.length} capsule{recordings.length !== 1 ? 's' : ''} récente{recordings.length !== 1 ? 's' : ''}
		</p>
	</section>

	<section class="profile-section">
		<div class="section-header">
			<h2>Dernières images</h2>
			<span>{data.totalImages} au total</span>
		</div>

		{#if galleryImages.length === 0}
			<p class="empty-state">Aucune image publiée pour le moment.</p>
		{:else}
			<div class="profile-gallery">
				{#each galleryImages as image}
					<button
						type="button"
						class="gallery-item"
						onclick={() => selectedImageUrl = `/uploads/${image.image_filename}`}
						aria-label={`Voir l'image du ${formatDate(image.recorded_at)}`}
					>
						<img src={`/uploads/${image.image_filename}`} alt="" />
					</button>
				{/each}
			</div>

			{#if hasMoreImages}
				<div class="gallery-actions">
					<button type="button" class="btn" onclick={loadMoreImages} disabled={isLoadingMoreImages}>
						{isLoadingMoreImages ? 'Chargement…' : 'Charger 8 images de plus'}
					</button>
				</div>
			{/if}
		{/if}
	</section>

	<section class="profile-section">
		<div class="section-header">
			<h2>Dernières capsules audio</h2>
			<span>10 plus récentes</span>
		</div>

		{#if recordings.length === 0}
			<p class="empty-state">Aucune capsule disponible.</p>
		{:else}
			<div class="recordings-list">
				{#each recordings as recording}
					{@const isCurrentlyPlaying = player.currentRecording?.id === recording.id && player.isPlaying}
					<div class="recording-item-wrapper">
						<div class="recording-item">
							{#if recording.image_filename}
								<button
									type="button"
									class="recording-thumb"
									onclick={() => selectedImageUrl = `/uploads/${recording.image_filename}`}
									aria-label="Voir l'image"
								>
									<img src={`/uploads/${recording.image_filename}`} alt="" />
								</button>
							{:else if canAddImage(recording)}
								<button
									type="button"
									class="recording-thumb recording-thumb-add"
									onclick={() => openImageEditor(recording)}
									aria-label="Ajouter une image à cette capsule"
								>
									<span class="recording-thumb-add-icon">+</span>
								</button>
							{:else}
								<div class="recording-thumb recording-thumb-empty">🎙️</div>
							{/if}

							<div class="recording-main">
								<div class="recording-topline">
									<span class="recording-date">{formatDate(recording.recorded_at)}</span>
									<span class="recording-time">{formatTime(recording.recorded_at)}</span>
								</div>
								<div class="recording-bottomline">
									<span class="recording-duration">{formatDuration(recording.duration_seconds)}</span>
									{#if hasServerProcessingFailed(recording)}
										<span
											class="recording-status-badge"
											class:is-failed={hasServerProcessingFailed(recording)}
										>
											{getRecordingStatusLabel(recording)}
										</span>
									{/if}
								</div>
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
								{:else if canAddUrl(recording)}
									<button
										type="button"
										class="url-add-btn"
										onclick={() => openLinkEditor(recording)}
										aria-label="Ajouter un lien"
									>
										+
									</button>
								{:else}
									<span class="url-placeholder"></span>
								{/if}

								<button
									type="button"
									class="listen-btn"
									onclick={() => playRecording(recording)}
									aria-label="Écouter"
									disabled={!canPlayRecording(recording)}
								>
									{#if !canPlayRecording(recording)}
										{#if hasServerProcessingFailed(recording)}
											⚠️
										{:else}
											<span class="processing-glyph" aria-hidden="true">
												<svg viewBox="0 0 24 24" class="processing-spinner-icon">
													<circle class="processing-spinner-track" cx="12" cy="12" r="8.5"></circle>
													<path class="processing-spinner-head" d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"></path>
												</svg>
											</span>
										{/if}
									{:else}
										{isCurrentlyPlaying ? '⏸️' : '▶️'}
									{/if}
								</button>
							</div>
						</div>

						{#if imageEditor?.recordingId === recording.id}
							<div class="inline-editor">
								<ImageUpload
									onImageChange={setImageDraft}
									onWarning={(warning) => {
										if (!imageEditor) return;
										imageEditor = { ...imageEditor, error: warning };
									}}
								/>
								{#if imageEditor.error}
									<p class="editor-error">{imageEditor.error}</p>
								{/if}
								<div class="inline-editor-actions">
									<button type="button" class="cancel-btn" onclick={closeImageEditor} disabled={imageEditor.isSaving}>Annuler</button>
									<button type="button" class="save-btn" onclick={saveImage} disabled={imageEditor.isSaving || !imageEditor.imageBlob}>
										{imageEditor.isSaving ? 'Ajout…' : 'Ajouter la photo'}
									</button>
								</div>
							</div>
						{/if}

						{#if linkEditor?.recordingId === recording.id}
							<div class="inline-editor">
								<input
									type="url"
									class="url-input"
									placeholder="Lien URL pour cette capsule (https://...)"
									bind:value={linkEditor.url}
								/>
								{#if linkEditor.error}
									<p class="editor-error">{linkEditor.error}</p>
								{/if}
								<div class="inline-editor-actions">
									<button type="button" class="cancel-btn" onclick={closeLinkEditor} disabled={linkEditor.isSaving}>Annuler</button>
									<button type="button" class="save-btn" onclick={saveLink} disabled={linkEditor.isSaving || !linkEditor.url.trim()}>
										{linkEditor.isSaving ? 'Ajout…' : 'Ajouter le lien'}
									</button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<ImageViewer imageUrl={selectedImageUrl} isOpen={selectedImageUrl !== null} onClose={() => selectedImageUrl = null} />

<style>
	.profile-page {
		width: min(100%, 780px);
		margin: 0 auto;
		padding: 1.25rem 1rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
	}

	.profile-topbar {
		display: flex;
		justify-content: flex-start;
	}

	.back-home-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1rem;
		border-radius: 999px;
		background: #2a2a4e;
		color: #fff;
		text-decoration: none;
		font-weight: 700;
	}

	.profile-hero,
	.profile-section {
		background: #1f2140;
		border: 1px solid rgba(255, 255, 255, 0.05);
		border-radius: 22px;
		padding: 1.2rem;
	}

	.profile-hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.7rem;
	}

	h1,
	h2 {
		color: #e94560;
	}

	.profile-subtitle,
	.section-header span,
	.empty-state,
	.recording-duration,
	.recording-time {
		color: #a0a0c0;
	}

	.section-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.profile-gallery {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.gallery-item {
		aspect-ratio: 1;
		border: none;
		background: #15162b;
		border-radius: 16px;
		padding: 0;
		overflow: hidden;
	}

	.gallery-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.gallery-actions {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}

	.recordings-list {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.recording-item-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.recording-item {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.85rem;
		background: #15162b;
		border-radius: 16px;
	}

	.recording-thumb {
		width: 54px;
		height: 72px;
		border-radius: 12px;
		border: none;
		padding: 0;
		background: transparent;
		flex-shrink: 0;
		overflow: hidden;
	}

	.recording-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.recording-thumb-empty,
	.recording-thumb-add {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.recording-thumb-empty {
		background: #2a2a4e;
		font-size: 1.5rem;
	}

	.recording-thumb-add {
		background: rgba(255, 255, 255, 0.03);
		border: 2px dashed rgba(255, 255, 255, 0.18);
		color: #d8d3e2;
	}

	.recording-thumb-add-icon,
	.url-add-btn {
		font-weight: 700;
		line-height: 1;
	}

	.recording-thumb-add-icon {
		font-size: 1.9rem;
	}

	.recording-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.recording-topline,
	.recording-bottomline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.recording-date {
		color: #fff;
		font-weight: 600;
	}

	.recording-status-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.2rem 0.55rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.01em;
		background: rgba(255, 255, 255, 0.08);
		color: #cfd3ff;
	}

	.recording-status-badge.is-failed {
		background: rgba(255, 107, 129, 0.14);
		color: #ff8ea2;
	}

	.recording-actions {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.url-btn,
	.listen-btn,
	.url-add-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 42px;
		height: 42px;
		border-radius: 999px;
		text-decoration: none;
		border: none;
	}

	.url-btn,
	.listen-btn {
		background: #2a2a4e;
	}

	.listen-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.processing-glyph {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		color: #ffd56d;
		filter: drop-shadow(0 0 10px rgba(255, 213, 109, 0.22));
	}

	.processing-spinner-icon {
		width: 22px;
		height: 22px;
		display: block;
		animation: recording-processing-spin 0.95s linear infinite;
	}

	.processing-spinner-track,
	.processing-spinner-head {
		fill: none;
		stroke-linecap: round;
	}

	.processing-spinner-track {
		stroke: rgba(255, 213, 109, 0.24);
		stroke-width: 2.4;
	}

	.processing-spinner-head {
		stroke: currentColor;
		stroke-width: 2.8;
	}

	@keyframes recording-processing-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.url-add-btn {
		background: rgba(255, 255, 255, 0.03);
		border: 2px dashed rgba(255, 255, 255, 0.18);
		color: #d8d3e2;
		font-size: 1.35rem;
	}

	.url-placeholder {
		width: 42px;
		height: 42px;
		display: inline-block;
	}

	.inline-editor {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		padding: 0.95rem;
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.06);
	}

	.url-input {
		width: 100%;
		padding: 0.85rem 0.95rem;
		border: 1px solid #444;
		border-radius: 10px;
		background: #2a2a4e;
		color: #ccc;
		font-size: 0.95rem;
	}

	.url-input::placeholder {
		color: #666;
	}

	.editor-error {
		color: #ff6b6b;
		font-size: 0.9rem;
	}

	.inline-editor-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
	}

	.cancel-btn,
	.save-btn,
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.85rem 1.2rem;
		border-radius: 999px;
		border: none;
		font-weight: 700;
	}

	.cancel-btn {
		background: #2a2a4e;
		color: #fff;
	}

	.save-btn,
	.btn {
		background: linear-gradient(135deg, #f05271, #ff667d);
		color: #fff;
	}

	@media (max-width: 640px) {
		.profile-gallery {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.recording-item {
			align-items: flex-start;
		}
	}
</style>
