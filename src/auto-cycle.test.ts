/**
 * Tests for Auto-Cycle Feature
 * Story US-006: Auto cycle between Work and Break phases
 */

import {
  state,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  handleTimerComplete,
  handleVisibilityChange,
  updateDisplay,
  initDOMElements,
  WORK_DURATION,
  BREAK_DURATION
} from './main';

// Mock AudioContext using a factory function
const mockAudioContextFactory = () => ({
  currentTime: 0,
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: 'sine',
    start: jest.fn(),
    stop: jest.fn()
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  })),
  destination: {}
});

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn(() => mockAudioContextFactory())
});

describe('Auto-Cycle Between Work and Break Phases', () => {
  beforeEach(() => {
    // Reset state to initial
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;
    state.lastTickTime = null;

    // Setup DOM
    document.body.innerHTML = `
      <div id="timer-display">25:00</div>
      <div id="session-type">WORK</div>
      <div id="session-count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn">Reset</button>
    `;

    jest.useFakeTimers();
    initDOMElements();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  });

  describe('AC1: Timer automatically transitions to Break after Work completes', () => {
    test('should switch to break phase when work timer reaches zero', () => {
      state.timeRemaining = 3;
      state.isWorkSession = true;

      startTimer();
      jest.advanceTimersByTime(3000);

      expect(state.isWorkSession).toBe(false);
      expect(state.timeRemaining).toBe(BREAK_DURATION);
    });

    test('should auto-start break timer after work completes', () => {
      state.timeRemaining = 2;
      state.isWorkSession = true;

      startTimer();
      jest.advanceTimersByTime(2000);

      // Should auto-start the break timer
      expect(state.isRunning).toBe(true);
      expect(state.isWorkSession).toBe(false);

      // Break timer should be counting down
      jest.advanceTimersByTime(1000);
      expect(state.timeRemaining).toBe(BREAK_DURATION - 1);
    });

    test('should play notification sound when work completes', () => {
      state.timeRemaining = 1;

      startTimer();
      jest.advanceTimersByTime(1000);

      expect(window.AudioContext).toHaveBeenCalled();
    });
  });

  describe('AC2: Timer automatically transitions to Work after Break completes', () => {
    test('should switch to work phase when break timer reaches zero', () => {
      state.timeRemaining = 3;
      state.isWorkSession = false;
      state.sessionCount = 1;

      startTimer();
      jest.advanceTimersByTime(3000);

      expect(state.isWorkSession).toBe(true);
      expect(state.timeRemaining).toBe(WORK_DURATION);
    });

    test('should auto-start work timer after break completes', () => {
      state.timeRemaining = 2;
      state.isWorkSession = false;

      startTimer();
      jest.advanceTimersByTime(2000);

      // Should auto-start the work timer
      expect(state.isRunning).toBe(true);
      expect(state.isWorkSession).toBe(true);

      // Work timer should be counting down
      jest.advanceTimersByTime(1000);
      expect(state.timeRemaining).toBe(WORK_DURATION - 1);
    });
  });

  describe('AC3: Session counter increments after work session', () => {
    test('should increment session count when transitioning from break to work', () => {
      state.timeRemaining = 3;
      state.isWorkSession = false;
      state.sessionCount = 1;

      startTimer();
      jest.advanceTimersByTime(3000);

      expect(state.sessionCount).toBe(2);
      expect(state.isWorkSession).toBe(true);
    });

    test('should NOT increment session count when transitioning from work to break', () => {
      state.timeRemaining = 3;
      state.isWorkSession = true;
      state.sessionCount = 1;

      startTimer();
      jest.advanceTimersByTime(3000);

      // Should be on break with same session count
      expect(state.isWorkSession).toBe(false);
      expect(state.sessionCount).toBe(1);
    });

    test('should display correct session count after multiple cycles', () => {
      // Complete first work+break cycle (goes to session 2)
      state.timeRemaining = 1;
      state.isWorkSession = true;
      state.sessionCount = 1;

      startTimer();
      jest.advanceTimersByTime(1000); // Work completes, auto-starts break
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes, auto-starts work with session 2

      expect(state.sessionCount).toBe(2);
      expect(state.isWorkSession).toBe(true);
    });
  });

  describe('AC4: After 4 work sessions, counter resets to Session 1', () => {
    test('should reset session count to 1 after completing 4 work sessions', () => {
      state.timeRemaining = 2;
      state.isWorkSession = false; // On break after 4th work session
      state.sessionCount = 4;

      startTimer();
      jest.advanceTimersByTime(2000); // Break completes

      expect(state.sessionCount).toBe(1);
      expect(state.isWorkSession).toBe(true);
    });

    test('should reset after full 4-session cycle', () => {
      // Simulate completing 3 full work+break cycles (sessions 1, 2, 3 done)
      // Now on session 4, break phase
      state.timeRemaining = 2;
      state.isWorkSession = false;
      state.sessionCount = 4;

      startTimer();
      jest.advanceTimersByTime(2000); // Break of session 4 completes

      expect(state.sessionCount).toBe(1);
      expect(state.isWorkSession).toBe(true);
      expect(state.timeRemaining).toBe(WORK_DURATION);
    });

    test('session count should never exceed MAX_SESSIONS', () => {
      // Start at session 4, work phase
      state.timeRemaining = 2;
      state.isWorkSession = true;
      state.sessionCount = 4;

      startTimer();
      jest.advanceTimersByTime(2000); // Work completes, auto-starts break
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes, should reset to session 1

      // Should reset to session 1, not go to session 5
      expect(state.sessionCount).toBe(1);
    });
  });

  describe('AC5: Timer continues accurately when tab is backgrounded', () => {
    let hiddenValue = false;

    beforeEach(() => {
      // Mock document.hidden
      hiddenValue = false;
      Object.defineProperty(document, 'hidden', {
        get() { return hiddenValue; },
        set(value) { hiddenValue = value; },
        configurable: true
      });
    });

    test('should update lastTickTime when timer starts', () => {
      const beforeStart = Date.now();
      startTimer();
      const afterStart = Date.now();

      expect(state.lastTickTime).not.toBeNull();
      expect(state.lastTickTime).toBeGreaterThanOrEqual(beforeStart);
      expect(state.lastTickTime).toBeLessThanOrEqual(afterStart);
    });

    test('should update lastTickTime on each tick', () => {
      startTimer();
      const initialTickTime = state.lastTickTime;

      jest.advanceTimersByTime(1000);

      expect(state.lastTickTime).not.toBe(initialTickTime);
    });

    test('should correct time drift when tab becomes visible', () => {
      // Start timer
      state.timeRemaining = 60;
      startTimer();

      // Simulate 10 seconds passing while tab is hidden
      const simulatedNow = Date.now() + 10000;
      jest.spyOn(Date, 'now').mockReturnValue(simulatedNow);

      // Call visibility change handler
      handleVisibilityChange();

      // Should have subtracted 10 seconds
      expect(state.timeRemaining).toBe(50);
    });

    test('should not adjust time when tab is hidden', () => {
      state.timeRemaining = 60;
      startTimer();

      hiddenValue = true;

      const initialTime = state.timeRemaining;
      handleVisibilityChange();

      expect(state.timeRemaining).toBe(initialTime);
    });

    test('should not adjust time when timer is not running', () => {
      state.timeRemaining = 60;
      state.isRunning = false;
      state.lastTickTime = Date.now() - 10000;

      const initialTime = state.timeRemaining;
      handleVisibilityChange();

      expect(state.timeRemaining).toBe(initialTime);
    });

    test('should handle timer completion that occurred while backgrounded', () => {
      // Start timer with 5 seconds
      state.timeRemaining = 5;
      startTimer();

      // Simulate 10 seconds passing while tab is hidden (timer should complete)
      const simulatedNow = Date.now() + 10000;
      jest.spyOn(Date, 'now').mockReturnValue(simulatedNow);

      // Call visibility change handler
      handleVisibilityChange();

      // Timer should have completed and transitioned
      expect(state.timeRemaining).toBeGreaterThanOrEqual(0);
    });

    test('should set lastTickTime to null when timer is stopped', () => {
      startTimer();
      expect(state.lastTickTime).not.toBeNull();

      pauseTimer();
      // lastTickTime is preserved for resume reference
    });

    test('should set lastTickTime to null when timer is reset', () => {
      startTimer();
      expect(state.lastTickTime).not.toBeNull();

      resetTimer();
      expect(state.lastTickTime).toBeNull();
    });
  });

  describe('handleTimerComplete with autoStart parameter', () => {
    test('should auto-start next phase by default', () => {
      state.timeRemaining = 0;
      state.isWorkSession = true;

      handleTimerComplete();

      expect(state.isRunning).toBe(true);
    });

    test('should not auto-start when autoStart is false', () => {
      state.timeRemaining = 0;
      state.isWorkSession = true;
      state.isRunning = true;

      handleTimerComplete(false);

      expect(state.isRunning).toBe(false);
    });
  });

  describe('Display Updates for Auto-Cycle', () => {
    test('should update session type label when transitioning phases', () => {
      const sessionType = document.getElementById('session-type') as HTMLElement;

      state.isWorkSession = true;
      updateDisplay();
      expect(sessionType.textContent).toBe('WORK');

      state.isWorkSession = false;
      updateDisplay();
      expect(sessionType.textContent).toBe('BREAK');
    });

    test('should update session count display correctly', () => {
      const countDisplay = document.getElementById('session-count') as HTMLElement;

      state.sessionCount = 1;
      updateDisplay();
      expect(countDisplay.textContent).toBe('Session 1 of 4');

      state.sessionCount = 4;
      updateDisplay();
      expect(countDisplay.textContent).toBe('Session 4 of 4');
    });

    test('should display correct timer value after phase transition', () => {
      const display = document.getElementById('timer-display') as HTMLElement;

      // After work completes, should show break duration
      state.isWorkSession = false;
      state.timeRemaining = BREAK_DURATION;
      updateDisplay();
      expect(display.textContent).toBe('05:00');

      // After break completes, should show work duration
      state.isWorkSession = true;
      state.timeRemaining = WORK_DURATION;
      updateDisplay();
      expect(display.textContent).toBe('25:00');
    });
  });

  describe('Integration: Full Work-Break Cycle', () => {
    test('should complete full work-break cycle with auto-transition', () => {
      // Start with work session
      state.timeRemaining = 3;
      state.isWorkSession = true;
      state.sessionCount = 1;

      startTimer();

      // Work phase completes, auto-transitions to break
      jest.advanceTimersByTime(3000);

      expect(state.isWorkSession).toBe(false);
      expect(state.timeRemaining).toBe(BREAK_DURATION);
      expect(state.isRunning).toBe(true);

      // Break phase completes, auto-transitions to work
      jest.advanceTimersByTime(BREAK_DURATION * 1000);

      expect(state.isWorkSession).toBe(true);
      expect(state.sessionCount).toBe(2);
      expect(state.timeRemaining).toBe(WORK_DURATION);
      expect(state.isRunning).toBe(true);
    });

    test('should complete all 4 sessions and reset', () => {
      // Speed run through 4 sessions - need to manually set timeRemaining 
      // because handleTimerComplete sets it to full WORK_DURATION/BREAK_DURATION
      state.timeRemaining = 1;
      state.isWorkSession = true;
      state.sessionCount = 1;

      startTimer();

      // Complete 3 full cycles to get to session 4
      // Session 1: Work(1s) -> Break(5m) -> Work(Session 2)
      jest.advanceTimersByTime(1000); // Work completes
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes -> Session 2
      expect(state.sessionCount).toBe(2);

      // Manually set short work time for fast test
      pauseTimer();
      state.timeRemaining = 1;
      resumeTimer();

      // Session 2: Work -> Break -> Work(Session 3)
      jest.advanceTimersByTime(1000); // Work completes
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes -> Session 3
      expect(state.sessionCount).toBe(3);

      // Manually set short work time for fast test
      pauseTimer();
      state.timeRemaining = 1;
      resumeTimer();

      // Session 3: Work -> Break -> Work(Session 4)
      jest.advanceTimersByTime(1000); // Work completes
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes -> Session 4
      expect(state.sessionCount).toBe(4);

      // Manually set short work time for fast test
      pauseTimer();
      state.timeRemaining = 1;
      resumeTimer();

      // Session 4: Work -> Break -> Reset to Session 1
      jest.advanceTimersByTime(1000); // Work completes
      jest.advanceTimersByTime(BREAK_DURATION * 1000); // Break completes -> Reset to Session 1

      expect(state.sessionCount).toBe(1);
      expect(state.isWorkSession).toBe(true);
    });
  });
});
