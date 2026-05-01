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
	import CloseIconButton from '$lib/components/CloseIconButton.svelte';
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

	type UnreadPlaylistGroup = {
		date: string;
		recordings: Recording[];
		startIndex: number;
	};

	type UnreadPlaylistModal = {
		playlist: DayRecordings;
		groups: UnreadPlaylistGroup[];
		totalSeconds: number;
		count: number;
	};

	let { data }: { data: PageData & { user?: User; allUsers: UserList[]; threshold: number; unreadStats?: { count: number; totalSeconds: number }; hasMore?: boolean; pendingRegistrationsCount?: number } } = $props();

	function getInitialHomeState() {
		const initialPage = data.page ?? 1;
		const initialTodayDate = getUserToday();
		const initialDays = data.days ?? [];

		return {
			initialPage,
			initialTodayDate,
			initialDays,
			initialTodayDay: initialDays.find((day) => day.date === initialTodayDate) || null,
			initialPastDays: initialDays.filter((day) => day.date !== initialTodayDate)
		};
	}

	const initialHomeState = getInitialHomeState();
	let showTeam = $state(false);
	let currentPage = $state(initialHomeState.initialPage);
	let allDays = $state<DayRecordings[]>(initialHomeState.initialPastDays);
	let loadingMore = $state(false);
	let showCalendar = $state(initialHomeState.initialPage >= 2);
	let calendarDates = $state<Record<string, DateInfo>>({});
	let selectedDate = $state<string | null>(null);
	let selectedDayRecordings = $state<DayRecordings | null>(null);
	let unreadPlaylistModal = $state<UnreadPlaylistModal | null>(null);
	let unreadPlaylistSession = $state<UnreadPlaylistModal | null>(null);
	let unreadPlaylistResolved = $state(false);
	let loadingDay = $state(false);
	let calendarMonths = $state<CalendarMonth[] | null>(null);
	let todayDay = $state<DayRecordings | null>(initialHomeState.initialTodayDay);
	let openingUnreadSummary = $state(false);
	let syncingUnreadPlaylist = false;

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
		isMuted: false,
		bufferedPercent: 0
	});

	// Image viewer state
	let selectedImageUrl = $state<string | null>(null);

	// Touch/swipe handling for track change on cards
	let cardTouchStartX = 0;
	let cardTouchStartY = 0;
	let cardSwiped = $state(false);
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

	// Computed: unread recordings count and total duration (from server/local UI state)
	let unreadStats = $derived.by(() => {
		const allKnownRecordings = [...(todayDay?.recordings || []), ...allDays.flatMap(d => d.recordings)];
		const dedupedRecordings = Array.from(new Map(allKnownRecordings.map((recording) => [recording.id, recording])).values());
		const serverUnreadCount = data.unreadStats?.count ?? 0;
		const serverUnreadSeconds = data.unreadStats?.totalSeconds ?? 0;
		const optimisticallyListenedRecordings = dedupedRecordings.filter((recording) =>
			recording.user_id !== data.user?.id &&
			recording.listened_by_user !== 1 &&
			listenedRecordings.has(recording.id)
		);

		const optimisticCountReduction = optimisticallyListenedRecordings.length;
		const optimisticSecondsReduction = optimisticallyListenedRecordings.reduce((sum, recording) => sum + recording.duration_seconds, 0);
		const adjustedCount = Math.max(0, serverUnreadCount - optimisticCountReduction);
		const adjustedSeconds = Math.max(0, serverUnreadSeconds - optimisticSecondsReduction);

		return { count: adjustedCount, totalSeconds: adjustedSeconds };
	});

	let canPlayUnreadSummary = $derived((unreadPlaylistSession?.count ?? 0) > 0);

	let unreadSummaryPresentation = $derived.by(() => {
		const totalCount = unreadStats.count;
		const totalSeconds = unreadStats.totalSeconds;
		const playableCount = unreadPlaylistSession?.count ?? 0;
		const playableSeconds = unreadPlaylistSession?.totalSeconds ?? 0;
		const hasResolvedPlayableState = unreadPlaylistResolved || totalCount === 0;
		const hasPlayableUnread = playableCount > 0;
		const hasOnlyLockedUnread = hasResolvedPlayableState && totalCount > 0 && playableCount === 0;
		const hasMixedUnread = hasResolvedPlayableState && playableCount > 0 && playableCount < totalCount;

		if (hasOnlyLockedUnread) {
			return {
				title: `${totalCount} capsule${totalCount !== 1 ? 's' : ''} pour ${data.threshold}`,
				duration: formatCompactDurationLabel(totalSeconds),
				showPlayIcon: false,
				showLockIcon: true
			};
		}

		if (hasMixedUnread) {
			return {
				title: `${playableCount} capsule${playableCount !== 1 ? 's' : ''} non lue${playableCount !== 1 ? 's' : ''}`,
				duration: formatCompactDurationLabel(playableSeconds),
				showPlayIcon: true,
				showLockIcon: false
			};
		}

		return {
			title: `${totalCount} capsule${totalCount !== 1 ? 's' : ''} non lue${totalCount !== 1 ? 's' : ''}`,
			duration: formatCompactDurationLabel(totalSeconds),
			showPlayIcon: hasPlayableUnread,
			showLockIcon: hasOnlyLockedUnread
		};
	});

	// Subscribe to player store outside of $effect to avoid infinite loops
	playerStore.subscribe(state => {
		player = state;
	});

	// Subscribe to lastListenedRecordingId outside of $effect
	lastListenedRecordingId.subscribe((recordingId: number | null) => {
		if (recordingId !== null) {
			listenedRecordings = new Set([...listenedRecordings, recordingId]);
		}
	});

	// Auto-scroll horizontally within the current day's scroller when playing
	$effect(() => {
		if (player.isPlaying && player.currentDay && player.currentRecording) {
			if (player.currentDay === '__unread_playlist__') {
				scrollModalCardHorizontal(player.currentIndex);
			} else {
				scrollToCardHorizontal(player.currentDay, player.currentIndex);
			}
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
		// Preserve optimistic local updates while the server catches up.
		// Replacing the set here can make the unread pill oscillate during playback.
		const mergedListened = new Set([...listenedRecordings, ...listened]);
		if (!areSetsEqual(listenedRecordings, mergedListened)) {
			listenedRecordings = mergedListened;
		}
	});

	function computeCalendarCells() {
		if (!calendarMonths) return;
		
		loadingCalendar = true;
		const months = calendarMonths;
		const resolvedCalendarDates = getResolvedCalendarDates();
		
		setTimeout(() => {
			if (!months) return;
			
			const cells: CalendarCell[][] = [];
			const isLoaded = Object.keys(resolvedCalendarDates).length > 0;
			
			for (const monthData of months) {
				const monthCells: CalendarCell[] = [];
				for (const week of monthData.weeks) {
					for (const day of week) {
						if (day === -1) {
							monthCells.push({ day: -1, key: '', classes: 'cell-day cell-empty', hasRecordings: false });
						} else {
							const key = getDateKey(monthData.year, monthData.month, day);
							const info = resolvedCalendarDates[key];
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

	function getResolvedCalendarDates(): Record<string, DateInfo> {
		const resolved = { ...calendarDates };
		const loadedDays = [todayDay, ...allDays].filter(Boolean) as DayRecordings[];

		for (const day of loadedDays) {
			if (day.recordings.length === 0) {
				continue;
			}

			resolved[day.date] = {
				hasRecordings: true,
				hasUnread: day.recordings.some((recording) => !isRecordingListened(recording))
			};
		}

		return resolved;
	}

	function getOldestUnreadDate(): string | null {
		const dates = Object.entries(getResolvedCalendarDates())
			.filter(([, info]) => info.hasUnread)
			.map(([date]) => date)
			.sort((a, b) => a.localeCompare(b));

		return dates[0] ?? null;
	}

	function areSetsEqual<T>(a: Set<T>, b: Set<T>): boolean {
		if (a.size !== b.size) return false;
		for (const item of a) {
			if (!b.has(item)) return false;
		}
		return true;
	}

	function handleTouchStart(e: TouchEvent) {
		// Disable pull-to-refresh when any modal is open
		if (showTeam || selectedDayRecordings || unreadPlaylistModal || selectedImageUrl) return;
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
		unreadPlaylistResolved = data.unreadStats?.count ? false : true;
		if (data.unreadStats?.count) {
			void syncUnreadPlaylistSession();
		}
	});

	// Sync data to component state - only when page changes
	let prevPage = 0;
	let initialScrollDone = false;
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
				
				// Initialize scroll positions after data is loaded (only on first load)
				if (!initialScrollDone) {
					initialScrollDone = true;
					initializeScrollPositions();
				}
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

	$effect(() => {
		if (!showCalendar || !calendarMonths || Object.keys(calendarDates).length === 0) return;
		todayDay;
		allDays;
		listenedRecordings;
		computeCalendarCells();
	});

	$effect(() => {
		todayDay;
		allDays;
		listenedRecordings;

		if (!data.user || !data.unreadStats?.count) {
			unreadPlaylistResolved = true;
			return;
		}
		if (player.currentDay === '__unread_playlist__') return;

		void syncUnreadPlaylistSession();
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
			
			// Initialize scroll position for modal (scroll to first unread)
			if (result.day && result.day.recordings.length > 0) {
				 
				window.requestAnimationFrame(() => {
					const firstUnreadIndex = getFirstUnreadIndex(result.day);
					scrollToCardWithoutAnimation(result.day.date, firstUnreadIndex);
				});
			}
		} catch (e) {
			console.error('Failed to load day recordings:', e);
		}
		loadingDay = false;
	}

	async function buildUnreadPlaylistSession(): Promise<UnreadPlaylistModal | null> {
		if (Object.keys(calendarDates).length === 0) {
			await loadCalendarDates();
		}

		const unreadDates = Object.entries(getResolvedCalendarDates())
			.filter(([, info]) => info.hasUnread)
			.map(([date]) => date)
			.sort((a, b) => a.localeCompare(b));

		if (unreadDates.length === 0) return null;

		const responses = await Promise.all(
			unreadDates.map(async (date) => {
				const response = await fetch(`/api/recordings/by-date?date=${date}`);
				const result = await response.json();
				return result.day as DayRecordings | null;
			})
		);

		const groups: UnreadPlaylistGroup[] = [];
		const playlistRecordings: Recording[] = [];
		let totalSeconds = 0;

		for (const day of responses) {
			if (!day?.available) continue;
			const unreadRecordings = day.recordings.filter((recording) => !isRecordingListened(recording));
			if (unreadRecordings.length === 0) continue;

			groups.push({
				date: day.date,
				recordings: unreadRecordings,
				startIndex: playlistRecordings.length
			});

			playlistRecordings.push(...unreadRecordings);
			totalSeconds += unreadRecordings.reduce((sum, recording) => sum + recording.duration_seconds, 0);
		}

		if (playlistRecordings.length === 0) return null;

		return {
			playlist: {
				date: '__unread_playlist__',
				recordings: playlistRecordings,
				available: true
			},
			groups,
			totalSeconds,
			count: playlistRecordings.length
		};
	}

	async function syncUnreadPlaylistSession() {
		if (syncingUnreadPlaylist) return;
		syncingUnreadPlaylist = true;
		unreadPlaylistResolved = false;
		try {
			unreadPlaylistSession = await buildUnreadPlaylistSession();
		} finally {
			syncingUnreadPlaylist = false;
			unreadPlaylistResolved = true;
		}
	}

	async function openUnreadPlaylist() {
		if (unreadStats.count === 0 || openingUnreadSummary) return;

		openingUnreadSummary = true;
		try {
			if (unreadPlaylistSession) {
				const session = unreadPlaylistSession;
				unreadPlaylistModal = session;

				window.requestAnimationFrame(() => {
					const targetIndex = player.currentDay === '__unread_playlist__'
						? player.currentIndex
						: getFirstUnreadIndex(session.playlist);
					scrollModalCardWithoutAnimation(targetIndex, '.unread-playlist-modal .recordings-scroller');
				});

				if (player.currentDay !== '__unread_playlist__' || !player.currentRecording) {
					const startIndex = getFirstUnreadIndex(session.playlist);
					if (session.playlist.recordings[startIndex]) {
						playFromRecording(session.playlist, startIndex);
					}
				}
				return;
			}

			const session = await buildUnreadPlaylistSession();
			if (!session) return;
			unreadPlaylistSession = session;
			unreadPlaylistModal = session;

			playFromRecording(session.playlist, 0);

			window.requestAnimationFrame(() => {
				scrollModalCardWithoutAnimation(0, '.unread-playlist-modal .recordings-scroller');
			});
		} finally {
			openingUnreadSummary = false;
		}
	}

	function closeDayModal() {
		selectedDate = null;
		selectedDayRecordings = null;
	}

	function closeUnreadPlaylistModal() {
		unreadPlaylistModal = null;
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

	function scrollModalCardWithoutAnimation(index: number, selector = '.day-modal .recordings-scroller') {
		const scroller = document.querySelector(selector);
		if (!scroller) return;

		const cards = scroller.querySelectorAll('.recording-card');
		if (cards[index]) {
			const cardRect = cards[index].getBoundingClientRect();
			const scrollerRect = scroller.getBoundingClientRect();
			const scrollLeft = cardRect.left - scrollerRect.left + scroller.scrollLeft - 16;
			scroller.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'auto' });
		}
	}

	function scrollModalCardHorizontal(index: number, selector = '.unread-playlist-modal .recordings-scroller') {
		const scroller = document.querySelector(selector);
		if (!scroller) return;

		const cards = scroller.querySelectorAll('.recording-card');
		if (cards[index]) {
			const cardRect = cards[index].getBoundingClientRect();
			const scrollerRect = scroller.getBoundingClientRect();
			const scrollLeft = cardRect.left - scrollerRect.left + scroller.scrollLeft - (scrollerRect.width / 2) + (cardRect.width / 2);
			scroller.scrollTo({ left: scrollLeft, behavior: 'smooth' });
		}
	}

	// Scroll only horizontally within the day's scroller, without vertical page scroll
	function scrollToCardHorizontal(dayDate: string, index: number) {
		const dayElement = document.querySelector(`[data-day="${dayDate}"]`);
		if (!dayElement) return;
		
		// Check if day is visible in viewport (don't scroll vertically if not)
		const rect = dayElement.getBoundingClientRect();
		const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
		if (!isVisible) return;
		
		const scroller = dayElement.querySelector('.recordings-scroller');
		if (scroller) {
			const cards = scroller.querySelectorAll('.recording-card');
			if (cards[index]) {
				// Scroll only horizontally, don't scroll the page vertically
				const cardRect = cards[index].getBoundingClientRect();
				const scrollerRect = scroller.getBoundingClientRect();
				const scrollLeft = cardRect.left - scrollerRect.left + scroller.scrollLeft - (scrollerRect.width / 2) + (cardRect.width / 2);
				scroller.scrollTo({ left: scrollLeft, behavior: 'smooth' });
			}
		}
	}

	// Find the index of the first unread recording for a day
	function getFirstUnreadIndex(day: DayRecordings): number {
		for (let i = 0; i < day.recordings.length; i++) {
			if (!isRecordingListened(day.recordings[i])) {
				return i;
			}
		}
		return 0; // All read, return first
	}

	// Scroll to a specific card without animation (for initial positioning)
	function scrollToCardWithoutAnimation(dayDate: string, index: number) {
		const dayElement = document.querySelector(`[data-day="${dayDate}"]`);
		if (!dayElement) return;
		
		const scroller = dayElement.querySelector('.recordings-scroller');
		if (scroller) {
			const cards = scroller.querySelectorAll('.recording-card');
			if (cards[index]) {
				// Calculate scroll position to align the card at the left (with a small margin)
				const cardRect = cards[index].getBoundingClientRect();
				const scrollerRect = scroller.getBoundingClientRect();
				const scrollLeft = cardRect.left - scrollerRect.left + scroller.scrollLeft - 16; // 16px margin
				scroller.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'auto' });
			}
		}
	}

	// Initialize scroll positions for all visible days (scroll to first unread)
	function initializeScrollPositions() {
		// Wait for DOM to be ready
		// eslint-disable-next-line no-undef
		requestAnimationFrame(() => {
			// Scroll today section
			if (todayDay && todayDay.recordings.length > 0) {
				const firstUnreadIndex = getFirstUnreadIndex(todayDay);
				scrollToCardWithoutAnimation(todayDay.date, firstUnreadIndex);
			}
			
			// Scroll all past days
			allDays.forEach(day => {
				if (day.recordings.length > 0) {
					const firstUnreadIndex = getFirstUnreadIndex(day);
					scrollToCardWithoutAnimation(day.date, firstUnreadIndex);
				}
			});
		});
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
		// DEBUG: Log pour Safari
		console.log('[formatDateHeader] dateStr:', dateStr, 'type:', typeof dateStr);
		
		// Validation robuste
		if (!dateStr || typeof dateStr !== 'string') {
			console.error('[formatDateHeader] dateStr invalide:', dateStr);
			return 'Date inconnue';
		}
		
		const today = getUserToday();
		const yesterday = getUserYesterday();
		
		const uniqueUsers = new Set(recordings.map(r => r.user_id));
		const hasMultipleUsers = uniqueUsers.size >= 2;
		const fireEmoji = hasMultipleUsers ? '🔥 ' : '';
		
		if (dateStr === today) return `${fireEmoji}Aujourd'hui`;
		if (dateStr === yesterday) return `${fireEmoji}Hier, ${formatDate(dateStr)}`;
		
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		let date: Date;
		try {
			let dateString: string;
			if (dateStr.includes('T') || dateStr.includes('Z')) {
				dateString = dateStr;
			} else if (dateStr.includes(' ')) {
				dateString = dateStr.replace(' ', 'T') + 'Z';
			} else {
				dateString = dateStr + 'T00:00:00Z';
			}
			date = new Date(dateString);
			
			// Vérifier que la date est valide
			if (isNaN(date.getTime())) {
				console.error('[formatDateHeader] Date invalide:', dateStr, '->', date);
				return 'Date inconnue';
			}
		} catch (e) {
			console.error('[formatDateHeader] Erreur parsing:', dateStr, e);
			return 'Date inconnue';
		}
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

	function formatDurationLabel(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const mins = Math.floor((totalSeconds % 3600) / 60);
		const secs = totalSeconds % 60;

		if (hours > 0) {
			if (mins === 0) {
				return `${hours} heure${hours > 1 ? 's' : ''}`;
			}
			return `${hours} heure${hours > 1 ? 's' : ''} et ${mins} minute${mins > 1 ? 's' : ''}`;
		}

		if (mins === 0) {
			return `${secs} seconde${secs > 1 ? 's' : ''}`;
		}

		if (secs === 0) {
			return `${mins} minute${mins > 1 ? 's' : ''}`;
		}

		return `${mins} minute${mins > 1 ? 's' : ''} et ${secs} seconde${secs > 1 ? 's' : ''}`;
	}

	function formatCompactDurationLabel(totalSeconds: number): string {
		const hours = Math.floor(totalSeconds / 3600);
		const mins = Math.floor((totalSeconds % 3600) / 60);
		const secs = totalSeconds % 60;

		if (hours > 0) {
			if (mins === 0) {
				return `${hours} h`;
			}

			return `${hours} h ${mins} min`;
		}

		if (mins === 0) {
			return `${secs} s`;
		}

		if (secs === 0) {
			return `${mins} min`;
		}

		return `${mins} min ${secs} s`;
	}

	function formatDate(dateStr: string): string {
		// Forcer l'interprétation UTC en ajoutant 'Z' si pas de timezone
		let dateString: string;
		if (dateStr.includes('T') || dateStr.includes('Z')) {
		    dateString = dateStr;
		} else if (dateStr.includes(' ')) {
		    dateString = dateStr.replace(' ', 'T') + 'Z';
		} else {
		    dateString = dateStr + 'T00:00:00Z';
		}
		const date = new Date(dateString);
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
	role="application"
	aria-label="Page principale"
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
			<button
				class="unread-summary-pill"
				class:is-passive={!canPlayUnreadSummary}
				onclick={openUnreadPlaylist}
				disabled={openingUnreadSummary || !canPlayUnreadSummary}
			>
				<span class="pill-leading-slot" aria-hidden="true">
					{#if unreadSummaryPresentation.showPlayIcon}
						<svg viewBox="0 0 24 24" class="pill-play-icon">
							<circle cx="12" cy="12" r="11"></circle>
							<path d="M10 8.5v7l5.8-3.5z"></path>
						</svg>
					{:else if unreadSummaryPresentation.showLockIcon}
						<svg viewBox="0 0 24 24" class="pill-lock-icon">
							<rect x="6.25" y="10.25" width="11.5" height="9" rx="2.4"></rect>
							<path d="M8.75 10.25V8.1a3.25 3.25 0 0 1 6.5 0v2.15"></path>
						</svg>
					{/if}
				</span>
				<span class="pill-copy">
					<span class="pill-title">{openingUnreadSummary ? 'Ouverture...' : unreadSummaryPresentation.title}</span>
					<span class="pill-duration">{unreadSummaryPresentation.duration}</span>
				</span>
				<span class="pill-trailing-slot" aria-hidden="true"></span>
			</button>
		{/if}
		<button class="team-button" onclick={() => showTeam = true}>
			👥
		</button>
	</header>

	<TeamList allUsers={data.allUsers} bind:showTeam />

	{#if unreadPlaylistModal}
		<div
			class="modal-overlay"
			use:scrollLock={unreadPlaylistModal !== null}
			onclick={closeUnreadPlaylistModal}
			onkeydown={(e) => e.key === 'Escape' && closeUnreadPlaylistModal()}
			role="button"
			tabindex="0"
			aria-label="Fermer la file d'écoute"
		>
			<div
				class="modal day-modal unread-playlist-modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeUnreadPlaylistModal()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="unread-playlist-title"
				tabindex="-1"
			>
				<CloseIconButton
					onclick={closeUnreadPlaylistModal}
					ariaLabel="Fermer la file d'écoute"
					size="md"
					extraClass="modal-close-outer-btn"
				/>

				<div class="day-header-new modal-header">
					<div class="day-header-left">
						<h2 class="day-title" id="unread-playlist-title">À écouter</h2>
						<span class="day-count">{unreadPlaylistModal.count} capsule{unreadPlaylistModal.count !== 1 ? 's' : ''}</span>
					</div>

					<div class="day-header-right">
						<span class="day-duration">{formatDurationFull(unreadPlaylistModal.totalSeconds)}</span>
					</div>
				</div>

				<div class="recordings-scroller">
					<div class="recordings-row unread-playlist-row">
						{#each unreadPlaylistModal.groups as group, groupIndex}
							{#if groupIndex > 0}
								<div class="playlist-divider" aria-hidden="true">
									<span class="playlist-divider-line"></span>
									<span class="playlist-divider-label">{formatDateHeader(group.date, group.recordings)}</span>
								</div>
							{/if}

							{#each group.recordings as recording, index}
								{@const playlistIndex = group.startIndex + index}
								<RecordingCard
									{recording}
									index={playlistIndex}
									available={true}
									{cardSwiped}
									{player}
									threshold={data.threshold}
									{isRecordingListened}
									{isCurrentPlaying}
									{isCurrentRecording}
									onplay={(i) => unreadPlaylistModal && playFromRecording(unreadPlaylistModal.playlist, i)}
									ontouchstart={handleCardTouchStart}
									ontouchend={(e) => unreadPlaylistModal && handleCardTouchEnd(e, unreadPlaylistModal.playlist, playlistIndex)}
									onimageclick={(url) => selectedImageUrl = url}
									{formatTime}
									{formatDuration}
									{formatTimeSeconds}
								/>
							{/each}
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if selectedDayRecordings}
		<div
			class="modal-overlay"
			use:scrollLock={selectedDayRecordings !== null}
			onclick={closeDayModal}
			onkeydown={(e) => e.key === 'Escape' && closeDayModal()}
			role="button"
			tabindex="0"
			aria-label="Fermer la modale"
		>
			<div
				class="modal day-modal"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.key === 'Escape' && closeDayModal()}
				role="dialog"
				aria-modal="true"
				aria-labelledby="day-modal-title"
				tabindex="-1"
			>
				<!-- Croix de fermeture au-dessus de la modale -->
				<CloseIconButton
					onclick={closeDayModal}
					ariaLabel="Fermer la modale"
					size="md"
					extraClass="modal-close-outer-btn"
				/>
				
				<div class="day-header-new modal-header">
					<div class="day-header-left">
						<h2 class="day-title" id="day-modal-title">
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
		inset: 0;
		min-height: 100vh;
		min-height: 100dvh;
		background: rgba(0, 0, 0, 0.88);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: 1050;
		padding: calc(5rem + env(safe-area-inset-top, 0px)) 1rem calc(15rem + env(safe-area-inset-bottom, 0px));
		overflow-y: auto;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
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

	.welcome {
		color: #888;
	}

	.unread-summary-pill {
		margin: 0.6rem auto 0;
		padding: 0.8rem 1rem 0.85rem;
		display: grid;
		grid-template-columns: 42px minmax(0, 1fr) 42px;
		align-items: center;
		column-gap: 0.15rem;
		width: min(100%, 290px);
		border-radius: 999px;
		border: 1px solid rgba(233, 69, 96, 0.28);
		background:
			linear-gradient(180deg, rgba(233, 69, 96, 0.18) 0%, rgba(233, 69, 96, 0.08) 100%),
			rgba(42, 42, 78, 0.9);
		color: #fff4f6;
		cursor: pointer;
		transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
		box-shadow: 0 14px 32px rgba(11, 11, 24, 0.24);
		appearance: none;
		font: inherit;
		text-align: center;
	}

	.unread-summary-pill:hover:not(:disabled) {
		transform: translateY(-1px);
		border-color: rgba(233, 69, 96, 0.45);
		box-shadow: 0 18px 38px rgba(11, 11, 24, 0.32);
	}

	.unread-summary-pill:disabled {
		cursor: default;
	}

	.unread-summary-pill:disabled:not(.is-passive) {
		opacity: 0.8;
		cursor: wait;
	}

	.unread-summary-pill.is-passive {
		box-shadow: 0 12px 28px rgba(11, 11, 24, 0.18);
	}

	.unread-summary-pill.is-passive .pill-title,
	.unread-summary-pill.is-passive .pill-duration {
		opacity: 0.92;
	}

	.unread-summary-pill .pill-leading-slot,
	.unread-summary-pill .pill-trailing-slot {
		width: 34px;
		height: 34px;
		display: flex;
		align-items: center;
	}

	.unread-summary-pill .pill-leading-slot {
		grid-column: 1;
		justify-content: center;
		filter: drop-shadow(0 6px 14px rgba(11, 11, 24, 0.28));
		justify-self: start;
	}

	.unread-summary-pill .pill-trailing-slot {
		grid-column: 3;
		justify-self: end;
	}

	.unread-summary-pill .pill-play-icon {
		width: 100%;
		height: 100%;
		display: block;
	}

	.unread-summary-pill .pill-lock-icon {
		width: 100%;
		height: 100%;
		display: block;
	}

	.unread-summary-pill .pill-play-icon circle {
		fill: rgba(233, 69, 96, 0.22);
		stroke: rgba(255, 199, 210, 0.42);
		stroke-width: 1.25;
	}

	.unread-summary-pill .pill-play-icon path {
		fill: #fff4f6;
	}

	.unread-summary-pill .pill-lock-icon rect,
	.unread-summary-pill .pill-lock-icon path {
		fill: none;
		stroke: #fff4f6;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.unread-summary-pill .pill-copy {
		grid-column: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.12rem;
		width: 100%;
		padding: 0;
		min-width: 0;
	}

	.unread-summary-pill .pill-title {
		font-size: 0.98rem;
		font-weight: 700;
		color: #ffffff;
		max-width: 100%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.unread-summary-pill .pill-duration {
		font-size: 0.82rem;
		font-weight: 500;
		color: #ffd7df;
		white-space: nowrap;
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
	:global(.modal-close-outer-btn) {
		position: absolute;
		top: -70px;
		right: 0;
		z-index: 1001;
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

	.unread-playlist-row {
		align-items: stretch;
	}

	.playlist-divider {
		flex: 0 0 76px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.85rem;
		padding: 0.5rem 0 0.5rem 0.15rem;
	}

	.playlist-divider-line {
		width: 2px;
		height: 160px;
		border-radius: 999px;
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.48) 50%, rgba(255, 255, 255, 0.04) 100%);
	}

	.playlist-divider-label {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.82);
		writing-mode: vertical-rl;
		transform: rotate(180deg);
		text-align: center;
	}


	.no-recordings {
		text-align: center;
		color: #888;
	}

	.modal .no-recordings {
		padding: 2rem;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>

<ImageViewer 
	imageUrl={selectedImageUrl} 
	isOpen={selectedImageUrl !== null} 
	onClose={() => selectedImageUrl = null} 
/>
