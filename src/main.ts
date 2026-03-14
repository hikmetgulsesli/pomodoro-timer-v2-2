// Pomodoro Timer - TypeScript Implementation
// Imports design tokens from design-tokens.css

export interface TimerState {
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isPaused: boolean;
  isWorkSession: boolean;
  sessionCount: number;
  intervalId: number | null;
}

export const WORK_DURATION = 25 * 60; // 25 minutes
export const BREAK_DURATION = 5 * 60; // 5 minutes
export const MAX_SESSIONS = 4;

export const state: TimerState = {
  timeRemaining: WORK_DURATION,
  isRunning: false,
  isPaused: false,
  isWorkSession: true,
  sessionCount: 1,
  intervalId: null,
};

// DOM Elements - lazy loaded
let timerDisplay: HTMLElement | null = null;
let sessionLabel: HTMLElement | null = null;
let sessionCountDisplay: HTMLElement | null = null;
let controlBtn: HTMLButtonElement | null = null;
let resetBtn: HTMLButtonElement | null = null;
let controlBtnIcon: HTMLElement | null = null;
let controlBtnLabel: HTMLElement | null = null;

/**
 * Initialize DOM element references
 */
export function initDOMElements(): boolean {
  timerDisplay = document.getElementById('timer-display');
  sessionLabel = document.getElementById('session-type');
  sessionCountDisplay = document.getElementById('session-count');
  controlBtn = document.getElementById('control-btn') as HTMLButtonElement | null;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  controlBtnIcon = document.getElementById('control-btn-icon');
  controlBtnLabel = document.getElementById('control-btn-label');

  return !!timerDisplay && !!sessionLabel && !!sessionCountDisplay &&
         !!controlBtn && !!resetBtn && !!controlBtnIcon && !!controlBtnLabel;
}

/**
 * Format seconds into MM:SS display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "25:00")
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Update control button appearance based on timer state
 */
export function updateControlButton(): void {
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
 * Update the timer display with current state
 */
export function updateDisplay(): void {
  if (!timerDisplay || !sessionLabel || !sessionCountDisplay) return;

  timerDisplay.textContent = formatTime(state.timeRemaining);
  sessionLabel.textContent = state.isWorkSession ? 'WORK' : 'BREAK';
  sessionCountDisplay.textContent = `Session ${state.sessionCount} of ${MAX_SESSIONS}`;

  // Update colors based on session type using CSS variables
  if (state.isWorkSession) {
    sessionLabel.style.color = 'var(--color-work)';
    sessionLabel.classList.remove('text-green-500');
    sessionLabel.classList.add('text-tomato');
  } else {
    sessionLabel.style.color = 'var(--color-break)';
    sessionLabel.classList.remove('text-tomato');
    sessionLabel.classList.add('text-green-500');
  }
}

/**
 * Play notification sound when timer completes
 * Uses Web Audio API for a pleasant beep pattern
 */
export function playNotificationSound(): void {
  // Create an audio context for notification sound
  const AudioContextClass = window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioContextClass();

  // Create a pleasant beep pattern
  const playBeep = (frequency: number, duration: number, delay: number): void => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const startTime = audioContext.currentTime + delay;
    gainNode.gain.setValueAtTime(0.3, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // Play 3 beeps
  playBeep(880, 0.2, 0);
  playBeep(880, 0.2, 0.3);
  playBeep(1100, 0.4, 0.6);
}

/**
 * Handle timer completion - switch between work and break sessions
 */
export function handleTimerComplete(): void {
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
      // All sessions complete, reset
      state.sessionCount = 1;
    }

    state.timeRemaining = WORK_DURATION;
  }

  updateDisplay();
  updateControlButton();
}

/**
 * Start the timer countdown
 */
export function startTimer(): void {
  if (state.isRunning) return;

  state.isRunning = true;
  state.isPaused = false;
  state.intervalId = window.setInterval(() => {
    state.timeRemaining--;

    if (state.timeRemaining <= 0) {
      handleTimerComplete();
      return;
    }

    updateDisplay();
  }, 1000);

  updateControlButton();
}

/**
 * Pause the timer (freezes countdown)
 */
export function pauseTimer(): void {
  if (!state.isRunning) return;

  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  state.isPaused = true;

  updateControlButton();
}

/**
 * Resume the timer from paused state
 */
export function resumeTimer(): void {
  if (state.isRunning) return;

  state.isRunning = true;
  state.isPaused = false;
  state.intervalId = window.setInterval(() => {
    state.timeRemaining--;

    if (state.timeRemaining <= 0) {
      handleTimerComplete();
      return;
    }

    updateDisplay();
  }, 1000);

  updateControlButton();
}

/**
 * Stop/pause the timer
 */
export function stopTimer(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  state.isPaused = false;

  updateControlButton();
}

/**
 * Reset the timer to initial state
 */
export function resetTimer(): void {
  stopTimer();
  state.isWorkSession = true;
  state.sessionCount = 1;
  state.timeRemaining = WORK_DURATION;
  state.isPaused = false;
  updateDisplay();
  updateControlButton();
}

/**
 * Handle control button click - toggles between Start/Pause/Resume
 */
export function handleControlClick(): void {
  if (state.isRunning) {
    pauseTimer();
  } else if (state.isPaused) {
    resumeTimer();
  } else {
    startTimer();
  }
}

/**
 * Initialize the application
 */
function init(): void {
  if (!initDOMElements()) {
    // DOM elements not found, likely in test environment
    return;
  }

  // Event Listeners
  controlBtn?.addEventListener('click', handleControlClick);
  resetBtn?.addEventListener('click', resetTimer);

  // Initialize display on load
  updateDisplay();
  updateControlButton();
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
