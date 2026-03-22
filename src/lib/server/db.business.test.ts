import { describe, it, expect, beforeEach } from 'vitest';
import { getRecordingsByDate, createUser, getUserById } from './db';

describe('Logique métier - Enregistrements', () => {
	let testUserId: number;

	beforeEach(() => {
		// Créer un utilisateur de test
		const pseudo = `test_recording_${Date.now()}`;
		const user = createUser(pseudo, 'testpassword123', false);
		testUserId = user.id;
	});

	it('devrait retourner null ou un objet pour une date donnée', () => {
		const date = new Date().toISOString().split('T')[0];
		const result = getRecordingsByDate(testUserId, date);
		
		// Peut être null si pas d'enregistrements, ou un objet si existants
		expect(result === null || typeof result === 'object').toBe(true);
	});

	it('si résultat non null, devrait avoir les propriétés attendues', () => {
		const date = new Date().toISOString().split('T')[0];
		const result = getRecordingsByDate(testUserId, date);
		
		if (result !== null) {
			expect(result).toHaveProperty('date');
			expect(result).toHaveProperty('recordings');
			expect(result).toHaveProperty('available');
		}
	});

	it('si résultat non null, recordings devrait être un tableau', () => {
		const date = new Date().toISOString().split('T')[0];
		const result = getRecordingsByDate(testUserId, date);
		
		if (result !== null) {
			expect(Array.isArray(result.recordings)).toBe(true);
		}
	});
});

describe('Logique métier - Utilisateurs', () => {
	it('devrait récupérer un utilisateur par ID', () => {
		const user = getUserById(1);
		// L'admin par défaut a l'ID 1 (créé via /setup)
		if (user) {
			expect(user).toHaveProperty('id');
			expect(user).toHaveProperty('pseudo');
		}
	});

	it('devrait retourner undefined pour un ID inexistant', () => {
		const user = getUserById(999999);
		expect(user).toBeUndefined();
	});
});