// Pomodoro Timer - TypeScript Implementation with Drift Correction and Audio Notifications

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
let audioContextResumed = false;

/**
 * Get or create the AudioContext
 * Uses lazy initialization for performance
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    const AudioContextClass = (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/**
 * Resume AudioContext to handle browser autoplay policy
 * Must be called on user interaction before playing sounds
 */
export async function resumeAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
      audioContextResumed = true;
      return true;
    } catch (error) {
      console.warn('Failed to resume AudioContext:', error);
      return false;
    }
  }
  audioContextResumed = true;
  return true;
}

/**
 * Check if AudioContext is ready for playback
 */
export function isAudioReady(): boolean {
  const ctx = getAudioContext();
  return ctx.state === 'running' || audioContextResumed;
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

// Update button visibility
function updateButtons(): void {
  if (!controlBtnIcon || !controlBtnLabel || !controlBtn) return;

  if (state.isRunning) {
    controlBtnIcon.textContent = 'pause';
    controlBtnLabel.textContent = 'Pause';
    controlBtn.setAttribute('aria-label', 'Pause Timer');
  } else {
    controlBtnIcon.textContent = 'play_arrow';
    controlBtnLabel.textContent = 'Start';
    controlBtn.setAttribute('aria-label', 'Start Timer');
  }
}

/**
 * Play a melodic chime for work session completion
 * Ascending major triad (C4-E4-G4-C5) - uplifting "job well done" sound
 */
export function playWorkCompleteSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Major triad frequencies: C4, E4, G4, C5
  const frequencies = [261.63, 329.63, 392.00, 523.25];
  const durations = [0.15, 0.15, 0.15, 0.4];
  const delays = [0, 0.12, 0.24, 0.36];

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const startTime = now + delays[i];
    const duration = durations[i];

    // Envelope: quick attack, gentle decay
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });

  // Add a subtle harmony note
  const harmonyOsc = ctx.createOscillator();
  const harmonyGain = ctx.createGain();
  harmonyOsc.connect(harmonyGain);
  harmonyGain.connect(ctx.destination);
  harmonyOsc.frequency.value = 196.00; // G3
  harmonyOsc.type = 'triangle';
  harmonyGain.gain.setValueAtTime(0, now);
  harmonyGain.gain.linearRampToValueAtTime(0.1, now + 0.05);
  harmonyGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
  harmonyOsc.start(now);
  harmonyOsc.stop(now + 1.0);
}

/**
 * Play a distinct gentle sound for break completion
 * Descending interval (A4-F4-D4) - calm "back to work" reminder
 */
export function playBreakCompleteSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Descending pattern: A4, F4, D4 (gentle, calming)
  const frequencies = [440.00, 349.23, 293.66];
  const durations = [0.2, 0.2, 0.35];
  const delays = [0, 0.15, 0.3];

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const startTime = now + delays[i];
    const duration = durations[i];

    // Softer envelope for break sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

/**
 * Legacy notification sound (for backward compatibility)
 * Three simple beeps
 */
export function playNotificationSound(): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Three beeps at 880Hz
  const frequencies = [880, 880, 1100];
  const durations = [0.2, 0.2, 0.4];
  const delays = [0, 0.3, 0.6];

  frequencies.forEach((freq, i) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';

    const startTime = now + delays[i];
    const duration = durations[i];

    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  });
}

// Handle timer completion
function handleTimerComplete(): void {
  // Play appropriate sound based on session type
  if (state.isWorkSession) {
    playWorkCompleteSound();
  } else {
    playBreakCompleteSound();
  }

  stopTimer();

  if (state.isWorkSession) {
    // Switch to break
    state.isWorkSession = false;
    state.timeRemaining = BREAK_DURATION;
  } else {
    // Break finished, switch to work
    state.isWorkSession = true;
    state.sessionCount++;

    if (state.sessionCount > MAX_SESSIONS) {
      // All sessions complete, reset
      state.sessionCount = 1;
    }

    state.timeRemaining = WORK_DURATION;
  }

  updateDisplay();
  updateButtons();
}

// Timer tick with drift correction
function tick(): void {
  if (!state.targetEndTime) return;

  const remaining = calculateTimeRemaining(state.targetEndTime);
  state.timeRemaining = remaining;

  if (state.timeRemaining <= 0) {
    handleTimerComplete();
  } else {
    updateDisplay();
  }
}

// Start the timer with drift-corrected timing
export async function startTimer(): Promise<void> {
  if (state.isRunning) return;

  // Resume AudioContext on user interaction to handle autoplay policy
  await resumeAudioContext();

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
  // Reset audio context for testing
  audioContext = null;
  audioContextResumed = false;
  updateDisplay();
  updateButtons();
}

// Get current timer state (for testing)
export function getState(): TimerState {
  return { ...state };
}

// Toggle timer (start/stop)
function toggleTimer(): void {
  if (state.isRunning) {
    stopTimer();
  } else {
    void startTimer();
  }
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

  if (!timerDisplay || !controlBtn || !resetBtn) {
    console.error('Required DOM elements not found');
    return;
  }

  // Event listeners
  controlBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize display
  updateDisplay();
  updateButtons();
}

// Initialize when DOM is ready - only in browser environment
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
