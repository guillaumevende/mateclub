import { afterEach, describe, expect, it } from 'vitest';
import { getAudioProcessingRuntimeConfig } from '$lib/server/audioProcessing';

const ORIGINAL_ENV = {
	AUDIO_PROCESSING_MODE: process.env.AUDIO_PROCESSING_MODE,
	AUDIO_PROCESSING_PYTHON_BIN: process.env.AUDIO_PROCESSING_PYTHON_BIN
};

afterEach(() => {
	if (ORIGINAL_ENV.AUDIO_PROCESSING_MODE === undefined) {
		delete process.env.AUDIO_PROCESSING_MODE;
	} else {
		process.env.AUDIO_PROCESSING_MODE = ORIGINAL_ENV.AUDIO_PROCESSING_MODE;
	}

	if (ORIGINAL_ENV.AUDIO_PROCESSING_PYTHON_BIN === undefined) {
		delete process.env.AUDIO_PROCESSING_PYTHON_BIN;
	} else {
		process.env.AUDIO_PROCESSING_PYTHON_BIN = ORIGINAL_ENV.AUDIO_PROCESSING_PYTHON_BIN;
	}
});

describe('Audio processing runtime config', () => {
	it('reste désactivé par défaut sans flag serveur', () => {
		delete process.env.AUDIO_PROCESSING_MODE;
		const config = getAudioProcessingRuntimeConfig();
		expect(config.configured).toBe(false);
		expect(config.mode).toBe('basic');
		expect(config.missingRequirements).toContain('AUDIO_PROCESSING_MODE=deepfilter');
	});

	it('considère DeepFilter disponible quand le flag et le binaire existent', () => {
		process.env.AUDIO_PROCESSING_MODE = 'deepfilter';
		process.env.AUDIO_PROCESSING_PYTHON_BIN = process.execPath;
		const config = getAudioProcessingRuntimeConfig();
		expect(config.configured).toBe(true);
		expect(config.mode).toBe('deepfilter');
		expect(config.pythonBin).toBe(process.execPath);
		expect(config.missingRequirements).toHaveLength(0);
	});
});
