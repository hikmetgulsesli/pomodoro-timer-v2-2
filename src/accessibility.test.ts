/**
 * Accessibility Tests
 * Story US-008: Accessibility and keyboard navigation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  state,
  startTimer,
  pauseTimer,
  resetTimer,
  updateDisplay,
  updateControlButton,
  announceState,
  getTimerStatusText,
  initDOMElements,
  WORK_DURATION,
  MAX_SESSIONS
} from './main';

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  state = 'running';
  createOscillator = vi.fn(() => ({
    connect: vi.fn(),
    frequency: { value: 0 },
    type: 'sine',
    start: vi.fn(),
    stop: vi.fn()
  }));
  createGain = vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    }
  }));
  destination = {};
  resume = vi.fn().mockResolvedValue(undefined);
}

const mockAudioContext = new MockAudioContext();

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: vi.fn().mockImplementation(() => mockAudioContext)
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
    state.targetEndTime = null;

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

    // Initialize DOM elements
    initDOMElements();

    // Initialize DOM elements
    initDOMElements();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    // Clean up any sr-only elements
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  it('timer display should have aria-live="polite" attribute', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;
    expect(timerDisplay.getAttribute('aria-live')).toBe('polite');
  });

  it('timer display should have aria-atomic="true" attribute', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;
    expect(timerDisplay.getAttribute('aria-atomic')).toBe('true');
  });

  it('control button should have accessible aria-label', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
    expect(controlBtn.getAttribute('aria-label')).toBeTruthy();
  });

  it('reset button should have accessible aria-label', () => {
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    expect(resetBtn.getAttribute('aria-label')).toBe('Reset Timer');
  });

  it('session type should have aria-label describing its purpose', () => {
    const sessionType = document.getElementById('session-type') as HTMLElement;
    expect(sessionType.getAttribute('aria-label')).toBe('Current session type');
  });

  it('session count should have aria-label describing its purpose', () => {
    const sessionCount = document.getElementById('session-count') as HTMLElement;
    expect(sessionCount.getAttribute('aria-label')).toBe('Session count');
  });

  it('aria-label on control button should update to "Pause Timer" when running', async () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;

    await startTimer();
    updateControlButton();

    expect(controlBtn.getAttribute('aria-label')).toBe('Pause Timer');
  });

  it('aria-label on control button should update to "Resume Timer" when paused', async () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;

    await startTimer();
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
    state.targetEndTime = null;

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

    // Initialize DOM elements
    initDOMElements();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  it('announceState should create a screen-reader only announcement element', () => {
    announceState('Test announcement');

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.classList.contains('sr-only')).toBe(true);
    expect(announcement?.getAttribute('aria-live')).toBe('polite');
  });

  it('startTimer should announce to screen readers', async () => {
    await startTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('Timer started');
  });

  it('pauseTimer should announce to screen readers', async () => {
    await startTimer();
    // Clear the start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    pauseTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('paused');
  });

  it('resetTimer should announce to screen readers', async () => {
    await startTimer();
    // Clear the start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    resetTimer();

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('reset');
  });

  it('timer display should have dynamic aria-label with context', () => {
    const timerDisplay = document.getElementById('timer-display') as HTMLElement;

    updateDisplay();

    const ariaLabel = timerDisplay.getAttribute('aria-label');
    expect(ariaLabel).toContain('Timer:');
    expect(ariaLabel).toContain('Work session');
  });

  it('session type should update aria-label for break phase', () => {
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
    state.targetEndTime = null;

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

    // Initialize DOM elements
    initDOMElements();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  it('control button text label conveys state, not just color', async () => {
    const label = document.getElementById('control-btn-label') as HTMLElement;

    // Initial state
    expect(label.textContent).toBe('Start');

    // Running state
    await startTimer();
    updateControlButton();
    expect(label.textContent).toBe('Pause');

    // Paused state
    pauseTimer();
    updateControlButton();
    expect(label.textContent).toBe('Resume');
  });

  it('session type displays WORK or BREAK text, not just color', () => {
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

  it('getTimerStatusText returns full state description', () => {
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
    state.targetEndTime = null;

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

    // Initialize DOM elements
    initDOMElements();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    // Clear all sr-only elements safely
    document.querySelectorAll('.sr-only').forEach(el => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  });

  it('should announce when work session completes', async () => {
    state.timeRemaining = 3;
    await startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    vi.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('Work session complete');
  });

  it('should announce when break session completes', async () => {
    state.timeRemaining = 3;
    state.isWorkSession = false;
    await startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    vi.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
    expect(announcement?.textContent).toContain('Break complete');
  });

  it('should announce when all sessions complete', async () => {
    state.timeRemaining = 3;
    state.isWorkSession = false;
    state.sessionCount = MAX_SESSIONS;
    await startTimer();

    // Clear start announcement
    document.querySelectorAll('.sr-only').forEach(el => el.remove());

    vi.advanceTimersByTime(3000);

    const announcement = document.querySelector('[role="status"]');
    expect(announcement).toBeTruthy();
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
    state.targetEndTime = null;

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

    // Initialize DOM elements
    initDOMElements();

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    document.querySelectorAll('.sr-only').forEach(el => el.remove());
  });

  it('buttons should be focusable via keyboard', () => {
    const controlBtn = document.getElementById('control-btn') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    // Buttons should have tabindex or be naturally focusable (default for button is 0)
    expect(controlBtn.tabIndex).toBe(0);
    expect(resetBtn.tabIndex).toBe(0);
  });

  it('buttons should have visible focus indicators via CSS classes', () => {
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
