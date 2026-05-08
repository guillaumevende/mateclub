<script lang="ts">
	import type { PageData } from './$types';
	import '$lib/shared.css';
	import Avatar from '$lib/components/Avatar.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import { playerStore, playRecording as startPlaylistPlayback, togglePlayPause, type DayRecordings, type PlayerState, type Recording as PlayerRecording } from '$lib/stores/player';

	let { data }: { data: PageData } = $props();

	let player = $state<PlayerState>({ ...$playerStore });
	let deletedIds = $state<number[]>([]);
	let cleanupRecordings = $derived(
		data.recordings.filter((recording) => !deletedIds.includes(recording.id))
	);
	let selectedImageUrl = $state<string | null>(null);
	let deletingId = $state<number | null>(null);
	let deleteError = $state<string | null>(null);

	$effect(() => {
		const unsubscribe = playerStore.subscribe((state) => {
			player = state;
		});
		return unsubscribe;
	});

	function formatDate(dateStr: string) {
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');

		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function formatTime(dateStr: string) {
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');

		return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
	}

	function formatDuration(seconds: number) {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function isCurrentCleanupRecording(recordingId: number) {
		return player.currentDay === '__admin_cleanup__' && player.currentRecording?.id === recordingId;
	}

	async function playCleanupRecording(recordingId: number) {
		const index = cleanupRecordings.findIndex((recording) => recording.id === recordingId);
		if (index === -1) return;

		if (isCurrentCleanupRecording(recordingId)) {
			togglePlayPause();
			return;
		}

		const dayData: DayRecordings = {
			date: '__admin_cleanup__',
			recordings: cleanupRecordings as PlayerRecording[],
			available: true
		};

		await startPlaylistPlayback(dayData, index);
	}

	async function deleteRecording(recordingId: number) {
		if (deletingId !== null) return;

		deletingId = recordingId;
		deleteError = null;

		try {
			const response = await fetch(`/api/recordings/${recordingId}`, { method: 'DELETE' });
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.error || 'Suppression impossible');
			}

			deletedIds = [...deletedIds, recordingId];
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Suppression impossible';
		} finally {
			deletingId = null;
		}
	}

	function buildHref(nextLimit: number) {
		const params = new globalThis.URLSearchParams();

		if (data.filters.authorId) {
			params.set('author', String(data.filters.authorId));
		}

		if (data.filters.fromDate) {
			params.set('from', data.filters.fromDate);
		}

		if (data.filters.toDate) {
			params.set('to', data.filters.toDate);
		}

		if (nextLimit > data.pageSize) {
			params.set('limit', String(nextLimit));
		}

		const query = params.toString();
		return query ? `/admin/cleanup?${query}` : '/admin/cleanup';
	}

	const resetHref = '/admin/cleanup';
	const loadMoreHref = $derived(buildHref(data.nextLimit));
</script>

