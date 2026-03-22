import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, getSession, recordLoginAttempt, canAttemptLogin } from './db';

describe('Authentification - Sessions', () => {
	let userId: number;

	beforeEach(() => {
		// On suppose qu'il y a au moins un utilisateur dans la DB (l'admin créé via /setup)
		// Pour les tests en conditions réelles, il faudrait un utilisateur de test
	});

	it('devrait créer une session et retourner un UUID', () => {
		const sessionId = createSession(1);
		expect(sessionId).toBeDefined();
		expect(typeof sessionId).toBe('string');
		expect(sessionId.length).toBe(36); // UUID format
	});

	it('devrait récupérer une session valide', () => {
		const sessionId = createSession(1);
		const user = getSession(sessionId);
		expect(user).toBeDefined();
		expect(user?.id).toBe(1);
	});

	it('devrait retourner undefined pour une session inexistante', () => {
		const user = getSession('invalid-session-id');
		expect(user).toBeUndefined();
	});
});

describe('Rate Limiting', () => {
	it('devrait autoriser les tentatives de login sous la limite', () => {
		const ip = '192.168.1.100';
		expect(canAttemptLogin(ip)).toBe(true);
	});

	it('devrait bloquer après 5 tentatives échouées', () => {
		const ip = '192.168.1.101';
		
		// Enregistrer 5 tentatives
		for (let i = 0; i < 5; i++) {
			recordLoginAttempt(ip);
		}
		
		// La 6ème tentative devrait être bloquée
		expect(canAttemptLogin(ip)).toBe(false);
	});
});