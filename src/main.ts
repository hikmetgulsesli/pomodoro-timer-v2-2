// Pomodoro Timer - TypeScript Implementation

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

// DOM Elements
const timerDisplay = document.getElementById('timer-display') as HTMLElement;
const sessionType = document.getElementById('session-type') as HTMLElement;
const sessionCountDisplay = document.getElementById('session-count') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateDisplay(): void {
  timerDisplay.textContent = formatTime(state.timeRemaining);
  sessionType.textContent = state.isWorkSession ? 'WORK' : 'BREAK';
  sessionCountDisplay.textContent = `Session ${state.sessionCount} of ${MAX_SESSIONS}`;
  
  // Update colors based on session type
  const timerContainer = timerDisplay.parentElement;
  if (timerContainer) {
    timerContainer.classList.toggle('text-tomato', state.isWorkSession);
    timerContainer.classList.toggle('text-green-500', !state.isWorkSession);
  }
}

function playNotificationSound(): void {
  // Create an audio context for notification sound
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  
  // Create a pleasant beep pattern
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
  
  startBtn.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
}

function stopTimer(): void {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.isRunning = false;
  
  startBtn.classList.remove('hidden');
  pauseBtn.classList.add('hidden');
}

function resetTimer(): void {
  stopTimer();
  state.isWorkSession = true;
  state.sessionCount = 1;
  state.timeRemaining = WORK_DURATION;
  updateDisplay();
}

// Event Listeners
startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', stopTimer);
resetBtn.addEventListener('click', resetTimer);

// Initialize
updateDisplay();
