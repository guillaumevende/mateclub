<script lang="ts">
	import type { CalendarMonth } from '$lib/calendar';

	interface DateInfo {
		hasRecordings: boolean;
		hasUnread: boolean;
	}

	interface CalendarCell {
		day: number;
		key: string;
		classes: string;
		hasRecordings: boolean;
	}

	interface Props {
		calendarMonths: CalendarMonth[] | null;
		calendarCells: CalendarCell[][];
		calendarDates: Record<string, DateInfo>;
		onDateClick: (date: string) => void;
	}

	let { calendarMonths, calendarCells, calendarDates, onDateClick }: Props = $props();

	function getMonthName(month: number): string {
		const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
		return monthNames[month];
	}

	function handleCalendarClick(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (target.classList.contains('has-recordings')) {
			const date = target.dataset.date;
			if (date) {
				onDateClick(date);
			}
		}
	}
</script>

<div class="calendar-container">
	<div class="calendar-scroll">
		{#each calendarMonths || [] as monthData, monthIndex}
		<div class="month-table">
			<h3 class="month-title">{getMonthName(monthData.month)} {monthData.year}</h3>
			<div
				class="month-grid"
				onclick={handleCalendarClick}
				onkeydown={(e) => e.key === 'Enter' && handleCalendarClick(e as unknown as MouseEvent)}
				role="grid"
				tabindex="0"
				aria-label="Calendrier des capsules"
			>
				<span class="cell-header">Lu</span>
				<span class="cell-header">Ma</span>
				<span class="cell-header">Me</span>
				<span class="cell-header">Je</span>
				<span class="cell-header">Ve</span>
				<span class="cell-header">Sa</span>
				<span class="cell-header">Di</span>
				{#each calendarCells[monthIndex] || [] as cell}
					{#if cell.day === -1}
						<span class="cell-day cell-empty"></span>
					{:else if cell.hasRecordings}
						<span
							class={cell.classes}
							data-date={cell.key}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && handleCalendarClick(e as unknown as MouseEvent)}
							aria-label={`Voir les capsules du ${cell.day}`}
						>
							{cell.day}
						</span>
					{:else}
						<span
							class={cell.classes}
							data-date={cell.key}
							role="gridcell"
						>
							{cell.day}
						</span>
					{/if}
				{/each}
			</div>
		</div>
		{/each}
	</div>
</div>

<style>
	.calendar-container {
		width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin-top: 1rem;
	}

	.calendar-scroll {
		display: flex;
		gap: 1.5rem;
		padding: 0.5rem;
		min-width: max-content;
	}

	.month-table {
		background: #2a2a4e;
		border-radius: 12px;
		padding: 0.5rem;
		flex-shrink: 0;
	}

	.month-title {
		text-align: center;
		color: #e94560;
		font-size: 0.85rem;
		margin: 0 0 0.4rem;
		font-weight: 500;
	}

	.month-grid {
		display: grid;
		grid-template-columns: repeat(7, 40px);
		grid-auto-rows: 40px;
		gap: 2px;
		width: max-content;
	}

	.cell-header,
	.cell-day {
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		font-size: 14px;
		border-radius: 50%;
		line-height: 1;
		cursor: default;
		user-select: none;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	.cell-header {
		color: #888;
		font-size: 12px;
	}

	.cell-day {
		color: white;
		text-align: center;
	}

	.cell-day.cell-empty {
		opacity: 0;
		pointer-events: none;
	}

	.cell-day.no-recordings {
		color: white;
		opacity: 0.4;
		padding: 0;
	}

	.cell-day.has-recordings {
		cursor: pointer;
	}

	.cell-day.has-recordings:hover {
		background: #e94560;
		color: white;
	}

	.cell-day.unread {
		font-weight: bold;
		color: #e94560;
	}

	.cell-day.unread:hover {
		background: #e94560;
		color: white;
	}

	.cell-day.today {
		border: 4px solid #e94560;
	}
</style>
