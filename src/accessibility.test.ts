/**
 * Accessibility Tests
 * Story US-008: Accessibility and keyboard navigation
 */

import {
  state,
  startTimer,
  pauseTimer,
  resetTimer,
  updateDisplay,
  updateControlButton,
  initDOMElements,
  announceState,
  getTimerStatusText,
  WORK_DURATION,
  MAX_SESSIONS
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

describe('Accessibility - ARIA Labels', () => {
  beforeEach(() => {
    // Reset state
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    // Setup DOM with accessibility attributes
    document.body.innerHTML = `
      <div id="session-type" aria-label="Current session type">WORK</div>
      <div id="timer-display" aria-live="polite" aria-atomic="true" aria-label="Timer display">25:00</div>
      <div id="session-count" aria-label="Session count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn" aria-label="Reset Timer">Reset</button>
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
    // Clean up any sr-only elements
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  test('timer display should have aria-live="polite" attribute', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;
    expect(timerDisplay.getAttribute('aria-live')).toBe('polite');
  });

  test('timer display should have aria-atomic="true" attribute', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;
    expect(timerDisplay.getAttribute('aria-atomic')).toBe('true');
  });

  test('control button should have accessible aria-label', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
    expect(controlBtn.getAttribute('aria-label')).toBeTruthy();
  });

  test('reset button should have accessible aria-label', () => {
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    expect(resetBtn.getAttribute('aria-label')).toBe('Reset Timer');
  });

  test('session type should have aria-label describing its purpose', () => {
    const sessionType = document.getElementById('session-type') as HTMLElement;
    expect(sessionType.getAttribute('aria-label')).toBe('Current session type');
  });

  test('session count should have aria-label describing its purpose', () => {
    const sessionCount = document.getElementById('session-count') as HTMLElement;
    expect(sessionCount.getAttribute('aria-label')).toBe('Session count');
  });

  test('aria-label on control button should update to "Pause Timer" when running', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;

    startTimer();
    updateControlButton();

    expect(controlBtn.getAttribute('aria-label')).toBe('Pause Timer');
  });

  test('aria-label on control button should update to "Resume Timer" when paused', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;

    startTimer();
    pauseTimer();
    updateControlButton();

    expect(controlBtn.getAttribute('aria-label')).toBe('Resume Timer');
  });
});

describe('Accessibility - Screen Reader Announcements', () => {
  beforeEach(() => {
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    document.body.innerHTML = `
      <div id="session-type" aria-label="Current session type">WORK</div>
      <div id="timer-display" aria-live="polite" aria-atomic="true" aria-label="Timer display">25:00</div>
      <div id="session-count" aria-label="Session count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn" aria-label="Reset Timer">Reset</button>
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
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  test('announceState should create a screen-reader only announcement element', () => {
    announceState('Test announcement');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.classList.contains('sr-only')).toBe(true);
    expect(announcement?.getAttribute('aria-live')).toBe('polite');
  });

  test('startTimer should announce to screen readers', () => {
    startTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('Timer started');
  });

  test('pauseTimer should announce to screen readers', () => {
    startTimer();
    // Clear the start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    pauseTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('paused');
  });

  test('resetTimer should announce to screen readers', () => {
    startTimer();
    // Clear the start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    resetTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('reset');
  });

  test('timer display should have dynamic aria-label with context', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;

    updateDisplay();

    const ariaLabel = timerDisplay.getAttribute('aria-label');
    expect(ariaLabel).toContain('Timer:');
    expect(ariaLabel).toContain('Work session');
  });

  test('session type should update aria-label for break phase', () => {
    const sessionType = document.getElementById('session-type') as HTMLElement;

    state.isWorkSession = false;
    updateDisplay();

    expect(sessionType.getAttribute('aria-label')).toBe('Current session: Break phase');
  });
});

describe('Accessibility - State Not via Color Only', () => {
  beforeEach(() => {
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    document.body.innerHTML = `
      <div id="session-type" aria-label="Current session type">WORK</div>
      <div id="timer-display" aria-live="polite" aria-atomic="true" aria-label="Timer display">25:00</div>
      <div id="session-count" aria-label="Session count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn" aria-label="Reset Timer">Reset</button>
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
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  test('control button text label conveys state, not just color', () => {
    const label = document.getElementById('control-btn-label') as HTMLElement;

    // Initial state
    expect(label.textContent).toBe('Start');

    // Running state
    startTimer();
    updateControlButton();
    expect(label.textContent).toBe('Pause');

    // Paused state
    pauseTimer();
    updateControlButton();
    expect(label.textContent).toBe('Resume');
  });

  test('session type displays WORK or BREAK text, not just color', () => {
    const sessionType = document.getElementById('session-type') as HTMLElement;

    // Work session
    state.isWorkSession = true;
    updateDisplay();
    expect(sessionType.textContent).toBe('WORK');

    // Break session
    state.isWorkSession = false;
    updateDisplay();
    expect(sessionType.textContent).toBe('BREAK');
  });

  test('getTimerStatusText returns full state description', () => {
    // Stopped state
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.timeRemaining = WORK_DURATION;

    let status = getTimerStatusText();
    expect(status).toContain('Work');
    expect(status).toContain('stopped');
    expect(status).toContain('25:00');

    // Running state
    state.isRunning = true;
    status = getTimerStatusText();
    expect(status).toContain('running');

    // Paused state
    state.isRunning = false;
    state.isPaused = true;
    status = getTimerStatusText();
    expect(status).toContain('paused');
  });
});

describe('Accessibility - Timer Completion Announcements', () => {
  beforeEach(() => {
    // Clear any existing announcements first
    document.querySelectorAll('.sr-only').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    document.body.innerHTML = `
      <div id="session-type" aria-label="Current session type">WORK</div>
      <div id="timer-display" aria-live="polite" aria-atomic="true" aria-label="Timer display">25:00</div>
      <div id="session-count" aria-label="Session count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn" aria-label="Reset Timer">Reset</button>
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
    // Clear all sr-only elements safely
    document.querySelectorAll('.sr-only').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  });

  test('should announce when work session completes', () => {
    state.timeRemaining = 3;
    startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    jest.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.textContent).toContain('Work session complete');
  });

  test('should announce when break session completes', () => {
    state.timeRemaining = 3;
    state.isWorkSession = false;
    startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    jest.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.textContent).toContain('Break complete');
  });

  test('should announce when all sessions complete', () => {
    state.timeRemaining = 3;
    state.isWorkSession = false;
    state.sessionCount = MAX_SESSIONS;
    startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    jest.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement?.textContent).toContain('All sessions complete');
  });
});

