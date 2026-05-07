import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getUserById, getUserTimezone, db, getConfiguredHistoryMonths } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const timezone = getUserTimezone(locals.user.id);
	const user = getUserById(locals.user.id);
	const thresholdMinutes = user?.daily_notification_hour ?? 420;
	const hours = Math.floor(thresholdMinutes / 60);
	const mins = thresholdMinutes % 60;
	const threshold = mins === 0 ? `${hours}h` : `${hours}h${mins.toString().padStart(2, '0')}`;

	const historyMonths = getConfiguredHistoryMonths();
	const historyCutoff = new Date();
	historyCutoff.setMonth(historyCutoff.getMonth() - historyMonths);

	try {
		// Récupérer les enregistrements individuels pour vérifier le verrouillage
		const stmt = db.prepare(`
			SELECT 
				r.recorded_at,
				r.user_id,
				l.id as listened_id
			FROM recordings r 
			LEFT JOIN listening_history l ON l.recording_id = r.id AND l.user_id = ?
			WHERE r.recorded_at >= ?
			ORDER BY r.recorded_at ASC
		`);

		const results = stmt.all(locals.user.id, historyCutoff.toISOString()) as {
			recorded_at: string;
			user_id: number;
			listened_id: number | null;
		}[];

		// Formatter pour la date et l'heure dans le fuseau utilisateur
		const dateFormatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		
		const hourMinFormatter = new Intl.DateTimeFormat('en-GB', {
			timeZone: timezone,
			hour: '2-digit',
			hour12: false,
			minute: '2-digit'
		});

		const today = dateFormatter.format(new Date());
		
		// Grouper par date et vérifier si disponible
		const grouped: Record<string, { total_count: number; unread_count: number; has_available: boolean }> = {};
		
		for (const row of results) {
			// Extraire l'heure et minute de l'enregistrement en minutes depuis minuit
			const parts = hourMinFormatter.formatToParts(new Date(row.recorded_at));
			const hourRecorded = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
			const minuteRecorded = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
			const recordedMinutes = hourRecorded * 60 + minuteRecorded;
			
			// Calculer la date effective: si l'heure < seuil, c'est hier
			let effectiveDate = dateFormatter.format(new Date(row.recorded_at));
			if (recordedMinutes < thresholdMinutes) {
				const recordedDate = new Date(row.recorded_at);
				recordedDate.setDate(recordedDate.getDate() - 1);
				effectiveDate = dateFormatter.format(recordedDate);
			}
			
			if (!grouped[effectiveDate]) {
				grouped[effectiveDate] = { total_count: 0, unread_count: 0, has_available: false };
			}
			
			grouped[effectiveDate].total_count += 1;
			const isOwnRecording = row.user_id === locals.user.id;
			if (!isOwnRecording && !row.listened_id) {
				grouped[effectiveDate].unread_count += 1;
			}
			
			// Vérifier si cet enregistrement est disponible (basé sur la date effective)
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			const yesterdayStr = dateFormatter.format(yesterday);
			const nowParts = hourMinFormatter.formatToParts(new Date());
			const currentMinutes = parseInt(nowParts.find(p => p.type === 'hour')?.value || '0', 10) * 60 + 
				parseInt(nowParts.find(p => p.type === 'minute')?.value || '0', 10);
			
			// Enregistrements d'hier → disponibles seulement si on a passé le seuil
			// Enregistrements d'aujourd'hui → disponibles seulement si l'heure d'enregistrement < seuil
			const isAvailable = effectiveDate < yesterdayStr || 
				(effectiveDate === yesterdayStr && currentMinutes >= thresholdMinutes) ||
				(effectiveDate === today && recordedMinutes < thresholdMinutes);
			if (isAvailable) {
				grouped[effectiveDate].has_available = true;
			}
		}

		// Ne montrer que les jours avec au moins un enregistrement disponible
		const datesInfo: Record<string, { hasRecordings: boolean; hasUnread: boolean }> = {};
		for (const [date, info] of Object.entries(grouped)) {
			// Uniquement les jours avec au moins un enregistrement disponible
			if (info.has_available) {
				datesInfo[date] = {
					hasRecordings: info.total_count > 0,
					hasUnread: info.unread_count > 0
				};
			}
		}

		return json({
			dates: datesInfo,
			timezone,
			threshold: user?.daily_notification_hour || 420,
			superPowers: user?.super_powers === 1
		});
	} catch (error) {
		console.error('Error in /api/recordings/dates:', error);
		return json({ error: 'Erreur interne' }, { status: 500 });
	}
};
