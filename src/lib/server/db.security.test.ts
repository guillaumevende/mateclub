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
	getUserTimezone,
	deleteUser
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
