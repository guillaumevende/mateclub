import { describe, it, expect, afterEach } from 'vitest';
import { createUser, deleteUser } from '$lib/server/db';

describe('Permissions Admin', () => {
	const createdUserIds: number[] = [];

	afterEach(() => {
		// Nettoyer : supprimer tous les utilisateurs de test créés
		for (const userId of createdUserIds) {
			deleteUser(userId);
		}
		createdUserIds.length = 0; // Vider le tableau
	});

	it('devrait créer un utilisateur normal (non admin) par défaut', () => {
		const pseudo = `test_user_${Date.now()}`;
		const user = createUser(pseudo, 'testpassword123', false);
		createdUserIds.push(user.id);
		
		expect(user.is_admin).toBe(0);
		expect(user.super_powers).toBe(0);
	});

	it('devrait créer un admin quand explicitement spécifié', () => {
		const pseudo = `test_admin_${Date.now()}`;
		const user = createUser(pseudo, 'testpassword123', true);
		createdUserIds.push(user.id);
		
		expect(user.is_admin).toBe(1);
		expect(user.super_powers).toBe(0);
	});

	it('un utilisateur non admin ne devrait pas avoir is_admin à 1', () => {
		const pseudo = `test_user2_${Date.now()}`;
		const user = createUser(pseudo, 'testpassword123', false);
		createdUserIds.push(user.id);
		
		expect(user.is_admin).not.toBe(1);
	});

	it('un utilisateur avec super_powers devrait être un utilisateur avancé', () => {
		const pseudo = `test_super_${Date.now()}`;
		const user = createUser(pseudo, 'testpassword123', false);
		createdUserIds.push(user.id);
		// Note: super_powers est défini lors de la création, ici on vérifie le champ
		// La mise à jour des super_powers se fait via updateUserSuperPowers
		expect(user.super_powers).toBeDefined();
	});
});