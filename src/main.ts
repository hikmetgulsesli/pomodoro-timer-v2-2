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
let controlBtn: HTMLButtonElement | null = null;
let controlBtnIcon: HTMLElement | null = null;
let controlBtnLabel: HTMLElement | null = null;
let resetBtn: HTMLButtonElement | null = null;

// AudioContext instance (created lazily for performance)
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

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
  const colorClass = state.isWorkSession ? 'text-tomato' : 'text-green-500';
  const oppositeClass = state.isWorkSession ? 'text-green-500' : 'text-tomato';
  sessionTypeEl.classList.remove(oppositeClass);
  sessionTypeEl.classList.add(colorClass);
}

// Update control button state (Start/Pause toggle)
function updateControlButton(): void {
  if (!controlBtnIcon || !controlBtnLabel || !controlBtn) return;

  if (state.isRunning) {
    // Show Pause state
    controlBtnIcon.textContent = 'pause';
    controlBtnLabel.textContent = 'Pause';
    controlBtn.setAttribute('aria-label', 'Pause Timer');
  } else {
    // Show Start state
    controlBtnIcon.textContent = 'play_arrow';
    controlBtnLabel.textContent = 'Start';
    controlBtn.setAttribute('aria-label', 'Start Timer');
  }
}

// Play notification sound using Web Audio API
export function playNotificationSound(): void {
  const ctx = getAudioContext();

  const playBeep = (frequency: number, duration: number, delay: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + delay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);

    oscillator.start(ctx.currentTime + delay);
    oscillator.stop(ctx.currentTime + delay + duration);
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
  updateControlButton();
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

  updateControlButton();
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

  updateControlButton();
  updateDisplay();
}

// Toggle between start and stop
function toggleTimer(): void {
  if (state.isRunning) {
    stopTimer();
  } else {
    startTimer();
  }
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
  controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
  controlBtnIcon = document.getElementById('control-btn-icon') as HTMLElement;
  controlBtnLabel = document.getElementById('control-btn-label') as HTMLElement;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  if (!timerDisplay || !controlBtn || !controlBtnIcon || !controlBtnLabel || !resetBtn) {
    console.error('Required DOM elements not found');
    return;
  }

  // Event listeners
  controlBtn.addEventListener('click', toggleTimer);
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
