// Pomodoro Timer - TypeScript Implementation with Drift Correction and Audio Notifications

export interface TimerState {
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
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
  isPaused: false,
  isWorkSession: true,
  sessionCount: 1,
  intervalId: null,
  targetEndTime: null,
};

// DOM Elements (will be initialized in initApp)
let timerDisplay: HTMLElement | null = null;
let sessionLabel: HTMLElement | null = null;
let sessionCountDisplay: HTMLElement | null = null;
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

/**
 * Announce timer state change for screen readers
 */
export function announceState(message: string): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  // Remove after announcement is read
  setTimeout(() => {
    if (announcement.parentNode === document.body) {
      document.body.removeChild(announcement);
    }
  }, 1000);
}

/**
 * Get current timer status text for accessibility
 */
export function getTimerStatusText(): string {
  const phase = state.isWorkSession ? 'Work' : 'Break';
  const action = state.isRunning ? 'running' : state.isPaused ? 'paused' : 'stopped';
  return `${phase} session, ${action}, ${formatTime(state.timeRemaining)} remaining`;
}

// Update the display
function updateDisplay(): void {
  if (!timerDisplay || !sessionLabel || !sessionCountDisplay) return;

  const timeText = formatTime(state.timeRemaining);
  timerDisplay.textContent = timeText;
  sessionLabel.textContent = state.isWorkSession ? 'WORK' : 'BREAK';
  sessionCountDisplay.textContent = `Session ${state.sessionCount} of ${MAX_SESSIONS}`;

  // Update aria-label to provide context for screen readers
  timerDisplay.setAttribute('aria-label', `Timer: ${timeText} ${state.isWorkSession ? 'Work' : 'Break'} session`);

  // Update colors based on session type using CSS variables
  if (state.isWorkSession) {
    sessionLabel.style.color = 'var(--color-work)';
    sessionLabel.classList.remove('text-green-500');
    sessionLabel.classList.add('text-tomato');
    sessionLabel.setAttribute('aria-label', 'Current session: Work phase');
  } else {
    sessionLabel.style.color = 'var(--color-break)';
    sessionLabel.classList.remove('text-tomato');
    sessionLabel.classList.add('text-green-500');
    sessionLabel.setAttribute('aria-label', 'Current session: Break phase');
  }
}

// Update control button appearance based on timer state
function updateControlButton(): void {
  if (!controlBtn || !controlBtnIcon || !controlBtnLabel) return;

  const btnDiv = controlBtn.querySelector('div');

  if (state.isRunning) {
    // Timer is running - show Pause
    controlBtnIcon.textContent = 'pause';
    controlBtnLabel.textContent = 'Pause';
    controlBtn.setAttribute('aria-label', 'Pause Timer');
    btnDiv?.classList.remove('bg-slate-blue');
    btnDiv?.classList.add('bg-orange-pause');
    controlBtnLabel.classList.remove('text-slate-blue');
    controlBtnLabel.classList.add('text-orange-pause');
  } else if (state.isPaused) {
    // Timer is paused - show Resume
    controlBtnIcon.textContent = 'play_arrow';
    controlBtnLabel.textContent = 'Resume';
    controlBtn.setAttribute('aria-label', 'Resume Timer');
    btnDiv?.classList.remove('bg-orange-pause');
    btnDiv?.classList.add('bg-slate-blue');
    controlBtnLabel.classList.remove('text-orange-pause');
    controlBtnLabel.classList.add('text-slate-blue');
  } else {
    // Timer is stopped/initial - show Start
    controlBtnIcon.textContent = 'play_arrow';
    controlBtnLabel.textContent = 'Start';
    controlBtn.setAttribute('aria-label', 'Start Timer');
    btnDiv?.classList.remove('bg-orange-pause');
    btnDiv?.classList.add('bg-slate-blue');
    controlBtnLabel.classList.remove('text-orange-pause');
    controlBtnLabel.classList.add('text-slate-blue');
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
    announceState('Work session complete! Time for a break.');
    state.isWorkSession = false;
    state.timeRemaining = BREAK_DURATION;
  } else {
    // Break finished, switch to work
    state.isWorkSession = true;
    state.sessionCount++;

    if (state.sessionCount > MAX_SESSIONS) {
      // All sessions complete, reset
      announceState('All sessions complete! Great job!');
      state.sessionCount = 1;
    } else {
      announceState(`Break complete! Starting work session ${state.sessionCount} of ${MAX_SESSIONS}.`);
    }

    state.timeRemaining = WORK_DURATION;
  }

  updateDisplay();
  updateControlButton();
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
  state.isPaused = false;
  // Calculate target end time based on current remaining time
  state.targetEndTime = Date.now() + (state.timeRemaining * 1000);

  announceState(`Timer started. ${state.isWorkSession ? 'Work' : 'Break'} session: ${formatTime(state.timeRemaining)}`);

  state.intervalId = window.setInterval(tick, 100); // Check every 100ms for responsiveness

  updateControlButton();
  updateDisplay();
}

// Pause the timer
export function pauseTimer(): void {
  if (!state.isRunning) return;

  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  state.isPaused = true;
  state.targetEndTime = null;
  announceState(`Timer paused at ${formatTime(state.timeRemaining)}`);

  updateControlButton();
}

// Resume the timer
export async function resumeTimer(): Promise<void> {
  if (state.isRunning) return;

  await resumeAudioContext();

  state.isRunning = true;
  state.isPaused = false;
  state.targetEndTime = Date.now() + (state.timeRemaining * 1000);
  announceState(`Timer resumed. ${state.isWorkSession ? 'Work' : 'Break'} session: ${formatTime(state.timeRemaining)}`);
  state.intervalId = window.setInterval(tick, 100);

  updateControlButton();
}

// Stop/pause the timer
export function stopTimer(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }

  state.isRunning = false;
  state.isPaused = false;
  state.targetEndTime = null;

  updateControlButton();
  updateDisplay();
}

// Reset timer to initial state
export function resetTimer(): void {
  stopTimer();
  state.isWorkSession = true;
  state.sessionCount = 1;
  state.timeRemaining = WORK_DURATION;
  state.isPaused = false;
  // Reset audio context for testing
  audioContext = null;
  audioContextResumed = false;
  announceState('Timer reset. Ready to start new work session.');
  updateDisplay();
  updateControlButton();
}

// Get current timer state (for testing)
export function getState(): TimerState {
  return { ...state };
}

// Handle control button click - toggles between Start/Pause/Resume
function handleControlClick(): void {
  if (state.isRunning) {
    pauseTimer();
  } else if (state.isPaused) {
    void resumeTimer();
  } else {
    void startTimer();
  }
}

// Initialize the app
function initApp(): void {
  timerDisplay = document.getElementById('timer-display') as HTMLElement;
  sessionLabel = document.getElementById('session-type') as HTMLElement;
  sessionCountDisplay = document.getElementById('session-count') as HTMLElement;
  controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
  controlBtnIcon = document.getElementById('control-btn-icon') as HTMLElement;
  controlBtnLabel = document.getElementById('control-btn-label') as HTMLElement;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

  if (!timerDisplay || !controlBtn || !resetBtn) {
    console.error('Required DOM elements not found');
    return;
  }

  // Event listeners
  controlBtn.addEventListener('click', handleControlClick);
  resetBtn.addEventListener('click', resetTimer);

  // Initialize display
  updateDisplay();
  updateControlButton();
}

// Initialize when DOM is ready - only in browser environment
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}
