import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatTime,
  calculateTimeRemaining,
  getState,
  startTimer,
  stopTimer,
  resetTimer,
  WORK_DURATION,
  BREAK_DURATION,
  MAX_SESSIONS
} from '../main.js';

describe('formatTime', () => {
  it('should format 25 minutes as 25:00', () => {
    expect(formatTime(25 * 60)).toBe('25:00');
  });

  it('should format 5 minutes as 05:00', () => {
    expect(formatTime(5 * 60)).toBe('05:00');
  });

  it('should format 0 seconds as 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('should format 90 seconds as 01:30', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  it('should format 59 seconds as 00:59', () => {
    expect(formatTime(59)).toBe('00:59');
  });

  it('should format 600 seconds as 10:00', () => {
    expect(formatTime(600)).toBe('10:00');
  });
});

describe('calculateTimeRemaining (Drift Correction)', () => {
  it('should return 0 when target time has passed', () => {
    const now = Date.now();
    const targetEndTime = now - 1000; // 1 second ago
    expect(calculateTimeRemaining(targetEndTime)).toBe(0);
  });

  it('should return correct remaining seconds', () => {
    const now = Date.now();
    const targetEndTime = now + 25000; // 25 seconds in the future
    const remaining = calculateTimeRemaining(targetEndTime);
    // Exact value since vi.useFakeTimers() mocks Date.now() deterministically
    expect(remaining).toBe(25);
  });

  it('should return 0 for exact current time', () => {
    const now = Date.now();
    expect(calculateTimeRemaining(now)).toBe(0);
  });

  it('should handle 25 minutes correctly', () => {
    const now = Date.now();
    const targetEndTime = now + (25 * 60 * 1000); // 25 minutes
    const remaining = calculateTimeRemaining(targetEndTime);
    // Exact value since vi.useFakeTimers() mocks Date.now() deterministically
    expect(remaining).toBe(1500);
  });
});

describe('Timer State', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <div id="session-type">WORK</div>
      <div id="session-count">Session 1 of 4</div>
      <button id="start-btn">Start</button>
      <button id="pause-btn" class="hidden">Pause</button>
      <button id="reset-btn">Reset</button>
    `;
    vi.useFakeTimers();
    // Reset state before each test
    resetTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with work session duration', () => {
    const state = getState();
    expect(state.timeRemaining).toBe(WORK_DURATION);
    expect(state.isWorkSession).toBe(true);
  });

  it('should start as non-running', () => {
    const state = getState();
    expect(state.isRunning).toBe(false);
    expect(state.intervalId).toBeNull();
    expect(state.targetEndTime).toBeNull();
  });

  it('should start at session 1', () => {
    const state = getState();
    expect(state.sessionCount).toBe(1);
  });

  it('should set targetEndTime when started', () => {
    startTimer();
    const state = getState();
    expect(state.isRunning).toBe(true);
    expect(state.targetEndTime).not.toBeNull();
    expect(state.targetEndTime).toBeGreaterThan(Date.now());
  });

  it('should clear targetEndTime when stopped', () => {
    startTimer();
    stopTimer();
    const state = getState();
    expect(state.isRunning).toBe(false);
    expect(state.targetEndTime).toBeNull();
  });

  it('should reset to work duration', () => {
    startTimer();
    vi.advanceTimersByTime(10000); // Advance 10 seconds
    stopTimer();
    resetTimer();
    const state = getState();
    expect(state.timeRemaining).toBe(WORK_DURATION);
    expect(state.isWorkSession).toBe(true);
    expect(state.sessionCount).toBe(1);
    expect(state.isRunning).toBe(false);
  });
});

describe('Timer Countdown with Drift Correction', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <div id="session-type">WORK</div>
      <div id="session-count">Session 1 of 4</div>
      <button id="start-btn">Start</button>
      <button id="pause-btn" class="hidden">Pause</button>
      <button id="reset-btn">Reset</button>
    `;
    vi.useFakeTimers();
    resetTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should countdown accurately using targetEndTime', () => {
    startTimer();
    const initialState = getState();
    expect(initialState.timeRemaining).toBe(WORK_DURATION);

    // Advance 5 seconds
    vi.advanceTimersByTime(5000);

    const after5Seconds = getState();
    expect(after5Seconds.timeRemaining).toBe(WORK_DURATION - 5);
  });

  it('should handle multiple tick intervals accurately', () => {
    startTimer();

    // Advance 60 seconds
    vi.advanceTimersByTime(60000);

    const state = getState();
    expect(state.timeRemaining).toBe(WORK_DURATION - 60);
  });

  it('should continue running when simulated background (time jumps)', () => {
    startTimer();

    // Simulate a background tab scenario - large time jump
    vi.advanceTimersByTime(120000); // Jump 2 minutes

    const state = getState();
    // Timer should have counted down 2 minutes accurately
    expect(state.timeRemaining).toBe(WORK_DURATION - 120);
  });
});

