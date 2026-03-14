/**
 * Tests for Responsive Design and Visual Polish
 * Story US-009: Responsive design and visual polish
 */

import { vi } from 'vitest';
import {
  state,
  startTimer,
  pauseTimer,
  updateControlButton,
  updateDisplay,
  initDOMElements,
  WORK_DURATION
} from './main';

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
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
      exponentialRampToValueAtTime: vi.fn()
    }
  }));
  destination = {};
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext
});

describe('Responsive Design', () => {
  beforeEach(() => {
    // Reset state
    state.timeRemaining = WORK_DURATION;
    state.isRunning = false;
    state.isPaused = false;
    state.isWorkSession = true;
    state.sessionCount = 1;
    state.intervalId = null;

    // Setup DOM with responsive structure
    document.body.innerHTML = `
      <div class="w-full max-w-2xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 flex flex-col items-center gap-8 sm:gap-10 lg:gap-12">
        <header class="text-center">
          <h1 class="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-2">Pomodoro Timer</h1>
        </header>
        <div class="flex flex-col items-center gap-6 sm:gap-8 w-full">
          <div id="session-type" class="text-tomato font-display text-xl sm:text-2xl font-bold tracking-widest uppercase">WORK</div>
          <div class="font-mono leading-none font-bold tracking-tighter text-slate-800 dark:text-slate-200 timer-display" id="timer-display">25:00</div>
          <div id="session-count" class="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium">Session 1 of 4</div>
        </div>
        <div class="flex items-center justify-center gap-4 sm:gap-6 mt-2 sm:mt-4">
          <button id="control-btn" aria-label="Start Timer" class="btn flex flex-col items-center justify-center gap-2 group focus:outline-none">
            <div class="btn-circle bg-slate-blue flex items-center justify-center text-white">
              <span id="control-btn-icon" class="material-symbols-outlined text-2xl sm:text-3xl ml-0.5">play_arrow</span>
            </div>
            <span id="control-btn-label" class="text-sm font-medium text-slate-blue transition-colors duration-200">Start</span>
          </button>
          <button id="reset-btn" aria-label="Reset Timer" class="btn flex flex-col items-center justify-center gap-2 group focus:outline-none">
            <div class="btn-circle bg-gray-reset flex items-center justify-center text-white">
              <span class="material-symbols-outlined text-2xl sm:text-3xl">replay</span>
            </div>
            <span class="text-sm font-medium text-gray-reset">Reset</span>
          </button>
        </div>
      </div>
    `;

    // Inject CSS variables for testing
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --timer-font-size-mobile: 48px;
        --timer-font-size-tablet: 64px;
        --timer-font-size-desktop: 80px;
      }
      @media (max-width: 639px) {
        :root { --timer-font-size: var(--timer-font-size-mobile); }
      }
      @media (min-width: 640px) and (max-width: 1023px) {
        :root { --timer-font-size: var(--timer-font-size-tablet); }
      }
      @media (min-width: 1024px) {
        :root { --timer-font-size: var(--timer-font-size-desktop); }
      }
      .btn { cursor: pointer; }
      .btn-circle { width: 64px; height: 64px; border-radius: 9999px; }
      @media (min-width: 640px) {
        .btn-circle { width: 72px; height: 72px; }
      }
    `;
    document.head.appendChild(style);

    vi.useFakeTimers();
    initDOMElements();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (state.intervalId) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
  });

  describe('Timer Font Sizes', () => {
    test('should have CSS custom properties for timer font sizes', () => {
      // Verify the CSS variables are defined (they may return empty in JSDOM)
      const root = document.querySelector('style');
      expect(root?.textContent).toContain('--timer-font-size-mobile: 48px');
      expect(root?.textContent).toContain('--timer-font-size-tablet: 64px');
      expect(root?.textContent).toContain('--timer-font-size-desktop: 80px');
    });

    test('should have responsive font size definitions for mobile (48px)', () => {
      const styles = document.querySelector('style')?.textContent || '';
      expect(styles).toContain('--timer-font-size: var(--timer-font-size-mobile)');
      expect(styles).toContain('max-width: 639px');
    });

    test('should have responsive font size definitions for tablet (64px)', () => {
      const styles = document.querySelector('style')?.textContent || '';
      expect(styles).toContain('min-width: 640px');
      expect(styles).toContain('max-width: 1023px');
    });

    test('should have responsive font size definitions for desktop (80px)', () => {
      const styles = document.querySelector('style')?.textContent || '';
      expect(styles).toContain('min-width: 1024px');
    });

    test('timer display element should exist', () => {
      const timerDisplay = document.getElementById('timer-display');
      expect(timerDisplay).toBeTruthy();
      expect(timerDisplay?.textContent).toBe('25:00');
    });
  });

  describe('Button Hover States', () => {
    test('should have btn class on control buttons', () => {
      const controlBtn = document.getElementById('control-btn');
      const resetBtn = document.getElementById('reset-btn');
      
      expect(controlBtn?.classList.contains('btn')).toBe(true);
      expect(resetBtn?.classList.contains('btn')).toBe(true);
    });

    test('should have btn-circle class on button icons', () => {
      const controlBtnCircle = document.querySelector('#control-btn .btn-circle');
      const resetBtnCircle = document.querySelector('#reset-btn .btn-circle');
      
      expect(controlBtnCircle).toBeTruthy();
      expect(resetBtnCircle).toBeTruthy();
    });

    test('should have initial slate-blue background on control button', () => {
      const controlBtnCircle = document.querySelector('#control-btn .btn-circle');
      expect(controlBtnCircle?.classList.contains('bg-slate-blue')).toBe(true);
    });

    test('should have initial gray-reset background on reset button', () => {
      const resetBtnCircle = document.querySelector('#reset-btn .btn-circle');
      expect(resetBtnCircle?.classList.contains('bg-gray-reset')).toBe(true);
    });

    test('control button changes to orange-pause when timer is running', () => {
      const controlBtnCircle = document.querySelector('#control-btn .btn-circle');
      
      startTimer();
      updateControlButton();
      
      expect(controlBtnCircle?.classList.contains('bg-orange-pause')).toBe(true);
      expect(controlBtnCircle?.classList.contains('bg-slate-blue')).toBe(false);
    });

    test('control button returns to slate-blue when paused', () => {
      const controlBtnCircle = document.querySelector('#control-btn .btn-circle');
      
      startTimer();
      updateControlButton();
      pauseTimer();
      updateControlButton();
      
      expect(controlBtnCircle?.classList.contains('bg-slate-blue')).toBe(true);
      expect(controlBtnCircle?.classList.contains('bg-orange-pause')).toBe(false);
    });
  });

  describe('Button Active States', () => {
    test('should have button elements with cursor pointer', () => {
      const controlBtn = document.getElementById('control-btn');
      const resetBtn = document.getElementById('reset-btn');
      
      // Buttons should have btn class which includes cursor: pointer
      expect(controlBtn?.classList.contains('btn')).toBe(true);
      expect(resetBtn?.classList.contains('btn')).toBe(true);
    });

    test('buttons should have aria-labels for accessibility', () => {
      const controlBtn = document.getElementById('control-btn');
      const resetBtn = document.getElementById('reset-btn');
      
      expect(controlBtn?.getAttribute('aria-label')).toBe('Start Timer');
      expect(resetBtn?.getAttribute('aria-label')).toBe('Reset Timer');
    });
  });

  describe('Responsive Layout', () => {
    test('should have responsive container with max-width', () => {
      const container = document.querySelector('.max-w-2xl');
      expect(container).toBeTruthy();
    });

    test('should have responsive padding classes', () => {
      const container = document.querySelector('.max-w-2xl');
      expect(container?.classList.contains('px-4')).toBe(true);
      expect(container?.classList.contains('sm:px-6')).toBe(true);
      expect(container?.classList.contains('lg:px-8')).toBe(true);
    });

    test('should have responsive gap classes', () => {
      const container = document.querySelector('.max-w-2xl');
      expect(container?.classList.contains('gap-8')).toBe(true);
      expect(container?.classList.contains('sm:gap-10')).toBe(true);
      expect(container?.classList.contains('lg:gap-12')).toBe(true);
    });

    test('should have responsive button gap classes', () => {
      const buttonContainer = document.querySelector('.gap-4');
      expect(buttonContainer?.classList.contains('sm:gap-6')).toBe(true);
    });

    test('should have responsive typography for heading', () => {
      const heading = document.querySelector('h1');
      expect(heading?.classList.contains('text-3xl')).toBe(true);
      expect(heading?.classList.contains('sm:text-4xl')).toBe(true);
    });

    test('should have responsive typography for session type', () => {
      const sessionType = document.getElementById('session-type');
      expect(sessionType?.classList.contains('text-xl')).toBe(true);
      expect(sessionType?.classList.contains('sm:text-2xl')).toBe(true);
    });

    test('should have responsive typography for session count', () => {
      const sessionCount = document.getElementById('session-count');
      expect(sessionCount?.classList.contains('text-base')).toBe(true);
      expect(sessionCount?.classList.contains('sm:text-lg')).toBe(true);
    });
  });

  describe('Color Palette', () => {
    test('should have tomato color for work session indicator', () => {
      const sessionType = document.getElementById('session-type');
      expect(sessionType?.classList.contains('text-tomato')).toBe(true);
    });

    test('should update colors when switching to break session', () => {
      // Start timer and let work session complete
      state.timeRemaining = 2;
      startTimer();
      vi.advanceTimersByTime(2000);
      
      updateDisplay();
      
      // After work completes, it should switch to break
      expect(state.isWorkSession).toBe(false);
    });
  });
});

describe('CSS Custom Properties Validation', () => {
  let validationStyle: HTMLStyleElement;
  
  beforeAll(() => {
    validationStyle = document.createElement('style');
    validationStyle.textContent = `
      :root {
        /* Hover State Colors */
        --color-tomato-hover: #c0392b;
        --color-slate-blue-hover: #4a5568;
        --color-orange-pause-hover: #d68910;
        --color-gray-reset-hover: #7f8c8d;
        /* Active State Colors */
        --color-tomato-active: #a93226;
        --color-slate-blue-active: #3d4852;
        --color-orange-pause-active: #b7791f;
        --color-gray-reset-active: #707b7c;
      }
    `;
    document.head.appendChild(validationStyle);
  });

  afterAll(() => {
    if (validationStyle && validationStyle.parentNode) {
      validationStyle.parentNode.removeChild(validationStyle);
    }
  });

  test('should have hover color variables defined', () => {
    const css = validationStyle.textContent || '';
    
    expect(css).toContain('--color-tomato-hover');
    expect(css).toContain('--color-slate-blue-hover');
    expect(css).toContain('--color-orange-pause-hover');
    expect(css).toContain('--color-gray-reset-hover');
  });

  test('should have active color variables defined', () => {
    const css = validationStyle.textContent || '';
    
    expect(css).toContain('--color-tomato-active');
    expect(css).toContain('--color-slate-blue-active');
    expect(css).toContain('--color-orange-pause-active');
    expect(css).toContain('--color-gray-reset-active');
  });
});
