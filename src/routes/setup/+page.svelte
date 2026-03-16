<script lang="ts">
	import type { ActionData } from './$types';
	import '$lib/shared.css';

	let { form, data }: { form: ActionData; data: any } = $props();
</script>

<div class="setup-container">
	<img src="/logo512px.png" alt="MateClub" class="logo" />

	<h1>Configuration initiale</h1>
	<p class="subtitle">Créez votre compte administrateur</p>

	{#if form?.success}
		<div class="success">
			<p>✅ Compte administrateur créé !</p>
			<a href="/login" class="btn">Aller à la page de connexion</a>
		</div>
	{:else}
		<form method="POST">
			<input 
				type="text" 
				name="pseudo" 
				placeholder="Pseudo" 
				required 
				autocomplete="username"
				minlength="2"
				maxlength="20"
			/>
			<input 
				type="password" 
				name="password" 
				placeholder="Mot de passe (min. 10 caractères)" 
				required 
				autocomplete="new-password"
				minlength="10"
			/>
			<input 
				type="password" 
				name="confirm_password" 
				placeholder="Confirmer le mot de passe" 
				required 
				autocomplete="new-password"
				minlength="10"
			/>
			
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<button type="submit">Créer le compte</button>
		</form>

		<p class="note">
			Après création, vous pourrez créer d'autres utilisateurs depuis le panel admin.
		</p>
	{/if}
</div>

<style>
	.setup-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		text-align: center;
		background: #1a1a2e;
		color: #fff;
	}

	.logo {
		max-width: 150px;
		height: auto;
		margin-bottom: 1rem;
	}

	h1 {
		color: #e94560;
		font-size: 1.75rem;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		color: #888;
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
		max-width: 300px;
	}

	input {
		width: 100%;
		background: #2a2a4e;
		border: 2px solid #e94560;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #fff;
		font-size: 1rem;
	}

	input::placeholder {
		color: #888;
	}

	input:focus {
		outline: none;
		border-color: #ff6b8a;
	}

	button {
		width: 100%;
		margin-top: 0.5rem;
		background: #e94560;
		color: #fff;
		border: none;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover {
		background: #ff6b8a;
	}

	.error {
		color: #ff6b6b;
		font-size: 0.875rem;
	}

	.success {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.success p {
		color: #4ade80;
		font-size: 1.25rem;
	}

	.btn {
		display: inline-block;
		background: #e94560;
		color: #fff;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		font-weight: 600;
	}

	.note {
		margin-top: 1.5rem;
		color: #666;
		font-size: 0.875rem;
		max-width: 300px;
	}
</style>
