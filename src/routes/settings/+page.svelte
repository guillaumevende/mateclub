<script lang="ts">
	import { enhance } from '$app/forms';
	import '$lib/shared.css';
	import CloseIconButton from '$lib/components/CloseIconButton.svelte';
	import imageCompression from 'browser-image-compression';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { onMount } from 'svelte';

	type Timezone = { value: string; label: string };
	type BrowserNotificationPermission = 'default' | 'denied' | 'granted';
	type PushConfig = {
		configured: boolean;
		publicKey: string | null;
		subject: string | null;
		missingKeys: string[];
	};
	let { data }: { 
		data: { 
			user?: {
				id: number;
				pseudo: string;
				avatar: string;
				daily_notification_hour: number;
				timezone: string;
				pwa_tutorial_enabled?: number;
				push_notifications_enabled?: number;
			}
			timezones: Timezone[]
			savedImage: string | null
			version: string
			pushConfig: PushConfig
		}, 
	} = $props();

	const emojis = ['☕', '😀', '😎', '🤠', '🥳', '😇', '🤩', '😈', '👻', '🤖', '🎸', '🎮', '🚀', '🍕', '🍺', '🌈', '🔥', '⭐', '❤️'];
	
	const PSEUDO_REGEX = /^[a-zA-Z0-9\s\-._àáâãäåæçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ]{3,22}$/;

	// État local
	let pseudo = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let imagePreview = $state<string | null>(null);
	let isImageAvatar = $state(false);
	let selectedEmoji = $state('☕');
	let savedImageFilename = $state<string | null>(null);

	// Synchroniser avec data quand il change
	$effect(() => {
		pseudo = data.user?.pseudo || '';
		isImageAvatar = data.user?.avatar?.includes('avatar_') || false;
		selectedEmoji = data.user?.avatar?.includes('avatar_') ? '' : (data.user?.avatar || '☕');
		savedImageFilename = data.savedImage;
	});
	let showSuccessModal = $state(false);
	let showMarkAllAsListenedModal = $state(false);
	let compressionProgress = $state(0);
	let isCompressing = $state(false);
	let isDragging = $state(false);
	let isUploading = $state(false);
	let pendingAvatarFile = $state<File | null>(null);
	let hasPendingImage = $state(false);
	let serverError = $state<string | null>(null);
	let hourError = $state<string | null>(null);
	let markAllAsListenedMessage = $state<string | null>(null);
	let pushToggleLoading = $state(false);
	let pushToggleMessage = $state<string | null>(null);
	let pushToggleError = $state<string | null>(null);
	let pushSupported = $state(false);
	let pushPermission = $state<BrowserNotificationPermission>('default');
	let pushEnabled = $state(data.user?.push_notifications_enabled === 1);
	
	// Convertir daily_notification_hour (minutes ou heures) en format HH:mm pour l'input time
	function minutesToHHmm(value: number): string {
		// Si la valeur est < 24, c'est probablement l'ancienne valeur en heures (0-23)
		// On convertit en minutes
		let minutes = value;
		if (value < 24) {
			minutes = value * 60;
		}
		if (typeof minutes !== 'number' || isNaN(minutes)) return '07:00';
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
	}
	let selectedHour = $state('');
	let selectedTimezone = $state('Europe/Paris');
	
	// Initialiser selectedHour après le chargement des données
	$effect(() => {
		selectedHour = minutesToHHmm(data.user?.daily_notification_hour ?? 420);
		selectedTimezone = data.user?.timezone || 'Europe/Paris';
	});

	// Synchroniser avec data quand la page recharge (mais pas si l'utilisateur a déjà modifié le pseudo)
	let hasUserModifiedPseudo = $state(false);
	
	$effect(() => {
		if (data.user && !hasUserModifiedPseudo) {
			pseudo = data.user.pseudo;
			const hasImage = data.user.avatar?.includes('avatar_') || false;
			isImageAvatar = hasImage;
			selectedEmoji = hasImage ? '' : (data.user.avatar || '☕');
			savedImageFilename = data.savedImage;
		}
	});
	
	// Validation pseudo temps réel
	let pseudoError = $derived.by(() => {
		if (pseudo.length === 0) return '';
		if (pseudo.length < 3) return 'Le pseudo doit contenir au moins 3 caractères';
		if (pseudo.length > 22) return 'Le pseudo ne doit pas dépasser 22 caractères';
		if (!PSEUDO_REGEX.test(pseudo)) return 'Caractères non autorisés (emojis et caractères spéciaux interdits)';
		return '';
	});
	
	let passwordValidation = $derived.by(() => {
		if (!password && !confirmPassword) return { valid: true, message: '' };
		if (password.length > 0 && password.length < 10) {
			return { valid: false, message: 'Le mot de passe doit contenir au moins 10 caractères' };
		}
		if (confirmPassword && password !== confirmPassword) {
			return { valid: false, message: 'Les mots de passe ne correspondent pas' };
		}
		if (password.length >= 10 && password === confirmPassword) {
			return { valid: true, message: 'Mots de passe identiques ✓' };
		}
		return { valid: true, message: '' };
	});
	
	function closeSuccessModal() {
		showSuccessModal = false;
	}

	function closeMarkAllAsListenedModal() {
		showMarkAllAsListenedModal = false;
	}

	onMount(() => {
		pushSupported = typeof window !== 'undefined'
			&& 'Notification' in window
			&& 'serviceWorker' in navigator
			&& 'PushManager' in window;
		if (pushSupported) {
			pushPermission = window.Notification.permission as BrowserNotificationPermission;
		}
	});

	function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = window.atob(normalized);
		return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer;
	}

	async function subscribeToPush() {
		if (!data.pushConfig.configured || !data.pushConfig.publicKey) {
			pushToggleError = 'Les notifications push ne sont pas configurées sur ce serveur.';
			return;
		}

		if (!pushSupported) {
			pushToggleError = 'Les notifications push ne sont pas supportées sur cet appareil.';
			return;
		}

		pushToggleLoading = true;
		pushToggleMessage = null;
		pushToggleError = null;

		try {
			const permission = await window.Notification.requestPermission();
			pushPermission = permission;
			if (permission !== 'granted') {
				pushToggleError = 'Autorisez les notifications dans votre navigateur pour les activer.';
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			const existingSubscription = await registration.pushManager.getSubscription();
			const subscription = existingSubscription ?? await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(data.pushConfig.publicKey)
			});

			const response = await fetch('/api/push/subscription', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ subscription: subscription.toJSON() })
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({}));
				throw new Error(result.error || 'Impossible d’activer les notifications push');
			}

			pushEnabled = true;
			pushToggleMessage = 'Notifications push activées. Vous recevrez un rappel à votre heure de mise à disposition.';
		} catch (error) {
			pushToggleError = error instanceof Error ? error.message : 'Impossible d’activer les notifications push';
		} finally {
			pushToggleLoading = false;
		}
	}

	async function unsubscribeFromPush() {
		pushToggleLoading = true;
		pushToggleMessage = null;
		pushToggleError = null;

		try {
			let endpoint: string | null = null;
			if (pushSupported) {
				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();
				endpoint = subscription?.endpoint ?? null;
				await subscription?.unsubscribe().catch(() => {});
			}

			const response = await fetch('/api/push/subscription', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endpoint })
			});

			if (!response.ok) {
				const result = await response.json().catch(() => ({}));
				throw new Error(result.error || 'Impossible de désactiver les notifications push');
			}

			pushEnabled = false;
			pushToggleMessage = 'Notifications push désactivées.';
		} catch (error) {
			pushToggleError = error instanceof Error ? error.message : 'Impossible de désactiver les notifications push';
		} finally {
			pushToggleLoading = false;
		}
	}
	
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
			const file = e.dataTransfer.files[0];
			if (file.type.startsWith('image/')) {
				await processImageFile(file);
			}
		}
	}

	// Détecter Safari/iOS pour HEIC preview
	function canDisplayHeic(): boolean {
		const ua = navigator.userAgent;
		const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Edg');
		const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
		return isSafari || isIOS;
	}

	async function processImageFile(file: File) {
		isCompressing = true;
		compressionProgress = 0;
		
		try {
			const options = {
				maxWidthOrHeight: 800,
				maxSizeMB: 1,
				initialQuality: 0.8,
				useWebWorker: true,
				libURL: '/lib/browser-image-compression.js',
				onProgress: (progress: number) => {
					compressionProgress = Math.round(progress * 100);
				}
			};
			
			const compressedFile = await imageCompression(file, options);
			imagePreview = URL.createObjectURL(compressedFile);
			pendingAvatarFile = compressedFile;
			isImageAvatar = true;
			hasPendingImage = true;
		} catch (error) {
			// Si la compression échoue (ex: HEIC), créer preview seulement sur Safari/iOS
			console.log('Compression non supportée, utilisation du fichier original');
			if (canDisplayHeic()) {
				imagePreview = URL.createObjectURL(file);
			} else {
				imagePreview = null; // Pas de preview sur Chrome/Edge/etc
			}
			pendingAvatarFile = file;
			isImageAvatar = true;
			hasPendingImage = true;
		} finally {
			isCompressing = false;
			compressionProgress = 0;
		}
	}
	
	async function handleImageSelect(e: Event) {
		e.preventDefault();
		e.stopPropagation();
		const input = e.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			await processImageFile(input.files[0]);
		}
	}
	
	async function uploadImage(file: File): Promise<string | null> {
		const formData = new FormData();
		formData.append('image', file);
		
		isUploading = true;
		try {
			const res = await fetch('/api/avatar', {
				method: 'POST',
				body: formData
			});
			
			if (res.ok) {
				const result = await res.json();
				if (result.filename) {
					savedImageFilename = result.filename;
					return result.filename;
				}
			}
		} catch (error) {
			console.error('Erreur upload:', error);
		} finally {
			isUploading = false;
		}
		return null;
	}
	
	async function restoreImage() {
		if (savedImageFilename) {
			try {
				// Mettre à jour l'avatar avec l'image sauvegardée
				const res = await fetch('/api/avatar/restore', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ filename: savedImageFilename })
				});
				
				if (res.ok) {
					isImageAvatar = true;
					selectedEmoji = '';
					// Recharger la page pour afficher la nouvelle image
					window.location.reload();
				}
			} catch (error) {
				console.error('Erreur restauration image:', error);
			}
		}
	}
	
	function cancelImageSelection() {
		pendingAvatarFile = null;
		imagePreview = null;
		hasPendingImage = false;
		isImageAvatar = data.user?.avatar?.includes('avatar_') || false;
	}
	
	async function selectEmoji(emoji: string) {
		// On ne supprime PAS l'image, on garde la possibilité de revenir dessus
		selectedEmoji = emoji;
		isImageAvatar = false;
		// Note: on ne réinitialise PAS imagePreview ici pour garder la preview si on revient à l'image
	}
	
	function getAvatarDisplay() {
		// Si on a une prévisualisation locale (nouvelle image uploadée mais pas encore rechargée)
		if (imagePreview) {
			return { type: 'preview', value: imagePreview };
		}
		
		// Sinon, comportement normal
		if (isImageAvatar && data.user?.avatar) {
			return { type: 'image', value: data.user.avatar };
		}
		return { type: 'emoji', value: selectedEmoji || data.user?.avatar || '☕' };
	}
