import { writable, get } from 'svelte/store';
import { triggerHaptic, initHaptics, destroyHaptics } from '$lib/utils/haptics';

export interface Recording {
  id: number;
  user_id: number;
  filename: string;
  image_filename: string | null;
  url: string | null;
  duration_seconds: number;
  recorded_at: string;
  listened_by_user: number;
  pseudo: string;
  avatar: string;
}

export interface DayRecordings {
  date: string;
  recordings: Recording[];
  available: boolean;
}

export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentDay: string | null;
  currentIndex: number;
  currentRecording: Recording | null;
  currentDayData: DayRecordings | null;
  progress: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

const initialState: PlayerState = {
  isPlaying: false,
  isLoading: false,
  currentDay: null,
  currentIndex: 0,
  currentRecording: null,
  currentDayData: null,
  progress: 0,
  duration: 0,
  volume: 1,
  isMuted: false
};

export const playerStore = writable<PlayerState>(initialState);

// Store to track last listened recording (for updating UI)
export const lastListenedRecordingId = writable<number | null>(null);

// Debug logs - only enabled when user has logs_enabled
export const debugLogs = writable<string[]>([]);
export const logsEnabled = writable<boolean>(false);
let logCounter = 0;

function logDebug(msg: string) {
  // Only log if enabled
  let enabled = false;
  logsEnabled.subscribe(v => enabled = v)();
  if (!enabled) return;
  
  logCounter++;
  const timestamp = new Date().toLocaleTimeString();
  debugLogs.update(logs => {
    const newLogs = [...logs, `#${logCounter} [${timestamp}] ${msg}`];
    return newLogs.slice(-30);
  });
}

let audioElement: HTMLAudioElement | null = null;
let guardianElement: HTMLAudioElement | null = null;
let jingleElement: HTMLAudioElement | null = null;
let isInitialized = false;

// Jingle configuration - volume is now set in the MP3 file itself
const JINGLE_CONFIG = {
  enabled: true,
  volume: 1.0,  // 100% - volume is in the MP3 file
  intro: '/jingle-intro.mp3'
};

// Store for jingle enabled state (can be toggled by admin)
export const jinglesEnabled = writable<boolean>(true);

function getJingleElement(): HTMLAudioElement {
  if (!jingleElement) {
    if (typeof document !== 'undefined') {
      const domJingle = document.getElementById('jingle-audio') as HTMLAudioElement;
      if (domJingle) {
        jingleElement = domJingle;
      } else {
        jingleElement = new Audio();
        jingleElement.preload = 'auto';
      }
    } else {
      jingleElement = new Audio();
      jingleElement.preload = 'auto';
    }
  }
  return jingleElement;
}

function initJingleAudio() {
  const jingle = getJingleElement();
  jingle.src = JINGLE_CONFIG.intro;
  jingle.load();
  
  logDebug('🎵 Jingle audio initialized');
}

function playJingleIntro(): Promise<void> {
  return new Promise((resolve) => {
    const jingle = getJingleElement();
    const enabled = get(jinglesEnabled) && JINGLE_CONFIG.enabled;
    
    if (!enabled) {
      logDebug('🎵 Jingle disabled, skipping');
      resolve();
      return;
    }
    
    logDebug('🎵 Playing jingle intro...');
    
    jingle.onended = () => {
      logDebug('🎵 Jingle ended');
      jingle.onended = null;
      resolve();
    };
    
    jingle.play().catch((e) => {
      logDebug('🎵 Jingle play error: ' + e.message);
      resolve();
    });
  });
}

function getAudioElement(): HTMLAudioElement {
  if (!audioElement) {
    if (typeof document !== 'undefined') {
      const domAudio = document.getElementById('persistent-audio') as HTMLAudioElement;
      if (domAudio) {
        audioElement = domAudio;
      } else {
        audioElement = new Audio();
        audioElement.preload = 'auto';
      }
    } else {
      audioElement = new Audio();
      audioElement.preload = 'auto';
    }
  }
  return audioElement;
}

function getGuardianElement(): HTMLAudioElement {
  if (!guardianElement) {
    if (typeof document !== 'undefined') {
      guardianElement = document.getElementById('audio-guardian') as HTMLAudioElement;
      if (guardianElement) {
        guardianElement.volume = 0.01;
      }
    }
  }
  return guardianElement!;
}

function startGuardian() {
  logDebug('⏫ startGuardian appelé');
  
  const guardian = getGuardianElement();
  
  if (guardian) {
    logDebug('⏫ Guardian FOUND, trying to play...');
    guardian.play().then(() => {
      logDebug('✅ Guardian started playing!');
    }).catch(e => {
      logDebug('❌ Guardian play error: ' + e.message);
    });
  } else {
    logDebug('❌ Guardian NOT FOUND!');
  }
}

