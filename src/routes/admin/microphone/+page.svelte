<script lang="ts">
	import { onMount } from 'svelte';
	import { clearMicDiagnostics, getMicExecutionContext, readMicDiagnostics, type MicDiagnosticEntry, type MicPermissionState } from '$lib/micDiagnostics';
	import '$lib/shared.css';

	let entries = $state<MicDiagnosticEntry[]>([]);
	let permissionState = $state<MicPermissionState>('unknown');
	let permissionsSupported = $state(false);
	let permissionError = $state<string | null>(null);
	let context = $state(getMicExecutionContext());

	async function refreshDiagnostics() {
		context = getMicExecutionContext();
		entries = readMicDiagnostics().slice().reverse();
		permissionError = null;

		if (!navigator.permissions || !navigator.permissions.query) {
			permissionsSupported = false;
			permissionState = 'unknown';
			return;
		}

		permissionsSupported = true;

		try {
			const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
			permissionState = result.state as MicPermissionState;
		} catch (error) {
			permissionState = 'unknown';
			permissionError = error instanceof Error ? error.message : 'permissions.query a échoué';
		}
	}

	function clearEntries() {
		clearMicDiagnostics();
		entries = [];
	}

	onMount(() => {
		refreshDiagnostics();
	});
</script>

<div class="container">
	<h1>Diagnostic microphone iOS</h1>

	<section>
		<h2>Résumé courant</h2>
		<div class="diag-grid">
			<div class="diag-card">
				<strong>Mode d'affichage</strong>
				<p>{context.isStandalone ? 'PWA / standalone' : 'Navigateur classique'}</p>
			</div>
			<div class="diag-card">
				<strong>Contexte sécurisé</strong>
				<p>{context.isSecureContext ? 'Oui' : 'Non'}</p>
			</div>
			<div class="diag-card">
				<strong>Détection iOS</strong>
				<p>{context.isIos ? 'Oui' : 'Non'}</p>
			</div>
			<div class="diag-card">
				<strong>Détection Safari</strong>
				<p>{context.isSafari ? 'Oui' : 'Non'}</p>
			</div>
			<div class="diag-card">
				<strong>`permissions.query`</strong>
				<p>{permissionsSupported ? permissionState : 'Non supporté'}</p>
			</div>
			<div class="diag-card">
				<strong>User-Agent</strong>
				<p class="mono">{context.userAgent || 'Non disponible'}</p>
			</div>
		</div>
		{#if permissionError}
			<p class="warning">`permissions.query` a échoué : {permissionError}</p>
		{/if}
		<div class="diag-actions">
			<button class="secondary" onclick={refreshDiagnostics}>Actualiser</button>
			<button class="secondary danger" onclick={clearEntries}>Vider le journal</button>
		</div>
	</section>

	<section>
		<h2>Interprétation rapide</h2>
		<ul class="diag-list">
			<li><strong>`Ask`</strong> : iOS/Safari redemandera l'accès au micro lors du prochain `getUserMedia`.</li>
			<li><strong>`Allow`</strong> : l'accès devrait être réutilisé, mais iOS peut malgré tout reprompter selon le contexte ou la relance.</li>
			<li><strong>`Deny`</strong> : l'enregistrement restera bloqué tant que l'accès n'est pas réactivé dans Safari/iPhone.</li>
			<li><strong>`Non supporté` / `unknown`</strong> : l'app ne peut pas lire l'état à l'avance et doit s'en remettre à `getUserMedia`.</li>
		</ul>
	</section>

	<section>
		<h2>Protocole de test iPhone</h2>
		<ol class="diag-list ordered">
			<li>Ouvrir Maté Club en HTTPS sur Safari iPhone, puis aller sur la page d'enregistrement.</li>
			<li>Noter le résumé courant ici, puis lancer un enregistrement test.</li>
			<li>Revenir sur cette page pour lire les événements `check`, `getUserMedia`, `success` ou `error`.</li>
			<li>Fermer simplement Safari puis relancer, refaire le test et comparer.</li>
			<li>Kill Safari ou la PWA, relancer, refaire le test et comparer.</li>
			<li>Refaire exactement les mêmes étapes dans la PWA installée.</li>
		</ol>
	</section>

	<section>
		<h2>Journal des événements</h2>
		{#if entries.length === 0}
			<p class="empty-state">Aucun événement enregistré pour le moment. Lance un test d'enregistrement sur un compte admin.</p>
		{:else}
			<div class="entries">
				{#each entries as entry}
					<div class="entry">
						<div class="entry-header">
							<strong>{entry.event}</strong>
							<span class="mono">{new Date(entry.timestamp).toLocaleString('fr-FR')}</span>
						</div>
						{#if entry.details}
							<p class="mono">{entry.details}</p>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.diag-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.diag-card,
	.entry {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 1rem;
	}

	.diag-card p,
	.entry p {
		margin-top: 0.5rem;
	}

	.diag-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1rem;
	}

	.diag-list {
		margin-top: 1rem;
		padding-left: 1.25rem;
		line-height: 1.6;
	}

	.ordered {
		list-style: decimal;
	}

	.entries {
		display: grid;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.entry-header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: baseline;
	}

	.mono {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		word-break: break-word;
	}

	.warning {
		color: #ffd166;
		margin-top: 1rem;
	}

	.empty-state {
		opacity: 0.8;
		margin-top: 1rem;
	}

	.danger {
		background: #7a2230;
	}
</style>