</script>

<div class="container">
	<h1>Paramètres</h1>

	{#if showSuccessModal}
		<div
			class="modal-overlay"
			use:scrollLock={showSuccessModal}
			onclick={closeSuccessModal}
			onkeydown={(e) => e.key === 'Escape' && closeSuccessModal()}
			role="button"
			tabindex="0"
			aria-label="Fermer la modale"
		>
			<div
				class="modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeSuccessModal()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="success-modal-title"
				tabindex="-1"
			>
				<h2 id="success-modal-title">Succès !</h2>
				<CloseIconButton
					onclick={closeSuccessModal}
					ariaLabel="Fermer"
					size="sm"
					extraClass="settings-success-close-btn"
				/>
				<p class="success-message">Paramètres sauvegardés avec succès !</p>
			</div>
		</div>
	{/if}

	{#if showMarkAllAsListenedModal}
		<div
			class="modal-overlay"
			use:scrollLock={showMarkAllAsListenedModal}
			onclick={closeMarkAllAsListenedModal}
			onkeydown={(e) => e.key === 'Escape' && closeMarkAllAsListenedModal()}
			role="button"
			tabindex="0"
			aria-label="Fermer la confirmation"
		>
			<div
				class="modal confirm-modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeMarkAllAsListenedModal()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="mark-all-listened-title"
				tabindex="-1"
			>
				<h2 id="mark-all-listened-title">Êtes-vous sûr de vouloir tout marquer comme lu ?</h2>
				<p class="confirm-modal-text">Attention, cette action est irréversible.</p>
				<div class="confirm-modal-actions">
					<form method="POST" use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') {
								showMarkAllAsListenedModal = false;
								markAllAsListenedMessage = (result.data as any)?.markAllAsListenedMessage || 'Publications marquées comme lues';
								setTimeout(() => {
									window.location.reload();
								}, 1000);
							}
						};
					}}>
						<input type="hidden" name="intent" value="markAllAsListened" />
						<input type="hidden" name="csrf_token" value={(data as any)?.csrfToken ?? ''} />
						<button type="submit" class="confirm-yes-btn">Oui</button>
					</form>
					<button type="button" class="confirm-cancel-btn" onclick={closeMarkAllAsListenedModal}>Annuler</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Affichage avatar actuel en haut -->
	<div class="current-avatar-display">
		<a href={`/profile/${data.user?.id}`} class="current-avatar-link" aria-label="Voir mon profil">
			{#if getAvatarDisplay().type === 'preview'}
				<img src={getAvatarDisplay().value} alt="Avatar" class="avatar-image" />
			{:else if getAvatarDisplay().type === 'image'}
				<img src="/uploads/avatars/{getAvatarDisplay().value}" alt="Avatar" class="avatar-image" />
			{:else}
				<span class="avatar-emoji">{getAvatarDisplay().value}</span>
			{/if}
		</a>
		{#if isUploading}
			<div class="upload-indicator">Upload...</div>
		{/if}
	</div>

	<form id="settings-form" method="POST" use:enhance={() => {
		// Réinitialiser les erreurs avant soumission
		serverError = null;
		hourError = null;
		
		return async ({ result, update }) => {
			// Upload pending image first if exists
			if (pendingAvatarFile) {
			await uploadImage(pendingAvatarFile);
			pendingAvatarFile = null;
			hasPendingImage = false;
		}
		await update();
		if (result.type === 'success') {
			showSuccessModal = true;
			password = '';
			confirmPassword = '';
			hasPendingImage = false;
			hasUserModifiedPseudo = false; // Reset pour permettre future sync
			// Recharger la page et remonter en haut pour voir le nouvel avatar
			setTimeout(() => {
				window.scrollTo(0, 0);
				window.location.reload();
			}, 1500);
		} else if (result.type === 'failure') {
				if ((result.data as any)?.error) {
					serverError = (result.data as any).error;
					window.scrollTo(0, 0);
				}
				if ((result.data as any)?.hourError) {
					hourError = (result.data as any).hourError;
					// Scroll vers le champ heure
					const hourInput = document.querySelector('.hour-input');
					if (hourInput) {
						hourInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
					}
				}
			}
		};
		}}>
		
		<input type="hidden" name="avatarImage" value={savedImageFilename || ''} />
		<input type="hidden" name="csrf_token" value={(data as any)?.csrfToken ?? ''} />
		
		<!-- Bloc 1: Nom d'utilisateur -->
		<section>
			<h2>Nom d'utilisateur</h2>
			<input 
				type="text" 
				name="pseudo" 
				bind:value={pseudo}
				oninput={() => { hasUserModifiedPseudo = true; serverError = null; }}
				placeholder="Votre pseudo"
				minlength="3"
				maxlength="22"
				required
			/>
			{#if pseudoError}
				<p class="pseudo-feedback error">{pseudoError}</p>
			{/if}
			{#if serverError}
				<p class="pseudo-feedback error">{serverError}</p>
			{/if}
		</section>

		<!-- Bloc 2: Avatar -->
		<section>
			<h2>Avatar</h2>
			
			<!-- Upload image -->
			<div
				class="avatar-upload-section"
				class:dragging={isDragging}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				role="region"
				aria-label="Zone de dépôt d'image"
			>
		{#if imagePreview}
			<div class="image-preview">
				<img src={imagePreview} alt="Preview" />
			</div>
		{/if}
				
				{#if isImageAvatar}
					<label class="upload-zone" class:disabled={isCompressing}>
						<input type="file" accept="image/*" onchange={handleImageSelect} disabled={isCompressing} />
						<span>🖼️ Changer la photo</span>
					</label>
				{:else}
					<label class="upload-zone" class:disabled={isCompressing}>
						<input type="file" accept="image/*" onchange={handleImageSelect} disabled={isCompressing} />
						<span>📷 Prendre ou choisir une photo</span>
					</label>
				{/if}
				
				{#if isCompressing}
					<div class="compression-progress">
						<div class="progress-bar-container">
							<div class="progress-bar-fill" style="width: {compressionProgress}%"></div>
						</div>
						<span class="progress-text">Compression... {compressionProgress}%</span>
					</div>
				{/if}
				
				{#if hasPendingImage && !imagePreview}
					<div class="image-confirmation">
						<p class="confirmation-text">✓ Image sélectionnée - Sauvegardez pour valider</p>
						<button type="button" class="cancel-btn" onclick={cancelImageSelection}>❌ Annuler</button>
					</div>
				{/if}
			</div>
			
			<!-- Grille emojis -->
			<p class="emoji-label">Ou choisissez un emoji :</p>
			<div class="emoji-grid">
				{#each emojis as emoji}
					<label class="emoji-option" class:selected={!isImageAvatar && selectedEmoji === emoji}>
						<input 
							type="radio" 
							name="avatar" 
							value={emoji} 
							checked={!isImageAvatar && selectedEmoji === emoji}
							onclick={() => selectEmoji(emoji)}
						/>
						<span>{emoji}</span>
					</label>
				{/each}
				
				<!-- Option pour revenir à l'image précédente -->
				{#if savedImageFilename}
					<label class="emoji-option image-option" class:selected={isImageAvatar}>
						<input 
							type="radio" 
							name="avatar" 
							value={savedImageFilename}
							checked={isImageAvatar}
							onclick={() => restoreImage()}
						/>
						<img src="/uploads/avatars/{savedImageFilename}" alt="Mon avatar" class="saved-image-thumb" />
					</label>
				{/if}
			</div>
		</section>

		<section>
			<h2>Changer le mot de passe</h2>
			<p class="description">Indiquez ici votre nouveau mot de passe et faites 'Sauvegarder'</p>
			
			<div class="password-section">
				<input 
					type="password" 
					name="password" 
					placeholder="Nouveau mot de passe"
					bind:value={password}
					minlength="10"
				/>
				<input 
					type="password" 
					name="confirmPassword" 
					placeholder="Confirmez le mot de passe"
					bind:value={confirmPassword}
					minlength="10"
				/>
				{#if passwordValidation.message}
					<p class="password-feedback" class:error={!passwordValidation.valid} class:success={passwordValidation.valid && password.length >= 10}>
						{passwordValidation.message}
					</p>
				{/if}
			</div>
		</section>

		<section>
			<h2>Fuseau horaire</h2>
			<p class="description">Utilisé pour afficher les dates et heures dans ton fuseau.</p>

			<select name="timezone" bind:value={selectedTimezone}>
				{#each data.timezones as tz}
					<option value={tz.value}>{tz.label}</option>
				{/each}
			</select>
		</section>

		<section>
			<h2>Heure de disponibilité</h2>
			<p class="description">Les enregistrements de la veille seront disponibles à partir de cette heure (dans ton fuseau horaire).</p>

			<div class="hour-input">
				<input type="time" name="hour" bind:value={selectedHour} />
			</div>
			{#if hourError}
				<p class="hour-feedback error">{hourError}</p>
			{/if}
		</section>

		{#if data.pushConfig.configured}
			<section class="settings-toggle-card push-settings-card">
				<h2>Notifications push</h2>
				<p class="description">Activez un rappel à votre heure quotidienne de mise à disposition. Vous recevrez une notification seulement s'il y a des capsules non lues à écouter.</p>
				<button
					type="button"
					class="toggle-button"
					disabled={pushToggleLoading || (!pushEnabled && (!pushSupported || pushPermission === 'denied'))}
					onclick={() => pushEnabled ? unsubscribeFromPush() : subscribeToPush()}
				>
					{#if pushToggleLoading}
						Mise à jour...
					{:else if pushEnabled}
						Désactiver les notifications push
					{:else}
						Activer les notifications push
					{/if}
				</button>
				{#if pushPermission === 'denied' && !pushEnabled}
					<p class="error-message update-success">Les notifications sont bloquées par le navigateur. Autorisez-les dans les réglages de votre appareil ou du navigateur.</p>
				{:else if !pushSupported}
					<p class="error-message update-success">Les notifications push ne sont pas supportées sur cet appareil ou dans ce navigateur.</p>
				{/if}
				{#if pushToggleMessage}
					<p class="success-message update-success">{pushToggleMessage}</p>
				{/if}
				{#if pushToggleError}
					<p class="error-message update-success">{pushToggleError}</p>
				{/if}
			</section>
		{/if}
	</form>

	<button type="submit" form="settings-form">Sauvegarder</button>

	<section class="settings-toggle-card">
		<h2>Tuto PWA</h2>
		<p class="description">Masque ou réactive les popups qui expliquent comment installer Maté Club en app.</p>

		<form method="POST" class="toggle-form">
			<input type="hidden" name="intent" value="togglePwaTutorial" />
			<input type="hidden" name="enabled" value={data.user?.pwa_tutorial_enabled === 0 ? 'true' : 'false'} />
			<input type="hidden" name="csrf_token" value={(data as any)?.csrfToken ?? ''} />
			<button type="submit" class="toggle-button">
				{data.user?.pwa_tutorial_enabled === 0 ? 'Activer le tuto PWA' : 'Désactiver le tuto PWA'}
			</button>
		</form>
	</section>

	<section class="settings-toggle-card update-card">
		<h2>Se mettre à jour</h2>
		<p class="description">Marquez toutes les publications existantes comme lues.</p>
		<button type="button" class="toggle-button update-button" onclick={() => showMarkAllAsListenedModal = true}>
			Tout marquer comme lu
		</button>
		{#if markAllAsListenedMessage}
			<p class="success-message update-success">{markAllAsListenedMessage}</p>
		{/if}
	</section>

	<a href="/logout" class="btn" data-sveltekit-reload>Déconnexion</a>

	<p class="app-version">v{(data as any).version || ''}</p>
</div>

<style>
	/* Avatar affichage en haut */
	.current-avatar-display {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
		position: relative;
	}

	.current-avatar-link {
		display: inline-flex;
		border-radius: 999px;
		text-decoration: none;
	}

	.avatar-image {
		width: 128px;
		height: 128px;
		border-radius: 50%;
		object-fit: cover;
		border: 3px solid #e94560;
	}

	.avatar-emoji {
		font-size: 6rem;
		width: 128px;
		height: 128px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #1a1a2e;
		border-radius: 50%;
		border: 3px solid #e94560;
	}

	/* Pseudo validation */
	.pseudo-feedback {
		font-size: 0.875rem;
		margin-top: 0.5rem;
		color: #ff6b6b;
	}

	.hour-feedback {
		font-size: 0.875rem;
		margin-top: 0.5rem;
		color: #ff6b6b;
	}

	/* Section Avatar */
	.avatar-upload-section {
		margin-bottom: 1.5rem;
	}

	.upload-zone {
		display: block;
		width: 100%;
		padding: 1.5rem;
		background: #1a1a2e;
		border: 2px dashed #444;
		border-radius: 12px;
		text-align: center;
		cursor: pointer;
		transition: border-color 0.2s, border-width 0.2s, background 0.2s;
		margin-bottom: 1rem;
	}

	.upload-zone:hover {
		border-color: #e94560;
	}

	.avatar-upload-section:global(.dragging) {
		background: rgba(74, 222, 128, 0.1);
	}

	.avatar-upload-section:global(.dragging) .upload-zone {
		border: 4px solid #4ade80;
		border-style: solid;
		background: rgba(74, 222, 128, 0.15);
	}

	.upload-zone input {
		display: none;
	}

	.upload-zone span {
		color: #888;
		font-size: 0.9rem;
	}

	.image-preview {
		width: 100%;
		aspect-ratio: 1;
		max-width: 200px;
		margin: 0 auto 1rem;
		border-radius: 12px;
		overflow: hidden;
	}

	.image-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.image-confirmation {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: rgba(74, 222, 128, 0.1);
		border: 1px solid rgba(74, 222, 128, 0.3);
		border-radius: 8px;
		text-align: center;
	}

	.confirmation-text {
		color: #4ade80;
		font-size: 0.875rem;
		margin: 0 0 0.5rem 0;
	}

	.cancel-btn {
		background: transparent;
		border: 1px solid #ff6b6b;
		color: #ff6b6b;
		padding: 0.25rem 0.75rem;
		font-size: 0.8rem;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		margin: 0;
	}

	.cancel-btn:hover {
		background: #ff6b6b;
		color: #fff;
	}

	.emoji-label {
		color: #888;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 0.5rem;
	}

	.emoji-option {
		cursor: pointer;
	}

	.emoji-option input {
		display: none;
	}

	.emoji-option span {
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

	.emoji-option.selected span,
	.emoji-option input:checked + span {
		background: #e94560;
		transform: scale(1.1);
	}

	/* Style pour l'option image (dernier élément de la grille) */
	.emoji-option.image-option .saved-image-thumb {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		object-fit: cover;
		border: 2px dashed #e94560;
		transition: transform 0.1s, border 0.2s;
	}

	.emoji-option.image-option.selected .saved-image-thumb {
		border: 2px solid #e94560;
		transform: scale(1.1);
	}

	.description {
		color: #888;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.hour-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.hour-input input {
		width: 120px;
		padding: 0.75rem;
		font-size: 1.25rem;
		text-align: center;
		background: #2a2a4e;
		color: #fff;
		border: 1px solid #444;
		border-radius: 8px;
	}

	.hour-input input:focus {
		border-color: #e94560;
		outline: none;
	}

	.password-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.password-feedback {
		font-size: 0.875rem;
		margin-top: 0.5rem;
		min-height: 1.2rem;
	}

	.password-feedback.error {
		color: #ff6b6b;
	}

	.password-feedback.success {
		color: #4ade80;
	}

	select {
		margin-bottom: 1rem;
	}

	button {
		margin-top: 1.5rem;
	}

	.settings-toggle-card {
		margin-top: 1.5rem;
	}

	.toggle-form {
		margin-top: 1rem;
	}

	.toggle-button {
		width: 100%;
	}

	.update-card {
		margin-top: 1.5rem;
	}

	.update-button {
		margin-top: 0;
	}

	.btn {
		display: block;
		width: 100%;
		margin-top: 1.5rem;
		margin-bottom: 3rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		background: #2a2a4e;
		color: #888;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		font-weight: 600;
	}

	/* Styles de la modale de succès */
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
		background: #1a1a2e;
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
		position: relative;
	}

	.modal h2 {
		color: #4ade80;
		margin-bottom: 1rem;
		text-align: center;
	}

	.confirm-modal h2 {
		color: #fff;
		font-size: 1.2rem;
		line-height: 1.4;
	}

	.confirm-modal-text {
		color: #ffb4c0;
		font-size: 0.95rem;
		margin: 0 0 1.25rem;
	}

	.confirm-modal-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
		align-items: stretch;
	}

	.confirm-modal-actions form,
	.confirm-modal-actions button {
		margin: 0;
	}

	.confirm-yes-btn,
	.confirm-cancel-btn {
		width: 100%;
		padding: 0.85rem 1rem;
		border: none;
		border-radius: 10px;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
	}

	.confirm-yes-btn {
		background: #e94560;
		color: #fff;
	}

	.confirm-cancel-btn {
		background: #44485f;
		color: #d3d5e3;
	}

	:global(.settings-success-close-btn) {
		position: absolute;
		top: 1rem;
		right: 1rem;
	}

	.success-message {
		color: #4ade80;
		font-size: 1.1rem;
		font-weight: 500;
		margin: 0;
	}

	.update-success {
		margin-top: 0.75rem;
		font-size: 0.95rem;
	}

	/* Compression progress bar */
	.compression-progress {
		margin-top: 1rem;
		width: 100%;
	}

	.progress-bar-container {
		width: 100%;
		height: 6px;
		background: #2a2a4e;
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #4ade80, #22c55e);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-text {
		font-size: 0.85rem;
		color: #888;
		text-align: center;
		display: block;
	}

	.upload-zone.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.upload-zone.disabled input {
		pointer-events: none;
	}

	.app-version {
		text-align: center;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 0.5rem;
		margin-bottom: 1rem;
	}

	.upload-indicator {
		position: absolute;
		bottom: -2rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.85rem;
		color: #e94560;
		animation: pulse 1s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
</style>
