// ──────────────────────────────────────────────────────────────────
// app.js  —  Spolia SPA Router & Application Core
// ──────────────────────────────────────────────────────────────────

// ── Demo Mode: opt-in via ?demo=true URL param (session-scoped)
function isDemoMode() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('demo')) {
            sessionStorage.setItem('spolia_demo', '1');
            const clean = window.location.pathname;
            history.replaceState(null, '', clean);
            return true;
        }
        return sessionStorage.getItem('spolia_demo') === '1';
    } catch {
        return false;
    }
}
const DEMO_MODE = isDemoMode();

import { FirebaseAuth, FirebaseDB, MOCK_USER_PROFILE } from './firebase-config.js';
import { LoginScreen }        from './components/login.js';
import { OnboardingScreen }   from './components/onboarding.js';
import { RadarScreen }        from './components/radar.js';
import { ScannerScreen }      from './components/scanner.js';
import { ImpactScreen }       from './components/impact.js';
import { VendorsScreen }      from './components/vendors.js';
import { ToolsScreen }        from './components/tools.js';
import { ProfileScreen }      from './components/profile.js';
import { MaterialDetailScreen } from './components/material-detail.js';
import { DisputeScreen }      from './components/dispute.js';
import { LogisticsScreen }    from './components/logistics.js';
import { ListingCreateScreen } from './components/listing-create.js';


// ── App State ──────────────────────────────────────────────────────
const App = {
    currentRoute: null,
    previousRoute: null,
    currentUser: null,
    currentUserProfile: null,
    isAuthenticated: false,
    isInitialized: false,
    screenInstances: {},

    routes: {
        // ── Public / Auth routes (no nav bar) ──────────────────────
        login:      { title: 'Sign In',    component: LoginScreen,      public: true, hideNav: true },
        onboarding: { title: 'Onboarding', component: OnboardingScreen, public: true, hideNav: true },
        // ── Protected routes (require auth) ────────────────────────
        radar:             { title: 'The Radar',      component: RadarScreen },
        scanner:           { title: 'AI Scanner',     component: ScannerScreen },
        impact:            { title: 'Impact',          component: ImpactScreen },
        vendors:           { title: 'Vendors',         component: VendorsScreen },
        tools:             { title: 'Site Tools',      component: ToolsScreen },
        profile:           { title: 'Profile',         component: ProfileScreen },
        'material-detail': { title: 'Listing Detail',  component: MaterialDetailScreen },
        dispute:           { title: 'Report Issue',    component: DisputeScreen },
        logistics:         { title: 'Pickup Route',    component: LogisticsScreen },
        'listing-create':  { title: 'Create Listing',  component: ListingCreateScreen }
    }
};


// ── Router ─────────────────────────────────────────────────────────
export function navigate(routeName, params = {}) {
    const route = App.routes[routeName];
    if (!route) {
        console.warn('[Router] Unknown route:', routeName);
        return;
    }

    // Auth guard — redirect to login if not authenticated and route is not public
    if (!route.public && !App.isAuthenticated) {
        // Don't call navigate('login') recursively here — use direct DOM ops
        _activateScreen('login', {});
        return;
    }

    if (routeName === App.currentRoute) return;
    _activateScreen(routeName, params);
}

function _activateScreen(routeName, params = {}) {
    const route = App.routes[routeName];
    if (!route) return;

    const prev = document.querySelector('.screen.active');
    if (prev) {
        prev.classList.remove('active');
        prev.classList.add('slide-out');
        setTimeout(() => prev.classList.remove('slide-out'), 350);
    }

    App.previousRoute = App.currentRoute;
    App.currentRoute = routeName;

    const next = document.getElementById(`screen-${routeName}`);
    if (next) next.classList.add('active');

    // Show/hide nav bar
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.style.display = route.hideNav ? 'none' : '';

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === routeName);
    });

    // Lifecycle hook — pass params
    const instance = App.screenInstances[routeName];
    if (instance?.onActivate) instance.onActivate(params);

    if (route) document.title = `${route.title} — Spolia`;
}


// ── Toast System ──────────────────────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const icons = { success: '✓', error: '✕', info: '✦' };
    toast.innerHTML = `
    <span style="font-size:16px;flex-shrink:0">${icons[type] || '✦'}</span>
    <span style="font:var(--text-body);color:var(--color-text-primary);flex:1">${message}</span>
  `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toast-in 300ms ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Sign Out ──────────────────────────────────────────────────────
export async function signOut() {
    try {
        await FirebaseAuth.signOut();
        App.currentUser = null;
        App.currentUserProfile = null;
        App.isAuthenticated = false;
        // Reset demo mode on sign out
        try { sessionStorage.removeItem('spolia_demo'); } catch (_) {}
        navigate('login');
        showToast('Signed out successfully', 'info');
    } catch (err) {
        console.error('[App] Sign-out error:', err);
        showToast('Sign-out failed. Please try again.', 'error');
    }
}
window.signOut = signOut;

// ── PWA Install Prompt ────────────────────────────────────────────
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) banner.removeAttribute('hidden');
});

window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('install-banner');
    if (banner) banner.setAttribute('hidden', '');
    deferredInstallPrompt = null;
    console.log('[PWA] App installed successfully.');
});

export function triggerInstall() {
    console.log('[PWA] triggerInstall called, deferredInstallPrompt:', deferredInstallPrompt);
    if (!deferredInstallPrompt) {
        window.showToast?.('Open this site in Chrome/Edge on mobile to install', 'info');
        return;
    }
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then((choice) => {
        console.log('[PWA] User choice:', choice.outcome);
        deferredInstallPrompt = null;
        const banner = document.getElementById('install-banner');
        if (banner) banner.setAttribute('hidden', '');
    });
}
window.triggerInstall = triggerInstall;



