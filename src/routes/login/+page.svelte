<script lang="ts">
	import type { ActionData } from './$types';

	let { form, data }: { form: ActionData; data: any } = $props();
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			(e.target as HTMLInputElement).form?.requestSubmit();
		}
	}
</script>

<div class="login-container">
	<img src="/icon-512x512.png" alt="Maté Club" class="logo" />

	<form method="POST">
		<input type="text" name="pseudo" placeholder="Pseudo" required autocomplete="username" onkeydown={handleKeydown} />
		<input type="password" name="password" placeholder="Mot de passe" required autocomplete="current-password" onkeydown={handleKeydown} />
		<input type="hidden" name="csrf_token" value={data?.csrfToken} />
		
		{#if form?.pending}
			<p class="pending">{form.error}</p>
		{:else if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<button type="submit">Connexion</button>
	</form>

	{#if data?.allowRegistration}
		<p class="register-link">
			Pas encore de compte ? <a href="/register">S'inscrire</a>
		</p>
	{/if}

	<p class="app-version">v{data?.version || ''}</p>
</div>

<style>
	.login-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 80vh;
		gap: 1.5rem;
	}

	.logo {
		max-width: 200px;
		height: auto;
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
		background: #1a1a2e;
		border: 2px solid #e94560;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		color: #fff;
	}

	input::placeholder {
		color: #aaa;
		opacity: 1;
	}

	button {
		width: 100%;
		margin-top: 0.5rem;
	}

	.error {
		color: #ff6b6b;
		font-size: 0.875rem;
		text-align: center;
	}

	.pending {
		color: #f59e0b;
		font-size: 0.875rem;
		text-align: center;
		background: rgba(245, 158, 11, 0.1);
		padding: 0.75rem;
		border-radius: 8px;
		border: 1px solid #f59e0b;
	}

	.register-link {
		text-align: center;
		font-size: 0.875rem;
		color: #888;
		margin-top: 1rem;
	}

	.register-link a {
		color: #e94560;
		text-decoration: none;
		font-weight: 600;
	}

	.register-link a:hover {
		text-decoration: underline;
	}

	.app-version {
		text-align: center;
		font-size: 0.75rem;
		color: rgba(255, 255, 255, 0.3);
		margin-top: 2rem;
	}
</style>
