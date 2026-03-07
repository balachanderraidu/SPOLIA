// components/profile.js — User Profile & Wallet (Live Firebase Data)
import { FirebaseAuth, FirebaseDB, MOCK_USER_PROFILE } from '../firebase-config.js';

const ROLE_BADGE_MAP = {
    architect:  { label: 'ARCHITECT',         icon: '🏛' },
    designer:   { label: 'INT. DESIGNER',     icon: '🎨' },
    contractor: { label: 'CONTRACTOR',        icon: '🏗' },
    vendor:     { label: 'MATERIAL VENDOR',   icon: '🏪' },
};

export class ProfileScreen {
    constructor(el) {
        this.el = el;
        this.user = null;       // Firebase Auth user
        this.profile = null;    // Firestore profile doc
        this.listings = [];
        this._unsubscribe = null;
    }

    render(profile = null) {
        const u = profile || this.profile || MOCK_USER_PROFILE;
        const roleInfo = ROLE_BADGE_MAP[u.role] || null;
        const photoURL = this.user?.photoURL || null;
        const displayName = u.displayName || this.user?.displayName || 'Professional';
        const entity = u.entity || u.email || '';

        this.el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">Profile</h1>
        <div class="page-header__actions">
          <button class="icon-btn" id="settings-btn" aria-label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </header>

      <!-- User Hero -->
      <div class="user-hero">
        ${photoURL
            ? `<img src="${photoURL}" class="user-hero__avatar" alt="${displayName}" style="border-radius:50%;object-fit:cover">`
            : `<div class="user-hero__avatar">👤</div>`}
        <h2 class="user-hero__name">${displayName}</h2>
        ${entity ? `<div class="user-hero__entity">${entity}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap">
          ${u.verified ? `<span class="badge badge--verified">✓ VERIFIED</span>` : `<span class="badge" style="background:rgba(245,166,35,0.15);color:var(--color-amber);border:1px solid rgba(245,166,35,0.3)">⏳ PENDING</span>`}
          ${roleInfo ? `<span class="badge badge--type">${roleInfo.icon} ${roleInfo.label}</span>` : ''}
          ${u.credentialNumber ? `<span class="badge badge--bond" style="font-size:10px">${u.credentialNumber}</span>` : ''}
        </div>
        ${u.bondRating ? `
          <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:8px">
            ${'⭐'.repeat(Math.floor(u.bondRating))}
            <span style="font:var(--text-caption);color:var(--color-text-secondary);margin-left:4px">${u.bondRating} Bond Rating</span>
          </div>` : ''}
      </div>

      <!-- Wallet Card -->
      <div style="padding:var(--space-md)">
        <div class="wallet-card">
          <div>
            <div class="wallet-card__label">Spolia Wallet</div>
            <div class="wallet-card__value">${(u.wallet?.currency || '₹')}${(u.wallet?.balance || 0).toLocaleString('en-IN')}</div>
            <div class="wallet-card__sub">${u.wallet?.pendingBonds || 0} Active Bond${u.wallet?.pendingBonds !== 1 ? 's' : ''} in escrow</div>
          </div>
          <button class="btn btn--outline" style="width:auto;height:36px;padding:0 16px;font-size:12px" id="withdraw-btn">
            Withdraw
          </button>
        </div>
      </div>

      <!-- Impact Mini Card -->
      <div style="margin:0 var(--space-md) var(--space-md);background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);border-radius:var(--radius-card);padding:var(--space-md)">
        <div style="font:var(--text-label);color:var(--color-green);letter-spacing:0.06em;margin-bottom:12px">🌱 YOUR IMPACT</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${((u.impact?.co2Saved || 0) / 1000).toFixed(1)}T</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">CO₂ Saved</div>
          </div>
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${u.impact?.transactions || 0}</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">Transactions</div>
          </div>
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${((u.impact?.weightRescued || 0) / 1000).toFixed(2)}T</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">Diverted</div>
          </div>
        </div>
      </div>

      <!-- My Listings -->
      <div class="section-header">
        <h2 class="section-header__title">My Listings</h2>
        <span class="section-header__action" id="view-all-listings">View All</span>
      </div>

      <div id="my-listings-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 var(--space-md) var(--space-md)">
        ${this._renderListingCards()}
      </div>

      <!-- Verification Status (if pending) -->
      ${u.verificationStatus === 'pending' ? `
        <div style="margin:0 var(--space-md) var(--space-md);background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.25);border-radius:var(--radius-card);padding:var(--space-md)">
          <div style="font:600 13px/1 Inter,sans-serif;color:var(--color-amber);margin-bottom:6px">⏳ Verification Under Review</div>
          <div style="font:var(--text-caption);color:var(--color-text-muted);line-height:1.5">Your application is being reviewed by our team. Expect a response within 24 hours.</div>
        </div>` : ''}

      <!-- Settings List -->
      <div class="section-header">
        <h2 class="section-header__title">Account</h2>
      </div>

      <div style="margin:0 var(--space-md) var(--space-xl);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden">
        ${[
            { id: 'documents-btn', icon: '📄', label: 'Verification Documents' },
            { id: 'notifs-btn',    icon: '🔔', label: 'Notification Preferences' },
            { id: 'referral-btn',  icon: '👥', label: 'Refer a Colleague' },
        ].map((item, i, arr) => `
          <button id="${item.id}" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;
            background:none;border:none;${i < arr.length - 1 ? 'border-bottom:1px solid var(--color-border);' : ''}
            color:var(--color-text-primary);text-align:left;cursor:pointer;font:var(--text-body);font-family:var(--font-body)">
            <span style="font-size:18px;width:24px">${item.icon}</span>
            <span style="flex:1">${item.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>`).join('')}
        <button id="signout-btn" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;
          background:none;border:none;border-top:1px solid var(--color-border);
          color:var(--color-red);text-align:left;cursor:pointer;font:var(--text-body);font-family:var(--font-body)">
          <span style="font-size:18px;width:24px">🚪</span>
          <span>Sign Out</span>
        </button>
      </div>
    `;

        this._bindActions();
    }

    _renderListingCards() {
        if (this.listings.length === 0) {
            return `
          <div style="grid-column:1/-1;padding:24px;text-align:center;color:var(--color-text-muted)">
            <div style="font-size:32px;margin-bottom:8px">📦</div>
            <div style="font:var(--text-caption)">No listings yet</div>
            <button class="btn btn--outline" style="height:36px;font-size:12px;margin-top:12px"
              onclick="window.navigate('scanner')">
              + Create a Listing
            </button>
          </div>`;
        }

        const EMOJIS = { stone: '🪨', marble: '🏛️', steel: '⚙️', wood: '🪵', brick: '🧱', other: '📦', bulk: '📦' };
        const statusMap = { active: { label: 'Active', cls: 'badge--ai' }, pending: { label: 'Pending', cls: 'badge--amber' }, sold: { label: 'Sold', cls: 'badge--verified' } };

        return this.listings.slice(0, 4).map(l => {
            const st = statusMap[l.status] || statusMap.pending;
            return `
          <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden;cursor:pointer"
            onclick="window.navigate('material-detail',{listingId:'${l.id}'})">
            <div style="height:100px;background:var(--color-bg-elevated);display:flex;align-items:center;justify-content:center;font-size:36px">
              ${l.imageUrls?.[0] ? `<img src="${l.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="${l.title}">` : (EMOJIS[l.type] || '📦')}
            </div>
            <div style="padding:10px">
              <div style="font:var(--text-caption);color:var(--color-text-primary);font-weight:500;margin-bottom:4px">${l.title}</div>
              <div style="font:var(--text-caption);color:var(--color-gold)">${l.currency || '₹'}${(l.price || 0).toLocaleString('en-IN')}/${l.unit}</div>
              <div style="margin-top:6px"><span class="badge ${st.cls}" style="font-size:9px">${st.label}</span></div>
            </div>
          </div>`;
        }).join('');
    }

    _bindActions() {
        this.el.querySelector('#withdraw-btn')?.addEventListener('click', () =>
            window.showToast?.('Withdrawal feature coming soon', 'info'));

        this.el.querySelector('#view-all-listings')?.addEventListener('click', () =>
            window.showToast?.('Full listings view coming soon', 'info'));

        this.el.querySelector('#documents-btn')?.addEventListener('click', () =>
            window.showToast?.('Document vault coming soon', 'info'));

        this.el.querySelector('#notifs-btn')?.addEventListener('click', () =>
            window.showToast?.('Notification preferences coming soon', 'info'));

        this.el.querySelector('#referral-btn')?.addEventListener('click', () => {
            const url = `${window.location.origin}?ref=${this.profile?.uid || ''}`;
            navigator.clipboard?.writeText(url).then(() =>
                window.showToast?.('Referral link copied!', 'success'));
        });

        this.el.querySelector('#signout-btn')?.addEventListener('click', () => {
            if (confirm('Sign out of Spolia?')) {
                FirebaseAuth.signOut().then(() => window.showToast?.('Signed out', 'info'));
            }
        });
    }

    async onActivate() {
        this.user = FirebaseAuth.getCurrentUser?.() || window.App?.currentUser;

        // Use globally cached profile if available (set by app.js auth listener)
        const globalProfile = window.App?.currentUserProfile;
        if (globalProfile) {
            this.profile = globalProfile;
        } else if (this.user?.uid) {
            this.profile = await FirebaseDB.getUserProfile(this.user.uid);
        }

        // Fetch user's listings
        if (this.user?.uid) {
            try {
                this.listings = await FirebaseDB.getMyListings(this.user.uid);
            } catch (e) {
                console.warn('[Profile] getMyListings error:', e);
                this.listings = [];
            }
        }

        // Re-render with live data
        this.render(this.profile);

        // Subscribe to real-time profile updates
        if (this._unsubscribe) this._unsubscribe();
        if (this.user?.uid) {
            this._unsubscribe = FirebaseDB.listenToUserProfile(this.user.uid, (liveProfile) => {
                if (liveProfile) {
                    this.profile = liveProfile;
                    window.App && (window.App.currentUserProfile = liveProfile);
                    this.render(liveProfile);
                }
            });
        }
    }
}
