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
	style={hasImage ? `background-image: url(/uploads/${hasImage})` : ''}
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
		min-width: 120px;
		max-width: 160px;
		height: 100px;
		background-color: #3a3a5e;
		border-radius: 12px;
		padding: 0.75rem;
		cursor: pointer;
		position: relative;
		background-size: cover;
		background-position: center;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.recording-card:active {
		transform: scale(0.98);
	}

	.recording-card.locked {
		opacity: 0.6;
		cursor: default;
	}

	.recording-card.listened {
		opacity: 0.7;
	}

	.recording-card.playing {
		box-shadow: 0 0 0 2px #e94560;
	}

	.recording-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(42, 42, 78, 0.9), rgba(42, 42, 78, 0.7));
		border-radius: 12px;
		z-index: 0;
	}

	.recording-card > * {
		position: relative;
		z-index: 1;
	}

	.card-top {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.card-time {
		font-size: 0.75rem;
		color: #aaa;
	}

	.card-author {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.card-author :global(.avatar) {
		width: 18px;
		height: 18px;
		font-size: 0.7rem;
	}

	.pseudo {
		font-size: 0.7rem;
		color: #ddd;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 80px;
	}

	.card-center-duration {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.duration {
		font-size: 0.875rem;
		color: #fff;
		font-weight: 500;
	}

	.duration.current-time {
		color: #e94560;
	}

	.status-indicator {
		font-size: 0.7rem;
		color: #e94560;
	}

	.url-link-container {
		margin-top: 0.25rem;
	}

	.url-link {
		font-size: 0.65rem;
		color: #4ade80;
		text-decoration: none;
	}

	.url-link:hover {
		text-decoration: underline;
	}

	.card-bottom-player {
		display: flex;
		justify-content: flex-end;
		margin-top: auto;
	}

	.card-thumbnail {
		width: 28px;
		height: 28px;
		border-radius: 4px;
		overflow: hidden;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.card-thumbnail img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.card-center-locked {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	.lock-icon {
		font-size: 1.25rem;
	}

	.locked-text {
		font-size: 0.6rem;
		color: #888;
		text-align: center;
	}
</style>
