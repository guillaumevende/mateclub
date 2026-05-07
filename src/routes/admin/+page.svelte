<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import '$lib/shared.css';
	import UserProfileAvatarLink from '$lib/components/UserProfileAvatarLink.svelte';
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
		created_at: string;
		last_login: string | null;
		logs_enabled?: number;
		jingles_enabled?: number;
	};

	type AppSettings = {
		groupName: string;
		historyMonths: number;
		maxRecordingSeconds: number;
		maxGroupNameLength: number;
	};

	type PendingRegistration = {
		id: number;
		pseudo: string;
		avatar: string;
		timezone: string;
		is_admin: number;
		requested_at: string;
		status: string;
	};

	let { data, form }: { data: PageData & { currentUser?: User; csrfToken?: string; pendingRegistrations?: PendingRegistration[]; allowRegistration?: boolean; oldestAdminId?: number | null; appSettings: AppSettings }; form?: { success?: boolean; error?: string; message?: string } } = $props();

	const emojis = ['☕', '😀', '😎', '🤠', '🥳', '😇', '🤩', '😈', '👻', '🤖', '🎸', '🎮', '🚀', '🍕', '🍺', '🌈', '🔥', '⭐', '❤️'];
	
	let selectedAvatar = $state('☕');
	let createError = $state<string | null>(null);
	let createSuccess = $state<string | null>(null);
	let passwordError = $state<string | null>(null);
	let pseudoError = $state<string | null>(null);
	let resetPasswordErrors = $state<Record<number, string>>({});
	let resetPasswordSuccess = $state<Record<number, string>>({});
	let resetPasswordLoading = $state<Record<number, boolean>>({});
	let unreadMarkingMessage = $state<string | null>(null);
	let unreadMarkingError = $state<string | null>(null);
	let unreadMarkingLoading = $state(false);
	let groupConfigMessage = $state<string | null>(null);
	let groupConfigError = $state<string | null>(null);
	let isSavingGroupConfig = $state(false);
	let groupName = $state('');
	let historyMonths = $state(3);
	let maxRecordingMinutes = $state(3);
	let maxRecordingSeconds = $state(0);
	
	// État du formulaire de création
	let isCreatingUser = $state(false);
	let pseudo = $state('');
	let password = $state('');

	// Modal de confirmation de suppression
	let showDeleteModal = $state(false);
	let userToDelete: User | null = $state(null);
	let countdown = $state(10);
	let countdownInterval: ReturnType<typeof setInterval> | null = $state(null);
	let canConfirmDelete = $state(false);

	let superPowersEnabled = $state(false);
	let allowRegistrationEnabled = $state(false);

	// Synchroniser avec data quand il change
	$effect(() => {
		superPowersEnabled = data.currentUser?.super_powers === 1;
		allowRegistrationEnabled = data.allowRegistration === true;
		groupName = data.appSettings?.groupName ?? '';
		historyMonths = data.appSettings?.historyMonths ?? 3;
		const duration = data.appSettings?.maxRecordingSeconds ?? 180;
		maxRecordingMinutes = Math.floor(duration / 60);
		maxRecordingSeconds = duration % 60;
	});

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

	function clearResetPasswordStatus(userId: number) {
		resetPasswordErrors = { ...resetPasswordErrors, [userId]: '' };
		resetPasswordSuccess = { ...resetPasswordSuccess, [userId]: '' };
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
		<h2>Configuration du groupe</h2>
		<form method="POST" action="?/saveGroupConfig" use:enhance={() => {
			isSavingGroupConfig = true;
			groupConfigMessage = null;
			groupConfigError = null;

			return async ({ result }) => {
				isSavingGroupConfig = false;

				if (result.type === 'success') {
					groupConfigMessage = (result.data as any)?.message || 'Réglages enregistrés';
					const savedSettings = (result.data as any)?.appSettings as AppSettings | undefined;
					if (savedSettings) {
						groupName = savedSettings.groupName;
						historyMonths = savedSettings.historyMonths;
						maxRecordingMinutes = Math.floor(savedSettings.maxRecordingSeconds / 60);
						maxRecordingSeconds = savedSettings.maxRecordingSeconds % 60;
					}
				} else if (result.type === 'failure') {
					groupConfigError = (result.data as any)?.error || 'Impossible d’enregistrer les réglages';
				}
			};
		}} class="group-config-form">
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<label class="config-field">
				<span class="config-label">Nom du groupe :</span>
				<input
					type="text"
					name="group_name"
					maxlength={data.appSettings.maxGroupNameLength}
					bind:value={groupName}
					placeholder="Facultatif"
				/>
				<span class="config-hint">{data.appSettings.maxGroupNameLength} caractères maximum</span>
			</label>

			<label class="config-field">
				<span class="config-label">Durée d'historique disponible en mois :</span>
				<input
					type="number"
					name="history_months"
					min="1"
					max="24"
					step="1"
					bind:value={historyMonths}
					required
				/>
				<span class="config-hint">Nombre entier entre 1 et 24. Valeur par défaut : 3.</span>
			</label>

			<div class="config-field">
				<span class="config-label">Durée maximum des messages audio :</span>
				<div class="duration-config-fields">
					<label>
						<span>Minutes</span>
						<input
							type="number"
							name="max_recording_minutes"
							min="0"
							max="60"
							step="1"
							bind:value={maxRecordingMinutes}
							required
						/>
					</label>
					<label>
						<span>Secondes</span>
						<input
							type="number"
							name="max_recording_seconds"
							min="0"
							max="59"
							step="1"
							bind:value={maxRecordingSeconds}
							required
						/>
					</label>
				</div>
				<span class="config-hint">Valeur par défaut : 3 minutes et 0 seconde.</span>
			</div>

			{#if groupConfigMessage}
				<p class="success-message">{groupConfigMessage}</p>
			{/if}
			{#if groupConfigError}
				<p class="error-message">{groupConfigError}</p>
			{/if}

			<button type="submit" class="super-btn section-action-btn" disabled={isSavingGroupConfig}>
				{isSavingGroupConfig ? 'Enregistrement...' : 'Enregistrer les réglages'}
			</button>
		</form>
	</section>

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
		<h2>Marquage non lu</h2>
		<p class="super-text">
			Cette option vous permet de mettre les 5 dernières capsules audio diffusées par d'autres utilisateurs comme non lues.
		</p>
		<form method="POST" action="?/markLatestUnread" use:enhance={() => {
			unreadMarkingLoading = true;
			unreadMarkingMessage = null;
			unreadMarkingError = null;

			return async ({ result }) => {
				unreadMarkingLoading = false;

				if (result.type === 'success') {
					unreadMarkingMessage = (result.data as any)?.message || 'Capsules passées en non lu';
					unreadMarkingError = null;
				} else if (result.type === 'failure') {
					unreadMarkingError = (result.data as any)?.error || 'Impossible de passer les capsules en non lu';
					unreadMarkingMessage = null;
				}
			};
		}}>
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<button type="submit" class="super-btn logs-btn" disabled={unreadMarkingLoading}>
				{unreadMarkingLoading ? 'Passage en cours...' : 'Passage en non lu'}
			</button>
			{#if unreadMarkingMessage}
				<p class="success-message">{unreadMarkingMessage}</p>
			{/if}
			{#if unreadMarkingError}
				<p class="error-message">{unreadMarkingError}</p>
			{/if}
		</form>
 	</section>

	<section>
		<h2>Nettoyage</h2>
		<p class="super-text">
			Supprimez des messages courts enregistrés par erreur.
		</p>
		<a class="super-btn cleanup-link section-action-btn" href="/admin/cleanup">Vérifier</a>
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
		<h2>Configuration des inscriptions</h2>
		<p class="super-text">
			Autorisez ou interdisez les nouvelles inscriptions. Quand les inscriptions sont ouvertes, 
			les visiteurs peuvent créer un compte qui devra être validé par un administrateur.
		</p>
		{#if allowRegistrationEnabled}
			<form method="POST" action="?/toggleRegistration" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						allowRegistrationEnabled = false;
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="false" />
				<button type="submit" class="super-btn registration-btn">🔴 Fermer les inscriptions</button>
			</form>
		{:else}
			<form method="POST" action="?/toggleRegistration" use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						allowRegistrationEnabled = true;
					}
				};
			}}>
				<input type="hidden" name="csrf_token" value={data.csrfToken} />
				<input type="hidden" name="enabled" value="true" />
				<button type="submit" class="super-btn registration-btn">✅ Ouvrir les inscriptions</button>
			</form>
		{/if}
	</section>

	{#if data.pendingRegistrations && data.pendingRegistrations.length > 0}
	<section class="pending-section">
		<h2>Inscriptions en attente ({data.pendingRegistrations.length})</h2>
		<p class="super-text">
			Validez ou rejetez les demandes d'inscription. Les utilisateurs rejetés sont supprimés définitivement.
		</p>
		
		<div class="pending-list">
			{#each data.pendingRegistrations as registration}
			<div class="pending-item">
				<div class="pending-info">
					<div class="pending-header">
						<span class="pending-avatar">{registration.avatar}</span>
						<div class="pending-identity">
							<span class="pending-pseudo">{registration.pseudo}</span>
							{#if registration.is_admin}
								<span class="badge admin">Admin</span>
							{/if}
						</div>
					</div>
					<div class="pending-meta">
						<span class="pending-timezone">🌍 {registration.timezone}</span>
						<span class="pending-date">
							📅 Inscrit(e) le {(registration.requested_at.includes('T') || registration.requested_at.includes('Z') ? new Date(registration.requested_at) : new Date(registration.requested_at.replace(' ', 'T') + 'Z')).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {(registration.requested_at.includes('T') || registration.requested_at.includes('Z') ? new Date(registration.requested_at) : new Date(registration.requested_at.replace(' ', 'T') + 'Z')).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
						</span>
					</div>
				</div>
				<div class="pending-decision">
					<form method="POST" action="?/approveRegistration" use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								window.location.reload();
							}
						};
					}} class="approve-form">
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						<input type="hidden" name="registration_id" value={registration.id} />
						<label class="checkbox-inline">
							<input type="checkbox" name="is_admin" checked={registration.is_admin === 1} />
							Valider comme admin
						</label>
						<button type="submit" class="decision-btn approve-btn">Valider</button>
					</form>
					<form method="POST" action="?/rejectRegistration" use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								window.location.reload();
							}
						};
					}} class="reject-form">
						<input type="hidden" name="csrf_token" value={data.csrfToken} />
						<input type="hidden" name="registration_id" value={registration.id} />
						<button type="submit" class="decision-btn reject-btn">Refuser</button>
					</form>
				</div>
			</div>
			{/each}
		</div>
	</section>
	{:else}
	<section class="pending-section empty">
		<h2>Inscriptions en attente</h2>
		<p class="super-text">Aucune inscription en attente.</p>
	</section>
	{/if}

	<section>
		<h2>Créer un utilisateur</h2>
		<form method="POST" action="?/create" use:enhance={() => {
			// Désactiver le bouton pendant le traitement
			isCreatingUser = true;
			
			return async ({ result }) => {
				isCreatingUser = false;
				
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
				
				// Réinitialiser le formulaire
				pseudo = '';
				password = '';
				
			// Forcer le rafraîchissement de la page pour voir le nouvel utilisateur
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			}
		};
	}}>
			<input type="hidden" name="csrf_token" value={data.csrfToken} />
			<div class="pseudo-field">
				<input 
					type="text" 
					name="pseudo" 
					placeholder="Pseudo" 
					required 
					oninput={() => pseudoError = null}
				/>
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
			<button type="submit" disabled={isCreatingUser}>
				{#if isCreatingUser}
					Création...
				{:else}
					Créer
				{/if}
			</button>
		</form>
	</section>

	<section>
		<h2>Utilisateurs</h2>
		<div class="users">
			{#each data.users as user}
				{@const isSelf = user.id === data.currentUser?.id}
				{@const canDelete = !user.is_admin && !isSelf}
				{@const canRemoveAdmin = user.is_admin && user.id !== data.oldestAdminId}
				{@const createdAt = user.created_at.includes('T') || user.created_at.includes('Z') ? new Date(user.created_at) : new Date(user.created_at.replace(' ', 'T') + 'Z')}
				{@const lastLogin = user.last_login ? (user.last_login.includes('T') || user.last_login.includes('Z') ? new Date(user.last_login) : new Date(user.last_login.replace(' ', 'T') + 'Z')) : null}
				<div class="user-card">
					<div class="user-row">
						<div class="user-left">
							<UserProfileAvatarLink userId={user.id} avatar={user.avatar} size="small" label={`Voir le profil de ${user.pseudo}`} />
							<span class="user-pseudo">{user.pseudo}</span>
						</div>
						<div class="user-right">
							<span class="badge" class:admin={user.is_admin} class:member={!user.is_admin}>
								{user.is_admin ? 'Admin' : 'Membre'}
							</span>
						</div>
					</div>
					<div class="user-row">
						<div class="user-left">
							<span class="user-timezone">🌍 {user.timezone}</span>
						</div>
						<div class="user-right">
							<span class="user-created">{createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
						</div>
					</div>
					{#if lastLogin}
					<div class="user-row">
						<div class="user-left">
							<span class="user-last-login-label">Dernière connexion :</span>
						</div>
						<div class="user-right">
							<span class="user-last-login">{lastLogin.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à {lastLogin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
						</div>
					</div>
					{/if}
					<div class="user-row user-actions">
						<form method="POST" action="?/delete" style="display: none" data-user-id={user.id}>
							<input type="hidden" name="csrf_token" value={data.csrfToken} />
							<input type="hidden" name="user_id" value={user.id} />
						</form>
						{#if !isSelf}
							<form method="POST" action="?/toggleUserLogs" use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										window.location.reload();
									}
								};
							}}>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="user_id" value={user.id} />
								<input type="hidden" name="enabled" value={user.logs_enabled === 1 ? 'false' : 'true'} />
								<button type="submit" class="logs-toggle-user">
									{user.logs_enabled === 1 ? '🪵 Désactiver logs' : '🪵 Activer logs'}
								</button>
							</form>
						{/if}
						{#if !user.is_admin}
							<form method="POST" action="?/promoteToAdmin" use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										window.location.reload();
									}
								};
							}}>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="user_id" value={user.id} />
								<button type="submit" class="promote-admin">
									👑 Rendre admin
								</button>
							</form>
						{:else if canRemoveAdmin}
							<form method="POST" action="?/removeAdmin" use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										window.location.reload();
									}
								};
							}}>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="user_id" value={user.id} />
								<button type="submit" class="demote-admin">
									⬇️ Retirer admin
								</button>
							</form>
						{/if}
						<button 
							type="button" 
							class="delete"
							class:disabled={!canDelete}
							disabled={!canDelete}
							title={isSelf ? 'Vous ne pouvez pas vous supprimer vous-même' : (user.is_admin ? 'Impossible de supprimer un administrateur' : '')}
							onclick={() => canDelete && openDeleteModal(user)}
						>
							🗑️ Supprimer
						</button>
					</div>
					{#if !user.is_admin || isSelf}
						<details class="password-reset">
							<summary>🔐 Modifier le mot de passe</summary>
							<form method="POST" action="?/resetPassword" class="password-reset-form" use:enhance={() => {
								resetPasswordLoading = { ...resetPasswordLoading, [user.id]: true };
								resetPasswordErrors = { ...resetPasswordErrors, [user.id]: '' };
								resetPasswordSuccess = { ...resetPasswordSuccess, [user.id]: '' };

								return async ({ result, formElement }) => {
									resetPasswordLoading = { ...resetPasswordLoading, [user.id]: false };

									if (result.type === 'failure') {
										resetPasswordErrors = {
											...resetPasswordErrors,
											[user.id]: (result.data as any)?.error || 'Erreur lors de la modification'
										};
										resetPasswordSuccess = { ...resetPasswordSuccess, [user.id]: '' };
									} else if (result.type === 'success') {
										resetPasswordSuccess = {
											...resetPasswordSuccess,
											[user.id]: (result.data as any)?.message || 'Mot de passe mis à jour'
										};
										resetPasswordErrors = { ...resetPasswordErrors, [user.id]: '' };
										formElement.reset();
									}
								};
							}}>
								<input type="hidden" name="csrf_token" value={data.csrfToken} />
								<input type="hidden" name="user_id" value={user.id} />
								<div class="password-reset-fields">
									<input
										type="password"
										name="password"
										placeholder="Nouveau mot de passe"
										minlength="12"
										required
										autocomplete="new-password"
										oninput={() => clearResetPasswordStatus(user.id)}
									/>
									<input
										type="password"
										name="confirm_password"
										placeholder="Confirmer le mot de passe"
										minlength="12"
										required
										autocomplete="new-password"
										oninput={() => clearResetPasswordStatus(user.id)}
									/>
								</div>
								<p class="password-reset-hint">12 caractères minimum. Le changement est immédiat.</p>
								{#if resetPasswordErrors[user.id]}
									<p class="field-error">{resetPasswordErrors[user.id]}</p>
								{/if}
								{#if resetPasswordSuccess[user.id]}
									<p class="success-message compact">{resetPasswordSuccess[user.id]}</p>
								{/if}
								<button type="submit" class="password-reset-submit" disabled={resetPasswordLoading[user.id]}>
									{resetPasswordLoading[user.id] ? 'Mise à jour...' : 'Mettre à jour'}
								</button>
							</form>
						</details>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	{#if showDeleteModal && userToDelete}
		<div
			class="modal-overlay"
			use:scrollLock={showDeleteModal}
			onclick={closeDeleteModal}
			onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}
			role="button"
			tabindex="0"
			aria-label="Fermer la modale"
		>
			<div
				class="modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="admin-delete-modal-title"
				tabindex="-1"
			>
				<h3 id="admin-delete-modal-title">⚠️ Action sensible ⚠️</h3>
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
		gap: 0.75rem;
	}

	.user-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: #1a1a2e;
		border-radius: 8px;
	}

	.user-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.user-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.user-right {
		display: flex;
		align-items: center;
	}

	.user-pseudo {
		font-weight: 600;
		color: #eee;
		font-size: 1rem;
	}

	.user-timezone {
		color: #aaa;
		font-size: 0.85rem;
	}

	.user-created {
		color: #666;
		font-size: 0.75rem;
	}

	.user-last-login-label {
		color: #888;
		font-size: 0.85rem;
	}

	.user-last-login {
		color: #fff;
		font-size: 0.85rem;
	}

	.badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.badge.admin {
		background: #e94560;
		color: #fff;
	}

	.badge.member {
		background: #666;
		color: #fff;
	}

	.user-actions {
		justify-content: flex-end;
		margin-top: 0.5rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	button[type="submit"]:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: #666;
	}

	.logs-toggle-user,
	.promote-admin,
	.demote-admin {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	.logs-toggle-user {
		background: #2e6bd9;
	}

	.promote-admin {
		background: #9b59b6;
	}

	.demote-admin {
		background: #7a5f2a;
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

	.password-reset {
		margin-top: 0.35rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 0.75rem;
	}

	.password-reset summary {
		color: #ddd;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 600;
		list-style-position: inside;
	}

	.password-reset summary:hover {
		color: #fff;
	}

	.password-reset-form {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		margin-top: 0.75rem;
	}

	.password-reset-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.password-reset-fields input {
		min-width: 0;
		margin-bottom: 0;
		font-size: 0.9rem;
	}

	.password-reset-hint {
		color: #8f8da8;
		font-size: 0.78rem;
		margin: 0;
	}

	.password-reset-submit {
		align-self: flex-start;
		background: #e94560;
		padding: 0.55rem 1rem;
		font-size: 0.875rem;
	}

	.success-message.compact {
		margin: 0;
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

	.cleanup-link {
		text-decoration: none;
	}

	.section-action-btn {
		display: block;
		width: 100%;
		box-sizing: border-box;
		text-align: center;
	}

	.group-config-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.config-field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.config-label {
		color: #eee;
		font-weight: 600;
	}

	.config-hint {
		color: #8e8aa8;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.duration-config-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem;
	}

	.duration-config-fields label {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: #cfcde6;
		font-size: 0.95rem;
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

	.registration-btn {
		width: 100%;
	}

	.pending-section {
		background: #2a2a4e;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.pending-section.empty {
		opacity: 0.6;
	}

	.pending-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1rem;
	}

	.pending-item {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		background: #1a1a2e;
		padding: 1rem;
		border-radius: 8px;
		gap: 1rem;
	}

	.pending-info {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.75rem;
	}

	.pending-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-width: 0;
	}

	.pending-avatar {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.pending-identity {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
		min-width: 0;
	}

	.pending-pseudo {
		font-weight: 600;
		color: #eee;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.pending-date {
		color: #a9a8bd;
		font-size: 0.75rem;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	.pending-timezone {
		color: #a9a8bd;
		font-size: 0.75rem;
		overflow-wrap: anywhere;
	}

	.pending-meta {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.pending-decision {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.decision-btn {
		border: none;
		padding: 0.75rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		font-size: 0.875rem;
		width: 100%;
	}

	.approve-btn {
		background: #22c55e;
		color: white;
	}

	.approve-btn:hover {
		background: #16a34a;
	}

	.reject-btn {
		background: rgba(239, 68, 68, 0.16);
		color: #ffd5d5;
		border: 1px solid rgba(239, 68, 68, 0.4);
	}

	.reject-btn:hover {
		background: rgba(239, 68, 68, 0.22);
	}

	.approve-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.reject-form {
		display: block;
	}

	.checkbox-inline {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		color: #ccc;
		font-size: 0.9rem;
		padding: 0.1rem 0;
	}

	@media (max-width: 520px) {
		.pending-section {
			padding: 1rem;
		}

		.password-reset-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
