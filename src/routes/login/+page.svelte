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
	<img src="/logo512px.png" alt="MateClub" class="logo" />

	<form method="POST">
		<input type="text" name="pseudo" placeholder="Pseudo" required autocomplete="username" onkeydown={handleKeydown} />
		<input type="password" name="password" placeholder="Mot de passe" required autocomplete="current-password" onkeydown={handleKeydown} />
		<input type="hidden" name="csrf_token" value={data?.csrfToken} />
		
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}

		<button type="submit">Connexion</button>
	</form>
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
</style>
