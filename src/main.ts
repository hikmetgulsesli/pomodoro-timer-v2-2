// Pomodoro Timer - TypeScript Implementation with Drift Correction

export interface TimerState {
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isWorkSession: boolean;
  sessionCount: number;
  intervalId: number | null;
  targetEndTime: number | null; // timestamp when timer should end (for drift correction)
}

export const WORK_DURATION = 25 * 60; // 25 minutes
export const BREAK_DURATION = 5 * 60; // 5 minutes
export const MAX_SESSIONS = 4;

// Module-level state
const state: TimerState = {
  timeRemaining: WORK_DURATION,
  isRunning: false,
  isWorkSession: true,
  sessionCount: 1,
  intervalId: null,
  targetEndTime: null,
};

// DOM Elements (will be initialized in initApp)
let timerDisplay: HTMLElement | null = null;
let sessionTypeEl: HTMLElement | null = null;
let sessionCountEl: HTMLElement | null = null;
let startBtn: HTMLButtonElement | null = null;
let pauseBtn: HTMLButtonElement | null = null;
let resetBtn: HTMLButtonElement | null = null;

// Format seconds to MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Calculate time remaining based on target end time (drift correction)
export function calculateTimeRemaining(targetEndTime: number): number {
  const now = Date.now();
  const remaining = Math.ceil((targetEndTime - now) / 1000);
  return Math.max(0, remaining);
}

// Update the display
function updateDisplay(): void {
  if (!timerDisplay || !sessionTypeEl || !sessionCountEl) return;

  timerDisplay.textContent = formatTime(state.timeRemaining);
  sessionTypeEl.textContent = state.isWorkSession ? 'WORK' : 'BREAK';
  sessionCountEl.textContent = `Session ${state.sessionCount} of ${MAX_SESSIONS}`;

  // Update colors based on session type
  sessionTypeEl.className = state.isWorkSession
    ? 'text-tomato font-display text-2xl font-bold tracking-widest uppercase'
    : 'text-green-500 font-display text-2xl font-bold tracking-widest uppercase';
}

// Update button visibility
function updateButtons(): void {
  if (!startBtn || !pauseBtn) return;

  if (state.isRunning) {
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
  } else {
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
  }
}

// Play notification sound using Web Audio API
export function playNotificationSound(): void {
  const AudioContextClass = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();

  const playBeep = (frequency: number, duration: number, delay: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + delay + duration);

    oscillator.start(audioContext.currentTime + delay);
    oscillator.stop(audioContext.currentTime + delay + duration);
  };

  // Play 3 beeps
  playBeep(880, 0.2, 0);
  playBeep(880, 0.2, 0.3);
  playBeep(1100, 0.4, 0.6);
}

// Handle timer completion and switch phases
function handleTimerComplete(): void {
  stopTimer();
  playNotificationSound();

  if (state.isWorkSession) {
    // Switch to break
    state.isWorkSession = false;
    state.timeRemaining = BREAK_DURATION;
  } else {
    // Break finished, switch to work
    state.isWorkSession = true;
    state.sessionCount++;

    if (state.sessionCount > MAX_SESSIONS) {
      state.sessionCount = 1;
    }

    state.timeRemaining = WORK_DURATION;
  }

  updateDisplay();
}

// Tick handler with drift correction
function tick(): void {
  if (!state.targetEndTime) return;

  // Calculate remaining time based on target end time (handles background tabs)
  const remaining = calculateTimeRemaining(state.targetEndTime);
  state.timeRemaining = remaining;

  if (state.timeRemaining <= 0) {
    handleTimerComplete();
  } else {
    updateDisplay();
  }
}

// Start the timer with drift-corrected timing
export function startTimer(): void {
  if (state.isRunning) return;

  state.isRunning = true;
  // Calculate target end time based on current remaining time
  state.targetEndTime = Date.now() + (state.timeRemaining * 1000);

  state.intervalId = window.setInterval(tick, 100); // Check every 100ms for responsiveness

  updateButtons();
  updateDisplay();
}

// Stop/pause the timer
export function stopTimer(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  state.isRunning = false;
  state.targetEndTime = null;

  updateButtons();
  updateDisplay();
}

// Reset timer to initial state
export function resetTimer(): void {
  stopTimer();
  state.isWorkSession = true;
  state.sessionCount = 1;
  state.timeRemaining = WORK_DURATION;
  state.targetEndTime = null;
  updateDisplay();
}

// Get current timer state (for testing)
export function getState(): TimerState {
  return { ...state };
}

// Initialize the app
function initApp(): void {
  timerDisplay = document.getElementById('timer-display') as HTMLElement;
  sessionTypeEl = document.getElementById('session-type') as HTMLElement;
  sessionCountEl = document.getElementById('session-count') as HTMLElement;
  startBtn = document.getElementById('start-btn') as HTMLButtonElement;
  pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  if (!timerDisplay || !startBtn || !pauseBtn || !resetBtn) {
    console.error('Required DOM elements not found');
    return;
  }

  // Event listeners
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', stopTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize display
  updateDisplay();
}

// Initialize when DOM is ready - only in browser environment
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
