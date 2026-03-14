# Pomodoro Timer

A simple, elegant Pomodoro timer application built with TypeScript and Tailwind CSS.

## Features

- **25-minute work sessions** followed by **5-minute breaks**
- **Start/Pause/Reset** controls with intuitive button interface
- **Audio notifications** when timer completes
- **Session tracking** (1 of 4 sessions)
- **Responsive design** with dark mode support
- **Material Design icons** for clear visual feedback

## Project Structure

```
├── index.html          # Main HTML file with semantic structure
├── src/
│   ├── main.ts         # Timer logic and state management
│   └── __tests__/      # Test files
├── dist/               # Compiled JavaScript (generated)
├── stitch/             # Design assets and tokens
│   ├── design-tokens.css
│   └── Pomodoro-Timer-Dashboard.html
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/hikmetgulsesli/pomodoro-timer-v2-2.git
cd pomodoro-timer-v2-2

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development

```bash
# Run linter
npm run lint

# Run tests in watch mode
npx vitest

# Build for production
npm run build
```

## Usage

1. Open `index.html` in your browser
2. Click **Start** to begin a 25-minute work session
3. Click **Pause** to pause the timer
4. Click **Reset** to reset to the beginning of the current session
5. After each work session, a 5-minute break automatically begins
6. After 4 work sessions, the cycle resets

## Design

The application follows the design system specified in `stitch/design-tokens.css`:

- **Primary Color**: `#137fec`
- **Tomato (Work)**: `#E74C3C`
- **Orange (Pause)**: `#F39C12`
- **Gray (Reset)**: `#95A5A6`
- **Display Font**: Space Grotesk
- **Body Font**: DM Sans
- **Mono Font**: SF Mono

## Technologies

- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Testing framework
- **ESBuild** - Fast bundler
- **ESLint** - Code linting

## License

ISC
