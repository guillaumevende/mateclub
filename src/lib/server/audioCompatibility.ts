import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type AudioMimeType = 'audio/mp4' | 'audio/webm' | 'audio/ogg' | 'audio/mpeg';

type PreparedAudio = {
	buffer: Buffer;
	mimeType: AudioMimeType;
	extension: string;
	transcoded: boolean;
};

export function getAudioExtension(mimeType: string | null): string {
	switch (mimeType) {
		case 'audio/webm':
			return 'webm';
		case 'audio/ogg':
			return 'ogg';
		case 'audio/mpeg':
			return 'mp3';
		case 'audio/mp4':
		default:
			return 'm4a';
	}
}

export function shouldTranscodeForSafariCompatibility(mimeType: string | null): boolean {
	return mimeType === 'audio/webm' || mimeType === 'audio/ogg';
}

export async function prepareAudioForStorage(
	audioBuffer: Buffer,
	detectedMimeType: string | null
): Promise<PreparedAudio> {
	if (!shouldTranscodeForSafariCompatibility(detectedMimeType)) {
		return {
			buffer: audioBuffer,
			mimeType: isAudioMimeType(detectedMimeType) ? detectedMimeType : 'audio/mp4',
			extension: getAudioExtension(detectedMimeType),
			transcoded: false
		};
	}

	const transcodedBuffer = await transcodeToM4a(audioBuffer, detectedMimeType);

	return {
		buffer: transcodedBuffer,
		mimeType: 'audio/mp4',
		extension: 'm4a',
		transcoded: true
	};
}

function isAudioMimeType(mimeType: string | null): mimeType is AudioMimeType {
	return mimeType === 'audio/mp4' || mimeType === 'audio/webm' || mimeType === 'audio/ogg' || mimeType === 'audio/mpeg';
}

async function transcodeToM4a(audioBuffer: Buffer, mimeType: string | null): Promise<Buffer> {
	if (!isAudioMimeType(mimeType)) {
		throw new Error('Type mime audio non supporté pour le transcodage');
	}

	const tempDir = await mkdtemp(join(tmpdir(), 'mateclub-audio-'));
	const inputPath = join(tempDir, `input.${getAudioExtension(mimeType)}`);
	const outputPath = join(tempDir, 'output.m4a');

	try {
		await writeFile(inputPath, audioBuffer);
		await execFileAsync('ffmpeg', [
			'-y',
			'-hide_banner',
			'-loglevel',
			'error',
			'-i',
			inputPath,
			'-vn',
			'-c:a',
			'aac',
			'-b:a',
			'128k',
			'-movflags',
			'+faststart',
			outputPath
		]);
		return await readFile(outputPath);
	} catch (error) {
		console.error('[AUDIO] Erreur lors du transcodage Safari-compatible:', error);
		throw new Error('Impossible de convertir cet audio dans un format compatible Safari', { cause: error });
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}
