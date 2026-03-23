import { describe, it, expect } from 'vitest';
import { isValidAudioBuffer, isValidImageBuffer } from '$lib/server/fileValidation';

describe('Validation buffer audio', () => {
	it('devrait valider un buffer WebM valide', () => {
		const webmBuffer = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x9B, 0x80]);
		expect(isValidAudioBuffer(webmBuffer)).toBe(true);
	});

	it('devrait valider un buffer MP3 valide', () => {
		const mp3Buffer = Buffer.from([0xFF, 0xFB, 0x90, 0x00]);
		expect(isValidAudioBuffer(mp3Buffer)).toBe(true);
	});

	it('devrait valider un buffer OGG valide', () => {
		const oggBuffer = Buffer.from([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02]);
		expect(isValidAudioBuffer(oggBuffer)).toBe(true);
	});

	it('devrait rejeter un buffer audio invalide', () => {
		const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
		expect(isValidAudioBuffer(invalidBuffer)).toBe(false);
	});

	it('devrait rejeter un buffer texte comme audio', () => {
		const textBuffer = Buffer.from('Hello World', 'utf-8');
		expect(isValidAudioBuffer(textBuffer)).toBe(false);
	});
});

describe('Validation buffer image', () => {
	it('devrait valider un buffer JPEG valide', () => {
		const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
		expect(isValidImageBuffer(jpegBuffer)).toBe(true);
	});

	it('devrait valider un buffer PNG valide', () => {
		const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
		expect(isValidImageBuffer(pngBuffer)).toBe(true);
	});

	it('devrait valider un buffer WebP valide', () => {
		const webpBuffer = Buffer.from([
			0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
			0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00
		]);
		expect(isValidImageBuffer(webpBuffer)).toBe(true);
	});

	it('devrait rejeter un buffer image invalide', () => {
		const invalidBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
		expect(isValidImageBuffer(invalidBuffer)).toBe(false);
	});

	it('devrait rejeter un buffer texte comme image', () => {
		const textBuffer = Buffer.from('Hello World', 'utf-8');
		expect(isValidImageBuffer(textBuffer)).toBe(false);
	});
});

describe('Validation URL', () => {
	function validateUrl(url: string): { valid: boolean; error?: string } {
		if (!url || url.trim() === '') {
			return { valid: true };
		}
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:') {
				return { valid: false, error: 'L\'URL doit commencer par https://' };
			}
			return { valid: true };
		} catch {
			return { valid: false, error: 'URL invalide' };
		}
	}

	it('devrait accepter une URL HTTPS valide', () => {
		const result = validateUrl('https://example.com');
		expect(result.valid).toBe(true);
	});

	it('devrait rejeter une URL HTTP', () => {
		const result = validateUrl('http://example.com');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('L\'URL doit commencer par https://');
	});

	it('devrait rejeter une URL invalide', () => {
		const result = validateUrl('not-a-url');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('URL invalide');
	});

	it('devrait accepter une URL vide', () => {
		const result = validateUrl('');
		expect(result.valid).toBe(true);
	});

	it('devrait accepter une URL avec query params', () => {
		const result = validateUrl('https://example.com/path?foo=bar&baz=qux');
		expect(result.valid).toBe(true);
	});
});

describe('Validation durée', () => {
	const MAX_DURATION_SECONDS = 180;

	function validateDuration(duration: string | undefined): { valid: boolean; error?: string } {
		if (!duration) {
			return { valid: false, error: 'Durée requise' };
		}
		const seconds = parseInt(duration, 10);
		if (isNaN(seconds) || seconds <= 0) {
			return { valid: false, error: 'Durée invalide' };
		}
		if (seconds > MAX_DURATION_SECONDS) {
			return { valid: false, error: 'Durée maximale: 3 minutes' };
		}
		return { valid: true };
	}

	it('devrait accepter une durée valide', () => {
		const result = validateDuration('30');
		expect(result.valid).toBe(true);
	});

	it('devrait accepter la durée maximale', () => {
		const result = validateDuration('180');
		expect(result.valid).toBe(true);
	});

	it('devrait rejeter une durée dépassant le maximum', () => {
		const result = validateDuration('181');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Durée maximale: 3 minutes');
	});

	it('devrait rejeter une durée invalide', () => {
		const result = validateDuration('abc');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Durée invalide');
	});

	it('devrait rejeter une durée nulle', () => {
		const result = validateDuration('0');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Durée invalide');
	});
});

describe('Validation longueur mot de passe', () => {
	const MIN_PASSWORD_LENGTH = 12;

	function validatePasswordLength(password: string): { valid: boolean; error?: string } {
		if (!password) {
			return { valid: false, error: 'Mot de passe requis' };
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			return { valid: false, error: 'Le mot de passe doit contenir au moins 12 caractères' };
		}
		return { valid: true };
	}

	it('devrait accepter un mot de passe de 12 caractères', () => {
		const result = validatePasswordLength('123456789012');
		expect(result.valid).toBe(true);
	});

	it('devrait accepter un mot de passe de plus de 12 caractères', () => {
		const result = validatePasswordLength('verylongpassword123');
		expect(result.valid).toBe(true);
	});

	it('devrait rejeter un mot de passe de 11 caractères', () => {
		const result = validatePasswordLength('12345678901');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Le mot de passe doit contenir au moins 12 caractères');
	});

	it('devrait rejeter un mot de passe vide', () => {
		const result = validatePasswordLength('');
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Mot de passe requis');
	});

	it('devrait rejeter un mot de passe null', () => {
		const result = validatePasswordLength(undefined as unknown as string);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('Mot de passe requis');
	});
});
