// components/profile.js — User Profile (Stitch-designed + Live Firebase)
import { FirebaseAuth, FirebaseDB, MOCK_USER_PROFILE } from '../firebase-config.js';

const ROLE_MAP = {
    architect:  { label: 'ARCHITECT',         icon: '🏛️', color: '#4B9FD4' },
    designer:   { label: 'INT. DESIGNER',     icon: '🎨', color: '#9B59B6' },
    contractor: { label: 'CONTRACTOR',        icon: '🏗️', color: '#E67E22' },
    vendor:     { label: 'VENDOR',            icon: '🏪', color: '#27AE60' },
};

export class ProfileScreen {
    constructor(el) {
        this.el = el;
        this.user = null;
        this.profile = null;
        this.listings = [];
        this._unsubscribe = null;
    }

    render(profile = null) {
        const u = profile || this.profile || MOCK_USER_PROFILE;
        const auth = this.user;
        const roleInfo = ROLE_MAP[u.role] || null;
        const photoURL = auth?.photoURL || u.photoURL || null;
        const displayName = auth?.displayName || u.displayName || 'Professional';
        const entity = u.entity || u.email || '';
        const wallet = u.wallet || { balance: 0, currency: '₹', pendingBonds: 0 };
        const impact = u.impact || { co2Saved: 0, transactions: 0, weightRescued: 0 };
        const isVerified = u.verified === true;
        const isPending = u.verificationStatus === 'pending' || (u.role && !isVerified);

        this.el.innerHTML = `
      <!-- Scrollable profile -->
      <div style="min-height:100%;background:#0D0D0D;padding-bottom:100px;overflow-y:auto">

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:max(env(safe-area-inset-top),16px) 20px 12px">
          <h1 style="font:700 22px/1 'Playfair Display',Georgia,serif;color:#FFD700">Profile</h1>
          <button id="settings-btn" aria-label="Settings"
            style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
              display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>

        <!-- Avatar + identity -->
        <div style="text-align:center;padding:8px 20px 24px">
          <!-- Avatar -->
          <div style="width:88px;height:88px;border-radius:50%;border:2.5px solid #FFD700;
            margin:0 auto 14px;overflow:hidden;background:#1A1A1A;
            display:flex;align-items:center;justify-content:center;position:relative">
            ${photoURL
              ? `<img src="${photoURL}" style="width:100%;height:100%;object-fit:cover" alt="${displayName}">`
              : `<span style="font-size:36px">👤</span>`}
          </div>

          <h2 style="font:700 22px/1.2 Inter,sans-serif;color:#F5F0E8;margin:0 0 4px">${displayName}</h2>
          ${entity ? `<div style="font:400 13px/1 Inter,sans-serif;color:#5C5647;margin-bottom:14px">${entity}</div>` : '<div style="margin-bottom:14px"></div>'}

          <!-- Badges row -->
          <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:12px">
            ${isVerified
              ? `<span style="background:rgba(76,175,130,0.15);color:#4CAF82;border:1px solid rgba(76,175,130,0.3);
                  font:600 10px/1 Inter,sans-serif;padding:5px 10px;border-radius:999px;letter-spacing:0.08em">✓ VERIFIED</span>`
              : isPending
              ? `<span style="background:rgba(245,166,35,0.12);color:#F5A623;border:1px solid rgba(245,166,35,0.3);
                  font:600 10px/1 Inter,sans-serif;padding:5px 10px;border-radius:999px;letter-spacing:0.08em">⏳ PENDING REVIEW</span>`
              : ''}
            ${roleInfo ? `<span style="background:rgba(75,159,212,0.12);color:${roleInfo.color};border:1px solid rgba(75,159,212,0.25);
                font:600 10px/1 Inter,sans-serif;padding:5px 10px;border-radius:999px;letter-spacing:0.08em">${roleInfo.icon} ${roleInfo.label}</span>` : ''}
            ${u.credentialNumber ? `<span style="background:rgba(255,215,0,0.08);color:#FFD700;border:1px solid rgba(255,215,0,0.2);
                font:600 10px/1 Inter,sans-serif;padding:5px 10px;border-radius:999px;letter-spacing:0.04em">${u.credentialNumber}</span>` : ''}
          </div>

          <!-- Bond rating -->
          ${u.bondRating ? `
            <div style="display:flex;align-items:center;justify-content:center;gap:4px">
              <span style="color:#FFD700;font-size:13px">★★★★${u.bondRating >= 5 ? '★' : '☆'}</span>
              <span style="font:400 12px/1 Inter,sans-serif;color:#5C5647">${u.bondRating} Bond Rating</span>
            </div>` : ''}
        </div>

