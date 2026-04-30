<script lang="ts">
	import imageCompression from 'browser-image-compression';
	import CloseIconButton from '$lib/components/CloseIconButton.svelte';
	import { debug } from '$lib/debug';

	interface Props {
		onImageChange: (blob: Blob | null, preview: string | null) => void;
		onWarning: (warning: string | null) => void;
		initialPreview?: string | null;
	}

	let {
		onImageChange,
		onWarning,
		initialPreview = null
	}: Props = $props();

	let imagePreview = $state<string | null>(initialPreview);
	let imageWarning = $state<string | null>(null);
	let isCompressingImage = $state(false);
	let compressionProgress = $state(0);
	let isDragging = $state(false);
	let photoInput = $state<HTMLInputElement | null>(null);
	let galleryInput = $state<HTMLInputElement | null>(null);
	const showAndroidCameraOptions = $derived.by(() => {
		if (typeof navigator === 'undefined') {
			return false;
		}

		return /Android/i.test(navigator.userAgent);
	});

	const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

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

	async function handleImageSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			await handleImageFile(input.files[0]);
		}
	}

	async function handleImageFile(file: File) {
		if (!validImageTypes.includes(file.type)) {
			imageWarning = 'Format d\'image non valide. Votre capsule va être envoyée sans image ou sélectionnez une image valide.';
			onWarning('Format d\'image non valide. Votre capsule va être envoyée sans image ou sélectionnez une image valide.');
			return;
		}
		
		const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
		imageWarning = null;
		onWarning(null);
		
		if (isHeic) {
			imagePreview = URL.createObjectURL(file);
			onImageChange(file, imagePreview);
			return;
		}
		
		isCompressingImage = true;
		compressionProgress = 0;
		try {
			const options = {
				maxWidthOrHeight: 1200,
				maxSizeMB: 1,
				useWebWorker: false,
				libURL: '/lib/browser-image-compression.js',
				onProgress: (progress: number) => {
					compressionProgress = Math.min(Math.round(progress * 100), 100);
				}
			};
			const compressedFile = await imageCompression(file, options);
			imagePreview = URL.createObjectURL(compressedFile);
			onImageChange(compressedFile, imagePreview);
		} catch (err) {
			debug.upload.error('Erreur compression:', err);
			imageWarning = 'Erreur lors du traitement de l\'image';
			onWarning('Erreur lors du traitement de l\'image');
		} finally {
			isCompressingImage = false;
			compressionProgress = 0;
		}
	}

	function removeImage() {
		imagePreview = null;
		imageWarning = null;
		onImageChange(null, null);
	}

	function openPhotoCapture() {
		if (isCompressingImage) return;
		photoInput?.click();
	}

	function openPhotoLibrary() {
		if (isCompressingImage) return;
		galleryInput?.click();
	}
</script>

<div class="image-upload-container">
	{#if imagePreview}
		<div class="image-preview">
			<img src={imagePreview} alt="Preview" />
			<CloseIconButton
				onclick={removeImage}
				ariaLabel="Supprimer l'image"
				size="sm"
				extraClass="remove-image-btn"
			/>
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
		<div
			class="image-upload"
			class:disabled={isCompressingImage}
			class:dragging={isDragging}
			role="group"
			aria-label="Ajout d'une photo à la capsule"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<input bind:this={galleryInput} type="file" accept="image/*" onchange={handleImageSelect} disabled={isCompressingImage} />
			{#if showAndroidCameraOptions}
				<input bind:this={photoInput} type="file" accept="image/*" capture="environment" onchange={handleImageSelect} disabled={isCompressingImage} />
				<span class="image-upload-title">📷 Ajouter une photo</span>
				<div class="image-upload-actions">
					<button type="button" class="image-action-btn image-action-primary" onclick={openPhotoCapture} disabled={isCompressingImage}>
						Prendre une photo
					</button>
					<button type="button" class="image-action-btn image-action-secondary" onclick={openPhotoLibrary} disabled={isCompressingImage}>
						Choisir une photo
					</button>
				</div>
			{:else}
				<button type="button" class="image-action-btn image-action-primary image-action-single" onclick={openPhotoLibrary} disabled={isCompressingImage}>
					📷 Ajouter une photo
				</button>
			{/if}
		</div>
	{/if}
	
	{#if imageWarning}
		<p class="image-warning">⚠️ {imageWarning}</p>
	{/if}
</div>

<style>
	.image-upload-container {
		width: 100%;
	}

	.image-preview {
		position: relative;
		width: 100%;
		max-width: 300px;
		margin: 0 auto;
	}

	.image-preview img {
		width: 100%;
		border-radius: 8px;
	}

	:global(.remove-image-btn) {
		position: absolute;
		top: -12px;
		right: -12px;
	}

	.compression-progress {
		margin: 1rem 0;
	}

	.progress-bar-container {
		width: 100%;
		height: 6px;
		background: #2a2a4e;
		border-radius: 3px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		display: block;
		margin-top: 0.5rem;
		font-size: 0.85rem;
		color: #888;
		text-align: center;
	}

	.image-upload {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		border: 2px dashed #3a3a5e;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.image-upload:hover {
		border-color: #e94560;
	}

	.image-upload.dragging {
		border-color: #e94560;
		background: rgba(233, 69, 96, 0.1);
	}

	.image-upload.disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.image-upload input {
		display: none;
	}

	.image-upload-title {
		font-size: 1rem;
		color: #888;
		margin-bottom: 1rem;
	}

	.image-upload-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		width: 100%;
	}

	.image-action-btn {
		border: none;
		border-radius: 999px;
		padding: 0.8rem 1.2rem;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
	}

	.image-action-btn:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.image-action-primary {
		background: #e94560;
		color: white;
	}

	.image-action-single {
		min-width: 220px;
	}

	.image-action-secondary {
		background: rgba(255, 255, 255, 0.08);
		color: #f4f4f8;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.image-action-btn:not(:disabled):hover {
		transform: translateY(-1px);
	}

	.image-warning {
		color: #ff9500;
		font-weight: bold;
		text-align: center;
		margin: 0.5rem 0;
	}
</style>
