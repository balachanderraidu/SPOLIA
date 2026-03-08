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
import { RadarScreen } from './components/radar.js';
import { ScannerScreen } from './components/scanner.js';
import { ImpactScreen } from './components/impact.js';
import { VendorsScreen } from './components/vendors.js';
import { ToolsScreen } from './components/tools.js';
import { ProfileScreen } from './components/profile.js';
import { MaterialDetailScreen } from './components/material-detail.js';
import { DisputeScreen } from './components/dispute.js';
import { LogisticsScreen } from './components/logistics.js';
import { LoginScreen } from './components/login.js';
import { OnboardingScreen } from './components/onboarding.js';
import { ListingCreateScreen } from './components/listing-create.js';


// ── App State ──────────────────────────────────────────────────────
const App = {
    currentRoute: 'login',
    previousRoute: null,
    currentUser: null,
    currentUserProfile: null,   // Firestore profile doc
    isAuthenticated: false,
    screenInstances: {},

    routes: {
        // Auth screens (no nav bar)
        login:      { title: 'Welcome to Spolia', component: LoginScreen,      public: true, hideNav: true },
        onboarding: { title: 'Verification',      component: OnboardingScreen, public: true, hideNav: true },

        // Main app screens
        radar:   { title: 'The Radar',    component: RadarScreen },
        scanner: { title: 'AI Scanner',   component: ScannerScreen },
        impact:  { title: 'Impact',       component: ImpactScreen },
        vendors: { title: 'Vendors',      component: VendorsScreen },
        tools:   { title: 'Site Tools',   component: ToolsScreen },
        profile: { title: 'Profile',      component: ProfileScreen },

        // Detail / action screens (no nav tab)
        'material-detail': { title: 'Listing Detail', component: MaterialDetailScreen },
        dispute:           { title: 'Report Issue',   component: DisputeScreen },
        logistics:         { title: 'Pickup Route',   component: LogisticsScreen },
        'listing-create':  { title: 'Create Listing', component: ListingCreateScreen }
    }
};


// ── Router ─────────────────────────────────────────────────────────
export function navigate(routeName, params = {}) {
    const route = App.routes[routeName];
    if (!route) {
        console.warn('[Router] Unknown route:', routeName);
        return;
    }

    // Auth guard
    if (!route.public && !App.isAuthenticated) {
        console.log('[Router] Not authenticated — redirecting to login');
        navigate('login');
        return;
    }

    if (routeName === App.currentRoute) return;

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
    if (!deferredInstallPrompt) return;
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

// ── After sign-in: check onboarding status ────────────────────────
async function handleAuthenticatedUser(user) {
    App.currentUser = user;
    App.isAuthenticated = true;

    // Upsert the Firestore user doc (non-destructive)
    await FirebaseDB.upsertUserProfile(user.uid, {
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || null
    });

    // Fetch the profile to check onboarding status
    const profile = await FirebaseDB.getUserProfile(user.uid);
    App.currentUserProfile = profile;

    const currentRouteConfig = App.routes[App.currentRoute];
    if (!currentRouteConfig?.public) return; // already on a protected route

    if (!profile || profile.onboardingComplete === false && !profile.role) {
        // Brand-new account — never submitted verification yet
        navigate('onboarding');
    } else if (profile.verificationStatus === 'pending') {
        // Already applied but pending review — go to radar in demo-like mode with toast
        navigate('radar');
        showToast(`Welcome back, ${user.displayName?.split(' ')[0] || 'back'}! ✦ Your verification is under review.`, 'info', 5000);
    } else {
        // Verified or returning user
        navigate('radar');
        showToast(`Welcome back, ${user.displayName?.split(' ')[0] || 'back'}! ✦`, 'success', 3000);
    }
}

// ── Initialize App ────────────────────────────────────────────────
async function init() {
    await registerServiceWorker();
    // Seed Firestore platformStats/global if it doesn't exist yet (no-op if it does)
    FirebaseDB.initPlatformStats().catch(() => {});

    // Build all screens into the DOM
    const appEl = document.getElementById('app');
    const routeKeys = Object.keys(App.routes);

    routeKeys.forEach(route => {
        const screen = document.createElement('div');
        screen.id = `screen-${route}`;
        screen.className = `screen ${route === 'login' ? 'active' : ''}`;
        appEl.appendChild(screen);

        const ComponentClass = App.routes[route].component;
        const instance = new ComponentClass(screen);
        App.screenInstances[route] = instance;
        instance.render();
    });

    buildNav();

    // Register globals
    window.navigate = navigate;
    window.showToast = showToast;
    window.App = App;

    document.title = 'Welcome to Spolia';

    // Hide nav immediately — we always start on login.
    document.getElementById('bottom-nav').style.display = 'none';
    App.currentRoute = null;

    // ── Auth State Listener ──────────────────────────────────────
    if (DEMO_MODE) {
        App.currentUser = MOCK_USER_PROFILE;
        App.currentUserProfile = MOCK_USER_PROFILE;
        App.isAuthenticated = true;
        navigate('radar');
        const demoBadge = document.createElement('div');
        demoBadge.style.cssText = `
            position:fixed;top:env(safe-area-inset-top,8px);right:12px;
            background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.3);
            color:#FFD700;font:600 10px/1 Inter,sans-serif;
            letter-spacing:0.08em;text-transform:uppercase;
            padding:4px 8px;border-radius:100px;z-index:999;
            pointer-events:none;
        `;
        demoBadge.textContent = 'Demo Mode';
        document.body.appendChild(demoBadge);
    } else {
        // Handle result from signInWithRedirect (Google returns the user here after auth)
        try {
            const result = await FirebaseAuth.getRedirectResult();
            if (result?.user) {
                console.log('[Auth] Redirect sign-in successful:', result.user.displayName);
            }
        } catch (err) {
            console.error('[Auth] Redirect result error:', err);
        }

        FirebaseAuth.onAuthStateChanged(async (user) => {
            if (user) {
                await handleAuthenticatedUser(user);
            } else {
                App.currentUser = null;
                App.currentUserProfile = null;
                App.isAuthenticated = false;
                const current = App.routes[App.currentRoute];
                if (!current?.public) navigate('login');
            }
        });
    }
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
