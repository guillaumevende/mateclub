<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import '$lib/shared.css';
	import Avatar from '$lib/components/Avatar.svelte';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { onDestroy } from 'svelte';

	type User = {
		id: number;
		pseudo: string;
		avatar: string;
		is_admin: number;
		super_powers: number;
		daily_notification_hour: number;
		timezone: string;
		logs_enabled?: number;
		jingles_enabled?: number;
	};

	let { data, form }: { data: PageData & { currentUser?: User; csrfToken?: string }; form?: { success?: boolean; error?: string } } = $props();

	const emojis = ['☕', '😀', '😎', '🤠', '🥳', '😇', '🤩', '😈', '👻', '🤖', '🎸', '🎮', '🚀', '🍕', '🍺', '🌈', '🔥', '⭐', '❤️'];
	
	let selectedAvatar = $state('☕');
	let createError = $state<string | null>(null);
	let createSuccess = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let pseudoError = $state<string | null>(null);

	let adminCount = $derived(data.users.filter(u => u.is_admin).length);
	
	// Modal de confirmation de suppression
	let showDeleteModal = $state(false);
	let userToDelete: User | null = $state(null);
	let countdown = $state(10);
	let countdownInterval: ReturnType<typeof setInterval> | null = $state(null);
	let canConfirmDelete = $state(false);

	let superPowersEnabled = $state(data.currentUser?.super_powers === 1);

	function openDeleteModal(user: User) {
		userToDelete = user;
		showDeleteModal = true;
		countdown = 10;
		canConfirmDelete = false;
		
		countdownInterval = setInterval(() => {
			countdown--;
			if (countdown <= 0) {
				canConfirmDelete = true;
				if (countdownInterval) {
					clearInterval(countdownInterval);
					countdownInterval = null;
				}
			}
		}, 1000);
	}
	
	function closeDeleteModal() {
		showDeleteModal = false;
		userToDelete = null;
		if (countdownInterval) {
			clearInterval(countdownInterval);
			countdownInterval = null;
		}
	}
	
	function confirmDelete() {
		if (canConfirmDelete && userToDelete) {
			const form = document.querySelector(`form[data-user-id="${userToDelete.id}"]`) as HTMLFormElement;
			if (form) {
				form.requestSubmit();
			}
		}
	}
	
	onDestroy(() => {
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}
	});
</script>

