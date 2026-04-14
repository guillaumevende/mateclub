<script lang="ts">
	import { scrollLock } from '$lib/actions/scrollLock';

	interface Props {
		imageUrl: string | null;
		isOpen: boolean;
		onClose: () => void;
	}

	let { imageUrl, isOpen, onClose }: Props = $props();

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onClose();
	}

	function handleKeyboardActivation(e: KeyboardEvent) {
		e.stopPropagation();
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && imageUrl}
	<div
		class="image-viewer-overlay"
		use:scrollLock={isOpen}
		onclick={handleClick}
		onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleKeyboardActivation(e)}
		role="button"
		tabindex="0"
		aria-label="Fermer l'image"
	>
		<img src={imageUrl} alt="" class="image-viewer-img" />
	</div>
{/if}

<style>
	.image-viewer-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.95);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		cursor: pointer;
	}

	.image-viewer-img {
		max-width: 95vw;
		max-height: 95vh;
		object-fit: contain;
		border-radius: 8px;
	}
</style>
