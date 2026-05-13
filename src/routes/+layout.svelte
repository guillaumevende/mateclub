<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';
	import { playerStore, initPlayer, debugLogs, logsEnabled, jinglesEnabled } from '$lib/stores/player';
	import { initHaptics } from '$lib/utils/haptics';
	import FloatingPlayer from '$lib/components/FloatingPlayer.svelte';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { onMount } from 'svelte';
	import '@khmyznikov/pwa-install';

	let { children, data }: { children: Snippet, data: { user?: { avatar: string; is_admin: number; pseudo: string; logs_enabled?: number; jingles_enabled?: number; pwa_tutorial_enabled?: number }; appSettings?: { groupName: string; historyMonths: number; maxRecordingSeconds: number; maxGroupNameLength: number; audioProcessingEnabled?: boolean }; broadcastInfo?: { message: string; revision: number; read: boolean } | null } } = $props();

	let debugVisible = $state(false);
	let logsEnabledValue = $state(false);
	let showBroadcastInfoModal = $state(false);
	let locallyReadBroadcastRevision = $state<number | null>(null);
	let broadcastInfoRead = $derived(
		(data.broadcastInfo?.read ?? true) ||
		(data.broadcastInfo?.revision != null && locallyReadBroadcastRevision === data.broadcastInfo.revision)
	);

	function updateViewportBottomOffset() {
		if (typeof window === 'undefined') return;

		const visualViewport = window.visualViewport;
		const viewportHeight = visualViewport?.height ?? window.innerHeight;
		const viewportOffsetTop = visualViewport?.offsetTop ?? 0;
		const rawBottomOffset = Math.max(0, window.innerHeight - (viewportHeight + viewportOffsetTop));

		document.documentElement.style.setProperty('--viewport-bottom-offset', `${rawBottomOffset}px`);
	}

	function refreshViewportBottomOffset() {
		updateViewportBottomOffset();
		window.requestAnimationFrame(() => updateViewportBottomOffset());
		window.setTimeout(() => updateViewportBottomOffset(), 120);
		window.setTimeout(() => updateViewportBottomOffset(), 420);
	}

	onMount(() => {
		initPlayer();
		initHaptics();
		refreshViewportBottomOffset();
		
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
				if (data.user?.pwa_tutorial_enabled !== 0 && !pwaInstall.isUnderStandaloneMode && pwaInstall.isInstallAvailable) {
					pwaInstall.showDialog();
				}
			}
		}, 5000);

		const handleVisibilityChange = () => {
			if (!document.hidden) {
				refreshViewportBottomOffset();
			}
		};

		const handleViewportChange = () => {
			refreshViewportBottomOffset();
		};

		const handleOpenBroadcastInfo = () => {
			openBroadcastInfoModal();
		};

		window.addEventListener('resize', handleViewportChange);
		window.addEventListener('orientationchange', handleViewportChange);
		window.addEventListener('focus', handleViewportChange);
		window.addEventListener('pageshow', handleViewportChange);
		window.addEventListener('mateclub:open-broadcast-info', handleOpenBroadcastInfo);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.visualViewport?.addEventListener('resize', handleViewportChange);

		return () => {
			window.removeEventListener('resize', handleViewportChange);
			window.removeEventListener('orientationchange', handleViewportChange);
			window.removeEventListener('focus', handleViewportChange);
			window.removeEventListener('pageshow', handleViewportChange);
			window.removeEventListener('mateclub:open-broadcast-info', handleOpenBroadcastInfo);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.visualViewport?.removeEventListener('resize', handleViewportChange);
		};
	});

	function closeDebug() {
		debugVisible = false;
	}

	async function openBroadcastInfoModal() {
		showBroadcastInfoModal = true;

		if (!data.broadcastInfo || broadcastInfoRead) return;

		try {
			const response = await fetch('/api/broadcast-info/read', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ revision: data.broadcastInfo.revision })
			});

			if (response.ok) {
				locallyReadBroadcastRevision = data.broadcastInfo.revision;
				window.dispatchEvent(new window.CustomEvent('mateclub:broadcast-info-read', { detail: data.broadcastInfo.revision }));
			}
		} catch (error) {
			console.warn('Impossible de marquer l’information comme lue', error);
		}
	}

	function closeBroadcastInfoModal() {
		showBroadcastInfoModal = false;
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

{#if data.user?.pwa_tutorial_enabled !== 0}
	<pwa-install
		manifest-url="/manifest.json"
		use-local-storage
		install-description="Installez Maté Club sur votre écran d'accueil pour accéder rapidement à vos capsules audio"
	></pwa-install>
{/if}

<main class:logged-in={!!data.user} class:with-player={showPlayer}>
	{#if data.broadcastInfo?.message}
		<div class="broadcast-info-shell">
			<button
				type="button"
				class="broadcast-info-pill"
				class:is-read={broadcastInfoRead}
				onclick={openBroadcastInfoModal}
				hidden={$page.url.pathname === '/' && broadcastInfoRead}
			>
				<span class="broadcast-info-pill-icon" aria-hidden="true">📣</span>
				<span class="broadcast-info-pill-copy">Nouvelle information du groupe</span>
			</button>
		</div>
	{/if}
	{@render children()}
</main>

{#if showBroadcastInfoModal && data.broadcastInfo?.message}
	<div
		class="modal-overlay broadcast-modal-overlay"
		use:scrollLock={showBroadcastInfoModal}
		onclick={closeBroadcastInfoModal}
		onkeydown={(e) => e.key === 'Escape' && closeBroadcastInfoModal()}
		role="button"
		tabindex="0"
		aria-label="Fermer la modale d’information"
	>
		<div
			class="modal broadcast-info-modal"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && closeBroadcastInfoModal()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="broadcast-info-title"
			tabindex="-1"
		>
			<button type="button" class="broadcast-close-btn" onclick={closeBroadcastInfoModal} aria-label="Fermer">✕</button>
			<h2 id="broadcast-info-title">Information du groupe</h2>
			<div class="broadcast-info-content">
				<p>{data.broadcastInfo.message}</p>
			</div>
		</div>
	</div>
{/if}

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

	:global(html) {
		scrollbar-gutter: stable;
		--viewport-bottom-offset: 0px;
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

	:global(textarea) {
		width: 100%;
		background: #1a1a2e;
		color: white;
		border: none;
		border-radius: 12px;
		padding: 0.9rem 1rem;
		font: inherit;
		resize: vertical;
	}

	.broadcast-info-shell {
		width: min(100%, 820px);
		margin: 0 auto;
		padding: 0 1rem 1rem;
	}

	.broadcast-info-pill {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.95rem 1rem;
		border-radius: 20px;
		background: linear-gradient(135deg, rgba(233, 69, 96, 0.18), rgba(145, 77, 240, 0.18));
		border: 1px solid rgba(233, 69, 96, 0.32);
		color: #fff6f8;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.24);
		text-align: left;
		cursor: pointer;
	}

	.broadcast-info-pill.is-read {
		background: rgba(94, 102, 140, 0.18);
		border-color: rgba(160, 160, 192, 0.18);
		color: #d7d8ea;
	}

	.broadcast-info-pill.home-compact {
		width: 36px;
		height: 36px;
		padding: 0;
		border-radius: 999px;
		justify-content: center;
		gap: 0;
	}

	.broadcast-info-pill-icon {
		font-size: 1.2rem;
	}

	.broadcast-info-pill.home-compact .broadcast-info-pill-icon {
		font-size: 1rem;
	}

	.broadcast-info-pill-copy {
		font-weight: 700;
		line-height: 1.3;
	}

	.broadcast-info-shell.home-compact-shell {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		width: auto;
		margin: 0;
		padding: 0;
		pointer-events: none;
		z-index: 25;
	}

	.broadcast-info-shell.home-compact-shell .broadcast-info-pill.home-compact {
		position: absolute;
		top: 1.5rem;
		left: 0;
		z-index: 6;
		box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
		pointer-events: auto;
	}

	.broadcast-info-shell.home-compact-shell.with-admin-badge .broadcast-info-pill.home-compact {
		left: 3.5rem;
	}

	.broadcast-modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.86);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1200;
	}

	.modal {
		background: #1f2140;
		border-radius: 20px;
		width: min(100%, 560px);
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.42);
	}

	.broadcast-info-modal {
		max-width: 560px;
		padding: 1.35rem 1.2rem 1.2rem;
	}

	.broadcast-close-btn {
		position: absolute;
		top: 0.85rem;
		right: 0.85rem;
		width: 38px;
		height: 38px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		color: #fff;
		padding: 0;
	}

	.broadcast-info-content {
		margin-top: 1rem;
		max-height: min(55vh, 420px);
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	.broadcast-info-content p {
		white-space: pre-wrap;
		line-height: 1.55;
		color: #f5f6ff;
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
		bottom: calc(var(--viewport-bottom-offset) + env(safe-area-inset-bottom, 0px));
		left: 0;
		right: 0;
		background: #16213e;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		border-top: 1px solid #2a2a4e;
		z-index: 1100;
		transform: translateZ(0);
		will-change: bottom;
	}

	nav::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		height: calc(var(--viewport-bottom-offset) + env(safe-area-inset-bottom, 0px) + 8px);
		background: #16213e;
		pointer-events: none;
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
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(0, 1fr);
		align-items: stretch;
		gap: 0.25rem;
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
		width: 100%;
		min-width: 0;
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
		width: 100%;
		min-width: 0;
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
		position: relative;
	}

	main.logged-in {
		padding-bottom: 5rem;
	}

	main.logged-in.with-player {
		padding-bottom: 14rem;
	}
</style>