<div class="container">
	<h1>Administration</h1>

	<section>
		<h2>Mes super pouvoirs</h2>
		
		{#if data.currentUser?.super_powers === 1}
			<p class="super-text">
				Vous avez des super pouvoirs : vous pouvez écouter les enregistrements du jour 
				sans attendre votre prochaine livraison. Jouez le jeu et annulez cette possibilité 
				en cliquant ci-dessous.
			</p>
			<form method="POST" action="?/toggleSuperPowers">
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="false" />
				<button type="submit" class="super-btn">✅ Désactiver les super pouvoirs</button>
			</form>
		{:else}
			<p class="super-text">
				Vous n'avez aucun privilège. Activez les super pouvoirs pour écouter 
				les enregistrements du jour sans attendre votre prochaine livraison. 
				Vous devriez jouer le jeu et ne l'activer qu'à titre exceptionnel.
			</p>
			<form method="POST" action="?/toggleSuperPowers">
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="true" />
				<button type="submit" class="super-btn">✨ Activer les super pouvoirs</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Logs</h2>
		<p class="super-text">
			Affichez le bouton d'accès aux logs du player audio (pour développement et debug).
		</p>
		{#if data.currentUser?.logs_enabled === 1}
			<form method="POST" action="?/toggleLogs" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						// Force reload to get updated data
						window.location.reload();
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="false" />
				<button type="submit" class="super-btn logs-btn">🔴 Désactiver les logs</button>
			</form>
		{:else}
			<form method="POST" action="?/toggleLogs" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						// Force reload to get updated data
						window.location.reload();
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="true" />
				<button type="submit" class="super-btn logs-btn">✅ Activer les logs</button>
			</form>
		{/if}
 	</section>

	<section>
		<h2>Jingle d'intro</h2>
		<p class="super-text">
			Ajoutez un jingle musical au début de la première capsule de la journée.
		</p>
		{#if data.currentUser?.jingles_enabled === 1}
			<form method="POST" action="?/toggleJingles" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						window.location.reload();
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="false" />
				<button type="submit" class="super-btn logs-btn">🔊 Désactiver le jingle</button>
			</form>
		{:else}
			<form method="POST" action="?/toggleJingles" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						window.location.reload();
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="true" />
				<button type="submit" class="super-btn logs-btn">🔇 Activer le jingle</button>
			</form>
		{/if}
	</section>

	<section>
		<h2>Créer un utilisateur</h2>
		<form method="POST" action="?/create" use:enhance={() => {
			return async ({ result }) => {
			if (result.type === 'failure' && (result.data as any)?.error) {
				const errorMsg = (result.data as any).error;
				const lowerError = errorMsg.toLowerCase();
				// Si c'est une erreur de mot de passe (12 caractères), l'afficher sous le champ password
				if (lowerError.includes('12 caractères')) {
					passwordError = errorMsg;
					pseudoError = null;
					createError = null;
				// Si c'est une erreur de pseudo déjà utilisé, l'afficher sous le champ pseudo
				} else if (lowerError.includes('déjà') || lowerError.includes('utilisateur') || lowerError.includes('nom')) {
					pseudoError = errorMsg;
					passwordError = null;
					createError = null;
				} else {
					createError = errorMsg;
					passwordError = null;
					pseudoError = null;
				}
				createSuccess = null;
			} else if (result.type === 'success') {
				createError = null;
				passwordError = null;
				pseudoError = null;
				createSuccess = (result.data as any)?.message || 'Utilisateur créé avec succès';
				selectedAvatar = '☕';
				// Réinitialiser le formulaire
				const form = document.querySelector('form[action="?/create"]') as HTMLFormElement;
				if (form) form.reset();
			}
			};
		}}>
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<div class="pseudo-field">
				<input type="text" name="pseudo" placeholder="Pseudo" required />
				{#if pseudoError}
					<p class="field-error">{pseudoError}</p>
				{/if}
			</div>
			<div class="password-field">
				<input 
					type="password" 
					name="password" 
					placeholder="Mot de passe (12 caractères minimum)" 
					required 
					oninput={(e) => {
						const value = (e.target as HTMLInputElement).value;
						if (value.length > 0 && value.length < 12) {
							passwordError = 'Le mot de passe doit contenir au moins 12 caractères';
						} else {
							passwordError = null;
						}
					}}
				/>
				{#if passwordError}
					<p class="field-error">{passwordError}</p>
				{/if}
			</div>
			<label class="checkbox">
				<input type="checkbox" name="is_admin" />
				Admin
			</label>
			<p class="avatar-label">Avatar par défaut :</p>
			<div class="avatar-selection">
				{#each emojis as emoji}
					<label class="avatar-option" class:selected={selectedAvatar === emoji}>
						<input 
							type="radio" 
							name="avatar" 
							value={emoji} 
							checked={selectedAvatar === emoji}
							onclick={() => selectedAvatar = emoji}
						/>
						<span>{emoji}</span>
					</label>
				{/each}
			</div>
			{#if createError}
				<p class="error-message">{createError}</p>
			{/if}
			{#if createSuccess}
				<p class="success-message">{createSuccess}</p>
			{/if}
			<button type="submit">Créer</button>
		</form>
	</section>

	<section>
		<h2>Utilisateurs</h2>
		<div class="users">
			{#each data.users as user}
				{@const isLastAdmin = user.is_admin && adminCount === 1}
				{@const isSelf = user.id === data.currentUser?.id}
				{@const canDelete = !isLastAdmin && !isSelf}
				<div class="user">
					<Avatar avatar={user.avatar} size="small" />
					<span class="pseudo">{user.pseudo}</span>
					<span class="badge" class:admin={user.is_admin} class:member={!user.is_admin}>{user.is_admin ? 'Admin' : 'Membre'}</span>
					<form method="POST" action="?/delete" style="display: none" data-user-id={user.id}>
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						<input type="hidden" name="user_id" value={user.id} />
					</form>
					<button 
						type="button" 
						class="delete"
						class:disabled={!canDelete}
						disabled={!canDelete}
						title={isSelf ? 'Vous ne pouvez pas vous supprimer vous-même' : (isLastAdmin ? 'Impossible de supprimer le dernier admin' : '')}
						onclick={() => canDelete && openDeleteModal(user)}
					>
						Supprimer
					</button>
				</div>
			{/each}
		</div>
	</section>

	{#if showDeleteModal && userToDelete}
		<div class="modal-overlay" use:scrollLock={showDeleteModal} onclick={closeDeleteModal}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>⚠️ Action sensible ⚠️</h3>
				<p class="warning-text">
					En confirmant la suppression de l'utilisateur <strong>{userToDelete.pseudo}</strong>, 
					il perdra son accès à l'application, ne pourra plus écouter ni participer. 
					Toutes ses participations audio seront supprimées ainsi que les éventuelles images associées. 
					Vous êtes sûr(e) ?
				</p>
				<p class="irreversible">Cette action est irréversible.</p>
				
				<div class="countdown">
					{#if !canConfirmDelete}
						<span class="timer">Attendez {countdown} secondes...</span>
					{/if}
				</div>
				
				<div class="actions">
					<button class="cancel" onclick={closeDeleteModal}>Annuler</button>
					<button 
						class="confirm" 
						disabled={!canConfirmDelete}
						class:disabled={!canConfirmDelete}
						onclick={confirmDelete}
					>
						{canConfirmDelete ? 'Confirmer la suppression' : `Attendez (${countdown})`}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.users {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.user {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #1a1a2e;
		border-radius: 8px;
	}

	.pseudo {
		flex: 1;
		font-weight: 600;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.badge.admin {
		background: #e94560;
	}

	.badge.member {
		background: transparent;
		border: 1px solid #e94560;
		color: #e94560;
	}

	.save-btn {
		margin-top: 1rem;
		background: #e94560;
		width: 100%;
	}

	.delete {
		background: #ff6b6b;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.delete.disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background: #666;
	}

	.avatar-label {
		color: #888;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
		margin-top: 1rem;
	}

	.avatar-selection {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.avatar-option {
		cursor: pointer;
	}

	.avatar-option input {
		display: none;
	}

	.avatar-option span {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		width: 44px;
		height: 44px;
		background: #1a1a2e;
		border-radius: 8px;
		transition: transform 0.1s, background 0.2s;
	}

	.avatar-option.selected span,
	.avatar-option input:checked + span {
		background: #e94560;
		transform: scale(1.1);
	}

	.super-text {
		color: #aaa;
		line-height: 1.6;
		margin-bottom: 1rem;
	}

	.super-btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		background: #e94560;
		color: #fff;
	}

	.super-btn:hover {
		background: #d63650;
	}

	/* Modal de confirmation */
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
		padding: 1rem;
	}

	.modal {
		background: #2a2a4e;
		padding: 2rem;
		border-radius: 12px;
		max-width: 400px;
		width: 100%;
		text-align: center;
	}

	.modal h3 {
		color: #e94560;
		margin-bottom: 1rem;
	}

	.modal p {
		margin-bottom: 0.5rem;
		color: #fff;
	}

	.modal .warning-text {
		color: #fff;
		line-height: 1.5;
		margin-bottom: 1rem;
	}

	.modal .irreversible {
		color: #ff6b6b;
		font-weight: 600;
		margin-bottom: 1.5rem;
	}

	.countdown {
		margin: 1.5rem 0;
	}

	.timer {
		font-size: 1.25rem;
		color: #e94560;
		font-weight: bold;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.actions button {
		flex: 1;
		padding: 0.75rem 1rem;
	}

	.actions .cancel {
		background: #2a2a4e;
		border: 1px solid #888;
		color: #888;
	}

	.actions .cancel:hover {
		background: #888;
		color: #fff;
	}

	.actions .confirm {
		background: #ff6b6b;
	}

	.actions .confirm.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message {
		color: #ff6b6b;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.success-message {
		color: #4caf50;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.password-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.password-field input::placeholder {
		font-size: 0.85rem;
	}

	.field-error {
		color: #ff6b6b;
		font-size: 0.8rem;
		margin: 0;
		padding-left: 0.5rem;
	}

	.pseudo-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
</style>
