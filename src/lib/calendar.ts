export interface CalendarMonth {
	year: number;
	month: number;
	weeks: number[][];
}

export function generateCalendarMonths(monthsBack: number = 12): CalendarMonth[] {
	const today = new Date();
	const result: CalendarMonth[] = [];

	for (let i = 0; i < monthsBack; i++) {
		const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
		const year = date.getFullYear();
		const month = date.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const lastDayDate = lastDay.getDate();

		let firstDayOfWeek = firstDay.getDay();
		firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

		const totalCells = firstDayOfWeek + lastDayDate;
		const numberOfWeeks = Math.ceil(totalCells / 7);

		const weeks: number[][] = [];

		for (let w = 0; w < numberOfWeeks; w++) {
			const week: number[] = [];
			
			for (let d = 0; d < 7; d++) {
				const dayNumber = w * 7 + d - firstDayOfWeek + 1;
				
				if (dayNumber >= 1 && dayNumber <= lastDayDate) {
					week.push(dayNumber);
				} else {
					week.push(-1);
				}
			}
			
			weeks.push(week);
		}

		result.push({ year, month, weeks });
	}

	return result;
}
