# Problem 2: Fancy Currency Swap Form

A visually stunning, high-performance currency swap interface built as a take-home assignment solution. This project prioritizes modern aesthetics, rigorous numeric precision, and a smooth, interactive user experience.

## ✨ Features

- **Dynamic Token Selection**: A custom, searchable dropdown featuring real-time token SVG images sourced from the Switcheo token-icons repository.
- **Flawless Numeric Precision**: Powered by `bignumber.js` to securely handle mathematically immense inputs (e.g., beyond 27 digits) while avoiding standard JavaScript scientific notation floating-point errors (`e+25`).
- **Interactive UI/UX**:
  - Dynamic thousand-separator auto-formatting (`100,000,000`).
  - Graceful horizontal infinite scrolling for massive input scales instead of clunky text truncations.
  - Comprehensive regex-based form validation.
- **Glassmorphism Aesthetic**: Beautiful, responsive, and abstract dark-mode UI powered by Tailwind CSS v4.

## 🛠️ Technology Stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: React Hooks (Native `useState`, `useMemo`, `useEffect`)
- **Number precision**: `bignumber.js`
- **Icons**: `lucide-react`
- **API Connectivity**: Live tokens fetch from [Switcheo Network API](https://interview.switcheo.com/prices.json)

---

## 🚀 Setup & Execution

Follow these instructions to run the application securely on your local machine.

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher is recommended) alongside `npm`.

### 1. Installation

Navigate to the project root directory (`src/problem2`) and install all required dependencies:

```bash
npm install
```

### 2. Start the Development Server

Run the local Vite development server:

```bash
npm run dev
```

Open the provided local network link in your browser (typically `http://localhost:5173/`).

### 3. Build for Production

To securely compile the TypeScript and generate a minified production bundle, run:

```bash
npm run build
```

This will thoroughly type-check the codebase and output the optimized application into the `/dist` folder.

---

## 🏗️ Architecture & Code Base Decisions

- **Single Truth State Strategy**: Token selection natively stores simple, raw currency string identifiers (e.g., `'USD'`, `'ETH'`) rather than overlapping duplicated block objects. Lookups happen exclusively during the render phase via efficiently memoized `useMemo` hooks.
- **Clean Fallback API Handling**: Fallback behaviors gracefully mount default values directly based on API resolution, eliminating entirely the cascading React warnings typically associated with syncing external APIs with local state `useEffect` chains.