function stopGuardian() {
  const guardian = getGuardianElement();
  if (guardian && !guardian.paused) {
    guardian.pause();
    guardian.currentTime = 0;
  }
}

function initAudioElement() {
  if (isInitialized) return;
  
  const audio = getAudioElement();
  
  audio.addEventListener('timeupdate', () => {
    playerStore.update(s => ({ ...s, progress: audio.currentTime }));
    
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator && navigator.mediaSession) {
      const dur = isFinite(audio.duration) ? audio.duration : 0;
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: audio.playbackRate || 1,
        position: audio.currentTime
      });
    }
  });
  
  audio.addEventListener('loadedmetadata', () => {
    const dur = isFinite(audio.duration) ? audio.duration : 0;
    playerStore.update(s => ({ ...s, duration: dur, isLoading: false }));
  });
  
  let lastEndedTime = 0;
  
  audio.addEventListener('ended', async () => {
    logDebug('🔴 AUDIO ENDED - testing guardian...');
    
    const guardian = getGuardianElement();
    if (guardian) {
      logDebug(`🔊 Guardian paused=${guardian.paused}, currentTime=${guardian.currentTime}`);
    }
    
    const now = Date.now();
    if (now - lastEndedTime < 1000) return;
    lastEndedTime = now;
    
    let state = get(playerStore);
    const recordingThatJustFinished = state.currentRecording;
    const currentIndexAtEnd = state.currentIndex;
    const dayData = state.currentDayData;
    
    if (recordingThatJustFinished) {
      fetch(`/api/recordings/${recordingThatJustFinished.id}/listened`, { method: 'POST' }).catch(() => {});
      lastListenedRecordingId.set(recordingThatJustFinished.id);
    }
    
    if (dayData && currentIndexAtEnd < dayData.recordings.length - 1) {
      const nextIndex = currentIndexAtEnd + 1;
      const nextRecording = dayData.recordings[nextIndex];
      
      triggerHaptic('nudge');
      
      if (nextRecording) {
        playerStore.update(s => ({
          ...s,
          isPlaying: true,
          progress: 0,
          isLoading: true,
          currentRecording: nextRecording,
          currentDayData: dayData,
          currentDay: dayData.date,
          currentIndex: nextIndex
        }));
        
        if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
          updateMediaSessionMetadata(nextRecording);
          navigator.mediaSession.playbackState = 'playing';
        }
        
        audio.src = `/api/recordings/${nextRecording.id}`;
        await audio.load();
        
        try {
          await audio.play();
        } catch (e) {
          console.error('Auto-play next failed:', e);
          playerStore.update(s => ({ ...s, isLoading: false, isPlaying: false }));
        }
      }
    } else {
      playerStore.update(s => ({ ...s, isPlaying: false, progress: 0 }));
      // NE PAS arrêter le guardian - le garder actif pour permettre l'enchaînement auto
      logDebug('⏹ Playlist terminée, ARRET guardian');
      stopGuardian();
    }
  });
  
  audio.addEventListener('play', () => {
    logDebug('▶ Event PLAY détecté');
    playerStore.update(s => ({ ...s, isPlaying: true }));
    startGuardian();
    // Resume jingle if it was playing before pause
    const jingle = getJingleElement();
    if (!jingle.paused) {
      // Jingle already playing
    } else if (jingle.currentTime > 0 && jingle.currentTime < jingle.duration) {
      // Resume jingle from where it was
      jingle.play().catch(() => {});
    }
  });
  
  audio.addEventListener('playing', () => {
    const state = get(playerStore);
    if (state.currentRecording) {
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
        updateMediaSessionMetadata(state.currentRecording);
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
      }
    }
    playerStore.update(s => ({ ...s, isPlaying: true, isLoading: false }));
    startGuardian();
  });
  
  audio.addEventListener('pause', () => {
    playerStore.update(s => ({ ...s, isPlaying: false }));
    // Also pause jingle when voice pauses
    const jingle = getJingleElement();
    if (!jingle.paused) {
      jingle.pause();
    }
    // NE PAS arrêter le guardian si l'audio n'est pas terminé (pour permettre l'enchaînement auto)
    if (audio.ended) {
      logDebug('⏸ Audio en pause (ended=true) - guardian continue');
    } else {
      stopGuardian();
    }
  });
  
  audio.addEventListener('waiting', () => {
    playerStore.update(s => ({ ...s, isLoading: true }));
  });
  
  audio.addEventListener('canplay', () => {
    playerStore.update(s => ({ ...s, isLoading: false }));
  });
  
  isInitialized = true;
}

