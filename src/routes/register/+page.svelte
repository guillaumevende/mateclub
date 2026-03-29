<script lang="ts">
	import type { ActionData } from './$types';

	let { form, data }: { form: ActionData; data: any } = $props();
	
	// Liste des emojis pour l'avatar (même liste que dans admin)
	const emojis = ['☕', '😀', '😎', '🤠', '🥳', '😇', '🤩', '😈', '👻', '🤖', '🎸', '🎮', '🚀', '🍕', '🍺', '🌈', '🔥', '⭐', '❤️'];
	
	let selectedAvatar = $state('☕');
	let selectedTimezone = $state('Europe/Paris');
	let password = $state('');
	let passwordConfirm = $state('');
	let pseudo = $state('');
	let passwordsMatch = $state(true);
	let passwordLengthValid = $state(true);
	
	function checkPasswords() {
		passwordsMatch = password === passwordConfirm;
	}
	
	function checkPasswordLength() {
		passwordLengthValid = password.length >= 12 || password.length === 0;
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			(e.target as HTMLInputElement).form?.requestSubmit();
		}
	}
</script>

<div class="register-container">
	<img src="/icon-512x512.png" alt="Maté Club" class="logo" />

	{#if form?.success}
		<div class="success-message">
			<h2>✅ Inscription réussie !</h2>
			<p>{form?.message}</p>
			<a href="/login" class="back-link">Retour à la connexion</a>
		</div>
	{:else if data?.closed}
		<div class="closed-message">
			<h2>🔒 Inscriptions fermées</h2>
			<p>Les inscriptions ne sont pas possibles pour le moment.</p>
			<p class="sub-message">Contacte l'administrateur pour qu'il permette les inscriptions.</p>
			<a href="/login" class="back-link">Retour à la connexion</a>
		</div>
	{:else}
		<h1>Inscription</h1>
		
		<form method="POST">
			<input type="hidden" name="csrf_token" value={data?.csrfToken} />
			<input type="hidden" name="avatar" value={selectedAvatar} />
			<input type="hidden" name="timezone" value={selectedTimezone} />
			
			<div class="form-group">
				<label for="pseudo">Pseudo</label>
				<input 
					type="text" 
					id="pseudo" 
					name="pseudo" 
					placeholder="Choisis un pseudo" 
					required 
					minlength="3"
					maxlength="30"
					autocomplete="username"
					bind:value={pseudo}
					onkeydown={handleKeydown}
					class:error={form?.pseudoError}
				/>
			</div>

			<div class="form-group">
				<label for="password">Mot de passe</label>
				<input 
					type="password" 
					id="password" 
					name="password" 
					placeholder="Mot de passe (min. 12 caractères)" 
					required 
					minlength="12"
					autocomplete="new-password"
					bind:value={password}
					oninput={checkPasswordLength}
					onkeydown={handleKeydown}
					class:error={form?.passwordError || !passwordLengthValid}
				/>
				{#if !passwordLengthValid}
					<p class="field-error">Le mot de passe doit contenir au moins 12 caractères</p>
				{/if}
			</div>

			<div class="form-group">
				<label for="password_confirm">Confirmer le mot de passe</label>
				<input 
					type="password" 
					id="password_confirm" 
					name="password_confirm" 
					placeholder="Confirme ton mot de passe" 
					required 
					autocomplete="new-password"
					bind:value={passwordConfirm}
					oninput={checkPasswords}
					onkeydown={handleKeydown}
					class:error={form?.passwordMatchError || !passwordsMatch}
				/>
				{#if !passwordsMatch && passwordConfirm.length > 0}
					<p class="field-error">Les mots de passe ne correspondent pas</p>
				{/if}
			</div>

			<div class="form-group">
				<label>Avatar</label>
				<div class="avatar-grid">
					{#each emojis as emoji}
						<button
							type="button"
							class="avatar-btn"
							class:selected={selectedAvatar === emoji}
							onclick={() => selectedAvatar = emoji}
						>
							{emoji}
						</button>
					{/each}
				</div>
			</div>

			<div class="form-group">
				<label for="timezone">Fuseau horaire</label>
				<select id="timezone" name="timezone" bind:value={selectedTimezone}>
					{#each data.timezones as tz}
						<option value={tz.value}>{tz.label}</option>
					{/each}
				</select>
			</div>
			
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<button type="submit" class="submit-btn">S'inscrire</button>
		</form>

		<p class="login-link">
			Déjà inscrit ? <a href="/login">Se connecter</a>
		</p>
	{/if}

	<p class="app-version">v{data?.version || ''}</p>
</div>

<style>
	.register-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		min-height: 100vh;
		gap: 1rem;
		padding: 2rem 1rem;
	}

	.logo {
		max-width: 150px;
		height: auto;
	}

	h1 {
		color: #e94560;
		font-size: 1.5rem;
		margin-bottom: 0.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		width: 100%;
		max-width: 320px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		color: #ccc;
		font-size: 0.875rem;
		font-weight: 600;
	}

	input, select {
		width: 100%;
		background: #1a1a2e;
		border: 2px solid #e94560;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #fff;
		font-size: 1rem;
	}

	input:focus, select:focus {
		outline: none;
		border-color: #ff6b6b;
	}

	input.error, select.error {
		border-color: #ff4444;
	}

	input::placeholder {
		color: #888;
		opacity: 1;
	}

	.field-error {
		color: #ff4444;
		font-size: 0.75rem;
		margin: 0;
	}

	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.5rem;
		background: #2a2a4e;
		padding: 1rem;
		border-radius: 8px;
	}

	.avatar-btn {
		aspect-ratio: 1;
		font-size: 1.5rem;
		background: #1a1a2e;
		border: 2px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.avatar-btn:hover {
		transform: scale(1.1);
	}

	.avatar-btn.selected {
		border-color: #e94560;
		background: #e94560;
	}

	.submit-btn {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
	}

	.error {
		color: #ff6b6b;
		font-size: 0.875rem;
		text-align: center;
		background: rgba(255, 107, 107, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
	}

	.success-message {
		text-align: center;
		background: rgba(74, 222, 128, 0.1);
		border: 2px solid #4ade80;
		border-radius: 12px;
		padding: 2rem;
		max-width: 320px;
	}

	.success-message h2 {
		color: #4ade80;
		margin-bottom: 1rem;
	}

	.success-message p {
		color: #eee;
		margin-bottom: 1.5rem;
	}

	.closed-message {
		text-align: center;
		background: rgba(245, 158, 11, 0.1);
		border: 2px solid #f59e0b;
		border-radius: 12px;
		padding: 2rem;
		max-width: 320px;
	}

	.closed-message h2 {
		color: #f59e0b;
		margin-bottom: 1rem;
	}

	.closed-message p {
		color: #eee;
		margin-bottom: 0.5rem;
	}

	.sub-message {
		color: #888;
		font-size: 0.875rem;
	}

	.back-link {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.75rem 1.5rem;
		background: #e94560;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 600;
	}

	.login-link {
		color: #888;
		font-size: 0.875rem;
	}

	.login-link a {
		color: #e94560;
		text-decoration: underline;
	}

	.app-version {
		text-align: center;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 2rem;
	}
</style>