<div class="container cleanup-page">
	<div class="page-header">
		<div>
			<p class="eyebrow">Administration</p>
			<h1>Nettoyage</h1>
			<p class="intro">Supprimez des messages courts enregistrés par erreur.</p>
		</div>
		<a class="back-link" href="/admin">Retour admin</a>
	</div>

	<section class="filters-panel">
		<h2>Recherche</h2>
		<form class="filters-form" method="GET">
			<label>
				Auteur
				<select name="author">
					<option value="">Tous les auteurs</option>
					{#each data.authors as author}
						<option value={author.id} selected={data.filters.authorId === author.id}>
							{author.pseudo} ({author.short_recording_count})
						</option>
					{/each}
				</select>
			</label>

			<label>
				Du
				<input type="date" name="from" value={data.filters.fromDate} />
			</label>

			<label>
				Au
				<input type="date" name="to" value={data.filters.toDate} />
			</label>

			<div class="filter-actions">
				<button type="submit" class="primary-btn">Rechercher</button>
				<a class="secondary-btn" href={resetHref}>Réinitialiser</a>
			</div>
		</form>
	</section>

	<section class="results-panel">
		<div class="results-header">
			<div>
				<h2>Messages de moins de 10 secondes</h2>
				<p class="results-meta">{cleanupRecordings.length} résultat{cleanupRecordings.length > 1 ? 's' : ''} affiché{cleanupRecordings.length > 1 ? 's' : ''} sur cette page</p>
			</div>
			{#if data.hasMore}
				<span class="page-badge">Lots de 20</span>
			{/if}
		</div>

		{#if deleteError}
			<p class="error-message">{deleteError}</p>
		{/if}

		{#if cleanupRecordings.length === 0}
			<div class="empty-state">
				<p>Aucun message court ne correspond à cette recherche.</p>
			</div>
		{:else}
			<div class="recordings-list">
				{#each cleanupRecordings as recording}
					{@const isCurrent = isCurrentCleanupRecording(recording.id)}
					<div class="recording-item" class:is-current={isCurrent}>
						<div class="recording-visual">
							{#if recording.image_filename}
								<button
									type="button"
									class="recording-thumb"
									onclick={() => selectedImageUrl = `/uploads/${recording.image_filename}`}
									aria-label="Voir l'image"
								>
									<img src={`/uploads/${recording.image_filename}`} alt="" />
								</button>
							{:else}
								<div class="recording-thumb recording-thumb-empty">🎙️</div>
							{/if}
						</div>

						<div class="recording-body">
							<div class="recording-author">
								<Avatar avatar={recording.avatar} size="small" />
								<div class="recording-author-text">
									<span class="author-name">{recording.pseudo}</span>
									<span class="recording-datetime">{formatDate(recording.recorded_at)} à {formatTime(recording.recorded_at)}</span>
								</div>
							</div>

							<div class="recording-meta-row">
								<span class="duration-pill">{formatDuration(recording.duration_seconds)}</span>
								{#if isCurrent}
									<span class="playing-pill">{player.isPlaying ? 'En cours' : 'En pause'}</span>
								{/if}
							</div>
						</div>

						<div class="recording-actions">
							<button type="button" class="icon-btn" onclick={() => playCleanupRecording(recording.id)} aria-label="Écouter">
								{isCurrent && player.isPlaying ? '⏸️' : '▶️'}
							</button>
							<button
								type="button"
								class="icon-btn delete-btn"
								onclick={() => deleteRecording(recording.id)}
								disabled={deletingId === recording.id}
								aria-label="Supprimer"
							>
								{deletingId === recording.id ? '…' : '🗑️'}
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if data.hasMore}
				<div class="load-more-row">
					<a class="primary-btn load-more-btn" href={loadMoreHref}>Charger plus...</a>
				</div>
			{/if}
		{/if}
	</section>
</div>

<ImageViewer
	imageUrl={selectedImageUrl}
	isOpen={selectedImageUrl !== null}
	onClose={() => selectedImageUrl = null}
/>

<style>
	.cleanup-page {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 760px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding-top: 1rem;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #8f8da8;
		font-size: 0.78rem;
		margin-bottom: 0.35rem;
	}

	h1 {
		color: #e94560;
		margin-bottom: 0.35rem;
	}

	.intro {
		color: #a9a8bd;
		line-height: 1.5;
		max-width: 44ch;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.05);
		color: #f4edf7;
		border: 1px solid rgba(255, 255, 255, 0.08);
		white-space: nowrap;
	}

	.filters-panel,
	.results-panel {
		background: rgba(24, 27, 48, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 20px;
		padding: 1.2rem;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
	}

	.filters-panel h2,
	.results-panel h2 {
		color: #f8f6fb;
		margin-bottom: 0.9rem;
		font-size: 1.05rem;
	}

	.filters-form {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.9rem;
		align-items: end;
	}

	.filters-form label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: #cfc6d8;
		font-size: 0.88rem;
	}

	.filter-actions {
		display: flex;
		gap: 0.65rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.primary-btn,
	.secondary-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.1rem;
		border-radius: 12px;
		font-weight: 700;
		min-height: 46px;
	}

	.primary-btn {
		background: #e94560;
		color: #fff;
	}

	.secondary-btn {
		background: rgba(255, 255, 255, 0.06);
		color: #f4edf7;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.results-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.results-meta {
		color: #9f9bb5;
		font-size: 0.88rem;
	}

	.page-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.7rem;
		border-radius: 999px;
		background: rgba(233, 69, 96, 0.12);
		color: #ffb7c6;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.recordings-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recording-item {
		display: grid;
		grid-template-columns: 72px minmax(0, 1fr) auto;
		gap: 0.9rem;
		align-items: center;
		padding: 0.85rem;
		background: rgba(255, 255, 255, 0.04);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.recording-item.is-current {
		border-color: rgba(74, 222, 128, 0.42);
		box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.18);
	}

	.recording-thumb {
		width: 72px;
		height: 72px;
		border-radius: 14px;
		border: none;
		padding: 0;
		background: transparent;
		overflow: hidden;
	}

	.recording-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.recording-thumb-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		background: #2b2f57;
		font-size: 1.7rem;
	}

	.recording-body {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.recording-author {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		min-width: 0;
	}

	.recording-author-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.author-name {
		color: #fff;
		font-weight: 700;
	}

	.recording-datetime {
		color: #a9a8bd;
		font-size: 0.84rem;
		line-height: 1.35;
	}

	.recording-meta-row {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex-wrap: wrap;
	}

	.duration-pill,
	.playing-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.65rem;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.duration-pill {
		background: rgba(255, 255, 255, 0.07);
		color: #efe8f4;
	}

	.playing-pill {
		background: rgba(74, 222, 128, 0.14);
		color: #86efac;
	}

	.recording-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.icon-btn {
		min-width: 46px;
		min-height: 46px;
		padding: 0;
		border-radius: 12px;
		font-size: 1.2rem;
		background: rgba(255, 255, 255, 0.06);
	}

	.delete-btn {
		background: rgba(233, 69, 96, 0.14);
	}

	.load-more-row {
		display: flex;
		justify-content: center;
		margin-top: 1rem;
	}

	.load-more-btn {
		min-width: 220px;
	}

	.empty-state {
		padding: 1rem 0.25rem 0.35rem;
		color: #a9a8bd;
	}

	.error-message {
		color: #ff8ea1;
		margin-bottom: 0.75rem;
	}

	@media (max-width: 720px) {
		.page-header {
			flex-direction: column;
			align-items: stretch;
		}

		.filters-form {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 560px) {
		.recording-item {
			grid-template-columns: 64px minmax(0, 1fr);
		}

		.recording-actions {
			grid-column: 1 / -1;
			justify-content: flex-end;
		}

		.recording-thumb {
			width: 64px;
			height: 64px;
		}
	}
</style>