// ── Service Worker Registration ────────────────────────────────────
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('/service-worker.js');
            console.log('[App] Service worker registered:', reg.scope);
        } catch (err) {
            console.warn('[App] Service worker registration failed:', err);
        }
    }
}

// ── Build Navigation Bar ──────────────────────────────────────────
function buildNav() {
    const navItems = [
        { route: 'radar',   icon: navRadarSVG(),   label: 'Radar' },
        { route: 'scanner', icon: navScannerSVG(), label: 'Scan', fab: true },
        { route: 'impact',  icon: navImpactSVG(),  label: 'Impact' },
        { route: 'vendors', icon: navVendorSVG(),  label: 'Vendors' },
        { route: 'tools',   icon: navToolsSVG(),   label: 'Tools' },
        { route: 'profile', icon: navProfileSVG(), label: 'Profile' }
    ];

    const nav = document.getElementById('bottom-nav');
    nav.innerHTML = navItems.map(item => {
        if (item.fab) {
            return `
        <button class="nav-item nav-item--scanner" data-route="${item.route}" aria-label="AI Scanner">
          <div class="scanner-fab">${item.icon}</div>
          <span class="nav-item__label">${item.label}</span>
        </button>`;
        }
        return `
      <button class="nav-item ${item.route === App.currentRoute ? 'active' : ''}" data-route="${item.route}" aria-label="${item.label}">
        <span class="nav-item__icon">${item.icon}</span>
        <span class="nav-item__label">${item.label}</span>
        <span class="nav-item__dot"></span>
      </button>`;
    }).join('');

    nav.addEventListener('click', (e) => {
        const item = e.target.closest('[data-route]');
        if (item) navigate(item.dataset.route);
    });
}

// ── Auth State Machine ────────────────────────────────────────────
// This is the single source of truth for navigation decisions.
// It fires once on page load and again whenever auth state changes.
function setupAuthStateListener() {
    FirebaseAuth.onAuthStateChanged(async (user) => {
        if (!user) {
            // Not signed in — show login
            App.currentUser = null;
            App.currentUserProfile = null;
            App.isAuthenticated = false;
            _activateScreen('login', {});
            return;
        }

        // User is signed in
        App.currentUser = user;
        App.isAuthenticated = true;

        // Demo mode bypasses profile check — go straight to radar
        if (DEMO_MODE) {
            App.currentUserProfile = MOCK_USER_PROFILE;
            _activateScreen('radar', {});
            return;
        }

        // Silently upsert the basic auth profile (displayName, email, photoURL)
        try {
            await FirebaseDB.upsertUserProfile(user.uid, {
                displayName: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || null,
                phoneNumber: user.phoneNumber || null
            });
        } catch (_) { /* non-critical */ }

        // Determine where to route based on onboarding completion
        try {
            const profile = await FirebaseDB.getUserProfile(user.uid);
            App.currentUserProfile = profile;

            if (!profile || !profile.onboardingComplete) {
                // New user or incomplete onboarding — collect role & credentials
                _activateScreen('onboarding', {});
            } else {
                // Fully onboarded — go to the app
                _activateScreen('radar', {});
            }
        } catch (err) {
            console.warn('[App] Profile fetch failed — routing to radar anyway:', err);
            _activateScreen('radar', {});
        }
    });
}

// ── Initialize App ────────────────────────────────────────────────
async function init() {
    await registerServiceWorker();
    FirebaseDB.initPlatformStats().catch(() => {});

    // Build all screens into the DOM (hidden initially)
    const appEl = document.getElementById('app');
    Object.keys(App.routes).forEach(route => {
        const screen = document.createElement('div');
        screen.id = `screen-${route}`;
        screen.className = 'screen'; // none are active yet — auth state decides
        appEl.appendChild(screen);
        const ComponentClass = App.routes[route].component;
        const instance = new ComponentClass(screen);
        App.screenInstances[route] = instance;
        instance.render();
    });

    buildNav();
    // Initially hide the nav until we know auth state
    document.getElementById('bottom-nav').style.display = 'none';

    // Wire the PWA install banner buttons
    // (must be in init() not DOMContentLoaded because app.js is dynamically imported)
    document.getElementById('install-btn')?.addEventListener('click', triggerInstall);
    document.getElementById('install-dismiss')?.addEventListener('click', () => {
        document.getElementById('install-banner')?.setAttribute('hidden', '');
    });

    window.navigate = navigate;
    window.showToast = showToast;
    window.App = App;

    // STEP 1: Consume any pending redirect result from Google Sign-In.
    // This MUST happen before the auth state listener fires.
    // If signInWithRedirect was used on a previous page load, this resolves it.
    await FirebaseAuth.handleRedirectResult();

    // STEP 2: Set up the auth state listener — this is the router's single
    // source of truth. It fires immediately with the current user (or null).
    setupAuthStateListener();

    App.isInitialized = true;
}

// ── SVG Icons ─────────────────────────────────────────────────────
function navRadarSVG()   { return `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6a6 6 0 1 0 6 6"/></svg>`; }
function navScannerSVG() { return `<svg viewBox="0 0 24 24" stroke="#0D0D0D"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>`; }
function navImpactSVG()  { return `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10"/><path d="m12 12 8-4"/><path d="M12 12V2"/></svg>`; }
function navVendorSVG()  { return `<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`; }
function navToolsSVG()   { return `<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`; }
function navProfileSVG() { return `<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; }


// ── Boot ───────────────────────────────────────────────────────────
init();
