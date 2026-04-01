<script lang="ts">
	import Avatar from './Avatar.svelte';
	import { scrollLock } from '$lib/actions/scrollLock';

	interface User {
		id: number;
		pseudo: string;
		avatar: string;
		recording_count?: number;
	}

	interface Props {
		allUsers: User[];
		showTeam?: boolean;
	}

	let { allUsers, showTeam = $bindable(false) }: Props = $props();
</script>

{#if showTeam}
	<div
		class="modal-overlay"
		use:scrollLock={showTeam}
		onclick={() => showTeam = false}
		onkeydown={(e) => e.key === 'Escape' && (showTeam = false)}
		role="button"
		tabindex="0"
		aria-label="Fermer la modale"
	>
		<div
			class="modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && (showTeam = false)}
			role="dialog"
			aria-modal="true"
			aria-labelledby="team-title"
			tabindex="-1"
		>
			<button class="close-btn modal-close-outer" onclick={() => showTeam = false}>✕</button>
			
			<h2 id="team-title">La team</h2>
			<ul class="team-list">
				{#each allUsers as user}
					{@const count = user.recording_count ?? 0}
					<li>
						<Avatar avatar={user.avatar} size="small" />
						<span class="team-pseudo">{user.pseudo}</span>
						<span class="team-count">({count} capsule{count !== 1 ? 's' : ''})</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 4rem 1rem 1rem;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		position: relative;
		overflow: visible;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #2a2a4e;
		border: 2px solid #e94560;
		color: #fff;
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		z-index: 1001;
		padding: 0;
	}

	.close-btn:hover {
		background: #e94560;
		transform: scale(1.1);
	}

	.modal h2 {
		color: #e94560;
		margin-bottom: 1rem;
		text-align: center;
	}

	.team-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-height: 60vh;
		overflow-y: auto;
		padding-right: 0.5rem;
	}

	.team-list li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: #2a2a4e;
		border-radius: 8px;
	}

	.team-pseudo {
		flex: 1;
		font-weight: 500;
	}

	.team-count {
		font-size: 0.85rem;
		color: #888;
	}
</style>
