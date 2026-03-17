<script lang="ts">
	import { playerStore, playPrevious, playNext, togglePlayPause, seekTo, closePlayer } from '$lib/stores/player';
	import { page } from '$app/stores';

	let player = $state({ ...$playerStore });
	
	playerStore.subscribe(value => {
		player = value;
	});

	function handleSeek(e: Event) {
		const input = e.target as HTMLInputElement;
		const time = parseFloat(input.value);
		seekTo(time);
	}

	function handleSeekFromClick(e: MouseEvent) {
		const track = e.currentTarget as HTMLDivElement;
		const rect = track.getBoundingClientRect();
		const percent = (e.clientX - rect.left) / rect.width;
		const time = Math.max(0, Math.min(percent * displayDuration, displayDuration));
		seekTo(time);
	}

	let isDragging = false;

	function startDrag(e: MouseEvent | TouchEvent) {
		e.preventDefault();
		isDragging = true;
		
		const track = (e.currentTarget as HTMLDivElement).closest('.progress-track') as HTMLDivElement;
		const rect = track.getBoundingClientRect();
		
		const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
			if (!isDragging) return;
			
			let clientX: number;
			if ('touches' in moveEvent) {
				clientX = moveEvent.touches[0].clientX;
			} else {
				clientX = moveEvent.clientX;
			}
			
			const percent = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
			const time = percent * displayDuration;
			seekTo(time);
		};
		
		const upHandler = () => {
			isDragging = false;
			document.removeEventListener('mousemove', moveHandler);
			document.removeEventListener('mouseup', upHandler);
			document.removeEventListener('touchmove', moveHandler);
			document.removeEventListener('touchend', upHandler);
		};
		
		document.addEventListener('mousemove', moveHandler);
		document.addEventListener('mouseup', upHandler);
		document.addEventListener('touchmove', moveHandler);
		document.addEventListener('touchend', upHandler);
	}

	function formatTime(seconds: number): string {
		if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatFullDate(): string {
		if (!player.currentRecording) return '';
		
		const timezone = $page.data.user?.timezone || 'Europe/Paris';
		const recordedAt = new Date(player.currentRecording.recorded_at);
		
		const formatter = new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: timezone
		});
		
		return formatter.format(recordedAt).replace(/^./, (str) => str.toUpperCase()).replace(':', 'h');
	}

	function formatPosition(): string {
		if (!player.currentDayData || !player.currentRecording) return '';
		
		const total = player.currentDayData.recordings.length;
		const position = player.currentIndex + 1;
		
		return `(${position}/${total})`;
	}

	function formatDuration(): string {
		if (!player.currentRecording) return '';
		
		const mins = Math.floor(player.currentRecording.duration_seconds / 60);
		const secs = player.currentRecording.duration_seconds % 60;
		
		if (secs === 0) {
			return `${mins}min`;
		}
		return `${mins}min ${secs}`;
	}

	let hasPrevious = $derived(player.currentDayData && player.currentIndex > 0);
	let hasNext = $derived(player.currentDayData && player.currentIndex < player.currentDayData.recordings.length - 1);
	
	// Always use duration_seconds from database (reliable for all files including opus codec)
	let displayDuration = $derived(player.currentRecording?.duration_seconds || 0);
	let progressPercent = $derived((displayDuration > 0) ? (player.progress / displayDuration) * 100 : 0);
</script>

{#if player.currentRecording}
	<div class="floating-player">
		<div class="player-layout">
			<div class="close-column">
				<button class="close-btn" onclick={closePlayer} aria-label="Fermer">✕</button>
			</div>
			
			<div class="content-wrapper">
				<div class="info-column">
					<div class="date-line">{formatFullDate()}</div>
					<div class="position-line">
						{formatPosition()} • {formatDuration()}
					</div>
					<div class="controls-line">
						<button 
							class="control-btn" 
							onclick={playPrevious} 
							disabled={!hasPrevious}
							aria-label="Précédent"
						>
							⏮️
						</button>
						
						<button 
							class="play-btn" 
							onclick={togglePlayPause}
							disabled={player.isLoading}
							aria-label={player.isPlaying ? 'Pause' : 'Lecture'}
						>
							{player.isLoading ? '⏳' : player.isPlaying ? '⏸️' : '▶️'}
						</button>
						
						<button 
							class="control-btn" 
							onclick={playNext}
							disabled={!hasNext}
							aria-label="Suivant"
						>
							⏭️
						</button>
					</div>
				</div>
			</div>
		</div>
		
		<div class="progress-container">
			<span class="time current">{formatTime(player.progress)}</span>
			<div 
				class="progress-track" 
				onclick={(e) => handleSeekFromClick(e)}
				onmousedown={startDrag}
				ontouchstart={startDrag}
				role="slider"
				tabindex="0"
				aria-valuenow={player.progress}
				aria-valuemin={0}
				aria-valuemax={displayDuration}
			>
				<div class="progress-fill" style="width: {progressPercent}%"></div>
				<div class="progress-thumb" style="left: {progressPercent}%"></div>
			</div>
			<span class="time duration">{formatTime(displayDuration)}</span>
		</div>
	</div>
{/if}

<style>
	.floating-player {
		width: 100%;
		max-width: 600px;
		margin: 0 auto;
	}

	.player-layout {
		display: flex;
	}

	.close-column {
		flex-shrink: 0;
		width: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn {
		background: transparent;
		color: #aaa;
		font-size: 2rem;
		padding: 0.5rem;
		min-width: auto;
		min-height: auto;
		border: none;
		cursor: pointer;
	}

	.content-wrapper {
		flex: 1;
		display: flex;
		justify-content: center;
		padding-right: 60px;
	}

	.info-column {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.date-line {
		color: #e94560;
		font-weight: 600;
		font-size: 1rem;
		line-height: 1.2;
		text-align: center;
	}

	.position-line {
		color: #888;
		font-size: 0.85rem;
	}

	.controls-line {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 0.25rem;
	}

	.control-btn {
		background: transparent;
		border: none;
		font-size: 1.5rem;
		padding: 0.5rem;
		cursor: pointer;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.play-btn {
		background: #e94560;
		border: none;
		font-size: 1.75rem;
		padding: 0.5rem;
		border-radius: 50%;
		cursor: pointer;
		min-width: 56px;
		min-height: 56px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.play-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.progress-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.time {
		color: #888;
		font-size: 0.75rem;
		min-width: 50px;
	}

	.time.current {
		text-align: right;
	}

	.progress-track {
		flex: 1;
		max-width: 100%;
		height: 20px;
		display: flex;
		align-items: center;
		cursor: pointer;
		position: relative;
	}

	.progress-track::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: #2a2a4e;
	}

	.progress-fill {
		position: absolute;
		left: 0;
		height: 1px;
		background: #e94560;
		transition: width 0.1s linear;
	}

	.progress-thumb {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 14px;
		height: 14px;
		background: #fff;
		border-radius: 50%;
		z-index: 1;
		box-shadow: 0 0 4px rgba(0,0,0,0.5);
	}
</style>
