import { describe, expect, it } from 'vitest';
import {
	getAudioExtension,
	prepareAudioForStorage,
	shouldTranscodeForSafariCompatibility
} from '$lib/server/audioCompatibility';

describe('Compatibilité audio Safari', () => {
	it('associe la bonne extension au mime audio', () => {
		expect(getAudioExtension('audio/mp4')).toBe('m4a');
		expect(getAudioExtension('audio/webm')).toBe('webm');
		expect(getAudioExtension('audio/ogg')).toBe('ogg');
		expect(getAudioExtension('audio/mpeg')).toBe('mp3');
		expect(getAudioExtension(null)).toBe('m4a');
	});

	it('ne transcode que les formats peu fiables pour Safari', () => {
		expect(shouldTranscodeForSafariCompatibility('audio/webm')).toBe(true);
		expect(shouldTranscodeForSafariCompatibility('audio/ogg')).toBe(true);
		expect(shouldTranscodeForSafariCompatibility('audio/mp4')).toBe(false);
		expect(shouldTranscodeForSafariCompatibility('audio/mpeg')).toBe(false);
		expect(shouldTranscodeForSafariCompatibility(null)).toBe(false);
	});

	it('laisse les buffers déjà compatibles inchangés', async () => {
		const audioBuffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]);
		const prepared = await prepareAudioForStorage(audioBuffer, 'audio/mp4');
		expect(prepared.transcoded).toBe(false);
		expect(prepared.buffer).toBe(audioBuffer);
		expect(prepared.mimeType).toBe('audio/mp4');
		expect(prepared.extension).toBe('m4a');
	});
});
