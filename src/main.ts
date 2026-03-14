// Pomodoro Timer - TypeScript Implementation
// Imports design tokens from design-tokens.css

interface TimerState {
  timeRemaining: number; // in seconds
  isRunning: boolean;
  isWorkSession: boolean;
  sessionCount: number;
  intervalId: number | null;
}

const WORK_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60; // 5 minutes
const MAX_SESSIONS = 4;

const state: TimerState = {
  timeRemaining: WORK_DURATION,
  isRunning: false,
  isWorkSession: true,
  sessionCount: 1,
  intervalId: null,
};

// DOM Elements - lazy loaded
let timerDisplay: HTMLElement | null = null;
let sessionLabel: HTMLElement | null = null;
let sessionCountDisplay: HTMLElement | null = null;
let startBtn: HTMLButtonElement | null = null;
let pauseBtn: HTMLButtonElement | null = null;
let resetBtn: HTMLButtonElement | null = null;

/**
 * Initialize DOM element references
 */
function initDOMElements(): boolean {
  timerDisplay = document.getElementById('timer-display');
  sessionLabel = document.getElementById('session-type');
  sessionCountDisplay = document.getElementById('session-count');
  startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
  pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement | null;
  resetBtn = document.getElementById('reset-btn') as HTMLButtonElement | null;
  
  return !!timerDisplay && !!sessionLabel && !!sessionCountDisplay && 
         !!startBtn && !!pauseBtn && !!resetBtn;
}

/**
 * Format seconds into MM:SS display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "25:00")
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Update the timer display with current state
 */
function updateDisplay(): void {
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
function playNotificationSound(): void {
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
      // All sessions complete, reset
      state.sessionCount = 1;
    }
    
    state.timeRemaining = WORK_DURATION;
  }
  
  updateDisplay();
}

/**
 * Start the timer countdown
 */
function startTimer(): void {
  if (state.isRunning) return;
  
  state.isRunning = true;
  state.intervalId = window.setInterval(() => {
    state.timeRemaining--;
    
    if (state.timeRemaining <= 0) {
      handleTimerComplete();
      return;
    }
    
    updateDisplay();
  }, 1000);
  
  if (startBtn) startBtn.classList.add('hidden');
  if (pauseBtn) pauseBtn.classList.remove('hidden');
}

/**
 * Stop/pause the timer
 */
function stopTimer(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  
  if (startBtn) startBtn.classList.remove('hidden');
  if (pauseBtn) pauseBtn.classList.add('hidden');
}

/**
 * Reset the timer to initial state
 */
function resetTimer(): void {
  stopTimer();
  state.isWorkSession = true;
  state.sessionCount = 1;
  state.timeRemaining = WORK_DURATION;
  updateDisplay();
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
  startBtn?.addEventListener('click', startTimer);
  pauseBtn?.addEventListener('click', stopTimer);
  resetBtn?.addEventListener('click', resetTimer);
  
  // Initialize display on load
  updateDisplay();
}

// Initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export for testing
export { formatTime, WORK_DURATION, BREAK_DURATION, MAX_SESSIONS, initDOMElements };
export type { TimerState };
