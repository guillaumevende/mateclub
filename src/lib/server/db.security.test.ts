import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
	createUser, 
	getUserById, 
	getUserByPseudo, 
	verifyPassword, 
	isPseudoAvailable,
	updateUserHour,
	updateUserTimezone,
	updateUserPseudo,
	toggleAutoMarkOwnRecordingsAsListened,
	getUserTimezone,
	deleteUser,
	updateUserBirthday,
	updateUserAudioAvailabilityDays,
	getTeamBirthdayInfo,
	getUserCurrentAge,
	getConfiguredHistoryDays,
	saveRecording,
	getRecordingByClientDraftId,
	getRecordingByHashAndRecordedAt,
	getUserRecentRecordings
} from './db';

describe('Validation mot de passe', () => {
	it('devrait valider un mot de passe correct', () => {
		const pseudo = `test_pwd_valid_${Date.now()}`;
		const password = 'correctpassword123';
		createUser(pseudo, password, false);
		const user = getUserByPseudo(pseudo);
		const isValid = verifyPassword(user!.password_hash, 'correctpassword123');
		expect(isValid).toBe(true);
		deleteUser(user!.id);
	});

	it('devrait rejeter un mot de passe incorrect', () => {
		const pseudo = `test_pwd_invalid_${Date.now()}`;
		const password = 'correctpassword123';
		createUser(pseudo, password, false);
		const user = getUserByPseudo(pseudo);
		const isValid = verifyPassword(user!.password_hash, 'wrongpassword');
		expect(isValid).toBe(false);
		deleteUser(user!.id);
	});

	it('devrait créer un utilisateur avec un hash de mot de passe', () => {
		const pseudo = `test_hash_${Date.now()}`;
		const password = 'testpassword123';
		createUser(pseudo, password, false);
		const user = getUserByPseudo(pseudo);
		
		expect(user).toBeDefined();
		expect(user!.password_hash).toBeDefined();
		expect(user!.password_hash).not.toBe(password);
		expect(user!.password_hash.length).toBeGreaterThan(20);
		
		deleteUser(user!.id);
	});
});

describe('Validation pseudo', () => {
	it('devrait retourner true si le pseudo est disponible', () => {
		const available = isPseudoAvailable(`available_${Date.now()}`);
		expect(available).toBe(true);
	});

	it('devrait retourner false si le pseudo existe déjà', () => {
		const user = createUser(`taken_${Date.now()}`, 'password123', false);
		const available = isPseudoAvailable(user.pseudo);
		expect(available).toBe(false);
		deleteUser(user.id);
	});

	it('devrait permettre le même pseudo pour un autre utilisateur exclu', () => {
		const user = createUser(`excluded_${Date.now()}`, 'password123', false);
		const available = isPseudoAvailable(user.pseudo, user.id);
		expect(available).toBe(true);
		deleteUser(user.id);
	});
});

