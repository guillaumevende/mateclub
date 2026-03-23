<script lang="ts">
	import Avatar from './Avatar.svelte';
	import type { Recording } from '$lib/stores/player';
	import type { PlayerState } from '$lib/stores/player';

	interface Props {
		recording: Recording & { pseudo?: string; avatar?: string };
		index: number;
		available: boolean;
		cardSwiped: boolean;
		player: PlayerState;
		threshold: string;
		isRecordingListened: (recording: Recording & { pseudo?: string; avatar?: string }) => boolean;
		isCurrentPlaying: (recordingId: number) => boolean;
		isCurrentRecording: (recordingId: number) => boolean;
		onplay: (index: number) => void;
		ontouchstart: (e: TouchEvent) => void;
		ontouchend: (e: TouchEvent) => void;
		onimageclick: (url: string) => void;
		formatTime: (date: string) => string;
		formatDuration: (seconds: number) => string;
		formatTimeSeconds: (seconds: number) => string;
	}

	let {
		recording,
		index,
		available,
		cardSwiped,
		player,
		threshold,
		isRecordingListened,
		isCurrentPlaying,
		isCurrentRecording,
		onplay,
		ontouchstart,
		ontouchend,
		onimageclick,
		formatTime,
		formatDuration,
		formatTimeSeconds
	}: Props = $props();

	const hasImage = $derived(recording.image_filename);
	const isListened = $derived(isRecordingListened(recording));
	const isPlaying = $derived(isCurrentPlaying(recording.id));
	const isCurrent = $derived(isCurrentRecording(recording.id));
</script>

<div 
	class="recording-card" 
	class:locked={!available} 
	class:listened={isListened}
	class:playing={isCurrent && available}
	class:with-bg={hasImage}
	style:--bg-image={hasImage ? `url(/uploads/${hasImage})` : null}
	onclick={() => { if (!cardSwiped) onplay(index); }}
	ontouchstart={(e) => ontouchstart(e)}
	ontouchend={(e) => ontouchend(e)}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && onplay(index)}
>
	<div class="card-top">
		<div class="card-time">{formatTime(recording.recorded_at)}</div>
		<div class="card-author">
			<Avatar avatar={recording.avatar} size="small" />
			<span class="pseudo">{recording.pseudo}</span>
		</div>
	</div>
	{#if available}
		<div class="card-center-duration">
			{#if isCurrent && player.isPlaying}
				<span class="duration current-time">{formatTimeSeconds(player.progress)}</span>
			{:else}
				<span class="duration">{formatDuration(recording.duration_seconds)}</span>
			{/if}
			{#if isPlaying}
				<span class="status-indicator playing">▶ En cours</span>
			{/if}
		</div>
		{#if recording.url}
			<div class="url-link-container">
				<a 
					href={recording.url} 
					target="_blank" 
					rel="noopener noreferrer"
					class="url-link"
					onclick={(e) => e.stopPropagation()}
				>
					Ouvrir le lien
				</a>
			</div>
		{/if}
		<div class="card-bottom-player">
			{#if hasImage}
				<button 
					class="card-thumbnail" 
					onclick={(e) => { e.stopPropagation(); onimageclick(`/uploads/${hasImage}`); }}
					aria-label="Voir l'image"
				>
					<img src="/uploads/{hasImage}" alt="" />
				</button>
			{/if}
		</div>
	{:else}
		<div class="card-center-locked">
			<span class="lock-icon">🔒</span>
			<span class="locked-text">Reviens demain à {threshold}</span>
		</div>
	{/if}
</div>

<style>
	.recording-card {
		flex: 0 0 315px;
		width: 315px;
		min-height: 420px;
		background: #1a1a2e;
		background-size: cover;
		background-position: center;
		border-radius: 12px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		position: relative;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
		overflow: hidden;
	}

	.recording-card.with-bg {
		background-image: var(--bg-image);
	}

	.recording-card:hover {
		transform: translateY(-2px);
	}

	.recording-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		border-radius: 12px;
		z-index: 0;
	}

	.recording-card.locked {
		position: relative;
	}
	
	.recording-card.locked::before {
		content: '';
		position: absolute;
		inset: 0;
		background: inherit;
		filter: blur(12px);
		-webkit-filter: blur(12px);
		z-index: 4;
		border-radius: inherit;
	}

	.recording-card.locked::after {
		content: '';
		position: absolute;
		inset: 0;
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		background: rgba(0, 0, 0, 0.2);
		z-index: 5;
		border-radius: inherit;
	}

	.recording-card.locked {
		opacity: 1 !important;
	}

	.recording-card > * {
		position: relative;
		z-index: 1;
	}

	.recording-card.locked > * {
		z-index: 6;
	}

	.recording-card.playing {
		border: 3px solid #4ade80;
		box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
	}

	.recording-card:not(.listened):not(.locked):not(.playing) {
		border: 2px solid white;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.card-time {
		font-size: 1.4rem;
		font-weight: 600;
		color: #e94560;
	}

	.card-author {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.card-author .pseudo {
		font-size: 0.75rem;
		color: #e94560;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 60px;
	}

	.card-center-duration {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.card-center-duration .duration {
		font-size: 2rem;
		font-weight: 600;
		color: #e94560;
	}

	.card-center-duration .duration.current-time {
		color: #4ade80;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.card-center-locked {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.card-center-locked .lock-icon {
		font-size: 2.5rem;
	}

	.card-center-locked .locked-text {
		font-size: 0.9rem;
		color: #fff;
		text-align: center;
		text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8), 0 0 8px rgba(0, 0, 0, 0.5);
	}

	.card-bottom-player {
		margin-top: auto;
		text-align: center;
	}

	.status-indicator {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.5rem;
		border-radius: 20px;
		animation: pulse 1s ease-in-out infinite;
	}

	.status-indicator.playing {
		color: #4ade80;
		background: rgba(74, 222, 128, 0.2);
	}

	.url-link {
		font-size: 0.875rem;
		color: #60a5fa;
		text-decoration: none;
		padding: 0.35rem 0.75rem;
		border-radius: 20px;
		background: rgba(96, 165, 250, 0.2);
		font-weight: 600;
	}

	.url-link-container {
		text-align: center;
		margin-bottom: 0.75rem;
	}

	.card-thumbnail {
		width: 45px;
		height: 45px;
		border-radius: 8px;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.5);
		padding: 0;
		cursor: pointer;
		flex-shrink: 0;
		background: #1a1a2e;
	}

	.card-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 6px;
	}
</style>
