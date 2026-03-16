import { describe, it, expect } from 'vitest';
import { canAttemptLogin, recordLoginAttempt, getRemainingLockoutTime } from './db';

describe('Rate Limiting', () => {
	it('should allow login attempts under the limit', () => {
		const ip = '192.168.1.1';
		expect(canAttemptLogin(ip)).toBe(true);
	});

	it('should block after 5 failed attempts', () => {
		const ip = '192.168.1.2';
		
		// Record 5 failed attempts
		for (let i = 0; i < 5; i++) {
			recordLoginAttempt(ip);
		}
		
		// 6th attempt should be blocked
		expect(canAttemptLogin(ip)).toBe(false);
	});

	it('should return remaining lockout time', () => {
		const ip = '192.168.1.3';
		
		// Record 5 failed attempts
		for (let i = 0; i < 5; i++) {
			recordLoginAttempt(ip);
		}
		
		// Should return a positive number (minutes remaining)
		const remaining = getRemainingLockoutTime(ip);
		expect(remaining).toBeGreaterThan(0);
		expect(remaining).toBeLessThanOrEqual(15);
	});
});
