import { vi } from 'vitest';

// Mock AudioContext globally for all tests
const mockOscillator = {
  connect: vi.fn(),
  frequency: { value: 0 },
  type: 'sine',
  start: vi.fn(),
  stop: vi.fn(),
};

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  },
};

class MockAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  
  resume = vi.fn().mockResolvedValue(undefined);
  
  createOscillator() {
    return { ...mockOscillator };
  }
  
  createGain() {
    return { ...mockGainNode };
  }
}

// Set up global mocks
(globalThis as any).AudioContext = MockAudioContext as unknown as typeof AudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext as unknown as typeof AudioContext;
