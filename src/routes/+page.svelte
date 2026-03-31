<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { generateCalendarMonths, type CalendarMonth } from '$lib/calendar';
	import Avatar from '$lib/components/Avatar.svelte';
	import ImageViewer from '$lib/components/ImageViewer.svelte';
	import RecordingCard from '$lib/components/RecordingCard.svelte';
	import TeamList from '$lib/components/TeamList.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import { scrollLock } from '$lib/actions/scrollLock';
	import { triggerHaptic, triggerLockedHaptic } from '$lib/utils/haptics';
	import { playerStore, lastListenedRecordingId, type Recording, type DayRecordings, type PlayerState, playRecording, togglePlayPause, closePlayer, playNext } from '$lib/stores/player';
	import { debug } from '$lib/debug';
	import '$lib/shared.css';

	// Pull to refresh state
	let pullDistance = $state(0);
	let isPulling = $state(false);
	let isRefreshing = $state(false);
	let startY = 0;

	// Formatters réutilisables pour éviter de créer des instances à chaque appel
	const todayFormatter = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});

	type User = {
		id: number;
		pseudo: string;
		avatar: string;
		is_admin: number;
		super_powers: number;
		daily_notification_hour: number;
		timezone: string;
		recording_count?: number;
	};

	type UserList = {
		id: number;
		pseudo: string;
		avatar: string;
		is_admin: number;
		recording_count?: number;
	};

	type DateInfo = {
		hasRecordings: boolean;
		hasUnread: boolean;
	};

	type CalendarCell = {
		day: number;
		key: string;
		classes: string;
		hasRecordings: boolean;
	};

	let { data }: { data: PageData & { user?: User; allUsers: UserList[]; threshold: number; unreadStats?: { count: number; totalSeconds: number }; hasMore?: boolean; pendingRegistrationsCount?: number } } = $props();
	let showTeam = $state(false);
	let currentPage = $state(1);
	let allDays = $state<DayRecordings[]>([]);
	let loadingMore = $state(false);
	let showCalendar = $state(false);
	let calendarDates = $state<Record<string, DateInfo>>({});
	let selectedDate = $state<string | null>(null);
	let selectedDayRecordings = $state<DayRecordings | null>(null);
	let loadingDay = $state(false);
	let calendarMonths = $state<CalendarMonth[] | null>(null);
	let todayDay = $state<DayRecordings | null>(null);

	// Données du calendrier calculées uniquement quand nécessaire
	let calendarCells = $state<CalendarCell[][]>([]);
	let loadingCalendar = $state(false);

	// Player state from store
	let player = $state<PlayerState>({
		isPlaying: false,
		isLoading: false,
		currentDay: null,
		currentIndex: 0,
		currentRecording: null,
		currentDayData: null,
		progress: 0,
		duration: 0,
		volume: 1,
		isMuted: false
	});

	// Image viewer state
	let selectedImageUrl = $state<string | null>(null);

	// Touch/swipe handling for track change on cards
	let cardTouchStartX = 0;
	let cardTouchStartY = 0;
	let cardSwiped = false;
	const SWIPE_THRESHOLD = 50;

	function handleCardTouchStart(e: TouchEvent) {
		cardTouchStartX = e.touches[0].clientX;
		cardTouchStartY = e.touches[0].clientY;
		cardSwiped = false;
	}

	function handleCardTouchEnd(e: TouchEvent, day: DayRecordings, index: number) {
		const touchEndX = e.changedTouches[0].clientX;
		const touchEndY = e.changedTouches[0].clientY;
		
		const deltaX = touchEndX - cardTouchStartX;
		const deltaY = touchEndY - cardTouchStartY;
		
		// Only handle horizontal swipes (ignore vertical scrolls)
		if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > SWIPE_THRESHOLD) {
			cardSwiped = true;
			
			// Only change track if playback is already in progress
			if (player.isPlaying) {
				if (deltaX > 0 && index > 0) {
					// Swipe right → previous track
					playFromRecording(day, index - 1);
				} else if (deltaX < 0 && index < day.recordings.length - 1) {
					// Swipe left → next track
					playFromRecording(day, index + 1);
				}
			}
			
			setTimeout(() => { cardSwiped = false; }, 100);
		}
	}

	// Track listened recordings locally (for immediate UI updates)
	let listenedRecordings = $state<Set<number>>(new Set());

	// Computed: unread recordings count and total duration (from server)
	let unreadStats = $derived.by(() => {
		if (data.unreadStats) {
			return data.unreadStats;
		}
		// Fallback: calculate from loaded days
		const allRecordings = [...(todayDay?.recordings || []), ...allDays.flatMap(d => d.recordings)];
		const unread = allRecordings.filter(r => 
			!listenedRecordings.has(r.id) && r.listened_by_user !== 1
		);
		const totalSeconds = unread.reduce((sum, r) => sum + r.duration_seconds, 0);
		return { count: unread.length, totalSeconds };
	});

	$effect(() => {
		const unsubscribe = playerStore.subscribe(state => {
			player = state;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = lastListenedRecordingId.subscribe((recordingId: number | null) => {
			if (recordingId !== null) {
				listenedRecordings = new Set([...listenedRecordings, recordingId]);
			}
		});
		return unsubscribe;
	});

	$effect(() => {
		if (player.isPlaying && player.currentDay && player.currentRecording) {
			scrollToCard(player.currentDay, player.currentIndex);
		}
	});

	$effect(() => {
		const listened = new Set<number>();
		const allRecordings = [...(todayDay?.recordings || []), ...allDays.flatMap(d => d.recordings)];
		allRecordings.forEach(r => {
			if (r.listened_by_user) {
				listened.add(r.id);
			}
		});
		listenedRecordings = listened;
	});

	function computeCalendarCells() {
		if (!calendarMonths) return;
		
		loadingCalendar = true;
		const months = calendarMonths;
		
		setTimeout(() => {
			if (!months) return;
			
			const cells: CalendarCell[][] = [];
			const isLoaded = Object.keys(calendarDates).length > 0;
			
			for (const monthData of months) {
				const monthCells: CalendarCell[] = [];
				for (const week of monthData.weeks) {
					for (const day of week) {
						if (day === -1) {
							monthCells.push({ day: -1, key: '', classes: 'cell-day cell-empty', hasRecordings: false });
						} else {
							const key = getDateKey(monthData.year, monthData.month, day);
							const info = calendarDates[key];
							const isTodayCell = isToday(monthData.year, monthData.month, day);
							const hasRecordings = info?.hasRecordings ?? false;
							const hasUnread = info?.hasUnread ?? false;
							
							let classes = 'cell-day';
							if (isLoaded && !hasRecordings) classes += ' no-recordings';
							if (hasRecordings) classes += ' has-recordings';
							if (hasUnread) classes += ' unread';
							if (isTodayCell) classes += ' today';
							
							monthCells.push({ day, key, classes, hasRecordings });
						}
					}
				}
				cells.push(monthCells);
			}
			
			calendarCells = cells;
			loadingCalendar = false;
		}, 0);
	}

	function handleTouchStart(e: TouchEvent) {
		// Disable pull-to-refresh when any modal is open
		if (showTeam || selectedDayRecordings || selectedImageUrl) return;
		startY = e.touches[0].clientY;
		if (window.scrollY === 0) {
			isPulling = true;
		}
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPulling || isRefreshing) return;
		const currentY = e.touches[0].clientY;
		const diff = currentY - startY;
		if (diff > 0) {
			pullDistance = Math.min(diff * 0.5, 100);
		}
	}

	function handleTouchEnd() {
		if (pullDistance > 60) {
			refresh();
		}
		pullDistance = 0;
		isPulling = false;
	}

	async function refresh() {
		isRefreshing = true;
		await invalidateAll();
		// Force a full page reload to ensure fresh data
		window.location.reload();
	}

	onMount(() => {
		calendarMonths = generateCalendarMonths(3);
		invalidateAll();
	});

	// Sync data to component state - only when page changes
	let prevPage = 0;
	$effect(() => {
		const page = data.page;
		if (page && page !== prevPage) {
			prevPage = page;
			if (data.days && data.days.length > 0) {
				const today = getUserToday();
				
				if (page === 1) {
					allDays = data.days.filter(d => d.date !== today);
				} else {
					const existingDates = new Set(allDays.map(d => d.date));
					const newDays = data.days.filter(d => d.date !== today && !existingDates.has(d.date));
					if (newDays.length > 0) {
						allDays = [...allDays, ...newDays];
					}
				}
				
				todayDay = data.days.find(d => d.date === today) || null;
				currentPage = page;
				showCalendar = page >= 2;
			}
		}
	});
	
	// Charger le calendrier quand nécessaire
	$effect(() => {
		if (showCalendar && Object.keys(calendarDates).length === 0 && !loadingCalendar) {
			loadingCalendar = true;
			loadCalendarDates().then(() => {
				computeCalendarCells();
				loadingCalendar = false;
			});
		}
	});

	async function loadMore() {
		if (loadingMore) return;
		loadingMore = true;
		const nextPage = currentPage + 1;
		
		try {
			await goto(`?page=${nextPage}`, { replaceState: false, keepFocus: true, noScroll: true });
		} catch (e) {
			console.error('Navigation error:', e);
			loadingMore = false;
			return;
		}
		// currentPage will be synced by the $effect from data.page

		if (Object.keys(calendarDates).length === 0) {
			await loadCalendarDates();
		}
		
		computeCalendarCells();
		loadingMore = false;
	}

	async function loadCalendarDates() {
		try {
			const response = await fetch('/api/recordings/dates');
			const result = await response.json();
			calendarDates = result.dates || {};
		} catch (e) {
			console.error('Failed to load calendar dates:', e);
		}
	}

	async function loadDayRecordings(date: string) {
		loadingDay = true;
		selectedDate = date;
		try {
			const response = await fetch(`/api/recordings/by-date?date=${date}`);
			const result = await response.json();
			selectedDayRecordings = result.day;
		} catch (e) {
			console.error('Failed to load day recordings:', e);
		}
		loadingDay = false;
	}

	function closeDayModal() {
		selectedDate = null;
		selectedDayRecordings = null;
	}

	// Player helper functions
	function isCurrentPlaying(recordingId: number): boolean {
		return player.currentRecording?.id === recordingId && player.isPlaying;
	}

	function isCurrentRecording(recordingId: number): boolean {
		return player.currentRecording?.id === recordingId;
	}

	function playFromRecording(day: DayRecordings, index: number) {
		if (!day.available) {
			triggerLockedHaptic();
			return;
		}
		triggerHaptic('nudge');
		playRecording(day, index);
	}

	function playNextRecording() {
		playNext();
	}

	function stopPlayback() {
		closePlayer();
	}

	function toggleDayPlayback(day: DayRecordings) {
		if (player.currentDay === day.date && player.isPlaying) {
			togglePlayPause();
		} else if (player.currentDay === day.date && !player.isPlaying && player.currentRecording) {
			togglePlayPause();
		} else {
			if (day.recordings.length > 0) {
				playFromRecording(day, 0);
			}
		}
	}

	async function markAsListened(recordingId: number) {
		// Update local state immediately
		listenedRecordings = new Set([...listenedRecordings, recordingId]);
		
		// Call API to mark as listened
		try {
			await fetch(`/api/recordings/${recordingId}/listened`, { method: 'POST' });
		} catch (e) {
			console.error('Failed to mark as listened:', e);
		}
	}

	function scrollToCard(dayDate: string, index: number) {
		// Find the scroller for this day
		const scroller = document.querySelector(`[data-day="${dayDate}"] .recordings-scroller`);
		if (scroller) {
			const cards = scroller.querySelectorAll('.recording-card');
			if (cards[index]) {
				cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
			}
		}
	}

	function getDayAuthors(recordings: Recording[]): Recording[] {
		const seen = new Set<number>();
		return recordings.filter(r => {
			if (seen.has(r.user_id)) return false;
			seen.add(r.user_id);
			return true;
		});
	}

	function shouldShowPlayer(day: DayRecordings, user?: User): boolean {
		if (!day.available) return false;
		if (day.recordings.length === 0) return false;
		
		const today = getUserToday();
		// Show player for past days always
		if (day.date !== today) return true;
		
		// For today, only show if user has super powers
		return user?.super_powers === 1 || user?.is_admin === 1;
	}

	function formatTimeSeconds(seconds: number): string {
		if (!seconds || isNaN(seconds) || seconds === Infinity) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getUserToday(): string {
		const timezone = data.user?.timezone || 'Europe/Paris';
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		return formatter.format(new Date());
	}

	function getUserYesterday(): string {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const timezone = data.user?.timezone || 'Europe/Paris';
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		return formatter.format(yesterday);
	}

	function formatDateHeader(dateStr: string, recordings: Recording[]): string {
		const today = getUserToday();
		const yesterday = getUserYesterday();
		
		const uniqueUsers = new Set(recordings.map(r => r.user_id));
		const hasMultipleUsers = uniqueUsers.size >= 2;
		const fireEmoji = hasMultipleUsers ? '🔥 ' : '';
		
		if (dateStr === today) return `${fireEmoji}Aujourd'hui`;
		if (dateStr === yesterday) return `${fireEmoji}Hier, ${formatDate(dateStr)}`;
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		const formattedDate = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
		return `${fireEmoji}${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)}`;
	}

	function getTotalDuration(recordings: Recording[]): number {
		return recordings.reduce((total, r) => total + r.duration_seconds, 0);
	}

	function formatDurationFull(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function formatDate(dateStr: string): string {
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		
		return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
	}

	function getTodayDate(): string {
		const date = new Date();
		const formatted = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
		return formatted.toUpperCase();
	}

	function formatTime(dateStr: string): string {
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		const date = dateStr.includes('T') || dateStr.includes('Z')
			? new Date(dateStr)
			: new Date(dateStr.replace(' ', 'T') + 'Z');
		
		const timezone = data.user?.timezone || 'Europe/Paris';
		const formatter = new Intl.DateTimeFormat('fr-FR', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: timezone
		});
		return formatter.format(date).replace(':', 'h');
	}

	function formatDuration(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function getDateKey(year: number, month: number, day: number): string {
		return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	function isToday(year: number, month: number, day: number): boolean {
		const today = new Date();
		return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
	}

	function getDateInfo(year: number, month: number, day: number): DateInfo | null {
		const key = getDateKey(year, month, day);
		return calendarDates[key] || null;
	}

	function isRecordingListened(recording: Recording): boolean {
		// Les capsules de l'utilisateur courant ne montrent jamais le filet "non lue"
		if (data.user && recording.user_id === data.user.id) {
			return true;
		}
		return listenedRecordings.has(recording.id) || recording.listened_by_user === 1;
	}
</script>

<!-- Pull to refresh indicator -->
{#if pullDistance > 0 || isRefreshing}
	<div class="pull-indicator" class:refreshing={isRefreshing} style="transform: translateX(-50%) translateY({pullDistance}px)">
		{#if isRefreshing}
			<span class="pull-emoji">🤪</span>
		{:else}
			<span class="pull-emoji">😜</span>
		{/if}
	</div>
{/if}

<div 
	class="container" 
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<header>
		{#if data.user?.is_admin && data.pendingRegistrationsCount && data.pendingRegistrationsCount > 0}
			<a href="/admin" class="admin-badge" title="{data.pendingRegistrationsCount} inscription{data.pendingRegistrationsCount !== 1 ? 's' : ''} en attente">
				<span class="badge-count">{data.pendingRegistrationsCount}</span>
			</a>
		{/if}
		<img src="/icon-512x512.png" alt="Maté Club" class="logo" />
		<p class="date">{getTodayDate()}</p>
		<p class="welcome">Bienvenue, {data.user?.pseudo} !</p>
		{#if unreadStats.count > 0}
			{@const hours = Math.floor(unreadStats.totalSeconds / 3600)}
			{@const mins = Math.floor((unreadStats.totalSeconds % 3600) / 60)}
			{@const secs = unreadStats.totalSeconds % 60}
			<p class="unread-stats">
				{unreadStats.count} capsule{unreadStats.count !== 1 ? 's' : ''} audio non lue{unreadStats.count !== 1 ? 's' : ''}<br />
				({#if hours > 0}
					{hours} heure{hours !== 1 ? 's' : ''} et {mins} minute{mins !== 1 ? 's' : ''}
				{:else}
					{mins} minute{mins !== 1 ? 's' : ''} et {secs} seconde{secs !== 1 ? 's' : ''}
				{/if})
			</p>
		{/if}
		<button class="team-button" onclick={() => showTeam = true}>
			👥
		</button>
	</header>

	<TeamList allUsers={data.allUsers} bind:showTeam />

	{#if selectedDayRecordings}
		<div class="modal-overlay" use:scrollLock={selectedDayRecordings !== null} onclick={closeDayModal}>
			<div class="modal day-modal" onclick={(e) => e.stopPropagation()}>
				<!-- Croix de fermeture au-dessus de la modale -->
				<button class="close-btn modal-close-outer" onclick={closeDayModal}>✕</button>
				
				<div class="day-header-new modal-header">
					<div class="day-header-left">
						<h2 class="day-title">
							{formatDateHeader(selectedDayRecordings.date, selectedDayRecordings.recordings)}
							{#if !selectedDayRecordings.available}
								<span class="locked-icon">🔒</span>
							{/if}
						</h2>
						
						<span class="day-count">{selectedDayRecordings.recordings.length} capsule{selectedDayRecordings.recordings.length !== 1 ? 's' : ''}</span>
						
						<!-- Avatars des auteurs pour ce jour -->
						{#if selectedDayRecordings.recordings.length > 0}
							{@const authors = getDayAuthors(selectedDayRecordings.recordings)}
							{@const displayAuthors = authors.slice(0, 10)}
							{@const hasMore = authors.length > 10}
							{@const showAuthors = authors.length >= 2}
							{#if showAuthors}
							<div class="day-authors-header">
								{#each displayAuthors as author, i}
									<div 
										class="author-avatar-header" 
										title={author.pseudo}
										style="margin-left: {i === 0 ? 0 : -17}px; z-index: {i}"
									>
										<Avatar avatar={author.avatar} size="small" />
									</div>
								{/each}
								{#if hasMore}
									<div class="author-avatar-header more-avatars" style="margin-left: -17px; z-index: 0">
										<span>+{authors.length - 10}</span>
									</div>
								{/if}
							</div>
							{/if}
						{/if}
					</div>
					
					<div class="day-header-right">
						<span class="day-duration">{formatDurationFull(getTotalDuration(selectedDayRecordings.recordings))}</span>
					</div>
				</div>
				
				{#if selectedDayRecordings.recordings.length === 0}
					<p class="no-recordings">Aucun enregistrement ce jour</p>
				{:else}
					<div class="recordings-scroller">
						<div class="recordings-row">
							{#each selectedDayRecordings.recordings as recording, index}
								<RecordingCard
									{recording}
									{index}
									available={selectedDayRecordings.available}
									{cardSwiped}
									{player}
									threshold={data.threshold}
									{isRecordingListened}
									{isCurrentPlaying}
									{isCurrentRecording}
									onplay={(i) => selectedDayRecordings && playFromRecording(selectedDayRecordings, i)}
									ontouchstart={handleCardTouchStart}
									ontouchend={(e) => selectedDayRecordings && handleCardTouchEnd(e, selectedDayRecordings, index)}
									onimageclick={(url) => selectedImageUrl = url}
									{formatTime}
									{formatDuration}
									{formatTimeSeconds}
								/>
							{/each}
						</div>
					</div>
					
				{/if}
			</div>
		</div>
	{/if}

	{#if allDays.length === 0 && !todayDay}
		<div class="empty">
			{#if data.days}
				<p>Pas encore de capsule à écouter. Créez vos utilisateurs et faites un premier enregistrement audio.</p>
			{:else}
				<p>Chargement des capsules...</p>
			{/if}
		</div>
	{:else}
		{#if todayDay}
			<section class="day-section" data-day={todayDay.date}>
				<div class="day-header-new">
					<div class="day-header-left">
						<h2 class="day-title">
							{formatDateHeader(todayDay.date, todayDay.recordings)}
							{#if !todayDay.available}
								<span class="locked-icon">🔒</span>
							{/if}
						</h2>
						
						<span class="day-count">{todayDay.recordings.length} capsule{todayDay.recordings.length !== 1 ? 's' : ''}</span>
						
						<!-- Avatars des auteurs pour ce jour -->
						{#if todayDay.recordings.length > 0}
							{@const authors = getDayAuthors(todayDay.recordings)}
							{@const displayAuthors = authors.slice(0, 10)}
							{@const hasMore = authors.length > 10}
							{@const showAuthors = authors.length >= 2}
							{#if showAuthors}
							<div class="day-authors-header">
								{#each displayAuthors as author, i}
									<div 
										class="author-avatar-header" 
										title={author.pseudo}
										style="margin-left: {i === 0 ? 0 : -17}px; z-index: {i}"
									>
										<Avatar avatar={author.avatar} size="small" />
									</div>
								{/each}
								{#if hasMore}
									<div class="author-avatar-header more-avatars" style="margin-left: -17px; z-index: 0">
										<span>+{authors.length - 10}</span>
									</div>
								{/if}
							</div>
							{/if}
						{/if}
					</div>
					
					<div class="day-header-right">
						<span class="day-duration">{formatDurationFull(getTotalDuration(todayDay.recordings))}</span>
					</div>
				</div>
				
				<div class="recordings-scroller">
					<div class="recordings-row">
						{#each todayDay.recordings as recording, index}
							<RecordingCard
								{recording}
								{index}
								available={todayDay.available}
								{cardSwiped}
								{player}
								threshold={data.threshold}
								{isRecordingListened}
								{isCurrentPlaying}
								{isCurrentRecording}
								onplay={(i) => todayDay && playFromRecording(todayDay, i)}
								ontouchstart={handleCardTouchStart}
								ontouchend={(e) => todayDay && handleCardTouchEnd(e, todayDay, index)}
								onimageclick={(url) => selectedImageUrl = url}
								{formatTime}
								{formatDuration}
								{formatTimeSeconds}
							/>
						{/each}
					</div>
				</div>
		</section>
	{/if}
	
	{#each allDays as day}
		<section class="day-section" data-day={day.date}>
			<div class="day-header-new">
				<div class="day-header-left">
					<h2 class="day-title">
						{formatDateHeader(day.date, day.recordings)}
						{#if !day.available}
							<span class="locked-icon">🔒</span>
						{/if}
					</h2>
					
					<span class="day-count">{day.recordings.length} capsule{day.recordings.length !== 1 ? 's' : ''}</span>
					
					<!-- Avatars des auteurs pour ce jour -->
					{#if day.recordings.length > 0}
						{@const authors = getDayAuthors(day.recordings)}
						{@const displayAuthors = authors.slice(0, 10)}
						{@const hasMore = authors.length > 10}
						{@const showAuthors = authors.length >= 2}
						{#if showAuthors}
						<div class="day-authors-header">
							{#each displayAuthors as author, i}
									<div 
										class="author-avatar-header" 
										title={author.pseudo}
										style="margin-left: {i === 0 ? 0 : -17}px; z-index: {i}"
									>
										<Avatar avatar={author.avatar} size="small" />
									</div>
								{/each}
								{#if hasMore}
									<div class="author-avatar-header more-avatars" style="margin-left: -17px; z-index: 0">
										<span>+{authors.length - 10}</span>
									</div>
							{/if}
						</div>
						{/if}
					{/if}
				</div>
				
				<div class="day-header-right">
					<span class="day-duration">{formatDurationFull(getTotalDuration(day.recordings))}</span>
				</div>
			</div>
			
				<div class="recordings-scroller">
					<div class="recordings-row">
						{#each day.recordings as recording, index}
							<RecordingCard
								{recording}
								{index}
								available={day.available}
								{cardSwiped}
								{player}
								threshold={data.threshold}
								{isRecordingListened}
								{isCurrentPlaying}
								{isCurrentRecording}
								onplay={(i) => playFromRecording(day, i)}
								ontouchstart={handleCardTouchStart}
								ontouchend={(e) => handleCardTouchEnd(e, day, index)}
								onimageclick={(url) => selectedImageUrl = url}
								{formatTime}
								{formatDuration}
								{formatTimeSeconds}
							/>
						{/each}
					</div>
				</div>
		</section>
	{/each}

		<div class="load-more">
			{#if loadingMore}
				<span class="loading">Chargement...</span>
			{:else if showCalendar}
				<Calendar 
					{calendarMonths} 
					{calendarCells} 
					{calendarDates}
					onDateClick={loadDayRecordings}
				/>
			{:else if data.hasMore}
				<button class="btn" onclick={loadMore}>Charger plus</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Pull to refresh */
	.pull-indicator {
		position: fixed;
		top: 0;
		left: 50%;
		z-index: 1000;
		pointer-events: none;
		transition: transform 0.1s ease-out;
		transform: translateX(-50%) translateY(0);
	}

	.pull-indicator.refreshing {
		transform: translateX(-50%) translateY(60px);
	}

	.pull-emoji {
		font-size: 2.5rem;
		display: block;
		text-align: center;
	}

	.container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	header {
		text-align: center;
		padding: 1rem 0;
		position: relative;
	}

	.admin-badge {
		position: absolute;
		top: 0.5rem;
		left: 0;
		width: 32px;
		height: 32px;
		background: #e94560;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		text-decoration: none;
		animation: pulse-badge 2s infinite;
		z-index: 100;
	}

	.badge-count {
		color: white;
		font-weight: bold;
		font-size: 0.875rem;
	}

	@keyframes pulse-badge {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.7);
		}
		50% {
			box-shadow: 0 0 0 10px rgba(233, 69, 96, 0);
		}
	}

	.logo {
		max-width: 200px;
		height: auto;
		margin-bottom: 0.5rem;
	}

	.team-button {
		position: absolute;
		top: 0.5rem;
		right: 0;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: #2a2a4e;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		margin-top: 1rem;
		transition: transform 0.2s, background 0.2s;
	}

	.team-button:hover {
		transform: scale(1.1);
	}

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
		padding: 4rem 1rem 1rem;
	}

	.modal {
		background: #1a1a2e;
		border-radius: 16px;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
		position: relative;
		overflow: visible;
	}

	.modal.day-modal {
		max-width: 900px;
		width: 95%;
		position: relative;
		overflow: visible;
	}

	.modal h2 {
		color: #e94560;
		margin-bottom: 1rem;
		text-align: center;
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #2a2a4e;
		border: 2px solid #e94560;
		color: #fff;
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		z-index: 1001;
		padding: 0;
	}

	.close-btn:hover {
		background: #e94560;
		transform: scale(1.1);
	}

	.welcome {
		color: #888;
	}

	.unread-stats {
		color: #e94560;
		font-size: 0.875rem;
		margin-top: 0.25rem;
	}

	.date {
		color: #e94560;
		font-size: 1.1rem;
		font-weight: 500;
		margin-bottom: 0.75rem;
	}

	.empty {
		text-align: center;
		padding: 3rem 1rem;
		color: #888;
	}

	.btn {
		display: block;
		width: 100%;
		margin-top: 1rem;
		margin-bottom: 3rem;
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		background: #e94560;
		color: white;
		border-radius: 8px;
		border: none;
		cursor: pointer;
	}

	.day-section {
		background: #2a2a4e;
		border-radius: 12px;
		padding: 1rem;
	}

	.day-header {
		font-size: 1.125rem;
		color: #ccc;
		font-weight: normal;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	/* New Day Header Layout */
	.day-header-new {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		padding: 0;
		position: relative;
	}

	.day-header-left {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding-left: 0.25rem;
	}

	.day-title {
		font-size: 1.125rem;
		color: #ccc;
		font-weight: normal;
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.day-header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.day-duration {
		font-size: 1rem;
		color: #e94560;
		font-weight: bold;
	}

	.day-count {
		font-size: 0.875rem;
		color: #ccc;
		font-weight: normal;
	}

	/* Modal specific styles */
	.day-header-new.modal-header {
		padding-top: 0.5rem;
	}

	/* Croix de fermeture au-dessus de la modale */
	.close-btn.modal-close-outer {
		position: absolute;
		top: -70px;
		right: 0;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: #2a2a4e;
		border: 2px solid #e94560;
		color: #fff;
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
		z-index: 1001;
		padding: 0;
	}

	.close-btn.modal-close-outer:hover {
		background: #e94560;
		transform: scale(1.1);
	}

	/* Avatars avec chevauchement permanent */
	.day-authors-header {
		display: flex;
		flex-wrap: nowrap;
		margin-top: 0.75rem;
		padding-left: 0;
		overflow: visible;
	}

	.author-avatar-header {
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		overflow: hidden;
		border: 2px solid #2a2a4e;
		transition: transform 0.2s ease;
		position: relative;
		margin-left: -17px;
	}

	.author-avatar-header:first-child {
		margin-left: 0;
	}

	.author-avatar-header:hover {
		transform: scale(1.1);
		z-index: 100 !important;
	}

	/* Style pour le + des avatars supplémentaires */
	.author-avatar-header.more-avatars {
		background: #2a2a4e;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
		color: #e94560;
	}

	.locked-icon {
		font-size: 0.875rem;
	}

	.recordings-scroller {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: -0.25rem;
		padding: 0.25rem;
	}

	.recordings-row {
		display: flex;
		gap: 0.75rem;
	}


	.no-recordings {
		text-align: center;
		color: #888;
	}

	.modal .no-recordings {
		padding: 2rem;
	}

	/* Player Bar Styles */
	.player-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
		padding: 0.75rem 1rem;
		background: #1a1a2e;
		border-radius: 12px;
		border: 2px solid #e94560;
	}

	.play-btn {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #e94560;
		border: none;
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s, background 0.2s;
		flex-shrink: 0;
	}

	.play-btn:hover:not(:disabled) {
		transform: scale(1.1);
		background: #ff6b6b;
	}

	.play-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
		width: 24px;
		height: 24px;
		border: 3px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.player-authors {
		display: flex;
		gap: -8px;
		flex-shrink: 0;
	}

	.author-avatar {
		margin-left: -17px;
		border: 2px solid #1a1a2e;
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.author-avatar:first-child {
		margin-left: 0;
	}

	.author-avatar:hover {
		transform: scale(1.1);
		z-index: 1;
	}

	.player-progress {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 150px;
	}

	.progress-bar {
		height: 6px;
		background: #2a2a4e;
		border-radius: 3px;
		overflow: hidden;
		cursor: pointer;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #e94560, #ff6b6b);
		border-radius: 3px;
		transition: width 0.1s linear;
	}

	.time-display {
		font-size: 0.75rem;
		color: #888;
		text-align: center;
		font-family: monospace;
	}

	/* Modal player bar */
	:global(.day-modal .player-bar) {
		margin-top: 1.5rem;
		position: sticky;
		bottom: 0;
	}
</style>

<ImageViewer 
	imageUrl={selectedImageUrl} 
	isOpen={selectedImageUrl !== null} 
	onClose={() => selectedImageUrl = null} 
/>
