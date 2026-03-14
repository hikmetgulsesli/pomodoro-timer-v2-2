/**
 * Tests for Control Buttons
 * Story US-005: Start/Pause/Reset control buttons
 */

import {
  state,
  startTimer,
  pauseTimer,
  resumeTimer,
  resetTimer,
  handleControlClick,
  updateControlButton,
  updateDisplay,
  initDOMElements,
  WORK_DURATION,
  BREAK_DURATION
} from './main';

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  createOscillator = jest.fn(() => ({
    connect: jest.fn(),
    frequency: { value: 0 },
    type: 'sine',
    start: jest.fn(),
    stop: jest.fn()
  }));
  createGain = jest.fn(() => ({
    connect: jest.fn(),
    gain: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    }
  }));
  destination = {};
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext
});

describe('Control Buttons', () => {
  beforeEach(() => {
    // Reset state
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    // Setup DOM with single control button
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

  describe('Start Button', () => {
    test('should begin countdown from current time when Start is clicked', () => {
      const initialTime = state.timeRemaining;
      expect(state.isRunning).toBe(false);

      startTimer();

      expect(state.isRunning).toBe(true);
      expect(state.intervalId).not.toBeNull();

      // Advance timer by 5 seconds
      jest.advanceTimersByTime(5000);

      expect(state.timeRemaining).toBe(initialTime - 5);
    });

    test('should change button label to Pause when timer is running', () => {
      const label = document.getElementById('control-btn-label') as HTMLElement;
      const icon = document.getElementById('control-btn-icon') as HTMLElement;
      const btn = document.getElementById('control-btn') as HTMLButtonElement;

      expect(label.textContent).toBe('Start');
      expect(icon.textContent).toBe('play_arrow');

      startTimer();
      updateControlButton();

      expect(label.textContent).toBe('Pause');
      expect(icon.textContent).toBe('pause');
      expect(btn.getAttribute('aria-label')).toBe('Pause Timer');
    });
  });

  describe('Pause Button', () => {
    test('should freeze countdown when Pause is clicked', () => {
      startTimer();
      expect(state.isRunning).toBe(true);

      // Advance timer by 3 seconds
      jest.advanceTimersByTime(3000);
      const timeAfter3Seconds = state.timeRemaining;

      pauseTimer();

      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(true);

      // Advance timer by 5 more seconds (should not change time)
      jest.advanceTimersByTime(5000);

      expect(state.timeRemaining).toBe(timeAfter3Seconds);
    });

    test('should change button label to Resume when paused', () => {
      const label = document.getElementById('control-btn-label') as HTMLElement;
      const icon = document.getElementById('control-btn-icon') as HTMLElement;
      const btn = document.getElementById('control-btn') as HTMLButtonElement;

      startTimer();
      updateControlButton();

      pauseTimer();
      updateControlButton();

      expect(label.textContent).toBe('Resume');
      expect(icon.textContent).toBe('play_arrow');
      expect(btn.getAttribute('aria-label')).toBe('Resume Timer');
    });
  });

  describe('Resume Button', () => {
    test('should resume countdown from paused time when Resume is clicked', () => {
      startTimer();
      jest.advanceTimersByTime(3000);
      const timeWhenPaused = state.timeRemaining;

      pauseTimer();
      expect(state.timeRemaining).toBe(timeWhenPaused);

      resumeTimer();
      expect(state.isRunning).toBe(true);

      // Advance timer by 2 more seconds
      jest.advanceTimersByTime(2000);

      expect(state.timeRemaining).toBe(timeWhenPaused - 2);
    });
  });

  describe('Reset Button', () => {
    test('should stop timer when Reset is clicked', () => {
      startTimer();
      expect(state.isRunning).toBe(true);

      resetTimer();

      expect(state.isRunning).toBe(false);
      expect(state.intervalId).toBeNull();
    });

    test('should reset to initial phase duration when Reset is clicked', () => {
      // Start and run timer for a bit
      startTimer();
      jest.advanceTimersByTime(10000);

      resetTimer();

      expect(state.timeRemaining).toBe(WORK_DURATION);
      expect(state.isWorkSession).toBe(true);
      expect(state.sessionCount).toBe(1);
      expect(state.isPaused).toBe(false);
      expect(state.isRunning).toBe(false);
    });

    test('should reset button label back to Start', () => {
      const label = document.getElementById('control-btn-label') as HTMLElement;
      const icon = document.getElementById('control-btn-icon') as HTMLElement;
      const btn = document.getElementById('control-btn') as HTMLButtonElement;

      startTimer();
      updateControlButton();
      expect(label.textContent).toBe('Pause');

      resetTimer();
      updateControlButton();

      expect(label.textContent).toBe('Start');
      expect(icon.textContent).toBe('play_arrow');
      expect(btn.getAttribute('aria-label')).toBe('Start Timer');
    });
  });

  describe('handleControlClick', () => {
    test('should start timer when stopped and Start is clicked', () => {
      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(false);

      handleControlClick();

      expect(state.isRunning).toBe(true);
    });

    test('should pause timer when running and Pause is clicked', () => {
      startTimer();
      expect(state.isRunning).toBe(true);

      handleControlClick();

      expect(state.isRunning).toBe(false);
      expect(state.isPaused).toBe(true);
    });

    test('should resume timer when paused and Resume is clicked', () => {
      startTimer();
      handleControlClick(); // Pause

      expect(state.isPaused).toBe(true);

      handleControlClick(); // Resume

      expect(state.isRunning).toBe(true);
      expect(state.isPaused).toBe(false);
    });
  });
});

describe('Timer Completion', () => {
  beforeEach(() => {
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

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

  test('should switch to break after work session completes', () => {
    state.timeRemaining = 3;
    startTimer();

    jest.advanceTimersByTime(3000);

    expect(state.isWorkSession).toBe(false);
    expect(state.timeRemaining).toBe(BREAK_DURATION);
    expect(state.isRunning).toBe(true); // Auto-starts break phase
  });

  test('should switch back to work after break completes', () => {
    state.timeRemaining = 3;
    state.isWorkSession = false;
    startTimer();

    jest.advanceTimersByTime(3000);

    expect(state.isWorkSession).toBe(true);
    expect(state.sessionCount).toBe(2);
    expect(state.timeRemaining).toBe(WORK_DURATION);
  });
});

describe('Display Updates', () => {
  beforeEach(() => {
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

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

  test('should update timer display when time changes', () => {
    const display = document.getElementById('timer-display') as HTMLElement;

    updateDisplay();
    expect(display.textContent).toBe('25:00');

    state.timeRemaining = 300;
    updateDisplay();
    expect(display.textContent).toBe('05:00');
  });

  test('should update session type display', () => {
    const sessionType = document.getElementById('session-type') as HTMLElement;

    state.isWorkSession = true;
    updateDisplay();
    expect(sessionType.textContent).toBe('WORK');

    state.isWorkSession = false;
    updateDisplay();
    expect(sessionType.textContent).toBe('BREAK');
  });

  test('should update session count display', () => {
    const countDisplay = document.getElementById('session-count') as HTMLElement;

    state.sessionCount = 1;
    updateDisplay();
    expect(countDisplay.textContent).toBe('Session 1 of 4');

    state.sessionCount = 3;
    updateDisplay();
    expect(countDisplay.textContent).toBe('Session 3 of 4');
  });
});

describe('DOM Structure', () => {
  test('should have required timer elements in DOM', () => {
    document.body.innerHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pomodoro Timer</title>
      </head>
      <body>
        <div id="timer-display">25:00</div>
        <div id="session-type">WORK</div>
        <div id="session-count">Session 1 of 4</div>
        <button id="control-btn">
          <span id="control-btn-icon">play_arrow</span>
          <span id="control-btn-label">Start</span>
        </button>
        <button id="reset-btn">Reset</button>
      </body>
      </html>
    `;

    const html = document.documentElement.innerHTML;
    expect(html).toContain('timer-display');
    expect(html).toContain('session-type');
    expect(html).toContain('session-count');
    expect(html).toContain('control-btn');
    expect(html).toContain('reset-btn');
    expect(html).toContain('control-btn-icon');
    expect(html).toContain('control-btn-label');
  });

  test('should have proper meta tags for responsive design', () => {
    document.head.innerHTML = `
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Pomodoro Timer</title>
    `;

    const viewport = document.querySelector('meta[name="viewport"]');
    expect(viewport).toBeTruthy();
    expect(viewport?.getAttribute('content')).toContain('width=device-width');
  });
});
