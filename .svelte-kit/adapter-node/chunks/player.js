import { w as writable } from "./index.js";
const initialState = {
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
const playerStore = writable(initialState);
export {
  playerStore as p
};