        <!-- Wallet Card -->
        <div style="margin:0 16px 14px">
          <div style="background:linear-gradient(135deg,#1A1500 0%,#1A1A0A 100%);
            border:1px solid rgba(255,215,0,0.2);border-radius:20px;padding:20px 20px;
            display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font:500 11px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">Spolia Wallet</div>
              <div style="font:700 28px/1 Inter,sans-serif;color:#FFD700;margin-bottom:6px">${wallet.currency}${(wallet.balance || 0).toLocaleString('en-IN')}</div>
              <div style="font:400 12px/1 Inter,sans-serif;color:#5C5647">${wallet.pendingBonds || 0} Active Bond${wallet.pendingBonds !== 1 ? 's' : ''} in escrow</div>
            </div>
            <button id="withdraw-btn"
              style="height:38px;padding:0 18px;border-radius:10px;border:1.5px solid #2A2A2A;
                background:transparent;color:#F5F0E8;font:600 12px/1 Inter,sans-serif;cursor:pointer">
              Withdraw
            </button>
          </div>
        </div>

        <!-- Impact Card -->
        <div style="margin:0 16px 20px;background:rgba(76,175,130,0.07);
          border:1px solid rgba(76,175,130,0.18);border-radius:20px;padding:18px 20px">
          <div style="font:600 11px/1 Inter,sans-serif;color:#4CAF82;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px">🌱 Your Impact</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
            ${[
                { label: 'CO₂ Saved',   value: `${((impact.co2Saved || 0)/1000).toFixed(1)}T`,  color: '#4CAF82' },
                { label: 'Transactions', value: `${impact.transactions || 0}`,                   color: '#4CAF82' },
                { label: 'Diverted',    value: `${((impact.weightRescued || 0)/1000).toFixed(2)}T`, color: '#4CAF82' },
            ].map(s => `
              <div>
                <div style="font:700 20px/1 Inter,sans-serif;color:${s.color};margin-bottom:4px">${s.value}</div>
                <div style="font:400 10px/1.3 Inter,sans-serif;color:#5C5647">${s.label}</div>
              </div>`).join('')}
          </div>
        </div>

        <!-- My Listings -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:0 20px;margin-bottom:12px">
          <span style="font:600 14px/1 Inter,sans-serif;color:#F5F0E8">My Listings</span>
          <span id="view-all-btn" style="font:400 12px/1 Inter,sans-serif;color:#FFD700;cursor:pointer">View All</span>
        </div>
        <div id="listings-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:0 16px;margin-bottom:24px">
          ${this._renderListings()}
        </div>

        <!-- Verification pending notice -->
        ${isPending && !isVerified ? `
          <div style="margin:0 16px 20px;background:rgba(245,166,35,0.07);border:1px solid rgba(245,166,35,0.2);
            border-radius:16px;padding:16px 18px">
            <div style="font:600 12px/1 Inter,sans-serif;color:#F5A623;margin-bottom:6px">⏳ Verification Under Review</div>
            <div style="font:400 12px/1.5 Inter,sans-serif;color:#5C5647">Your application is being reviewed. Expect approval within 24 hours.</div>
          </div>` : ''}

