<script lang="ts">
	import imageCompression from 'browser-image-compression';
	import { debug } from '$lib/debug';

	interface Props {
		onImageChange: (blob: Blob | null, preview: string | null) => void;
		onWarning: (warning: string | null) => void;
	}

	let { onImageChange, onWarning }: Props = $props();

	let imageBlob = $state<Blob | null>(null);
	let imagePreview = $state<string | null>(null);
	let imageWarning = $state<string | null>(null);
	let isCompressingImage = $state(false);
	let compressionProgress = $state(0);
	let isDragging = $state(false);

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
			imageBlob = file;
			imagePreview = URL.createObjectURL(file);
			onImageChange(file, URL.createObjectURL(file));
			return;
		}
		
		isCompressingImage = true;
		compressionProgress = 0;
		try {
			const options = {
				maxWidthOrHeight: 1200,
				maxSizeMB: 1,
				useWebWorker: false,
				onProgress: (progress: number) => {
					compressionProgress = Math.min(Math.round(progress * 100), 100);
				}
			};
			const compressedFile = await imageCompression(file, options);
			imageBlob = compressedFile;
			imagePreview = URL.createObjectURL(compressedFile);
			onImageChange(compressedFile, URL.createObjectURL(compressedFile));
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
		imageBlob = null;
		imagePreview = null;
		imageWarning = null;
		onImageChange(null, null);
	}
</script>

<div class="image-upload-container">
	{#if imagePreview}
		<div class="image-preview">
			<img src={imagePreview} alt="Preview" />
			<button class="remove-image" onclick={removeImage} aria-label="Supprimer l'image">✕</button>
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
			<input type="file" accept="image/*" onchange={handleImageSelect} disabled={isCompressingImage} />
			<span>📷 Ajouter une photo</span>
		</label>
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

	.remove-image {
		position: absolute;
		top: -10px;
		right: -10px;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: #ff6b6b;
		color: white;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
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

	.image-upload span {
		font-size: 1rem;
		color: #888;
	}

	.image-warning {
		color: #ff9500;
		font-weight: bold;
		text-align: center;
		margin: 0.5rem 0;
	}
</style>