describe('Accessibility - Keyboard Navigation', () => {
  beforeEach(() => {
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    document.body.innerHTML = `
      <div id="session-type" aria-label="Current session type">WORK</div>
      <div id="timer-display" aria-live="polite" aria-atomic="true" aria-label="Timer display">25:00</div>
      <div id="session-count" aria-label="Session count">Session 1 of 4</div>
      <button id="control-btn" aria-label="Start Timer" class="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div class="bg-slate-blue">
          <span id="control-btn-icon">play_arrow</span>
        </div>
        <span id="control-btn-label">Start</span>
      </button>
      <button id="reset-btn" aria-label="Reset Timer" class="focus:outline-none focus-visible:ring-2">Reset</button>
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
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  test('buttons should be focusable via keyboard', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    // Buttons should have tabindex or be naturally focusable (default for button is 0)
    expect(controlBtn.tabIndex).toBe(0);
    expect(resetBtn.tabIndex).toBe(0);
  });

  test('buttons should have visible focus indicators via CSS classes', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
    const classList = Array.from(controlBtn.classList);

    // Check that focus-related classes exist (Tailwind uses focus: or focus-visible:)
    const hasFocusStyle = classList.some(cls =>
      cls.includes('focus') || cls.includes('focus-visible') || cls.includes('ring')
    );
    expect(hasFocusStyle).toBe(true);
    expect(controlBtn).toBeTruthy();
  });
});
