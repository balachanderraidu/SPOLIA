# Spolia Codebase Audit Report

## 🔴 High Priority: Security Vulnerabilities & Critical Issues

**1. Exposed Hardcoded Credentials**
Multiple API keys and sensitive identifiers are currently hardcoded directly into the client-side source files. These must be moved to secure environment variables and handled server-side (or securely injected at build time with proper origin restrictions).
- `firebase-config.js`: Contains `apiKey`, `authDomain`, `projectId`, `storageBucket`, etc., in plain text.
- `utils/gemini.js`: Contains `GEMINI_API_KEY` in plain text.
- `utils/maps.js`: Contains `MAPS_API_KEY` in plain text.

**2. Insecure Demo Mode & Authentication Bypass**
- `app.js` implements a `DEMO_MODE` that bypasses authentication based on a `localStorage` flag. This logic allows unauthenticated users to access protected routes if they simply set the `spolia_demo_start` key. Auth state should only be dictated by Firebase.
- The `MOCK_USER_PROFILE` assigns sensitive roles (`role: "architect"`, `verified: true`) without server validation, risking privilege escalation in development/testing environments that mistakenly deploy to production.

## 🟠 Medium Priority: Architecture & Code Practices

**1. Heavy Use of Inline HTML/CSS in JavaScript Components**
- Components like `components/radar.js`, `components/scanner.js`, and `components/login.js` rely extensively on massive template literals stringified with inline CSS.
- *Impact:* This makes the code extremely difficult to maintain, prone to XSS if user data isn't escaped correctly (e.g., in `listing.title`), breaks syntax highlighting, and prevents effective CSS caching.
- *Recommendation:* Adopt a proper templating engine, component library (e.g., React, Vue, Lit), or separate HTML/CSS files using Shadow DOM/Web Components.

**2. Global App State & Tight Coupling**
- The application relies on a single global `window.App` object and directly mutates the DOM via `document.getElementById()`.
- Router logic is mixed with component lifecycle hooks and auth state listeners within `app.js`.
- *Recommendation:* Implement a centralized state management solution and a decoupled router.

**3. Poor Error Handling & Fallbacks**
- Functions like `getListing` and `listenToRadar` in `firebase-config.js` silently swallow errors (using `console.warn`) and immediately fall back to returning `MOCK_LISTINGS`. This masks underlying network or database failures in production.
- *Recommendation:* Implement robust error boundaries, structured logging, and meaningful UI error states rather than silently showing mock data.

## 🟡 Low Priority: Technical Debt & Missing Features

**1. Missing Testing Infrastructure**
- There are no unit, integration, or end-to-end tests present in the codebase. Given the platform handles financial logic (e.g., bonds, wallets, pricing estimators), the lack of testing poses a severe risk of regressions.
- *Recommendation:* Introduce a testing framework (e.g., Jest/Vitest for unit tests, Playwright for E2E).

**2. Incomplete Offline Sync Implementation**
- The `service-worker.js` defines sync events for `sync-bonds` and `sync-disputes` but the functions (`syncPendingBonds`, `syncPendingDisputes`) are completely empty placeholders (`TODO: Read from IndexedDB and push to Firestore`).
- *Recommendation:* Fully implement IndexedDB storage and background sync, or remove the placeholders until the feature is actively developed.

**3. Stubs and Missing API Integrations**
- `utils/maps.js` contains stubs for `loadMap` and `getRoute`, simply returning mock strings or HTML snippets instead of actually integrating the Google Maps SDK.
- *Recommendation:* Implement the actual SDK logic or properly mark the module as a mock for development only.

**4. Magic Numbers and Hardcoded Configurations**
- Tools like `components/tools.js` (Logistics Estimator) have hardcoded pricing logic (`₹180` for bike, `₹500` for pickup). This pricing data should be fetched from a dynamic backend service to reflect real-world changes.
- `utils/gemini.js` hardcodes CO2 conversion factors. These should also ideally be configurable remotely.