        <!-- Account Settings -->
        <div style="padding:0 20px;margin-bottom:12px">
          <span style="font:600 14px/1 Inter,sans-serif;color:#F5F0E8">Account</span>
        </div>
        <div style="margin:0 16px;background:#1A1A1A;border:1px solid #2A2A2A;border-radius:20px;overflow:hidden;margin-bottom:32px">
          ${[
              { id: 'docs-btn',    icon: '📄', label: 'Verification Documents' },
              { id: 'notifs-btn',  icon: '🔔', label: 'Notification Preferences' },
              { id: 'refer-btn',   icon: '👥', label: 'Refer a Colleague' },
          ].map((item, i) => `
            <button id="${item.id}" style="width:100%;display:flex;align-items:center;gap:14px;
              padding:16px 18px;background:none;border:none;border-bottom:1px solid #222;
              color:#F5F0E8;text-align:left;cursor:pointer;font:400 14px/1 Inter,sans-serif;
              font-family:Inter,sans-serif">
              <span style="font-size:18px;width:24px;text-align:center">${item.icon}</span>
              <span style="flex:1">${item.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>`).join('')}
          <button id="signout-btn" style="width:100%;display:flex;align-items:center;gap:14px;
            padding:16px 18px;background:none;border:none;
            color:#E05C5C;text-align:left;cursor:pointer;font:400 14px/1 Inter,sans-serif;
            font-family:Inter,sans-serif">
            <span style="font-size:18px;width:24px;text-align:center">🚪</span>
            <span style="flex:1">Sign Out</span>
          </button>
        </div>
      </div>
    `;

        this._bindActions();
    }

    _renderListings() {
        if (this.listings.length === 0) {
            return `
          <div style="grid-column:1/-1;padding:24px;text-align:center;border:1px dashed #2A2A2A;
            border-radius:16px;display:flex;flex-direction:column;align-items:center;gap:10px">
            <span style="font-size:32px">📦</span>
            <span style="font:400 12px/1.4 Inter,sans-serif;color:#5C5647">No active listings yet</span>
            <button onclick="window.navigate?.('scanner')"
              style="height:34px;padding:0 16px;border-radius:8px;border:1.5px solid #2A2A2A;
                background:transparent;color:#FFD700;font:600 11px/1 Inter,sans-serif;cursor:pointer">
              + Scan & List
            </button>
          </div>`;
        }

        const EMOJI = { stone:'🪨', marble:'🪨', steel:'⚙️', wood:'🪵', brick:'🧱', other:'📦', bulk:'📦', plumbing:'🔧', cement:'🏗️' };
        return this.listings.slice(0, 4).map(l => `
          <div onclick="window.navigate?.('material-detail',{listingId:'${l.id}'})"
            style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;overflow:hidden;cursor:pointer">
            <div style="height:96px;background:#111;display:flex;align-items:center;justify-content:center;font-size:36px">
              ${l.imageUrls?.[0]
                ? `<img src="${l.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="${l.title}">`
                : (EMOJI[l.type] || '📦')}
            </div>
            <div style="padding:10px 12px">
              <div style="font:600 12px/1.3 Inter,sans-serif;color:#F5F0E8;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.title}</div>
              <div style="font:700 13px/1 Inter,sans-serif;color:#FFD700">${l.currency || '₹'}${(l.price || 0).toLocaleString('en-IN')}/${l.unit}</div>
              <div style="margin-top:6px">
                <span style="background:rgba(76,175,130,0.15);color:#4CAF82;border:1px solid rgba(76,175,130,0.25);
                  font:600 9px/1 Inter,sans-serif;padding:3px 7px;border-radius:999px;letter-spacing:0.06em">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>`).join('');
    }

    _bindActions() {
        this.el.querySelector('#withdraw-btn')?.addEventListener('click', () =>
            window.showToast?.('Withdrawal coming soon', 'info'));

        this.el.querySelector('#view-all-btn')?.addEventListener('click', () =>
            window.showToast?.('Full listings view coming soon', 'info'));

        this.el.querySelector('#docs-btn')?.addEventListener('click', () =>
            window.showToast?.('Document vault coming soon', 'info'));

        this.el.querySelector('#notifs-btn')?.addEventListener('click', () =>
            window.showToast?.('Notification preferences coming soon', 'info'));

        this.el.querySelector('#refer-btn')?.addEventListener('click', () => {
            const url = `${window.location.origin}?ref=${this.profile?.uid || ''}`;
            navigator.clipboard?.writeText(url)
                .then(() => window.showToast?.('Referral link copied!', 'success'))
                .catch(() => window.showToast?.('Referral link copied!', 'info'));
        });

        this.el.querySelector('#settings-btn')?.addEventListener('click', () =>
            window.showToast?.('App settings coming soon', 'info'));

        this.el.querySelector('#signout-btn')?.addEventListener('click', async () => {
            if (confirm('Sign out of Spolia?')) {
                if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
                // window.signOut() is defined in app.js — it signs out AND redirects to login
                await window.signOut?.();
            }
        });
    }

    async onActivate() {
        this.user = FirebaseAuth.getCurrentUser?.() || window.App?.currentUser;

        // Use cached global profile or fetch fresh
        const globalProfile = window.App?.currentUserProfile;
        if (globalProfile && globalProfile.uid) {
            this.profile = globalProfile;
        } else if (this.user?.uid) {
            this.profile = await FirebaseDB.getUserProfile(this.user.uid).catch(() => null);
        }

        // Fetch user's listings
        if (this.user?.uid) {
            this.listings = await FirebaseDB.getMyListings(this.user.uid).catch(() => []);
        }

        // Render with current data
        this.render(this.profile);

        // Subscribe to real-time profile changes
        if (this._unsubscribe) this._unsubscribe();
        if (this.user?.uid) {
            this._unsubscribe = FirebaseDB.listenToUserProfile(this.user.uid, (live) => {
                if (live) {
                    this.profile = live;
                    if (window.App) window.App.currentUserProfile = live;
                    this.render(live);
                }
            });
        }
    }
}
