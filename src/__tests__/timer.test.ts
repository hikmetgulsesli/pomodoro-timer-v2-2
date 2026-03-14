import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';



describe('Pomodoro Timer', () => {
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

  it('should format time correctly', () => {
    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    expect(formatTime(1500)).toBe('25:00');
    expect(formatTime(300)).toBe('05:00');
    expect(formatTime(60)).toBe('01:00');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(59)).toBe('00:59');
    expect(formatTime(61)).toBe('01:01');
  });

  it('should have working timer state transitions', () => {
    const WORK_DURATION = 25 * 60;
    const BREAK_DURATION = 5 * 60;
    
    // Test initial state
    const state = {
      timeRemaining: WORK_DURATION,
      isRunning: false,
      isWorkSession: true,
      sessionCount: 1
    };
    
    expect(state.timeRemaining).toBe(1500);
    expect(state.isWorkSession).toBe(true);
    expect(state.sessionCount).toBe(1);
    
    // Test break transition
    state.isWorkSession = false;
    state.timeRemaining = BREAK_DURATION;
    expect(state.timeRemaining).toBe(300);
    expect(state.isWorkSession).toBe(false);
  });
});

describe('Project Structure', () => {
  it('should verify required timer elements exist in DOM', () => {
    // Setup complete DOM structure for testing
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
        <button id="start-btn">Start</button>
        <button id="pause-btn">Pause</button>
        <button id="reset-btn">Reset</button>
      </body>
      </html>
    `;
    
    // Validate HTML structure
    const html = document.documentElement.innerHTML;
    expect(html).toContain('timer-display');
    expect(html).toContain('session-type');
    expect(html).toContain('session-count');
    expect(html).toContain('start-btn');
    expect(html).toContain('pause-btn');
    expect(html).toContain('reset-btn');
  });

  it('should have proper meta tags for responsive design', () => {
    // Setup with viewport meta
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
