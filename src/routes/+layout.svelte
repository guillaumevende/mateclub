<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { playerStore, initPlayer, debugLogs, logsEnabled, jinglesEnabled } from '$lib/stores/player';
	import { initHaptics, destroyHaptics } from '$lib/utils/haptics';
	import FloatingPlayer from '$lib/components/FloatingPlayer.svelte';
	import { onMount, onDestroy } from 'svelte';
	import '@khmyznikov/pwa-install';

	let { children, data }: { children: Snippet, data: { user?: { avatar: string; is_admin: number; pseudo: string; logs_enabled?: number; jingles_enabled?: number } } } = $props();

	let debugVisible = $state(false);
	let logsEnabledValue = $state(false);

	onMount(() => {
		initPlayer();
		initHaptics();
		
		// Initialize logsEnabled from user data
		if (data.user?.logs_enabled === 1) {
			logsEnabled.set(true);
			logsEnabledValue = true;
		}
		
		// Initialize jinglesEnabled from user data
		if (data.user?.jingles_enabled === 1) {
			jinglesEnabled.set(true);
		} else {
			jinglesEnabled.set(false);
		}
		
		logsEnabled.subscribe((v: boolean) => logsEnabledValue = v)();
		
		setInterval(() => {
			if (!logsEnabledValue) return;
			const g = document.getElementById('audio-guardian') as HTMLAudioElement;
			if (g && !g.paused) {
				debugLogs.update((logs: string[]) => [...logs, `[${new Date().toLocaleTimeString()}] 🔊 Guardian STILL playing!`].slice(-30));
			}
		}, 3000);
		
		// Configurer et afficher l'invite d'installation PWA après 5 secondes si éligible
		setTimeout(() => {
			const pwaInstall = document.querySelector('pwa-install') as any;
			if (pwaInstall) {
				// Appliquer les styles personnalisés (couleur de l'app)
				pwaInstall.styles = { '--tint-color': '#e94560' };
				
				// Afficher le dialog si éligible
				if (!pwaInstall.isUnderStandaloneMode && pwaInstall.isInstallAvailable) {
					pwaInstall.showDialog();
				}
			}
		}, 5000);
	});

	function closeDebug() {
		debugVisible = false;
	}

	function copyLogs() {
		if (!logsEnabledValue) return;
		const logs = $debugLogs.join('\n');
		try {
			const textarea = document.createElement('textarea');
			textarea.value = logs;
			textarea.style.position = 'fixed';
			textarea.style.opacity = '0';
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
			debugLogs.update((l: string[]) => [...l, `📋 COPIÉ!`]);
		} catch(e) {
			debugLogs.update((l: string[]) => [...l, `📋 ERREUR: ${e}`]);
		}
	}

	const navItems: {href?: string, label: string, icon: string, onclick?: () => void}[] = [
		{ href: '/', label: 'Accueil', icon: '🏠' },
		{ href: '/record', label: 'Enregistrer', icon: '🎙️' },
		{ href: '/settings', label: 'Réglages', icon: '⚙️' }
	];
	
	// Debug button
	let showDebug = $state(false);

	let showPlayer = $derived($playerStore.currentRecording !== null);
</script>

<audio id="persistent-audio" preload="auto" style="display: none;"></audio>
<audio id="audio-guardian" loop preload="auto" style="display: none;" src="/silence.mp3"></audio>
<audio id="jingle-audio" preload="auto" style="display: none;" src="/jingle-intro.mp3"></audio>
<audio id="end-sound-audio" preload="auto" style="display: none;"></audio>

