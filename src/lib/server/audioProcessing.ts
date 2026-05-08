import { execFile } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import {
	getNextRecordingForProcessing,
	getRecordingFilePath,
	markRecordingProcessingFailed,
	markRecordingProcessingReady,
	markRecordingProcessingStarted,
	type Recording
} from '$lib/server/db';

const execFileAsync = promisify(execFile);

const AUDIO_PROCESSING_INTERVAL_MS = 15_000;
const DEFAULT_AUDIO_PROCESSING_MODE = 'basic';
const SUPPORTED_AUDIO_PROCESSING_MODE = 'deepfilter';
const DEFAULT_AUDIO_PROCESSING_PYTHON_BIN = '/opt/mateclub-audio/bin/python';
const AUDIO_PROCESSING_SCRIPT_PATH = join(process.cwd(), 'scripts/process-audio.py');
const AUDIO_PROCESSING_CACHE_HOME = join(process.cwd(), 'data/audio-processing-home');

export type AudioProcessingRuntimeConfig = {
	configured: boolean;
	mode: string;
	pythonBin: string | null;
	scriptPath: string | null;
	cacheHome: string | null;
	missingRequirements: string[];
};

let workerInitialized = false;
let processingRunInFlight = false;
let scheduledRun: ReturnType<typeof setTimeout> | null = null;

export function getAudioProcessingRuntimeConfig(): AudioProcessingRuntimeConfig {
	const mode = process.env.AUDIO_PROCESSING_MODE?.trim() || DEFAULT_AUDIO_PROCESSING_MODE;
	const pythonBin = process.env.AUDIO_PROCESSING_PYTHON_BIN?.trim() || DEFAULT_AUDIO_PROCESSING_PYTHON_BIN;
	const missingRequirements: string[] = [];

	if (mode !== SUPPORTED_AUDIO_PROCESSING_MODE) {
		missingRequirements.push(`AUDIO_PROCESSING_MODE=${SUPPORTED_AUDIO_PROCESSING_MODE}`);
	}

	if (!existsSync(AUDIO_PROCESSING_SCRIPT_PATH)) {
		missingRequirements.push('scripts/process-audio.py introuvable');
	}

	if (mode === SUPPORTED_AUDIO_PROCESSING_MODE && !existsSync(pythonBin)) {
		missingRequirements.push(`Python DeepFilter introuvable (${pythonBin})`);
	}

	return {
		configured: missingRequirements.length === 0,
		mode,
		pythonBin: mode === SUPPORTED_AUDIO_PROCESSING_MODE ? pythonBin : null,
		scriptPath: existsSync(AUDIO_PROCESSING_SCRIPT_PATH) ? AUDIO_PROCESSING_SCRIPT_PATH : null,
		cacheHome: mode === SUPPORTED_AUDIO_PROCESSING_MODE ? AUDIO_PROCESSING_CACHE_HOME : null,
		missingRequirements
	};
}

function scheduleProcessingRun(delayMs = 500): void {
	if (scheduledRun) return;

	scheduledRun = setTimeout(() => {
		scheduledRun = null;
		void processPendingAudioRecordings();
	}, delayMs);

	scheduledRun.unref?.();
}

function buildProcessedFilename(recording: Recording): string {
	return `${Date.now()}-${crypto.randomUUID()}-processed.m4a`;
}

async function processRecording(recording: Recording, config: AudioProcessingRuntimeConfig): Promise<void> {
	if (!config.pythonBin || !config.scriptPath || !config.cacheHome) {
		throw new Error('Configuration DeepFilter incomplète');
	}

	mkdirSync(config.cacheHome, { recursive: true });
	markRecordingProcessingStarted(recording.id);

	const sourcePath = getRecordingFilePath(recording.filename);
	const processedFilename = buildProcessedFilename(recording);
	const processedPath = getRecordingFilePath(processedFilename);

	try {
		await execFileAsync(
			config.pythonBin,
			[config.scriptPath, '--input', sourcePath, '--output', processedPath],
			{
				env: {
					...process.env,
					HOME: config.cacheHome
				}
			}
		);
		markRecordingProcessingReady(recording.id, processedFilename);
	} catch (error) {
		rmSync(processedPath, { force: true });
		const message =
			error instanceof Error
				? error.message
				: typeof error === 'string'
					? error
					: 'Traitement audio impossible';
		markRecordingProcessingFailed(recording.id, message);
		console.error('[AUDIO_PROCESSING] Échec du traitement', recording.id, error);
	}
}

export async function processPendingAudioRecordings(): Promise<void> {
	if (processingRunInFlight) return;
	processingRunInFlight = true;

	try {
		const config = getAudioProcessingRuntimeConfig();
		if (!config.configured) {
			return;
		}

		while (true) {
			const recording = getNextRecordingForProcessing();
			if (!recording) break;
			await processRecording(recording, config);
		}
	} finally {
		processingRunInFlight = false;
	}
}

export function initializeAudioProcessingWorker(): void {
	if (workerInitialized) return;
	workerInitialized = true;

	if (!getAudioProcessingRuntimeConfig().configured) {
		return;
	}

	scheduleProcessingRun(1_000);

	const interval = setInterval(() => {
		void processPendingAudioRecordings();
	}, AUDIO_PROCESSING_INTERVAL_MS);

	interval.unref?.();
}

export function pokeAudioProcessingWorker(): void {
	if (!getAudioProcessingRuntimeConfig().configured) {
		return;
	}

	scheduleProcessingRun();
}
