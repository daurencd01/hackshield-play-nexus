# Changelog - HackShield Play Nexus

## [Unreleased] - 2026-05-13

### 🛡 Security & Hardening (Audit v1)
- **Dependency Audit**: Updated `vite` to 6.0.0, `postcss` to 8.5.14, and `react-router-dom` to 7.15.0. Resolved 16 vulnerabilities (9 high).
- **XSS Prevention**: Integrated `DOMPurify` for HTML sanitization. Replaced all `dangerouslySetInnerHTML` with `SafeHtml` utility.
- **Content Security Policy**: Added strict CSP meta tags and security headers (`nosniff`, `DENY`) to `index.html`.
- **Data Integrity**: Implemented `Zod` schema validation for all `localStorage` operations. Added `safeStorage` wrapper with versioning.
- **Global Resilience**: Implemented a comprehensive `ErrorBoundary` to catch and recover from runtime crashes.

### 🏗 Architecture Refactoring
- **Game Engine**: Modularized `GameScene.tsx` into specialized hooks (`useGameState`, `useInputHandler`, `useGameLoop`) and renderers.
- **Scenario Map**: Decomposed `ScenarioMap.tsx` into `MapNode`, `MapLine`, `RoomModal`, and `useMapEngine` hook.
- **User Profile**: Refactored `Profile.tsx` into `XpCard`, `AvatarUpload`, `ProfileForm`, and `useProfileManager` hook.

### ⚡ Performance & Optimization
- **Bundle Splitting**: Configured `manualChunks` in Vite to separate vendor libraries (React, UI, Utils), significantly improving caching.
- **Code Hygiene**: Removed circular dependencies, fixed TypeScript type mismatches, and resolved parsing errors in massive JSX files.
- **Render Pipeline**: Optimized canvas rendering in `GameRenderers.ts` by consolidating state and using `useRef` for high-frequency updates.

### 🐛 Bug Fixes
- Fixed "Expression expected" Vite parsing error in `GameScene.tsx`.
- Corrected import paths for `ScenarioStep` and `Mission` types.
- Fixed variable redeclaration issues in `Renderers.ts`.
- Resolved compatibility issues between Vite 7 and Node 20.11.1 by targeting Vite 6.