describe('Phase Transitions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <div id="session-type">WORK</div>
      <div id="session-count">Session 1 of 4</div>
      <button id="start-btn">Start</button>
      <button id="pause-btn" class="hidden">Pause</button>
      <button id="reset-btn">Reset</button>
    `;
    vi.useFakeTimers();
    // Mock playNotificationSound to avoid AudioContext issues
    vi.stubGlobal('AudioContext', class MockAudioContext {
      currentTime = 0;
      createOscillator() {
        return {
          connect: () => {},
          frequency: { value: 0 },
          type: 'sine',
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          connect: () => {},
          gain: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
        };
      }
      destination = {};
    });
    resetTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should switch to break after work session completes', () => {
    startTimer();

    // Advance past work duration
    vi.advanceTimersByTime(WORK_DURATION * 1000 + 100);

    const state = getState();
    expect(state.isWorkSession).toBe(false);
    expect(state.timeRemaining).toBe(BREAK_DURATION);
  });

  it('should reset to correct duration for each phase', () => {
    startTimer();
    vi.advanceTimersByTime(WORK_DURATION * 1000 + 100); // Complete work

    const breakState = getState();
    expect(breakState.isWorkSession).toBe(false);
    expect(breakState.timeRemaining).toBe(BREAK_DURATION);

    stopTimer();
    resetTimer();

    const resetState = getState();
    expect(resetState.isWorkSession).toBe(true);
    expect(resetState.timeRemaining).toBe(WORK_DURATION);
  });
});

describe('Constants', () => {
  it('WORK_DURATION should be 25 minutes (1500 seconds)', () => {
    expect(WORK_DURATION).toBe(1500);
  });

  it('BREAK_DURATION should be 5 minutes (300 seconds)', () => {
    expect(BREAK_DURATION).toBe(300);
  });

  it('MAX_SESSIONS should be 4', () => {
    expect(MAX_SESSIONS).toBe(4);
  });
});

describe('DOM Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <div id="session-type">WORK</div>
      <div id="session-count">Session 1 of 4</div>
      <button id="start-btn">Start</button>
      <button id="pause-btn" class="hidden">Pause</button>
      <button id="reset-btn">Reset</button>
    `;
    vi.useFakeTimers();
    resetTimer();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct default values', () => {
    const timerDisplay = document.getElementById('timer-display');
    const sessionType = document.getElementById('session-type');
    const sessionCount = document.getElementById('session-count');

    expect(timerDisplay?.textContent).toBe('25:00');
    expect(sessionType?.textContent).toBe('WORK');
    expect(sessionCount?.textContent).toBe('Session 1 of 4');
  });

  it('should have all required DOM elements', () => {
    expect(document.getElementById('timer-display')).toBeTruthy();
    expect(document.getElementById('session-type')).toBeTruthy();
    expect(document.getElementById('session-count')).toBeTruthy();
    expect(document.getElementById('start-btn')).toBeTruthy();
    expect(document.getElementById('pause-btn')).toBeTruthy();
    expect(document.getElementById('reset-btn')).toBeTruthy();
  });
});