function setupMediaSession() {
  logDebug('🔧 setupMediaSession called');
  
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    logDebug('⚠️ MediaSession NOT available');
    return;
  }
  
  navigator.mediaSession.setActionHandler('play', () => {
    logDebug('▶️ MediaSession PLAY pressed');
    const audio = getAudioElement();
    audio.play();
    startGuardian();
  });
  
  navigator.mediaSession.setActionHandler('pause', () => {
    logDebug('⏸️ MediaSession PAUSE pressed');
    const audio = getAudioElement();
    audio.pause();
    stopGuardian();
  });
  
  navigator.mediaSession.setActionHandler('previoustrack', () => {
    playPrevious();
  });
  
  navigator.mediaSession.setActionHandler('nexttrack', () => {
    playNext();
  });
  
  navigator.mediaSession.setActionHandler('seekbackward', (details) => {
    const audio = getAudioElement();
    const seekTime = details.seekOffset || 10;
    audio.currentTime = Math.max(0, audio.currentTime - seekTime);
  });
  
  navigator.mediaSession.setActionHandler('seekforward', (details) => {
    const audio = getAudioElement();
    const seekTime = details.seekOffset || 10;
    audio.currentTime = Math.min(audio.duration, audio.currentTime + seekTime);
  });
  
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    const audio = getAudioElement();
    if (details.seekTime !== undefined) {
      audio.currentTime = details.seekTime;
    }
  });
}

export function initPlayer() {
  logDebug('🚀 initPlayer called - STARTING');
  initAudioElement();
  initJingleAudio();
  setupMediaSession();
  logDebug('🚀 initPlayer done');
}

export function updateMediaSessionMetadata(recording: Recording | null) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
    return;
  }
  
  if (!recording) {
    navigator.mediaSession.metadata = null;
    return;
  }
  
  const duration = recording.duration_seconds;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  navigator.mediaSession.metadata = new MediaMetadata({
    title: recording.pseudo,
    artist: `MateClub - ${durationStr}`,
    artwork: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/logo512px.png', sizes: '512x512', type: 'image/png' }
    ]
  });
}

export async function playRecording(dayData: DayRecordings, index: number) {
  const recording = dayData.recordings[index];
  if (!recording) return;

  const audio = getAudioElement();
  
  playerStore.update(s => ({
    ...s,
    isLoading: true,
    currentRecording: recording,
    currentDayData: dayData,
    currentDay: dayData.date,
    currentIndex: index
  }));

  audio.src = `/api/recordings/${recording.id}`;
  await audio.load();
  
  updateMediaSessionMetadata(recording);

  // Check if this is the first recording of the day
  const isFirstRecording = index === 0;
  
  // Get jingle element and reset if not first recording
  const jingle = getJingleElement();
  if (!isFirstRecording) {
    // Stop jingle and reset for non-first recordings
    if (!jingle.paused) {
      jingle.pause();
    }
    jingle.currentTime = 0;
  }
  
  try {
    if (isFirstRecording) {
      // Play jingle in background (overlapped with voice)
      logDebug('🎵 First recording, playing jingle in background');
      jingle.currentTime = 0;
      jingle.volume = JINGLE_CONFIG.volume;
      jingle.play().then(() => {
        // Force volume again after play starts (iOS fix)
        jingle.volume = JINGLE_CONFIG.volume;
      }).catch(() => {});
    }
    
    // Always play voice
    await audio.play();
  } catch (e) {
    console.error('Playback failed:', e);
    playerStore.update(s => ({ ...s, isLoading: false }));
  }
}

export async function playPrevious() {
  const state = get(playerStore);
  if (!state.currentDayData || state.currentIndex <= 0) return;
  
  triggerHaptic('nudge');
  const newIndex = state.currentIndex - 1;
  await playRecording(state.currentDayData, newIndex);
}

export async function playNext() {
  const state = get(playerStore);
  if (!state.currentDayData || state.currentIndex >= state.currentDayData.recordings.length - 1) return;
  
  triggerHaptic('nudge');
  const newIndex = state.currentIndex + 1;
  await playRecording(state.currentDayData, newIndex);
}

export function togglePlayPause() {
  const audio = getAudioElement();
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

export function seekTo(time: number) {
  const audio = getAudioElement();
  audio.currentTime = time;
  playerStore.update(s => ({ ...s, progress: time }));
}

export function closePlayer() {
  const audio = getAudioElement();
  audio.pause();
  audio.currentTime = 0;
  
  playerStore.update(s => ({
    ...s,
    isPlaying: false,
    currentRecording: null,
    currentDay: null,
    currentIndex: 0,
    currentDayData: null,
    progress: 0,
    duration: 0
  }));
  
  updateMediaSessionMetadata(null);
}

export { getAudioElement };