{#if debugVisible}
<div id="debug-log" style="background: rgba(255, 255, 0, 0.95); color: black; padding: 10px; position: fixed; top: 0; left: 0; z-index: 9999; font-size: 11px; width: 100%; height: 70vh; overflow-y: auto; font-family: monospace; box-sizing: border-box;">
  <button onclick={() => debugVisible = false} style="float:right;padding:5px 10px;">✕ Fermer</button>
  <button onclick={copyLogs} style="float:right;padding:5px 10px;margin-right:5px;">📋 Copier</button>
  <div style="clear:both;"></div>
  <div id="debug-content" style="padding-top: 10px;">
    {#each $debugLogs as log}
      <div style="margin-bottom: 2px; padding: 2px 0; border-bottom: 1px solid #eee;">{log}</div>
    {/each}
  </div>
</div>
{/if}

<nav class:with-player={showPlayer}>
	{#if showPlayer}
		<div class="player-area">
			<FloatingPlayer />
		</div>
		<div class="player-nav-divider"></div>
	{/if}
	
	<div class="nav-items">
		{#if data.user}
		{#each navItems as item}
			{#if item.onclick}
			<button onclick={item.onclick} class="nav-btn">
				<span class="icon">{item.icon}</span>
				<span class="label">{item.label}</span>
			</button>
			{:else}
			<a href={item.href} class:active={$page.url.pathname === item.href}>
				<span class="icon">{item.icon}</span>
				<span class="label">{item.label}</span>
			</a>
			{/if}
		{/each}
		{#if data.user?.is_admin}
		<a href="/admin" class:active={$page.url.pathname === '/admin'}>
			<span class="icon">🚀</span>
			<span class="label">Admin</span>
		</a>
		{/if}
		{#if data.user?.logs_enabled}
		<button onclick={() => debugVisible = !debugVisible} class="nav-btn" style="color: yellow;">
			<span class="icon">🔧</span>
			<span class="label">Logs</span>
		</button>
		{/if}
		{/if}
	</div>
</nav>

<pwa-install
	manifest-url="/manifest.json"
	use-local-storage
	install-description="Installez Maté Club sur votre écran d'accueil pour accéder rapidement à vos capsules audio"
></pwa-install>

<main class:logged-in={!!data.user} class:with-player={showPlayer}>
	{@render children()}
</main>

<style>
	:global(*) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
		background: #1a1a2e;
		color: #eee;
		min-height: 100vh;
	}

	:global(input), :global(button), :global(select) {
		font-size: 1rem;
		padding: 0.75rem 1rem;
		border: none;
		border-radius: 8px;
		background: #2a2a4e;
		color: #eee;
	}

	:global(input[type="text"]),
	:global(input[type="password"]),
	:global(input[type="number"]),
	:global(select) {
		width: 100%;
		background: #1a1a2e;
		color: white;
	}

	:global(button) {
		background: #e94560;
		cursor: pointer;
		font-weight: 600;
		transition: transform 0.1s, opacity 0.2s;
	}

	:global(button:hover) {
		opacity: 0.9;
	}

	:global(button:active) {
		transform: scale(0.98);
	}

	:global(a) {
		color: #e94560;
		text-decoration: none;
	}

	nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: #16213e;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		border-top: 1px solid #2a2a4e;
		z-index: 1100;
	}

	nav.with-player {
		justify-content: flex-end;
	}

	.player-area {
		padding: 0.5rem 1rem;
	}

	.player-nav-divider {
		height: 1px;
		background: #2a2a4e;
		margin: 0 1rem;
	}

	.nav-items {
		display: flex;
		justify-content: space-around;
		padding: 0.5rem 0.25rem;
	}

	nav a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		color: #888;
		font-size: 0.75rem;
		text-decoration: none;
		padding: 1rem 0.75rem;
		border-radius: 12px;
		min-width: 70px;
		min-height: 60px;
		transition: color 0.2s, background 0.2s;
	}

	nav a.active {
		color: #e94560;
		background: rgba(233, 69, 96, 0.1);
	}

	nav .nav-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		color: #888;
		font-size: 0.75rem;
		text-decoration: none;
		padding: 1rem 0.75rem;
		border-radius: 12px;
		min-width: 70px;
		min-height: 60px;
		transition: color 0.2s, background 0.2s;
		background: transparent;
		border: none;
	}

	nav .icon {
		font-size: 1.25rem;
		line-height: 1;
	}

	nav .label {
		line-height: 1;
	}

	main {
		padding: 1rem;
		padding-bottom: 1rem;
		max-width: 600px;
		margin: 0 auto;
		min-height: 100vh;
		background: #1a1a2e;
	}

	main.logged-in {
		padding-bottom: 5rem;
	}

	main.logged-in.with-player {
		padding-bottom: 14rem;
	}
</style>