describe('Fonctions utilisateur', () => {
	let testUserId: number;

	beforeEach(() => {
		const user = createUser(`test_user_${Date.now()}`, 'password123', false);
		testUserId = user.id;
	});

	afterEach(() => {
		if (testUserId) {
			deleteUser(testUserId);
		}
	});

	it('devrait récupérer un utilisateur par ID', () => {
		const user = getUserById(testUserId);
		expect(user).toBeDefined();
		expect(user?.id).toBe(testUserId);
	});

	it('devrait récupérer un utilisateur par pseudo', () => {
		const user = getUserById(testUserId);
		const byPseudo = getUserByPseudo(user!.pseudo);
		expect(byPseudo).toBeDefined();
		expect(byPseudo?.id).toBe(testUserId);
	});

	it('devrait retourner undefined pour un ID inexistant', () => {
		const user = getUserById(999999);
		expect(user).toBeUndefined();
	});

	it('devrait retourner undefined pour un pseudo inexistant', () => {
		const user = getUserByPseudo('inexistant_12345678');
		expect(user).toBeUndefined();
	});

	it('devrait mettre à jour le fuseau horaire', () => {
		updateUserTimezone(testUserId, 'America/New_York');
		const user = getUserById(testUserId);
		expect(user?.timezone).toBe('America/New_York');
	});

	it('devrait récupérer le fuseau horaire de l\'utilisateur', () => {
		updateUserTimezone(testUserId, 'Asia/Tokyo');
		const timezone = getUserTimezone(testUserId);
		expect(timezone).toBe('Asia/Tokyo');
	});

	it('devrait mettre à jour l\'heure de notification', () => {
		updateUserHour(testUserId, 480); // 8h00
		const user = getUserById(testUserId);
		expect(user?.daily_notification_hour).toBe(480);
	});

	it('devrait mettre à jour le pseudo', () => {
		const newPseudo = `updated_${Date.now()}`;
		updateUserPseudo(testUserId, newPseudo);
		const user = getUserById(testUserId);
		expect(user?.pseudo).toBe(newPseudo);
	});

	it('devrait activer le marquage auto-lu des propres capsules par défaut', () => {
		const user = getUserById(testUserId);
		expect(user?.auto_mark_own_recordings_as_listened).toBe(1);
	});

	it('devrait initialiser la durée de mise à disposition sur la durée globale de l’app', () => {
		const user = getUserById(testUserId);
		expect(user?.audio_availability_days).toBe(getConfiguredHistoryDays());
	});

	it('devrait pouvoir désactiver le marquage auto-lu des propres capsules', () => {
		toggleAutoMarkOwnRecordingsAsListened(testUserId, false);
		const user = getUserById(testUserId);
		expect(user?.auto_mark_own_recordings_as_listened).toBe(0);
	});

	it('devrait enregistrer un anniversaire avec année optionnelle', () => {
		updateUserBirthday(testUserId, 12, 7, 1994);
		const user = getUserById(testUserId);
		expect(user?.birthday_day).toBe(12);
		expect(user?.birthday_month).toBe(7);
		expect(user?.birthday_year).toBe(1994);
		expect(getTeamBirthdayInfo(user!, 'Europe/Paris')?.label).toBe('12/07');
		expect(getUserCurrentAge(user!, 'Europe/Paris')).not.toBeNull();
	});

	it('devrait filtrer les enregistrements plus anciens que la durée perso de mise à disposition', () => {
		updateUserAudioAvailabilityDays(testUserId, 7);

		const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
		const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();

		saveRecording(testUserId, Buffer.from('recent-audio'), 5, { recordedAt: recentDate });
		saveRecording(testUserId, Buffer.from('old-audio'), 5, { recordedAt: oldDate });

		const recordings = getUserRecentRecordings(testUserId, 20);
		expect(recordings.some((recording) => recording.recorded_at === recentDate)).toBe(true);
		expect(recordings.some((recording) => recording.recorded_at === oldDate)).toBe(false);
	});

	it('devrait refuser deux enregistrements issus du même brouillon client', () => {
		const clientDraftId = `draft-${Date.now()}-${testUserId}`;
		const first = saveRecording(testUserId, Buffer.from('idempotent-audio'), 5, {
			clientDraftId,
			audioHash: `hash-${clientDraftId}`
		});

		expect(() =>
			saveRecording(testUserId, Buffer.from('idempotent-audio'), 5, {
				clientDraftId,
				audioHash: `hash-${clientDraftId}`
			})
		).toThrow();
		expect(getRecordingByClientDraftId(testUserId, clientDraftId)?.id).toBe(first.id);
	});

	it('devrait retrouver un ancien brouillon avec son empreinte et son heure d’enregistrement', () => {
		const recordedAt = new Date(Date.now() - 60 * 60 * 1000)
			.toISOString()
			.replace('T', ' ')
			.replace(/\.\d{3}Z$/, '');
		const audioHash = `old-draft-hash-${Date.now()}-${testUserId}`;
		const recording = saveRecording(testUserId, Buffer.from('old-draft-audio'), 5, {
			audioHash,
			recordedAt
		});

		expect(getRecordingByHashAndRecordedAt(testUserId, audioHash, recordedAt)?.id).toBe(recording.id);
	});
});

describe('Suppression utilisateur', () => {
	it('devrait supprimer un utilisateur', () => {
		const user = createUser(`delete_${Date.now()}`, 'password123', false);
		const userId = user.id;
		
		deleteUser(userId);
		
		const deleted = getUserById(userId);
		expect(deleted).toBeUndefined();
	});
});
