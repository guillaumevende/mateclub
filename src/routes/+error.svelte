<script lang="ts">
	import { page } from '$app/stores';
	import '$lib/shared.css';

	let status = $derived($page.status);
	let error = $derived($page.error);
</script>

<div class="error-container">
	<h1>Une erreur s'est produite</h1>
	
	{#if status}
		<p class="error-code">Erreur {status}</p>
	{/if}
	
	<p class="error-message">Veuillez réessayer ou contacter l'administrateur si le problème persiste.</p>
	
	<a href="/" class="home-link">Retour à l'accueil</a>
</div>

<style>
	.error-container {
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

	h1 {
		color: #e94560;
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.error-code {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.error-message {
		color: #888;
		margin-bottom: 2rem;
	}

	.home-link {
		color: #60a5fa;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		background: #2a2a4e;
		border-radius: 8px;
	}

	.home-link:hover {
		background: #3a3a5e;
	}
</style>
