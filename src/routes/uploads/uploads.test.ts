import { describe, it, expect } from 'vitest';
import { normalize, join } from 'path';

const uploadsDir = '/app/uploads';

function validatePathTraversal(filePath: string): boolean {
	// Handle absolute paths - they should be rejected
	if (filePath.startsWith('/')) {
		return false;
	}
	const fullPath = join(uploadsDir, filePath);
	const normalizedPath = normalize(fullPath);
	// Check for path traversal after normalization
	if (normalizedPath.includes('..')) {
		return false;
	}
	return normalizedPath.startsWith(uploadsDir);
}

describe('Protection path traversal', () => {
	it('devrait bloquer les chemins avec ..', () => {
		const maliciousPath = '../../etc/passwd';
		const isSafe = validatePathTraversal(maliciousPath);
		expect(isSafe).toBe(false);
	});

	it('devrait bloquer les chemins absolus', () => {
		const maliciousPath = '/etc/passwd';
		const isSafe = validatePathTraversal(maliciousPath);
		expect(isSafe).toBe(false);
	});

	it('devrait autoriser les chemins normaux', () => {
		const safePath = 'avatars/user123/photo.jpg';
		const isSafe = validatePathTraversal(safePath);
		expect(isSafe).toBe(true);
	});

	it('devrait bloquer les chemins avec .. au milieu', () => {
		const maliciousPath = 'avatars/../../secret/file.txt';
		const isSafe = validatePathTraversal(maliciousPath);
		expect(isSafe).toBe(false);
	});

	it('devrait bloquer .. après un slash', () => {
		// Note: 'uploads/../.env' normalise vers '.env' dans uploadsDir
		// C'est un chemin valide dans le dossier uploads, pas un path traversal réel
		// Le vrai path traversal est celui-ci:
		const maliciousPath = 'uploads/../../etc/passwd';
		const isSafe = validatePathTraversal(maliciousPath);
		expect(isSafe).toBe(false);
	});

	it('devrait autoriser les noms de fichiers avec des points', () => {
		const safePath = 'avatars/user.123.456/photo.tar.gz';
		const isSafe = validatePathTraversal(safePath);
		expect(isSafe).toBe(true);
	});
});