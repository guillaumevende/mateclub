<script lang="ts">
	interface Props {
		onclick: () => void;
		ariaLabel?: string;
		size?: 'sm' | 'md';
		extraClass?: string;
	}

	let {
		onclick,
		ariaLabel = 'Fermer',
		size = 'md',
		extraClass = ''
	}: Props = $props();
</script>

<button
	type="button"
	class={`close-icon-button ${size === 'sm' ? 'size-sm' : 'size-md'} ${extraClass}`.trim()}
	aria-label={ariaLabel}
	{onclick}
>
	<svg viewBox="0 0 24 24" aria-hidden="true" class="close-icon">
		<path d="M8 8l8 8M16 8l-8 8"></path>
	</svg>
</button>

<style>
	.close-icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		flex-shrink: 0;
		margin: 0;
		padding: 0;
		min-width: 0;
		min-height: 0;
		aspect-ratio: 1 / 1;
		border-radius: 50%;
		border: 2px solid #e94560;
		background: rgba(42, 42, 78, 0.96);
		color: #fff;
		cursor: pointer;
		box-shadow: 0 10px 24px rgba(11, 11, 24, 0.32);
		transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
	}

	.close-icon-button:hover {
		background: #e94560;
		transform: scale(1.06);
	}

	.close-icon-button:focus-visible {
		outline: 2px solid #fff4f6;
		outline-offset: 2px;
	}

	.close-icon-button.size-sm {
		width: 32px;
		height: 32px;
	}

	.close-icon-button.size-md {
		width: 40px;
		height: 40px;
	}

	.close-icon-button .close-icon {
		width: 58%;
		height: 58%;
		display: block;
	}

	.close-icon-button .close-icon path {
		fill: none;
		stroke: currentColor;
		stroke-width: 2.4;
		stroke-linecap: round;
	}
</style>
