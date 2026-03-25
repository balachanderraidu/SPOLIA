// components/profile.js — User Profile (Stitch-designed + Live Firebase)
import { FirebaseAuth, FirebaseDB, MOCK_BONDS, MOCK_LISTINGS } from '../firebase-config.js';

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

    _renderSkeleton() {
        this.el.innerHTML = `
      <div style="min-height:100%;background:#0D0D0D;padding-bottom:100px">
        <div style="display:flex;align-items:center;justify-content:space-between;
          padding:max(env(safe-area-inset-top),16px) 20px 12px">
          <h1 style="font:700 22px/1 'Playfair Display',Georgia,serif;color:#FFD700">Profile</h1>
        </div>
        <div style="text-align:center;padding:40px 20px">
          <div style="width:88px;height:88px;border-radius:50%;background:#1A1A1A;
            margin:0 auto 16px;animation:skeleton-pulse 1.5s ease infinite"></div>
          <div style="height:18px;width:140px;background:#1A1A1A;border-radius:8px;
            margin:0 auto 10px;animation:skeleton-pulse 1.5s ease infinite"></div>
          <div style="height:13px;width:100px;background:#1A1A1A;border-radius:6px;
            margin:0 auto;animation:skeleton-pulse 1.5s ease infinite"></div>
        </div>
        <style>
          @keyframes skeleton-pulse {
            0%,100%{opacity:0.4} 50%{opacity:0.8}
          }
        </style>
      </div>`;
    }

    render(profile = null) {
        const u = profile || this.profile;
        // If we still have no real profile data, show skeleton and wait for onActivate
        if (!u) { this._renderSkeleton(); return; }

        const auth = this.user;
        const roleInfo = ROLE_MAP[u.role] || null;
        const photoURL = auth?.photoURL || u.photoURL || null;
        // Prefer auth displayName (reflects Google account name) then Firestore, then fallback
        const displayName = (auth?.displayName && auth.displayName !== u.uid)
            ? auth.displayName
            : (u.displayName || auth?.displayName || 'Member');
        const entity = u.entity || '';
        const wallet = u.wallet || { balance: 0, currency: '₹', pendingBonds: 0 };
        const impact = u.impact || { co2Saved: 0, transactions: 0, weightRescued: 0 };
        const isVerified = u.verified === true;
        // Only show "PENDING" if they explicitly submitted verification (verificationStatus = 'pending')
        const isPending = u.verificationStatus === 'pending' && !isVerified;

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

          <!-- Seller rating (computed avg from Firestore stats) -->
          ${(() => {
            const ratingCount = u.stats?.ratingCount || 0;
            const ratingSum   = u.stats?.ratingSum   || 0;
            const avg = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : null;
            const rescuedCount = u.stats?.rescuedBeforeExpiry || 0;
            const stars = avg ? ('★'.repeat(Math.round(parseFloat(avg))) + '☆'.repeat(5 - Math.round(parseFloat(avg)))) : null;
            return stars ? `
              <div style="display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;margin-top:6px">
                <div style="display:flex;align-items:center;gap:4px">
                  <span style="color:#FFD700;font-size:14px;letter-spacing:1px">${stars}</span>
                  <span style="font:600 12px/1 Inter,sans-serif;color:#FFD700">${avg}</span>
                  <span style="font:400 11px/1 Inter,sans-serif;color:#5C5647">(${ratingCount} review${ratingCount !== 1 ? 's' : ''})</span>
                </div>
                ${rescuedCount > 0 ? `<span style="font:600 10px/1 Inter,sans-serif;color:#E05C5C;background:rgba(224,92,92,0.1);padding:3px 8px;border-radius:99px;border:1px solid rgba(224,92,92,0.25)">🔴 ${rescuedCount} rescued</span>` : ''}
              </div>` : (rescuedCount > 0 ? `
              <div style="display:flex;align-items:center;justify-content:center;margin-top:6px">
                <span style="font:600 10px/1 Inter,sans-serif;color:#E05C5C;background:rgba(224,92,92,0.1);padding:3px 8px;border-radius:99px;border:1px solid rgba(224,92,92,0.25)">🔴 ${rescuedCount} rescued</span>
              </div>` : '');
          })()}
        </div>

        <!-- Wallet Card -->
        <div style="margin:0 16px 14px">
          <div style="background:linear-gradient(135deg,#1A1500 0%,#1A1A0A 100%);
            border:1px solid rgba(255,215,0,0.2);border-radius:20px;padding:20px 20px;
            display:flex;align-items:center;justify-content:space-between">
            <div>
              <div style="font:500 11px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">Spolia Wallet</div>
              <div style="font:700 28px/1 Inter,sans-serif;color:#FFD700;margin-bottom:6px">${wallet.currency}${(wallet.balance || 0).toLocaleString('en-IN')}</div>
              <div id="bonds-btn" style="font:400 12px/1 Inter,sans-serif;color:#5C5647;text-decoration:underline;cursor:pointer">${wallet.pendingBonds || 0} Active Bond${wallet.pendingBonds !== 1 ? 's' : ''} in escrow</div>
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
            ${
                [
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

        <!-- Bio Card -->
        ${u.bio ? `
        <div style="margin:0 16px 20px;background:#111;border:1px solid #2A2A2A;border-radius:20px;padding:18px 20px">
          <div style="font:600 11px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">About</div>
          <div style="font:400 13px/1.6 Inter,sans-serif;color:#C8C0AE;margin-bottom:12px">${u.bio}</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            <span style="display:flex;align-items:center;gap:4px;font:400 11px/1 Inter;color:#5C5647">
              📅 Member since ${u.joinedAt ? new Date(u.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'N/A'}
            </span>
            ${u.city ? `<span style="display:flex;align-items:center;gap:4px;font:400 11px/1 Inter;color:#5C5647">📍 ${u.city}</span>` : ''}
            ${(u.stats?.rescuedBeforeExpiry || 0) > 0 ? `<span style="font:600 10px/1 Inter;color:#E05C5C;background:rgba(224,92,92,0.1);padding:3px 8px;border-radius:99px;border:1px solid rgba(224,92,92,0.25)">🔴 ${u.stats.rescuedBeforeExpiry} Rescues</span>` : ''}
          </div>
        </div>` : ''}

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
          ${(() => {
              const btns = [
                  { id: 'docs-btn',       icon: '📄', label: 'Verification Documents' },
                  { id: 'notifs-btn',     icon: '🔔', label: 'Notification Preferences' },
                  { id: 'refer-btn',      icon: '👥', label: 'Refer a Colleague' },
                  { id: 'install-app-btn',icon: '📲', label: 'Install Spolia App' }
              ];
              if (u?.role === 'admin') {
                  btns.unshift({ id: 'admin-btn', icon: '🛡️', label: 'Admin Center' });
              }
              return btns;
          })().map((item, i) => `
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

        const now = Date.now();
        const EMOJI = { stone:'🪨', marble:'🪨', steel:'⚙️', wood:'🪵', brick:'🧱', other:'📦', bulk:'📦', plumbing:'🔧', cement:'🏗️' };

        // Surface expired-but-still-active listings for re-list nudge
        const expiredListings = this.listings.filter(l => {
            if (!l.expiryDate || l.status === 'sold') return false;
            const exp = l.expiryDate?.toDate ? l.expiryDate.toDate() : new Date(l.expiryDate);
            return isNaN(exp.getTime()) ? false : exp.getTime() < now;
        });
        const expiredBanners = expiredListings.map(l => `
          <div style="grid-column:1/-1;background:rgba(224,92,92,0.08);border:1px solid rgba(224,92,92,0.4);
            border-left:3px solid #E05C5C;border-radius:12px;padding:12px 14px;animation:pulse 2s ease infinite">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
              <span>🔴</span>
              <span style="font:700 10px/1 Inter;color:#E05C5C;letter-spacing:0.06em;text-transform:uppercase">Rescue Missed — Expired</span>
            </div>
            <div style="font:600 12px/1.3 Inter;color:#F5F0E8;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.title}</div>
            <div style="font:400 11px/1.5 Inter;color:#A09882;margin-bottom:8px">Re-list at a discount — the material can still be rescued!</div>
            <button onclick="window.navigate?.('listing-create')"
              style="height:30px;padding:0 12px;border-radius:8px;border:1px solid rgba(224,92,92,0.5);
                background:rgba(224,92,92,0.12);color:#E05C5C;font:600 10px/1 Inter;cursor:pointer">
              🔄 Re-list with Discount
            </button>
          </div>`).join('');

        return expiredBanners + this.listings.slice(0, 4).map(l => `
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
            this._openWithdrawalSheet());

        // #bonds-btn — demo aware
        this.el.querySelector('#bonds-btn')?.addEventListener('click', () => {
            const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
            if (isDemo) { this._openDemoBondsSheet(); return; }
            window.navigate?.('bond-detail', { bondId: window.App?.currentUser?.uid });
        });

        this.el.querySelector('#view-all-btn')?.addEventListener('click', () =>
            this._openViewAllSheet());

        this.el.querySelector('#docs-btn')?.addEventListener('click', () =>
            this._openDocsSheet());

        this.el.querySelector('#notifs-btn')?.addEventListener('click', () =>
            this._openNotifsSheet());

        this.el.querySelector('#refer-btn')?.addEventListener('click', async () => {
            const name = this.profile?.displayName?.split(' ')[0] || 'Arjun';
            const shareText = `${name} invited you to Spolia — India's marketplace for reclaiming building materials from demolition & construction sites.\n\nRescue materials, save CO₂, and keep architecturally significant materials out of landfill.\n\nTry the demo: https://spolia-c42ab.web.app?spolia_demo=1`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: 'Join Spolia 🌱', text: shareText });
                    return;
                } catch {}
            }
            navigator.clipboard?.writeText(shareText)
                .then(() => window.showToast?.('🌿 Referral message copied to clipboard!', 'success'))
                .catch(() => window.showToast?.('demo.spolia.app?ref=yourid', 'info'));
        });

        this.el.querySelector('#install-app-btn')?.addEventListener('click', () => {
            if (window.triggerInstall) {
                window.triggerInstall();
            } else {
                window.showToast?.('To install: tap Share → "Add to Home Screen" in your browser', 'info');
            }
        });

        this.el.querySelector('#admin-btn')?.addEventListener('click', () => {
            window.navigate?.('admin');
        });

        this.el.querySelector('#settings-btn')?.addEventListener('click', () =>
            this._openSettings());

        this.el.querySelector('#bonds-btn')?.addEventListener('click', () =>
            this._openBondsSheet());

        this.el.querySelector('#signout-btn')?.addEventListener('click', async () => {
            if (confirm('Sign out of Spolia?')) {
                if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
                // window.signOut() is defined in app.js — it signs out AND redirects to login
                await window.signOut?.();
            }
        });
    }

    _openDemoBondsSheet() {
        document.getElementById('bonds-sheet-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'bonds-sheet-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms ease';

        const STATUS_COLOR = { completed: '#4CAF82', active: '#FFD700', pending: '#FFA000' };
        const STATUS_LABEL = { completed: '✅ Completed', active: '🔒 Active', pending: '⏳ Pending' };

        const bondsHtml = MOCK_BONDS.map(b => {
            const sc = STATUS_COLOR[b.status] || '#A09882';
            const sl = STATUS_LABEL[b.status] || b.status;
            const date = new Date(b.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `
            <div onclick="window.navigate?.('bond-detail',{bondId:'${b.id}'})" style="
                background:var(--color-bg-elevated);border:1px solid var(--color-border);
                border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;
                display:flex;align-items:center;gap:14px">
              <div style="width:40px;height:40px;border-radius:10px;background:${sc}18;border:1px solid ${sc}40;
                display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔒</div>
              <div style="flex:1;min-width:0">
                <div style="font:600 13px/1.3 Inter,sans-serif;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px">${b.listingTitle}</div>
                <div style="font:400 11px/1 Inter,sans-serif;color:var(--color-text-muted)">${date} · ${b.sellerName}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div style="font:700 14px/1 Inter,sans-serif;color:var(--color-gold);margin-bottom:4px">₹${(b.bondAmount||0).toLocaleString('en-IN')}</div>
                <span style="font:600 9px/1 Inter,sans-serif;color:${sc};background:${sc}18;padding:2px 7px;border-radius:99px;letter-spacing:0.05em">${sl}</span>
              </div>
            </div>`;
        }).join('');

        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;background:var(--color-bg-surface);
            border-radius:24px 24px 0 0;border-top:1px solid var(--color-border);
            padding:20px 20px max(24px, env(safe-area-inset-bottom));
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1)">
            <div style="width:40px;height:4px;background:#2A2A2A;border-radius:2px;margin:0 auto 16px"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h2 style="font:700 18px/1 var(--font-display);color:var(--color-gold)">My Spolia Bonds</h2>
              <button id="bonds-close" style="width:32px;height:32px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:14px">✕</button>
            </div>
            ${bondsHtml}
            <div style="text-align:center;margin-top:16px">
              <span style="font:400 11px/1 Inter;color:var(--color-text-muted)">Total CO₂ saved across all bonds: <strong style="color:var(--color-green)">608 kg</strong></span>
            </div>
          </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#bonds-close')?.addEventListener('click', () => overlay.remove());
    }

    _openWithdrawalSheet() {
        const u = this.profile || {};
        const wallet = u.wallet || { balance: 0, currency: '₹', pendingBonds: 0 };

        document.getElementById('settings-sheet-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;

        overlay.innerHTML = `
          <style>
            @keyframes slideUp   { from { transform:translateY(100%) } to { transform:translateY(0) } }
            @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
            @keyframes slideDown { from { transform:translateY(0) } to { transform:translateY(100%) } }
          </style>
          <div id="settings-sheet" style="
            width:100%;max-width:480px;
            background:#111;border-top:1px solid #2A2A2A;
            border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            max-height:90vh;overflow-y:auto;
          ">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;"></div>
            
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px">
              <div>
                <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700;margin-bottom:4px">Withdraw Funds</h2>
                <div style="font:400 12px/1 Inter,sans-serif;color:#A09882">Available Balance: ${wallet.currency}${wallet.balance.toLocaleString('en-IN')}</div>
              </div>
              <button id="settings-close" aria-label="Close"
                style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                  display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">✕</button>
            </div>

            <div style="padding:0 20px 20px">
              <div style="margin-bottom:12px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">Amount to Withdraw</label>
                <input id="withdraw-amount" type="number" max="${wallet.balance}"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:700 16px/1 Inter,sans-serif;
                    outline:none;caret-color:#FFD700"
                  placeholder="0">
              </div>

              <div style="margin-bottom:12px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">Bank Account Name</label>
                <input id="withdraw-name" type="text"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:400 14px/1 Inter,sans-serif;outline:none"
                  placeholder="Name as per bank">
              </div>

              <div style="margin-bottom:12px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">Account Number</label>
                <input id="withdraw-acc" type="text"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:400 14px/1 Inter,sans-serif;outline:none"
                  placeholder="1234567890">
              </div>

              <div style="margin-bottom:20px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">IFSC Code</label>
                <input id="withdraw-ifsc" type="text"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:400 14px/1 Inter,sans-serif;outline:none;text-transform:uppercase"
                  placeholder="SBIN0001234">
              </div>

              <button id="withdraw-submit"
                style="width:100%;height:44px;border-radius:12px;background:#FFD700;border:none;
                  color:#0D0D0D;font:700 14px/1 Inter,sans-serif;cursor:pointer;
                  transition:opacity 150ms">
                Request Withdrawal
              </button>
              
              <p style="font:400 11px/1.4 Inter,sans-serif;color:#5C5647;text-align:center;margin-top:12px">
                Transfers typically take 2-3 business days to reflect in your account.
              </p>
            </div>
          </div>`;

        document.body.appendChild(overlay);

        const close = (animate = true) => {
            if (!animate) { overlay.remove(); return; }
            const sheet = overlay.querySelector('#settings-sheet');
            if (sheet) sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
            setTimeout(() => overlay.remove(), 250);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#settings-close')?.addEventListener('click', () => close());

        overlay.querySelector('#withdraw-submit')?.addEventListener('click', async () => {
            const amt = parseFloat(overlay.querySelector('#withdraw-amount').value || '0');
            const name = overlay.querySelector('#withdraw-name').value.trim();
            const acc = overlay.querySelector('#withdraw-acc').value.trim();
            const ifsc = overlay.querySelector('#withdraw-ifsc').value.trim().toUpperCase();

            if (amt <= 0 || amt > wallet.balance) return window.showToast?.('Invalid amount', 'error');
            if (!name || !acc || !ifsc) return window.showToast?.('Please fill all bank details', 'error');

            const btn = overlay.querySelector('#withdraw-submit');
            btn.textContent = 'Processing...'; btn.disabled = true;

            try {
                await FirebaseDB.submitWithdrawal({ amount: amt, name, account: acc, ifsc });
                window.showToast?.('Withdrawal request submitted successfully ✓', 'success');
                close();
            } catch (err) {
                window.showToast?.('Withdrawal failed. Try again.', 'error');
                btn.textContent = 'Request Withdrawal'; btn.disabled = false;
            }
        });
    }

    _openViewAllSheet() {
        document.getElementById('settings-sheet-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;
        
        let gridHtml = '';
        if (this.listings.length === 0) {
            gridHtml = `<div style="text-align:center;padding:40px 20px;color:#A09882">No listings found.</div>`;
        } else {
            const EMOJI = { stone:'🪨', marble:'🪨', steel:'⚙️', wood:'🪵', brick:'🧱', other:'📦', bulk:'📦', plumbing:'🔧', cement:'🏗️' };
            gridHtml = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                ${this.listings.map(l => `
                  <div onclick="document.getElementById('settings-close').click(); window.navigate?.('material-detail',{listingId:'${l.id}'})"
                    style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;overflow:hidden;cursor:pointer">
                    <div style="height:96px;background:#111;display:flex;align-items:center;justify-content:center;font-size:36px">
                      ${l.imageUrls?.[0]
                        ? `<img src="${l.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="${l.title}">`
                        : (EMOJI[l.type] || '📦')}
                    </div>
                    <div style="padding:10px 12px">
                      <div style="font:600 12px/1.3 Inter,sans-serif;color:#F5F0E8;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.title}</div>
                      <div style="font:700 13px/1 Inter,sans-serif;color:#FFD700">${l.currency || '₹'}${(l.price || 0).toLocaleString('en-IN')}/${l.unit}</div>
                    </div>
                  </div>`).join('')}
                </div>`;
        }

        overlay.innerHTML = `
          <div id="settings-sheet" style="
            width:100%;max-width:480px;height:85vh;
            background:#111;border-top:1px solid #2A2A2A;
            border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            display:flex;flex-direction:column;
          ">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;flex-shrink:0"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;flex-shrink:0">
              <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700">All My Listings</h2>
              <button id="settings-close"
                style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                  display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">✕</button>
            </div>
            <div style="padding:0 20px 20px;overflow-y:auto;flex:1">
               ${gridHtml}
            </div>
          </div>`;

        document.body.appendChild(overlay);

        const close = (animate = true) => {
            if (!animate) { overlay.remove(); return; }
            const sheet = overlay.querySelector('#settings-sheet');
            if (sheet) sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
            setTimeout(() => overlay.remove(), 250);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#settings-close')?.addEventListener('click', () => close());
    }

    _openDocsSheet() {
        const u = this.profile || {};
        document.getElementById('settings-sheet-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;
        
        let docContent = `<div style="text-align:center;padding:40px 20px;color:#A09882">No verification document uploaded.</div>`;
        if (u.verificationDocUrl) {
            // Assume image for now based on app logic, can provide download link if PDF
            docContent = `<div style="border:1px solid #2A2A2A;border-radius:12px;overflow:hidden;background:#000">
                <img src="${u.verificationDocUrl}" style="width:100%;object-fit:contain;max-height:400px" alt="Verification Document">
            </div>
            <a href="${u.verificationDocUrl}" target="_blank" style="display:block;text-align:center;margin-top:12px;color:#FFD700;font:600 13px Inter;text-decoration:none">
                Open Full Size ↗
            </a>`;
        }

        overlay.innerHTML = `
          <div id="settings-sheet" style="
            width:100%;max-width:480px;
            background:#111;border-top:1px solid #2A2A2A;
            border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            max-height:90vh;overflow-y:auto;
          ">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px">
              <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700">Verification Vault</h2>
              <button id="settings-close"
                style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                  display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">✕</button>
            </div>
            
            <div style="padding:0 20px 20px">
              <!-- Credentials Info -->
              <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                  <span style="font:400 12px Inter;color:#A09882">Role</span>
                  <span style="font:600 13px Inter;color:#F5F0E8;text-transform:capitalize">${u.role || 'Unverified'}</span>
                </div>
                <div style="display:flex;justify-content:space-between">
                  <span style="font:400 12px Inter;color:#A09882">Registration No.</span>
                  <span style="font:600 13px Inter;color:#FFD700">${u.credentialNumber || 'N/A'}</span>
                </div>
              </div>
              
              <!-- Document Viewer -->
              <h3 style="font:600 12px Inter;color:#A09882;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px">Uploaded Document</h3>
              ${docContent}
            </div>
          </div>`;

        document.body.appendChild(overlay);

        const close = (animate = true) => {
            if (!animate) { overlay.remove(); return; }
            const sheet = overlay.querySelector('#settings-sheet');
            if (sheet) sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
            setTimeout(() => overlay.remove(), 250);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#settings-close')?.addEventListener('click', () => close());
    }

    _openNotifsSheet() {
        const u = this.profile || {};
        const prefs = u.preferences || { email: true, push: false, sms: false };
        document.getElementById('settings-sheet-overlay')?.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;

        const renderToggle = (id, label, desc, checked) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid #2A2A2A">
            <div>
              <div style="font:600 14px Inter;color:#F5F0E8;margin-bottom:4px">${label}</div>
              <div style="font:400 12px Inter;color:#A09882">${desc}</div>
            </div>
            <label style="position:relative;display:inline-block;width:44px;height:24px">
              <input type="checkbox" id="pref-${id}" ${checked ? 'checked' : ''} style="opacity:0;width:0;height:0">
              <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:${checked ? '#FFD700' : '#333'};transition:.3s;border-radius:24px">
                <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:${checked ? '#000' : '#888'};transition:.3s;border-radius:50%;transform:${checked ? 'translateX(20px)' : 'none'}"></span>
              </span>
            </label>
          </div>
        `;

        overlay.innerHTML = `
          <div id="settings-sheet" style="
            width:100%;max-width:480px;
            background:#111;border-top:1px solid #2A2A2A;
            border-radius:24px 24px 0 0;padding-bottom:env(safe-area-bottom,16px);
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
          ">
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;"></div>
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px">
              <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700">Notifications</h2>
              <button id="settings-close"
                style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                  display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">✕</button>
            </div>
            
            <div style="padding:0 20px 20px">
              <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;padding:0 16px;margin-bottom:24px">
                ${renderToggle('email', 'Email Updates', 'Dispute updates and Weekly digests', prefs.email)}
                ${renderToggle('push', 'Push Notifications', 'Real-time Radar matches and messages', prefs.push)}
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0">
                    <div>
                    <div style="font:600 14px Inter;color:#F5F0E8;margin-bottom:4px">SMS Alerts</div>
                    <div style="font:400 12px Inter;color:#A09882">Urgent pickup logistics only</div>
                    </div>
                    <label style="position:relative;display:inline-block;width:44px;height:24px">
                    <input type="checkbox" id="pref-sms" ${prefs.sms ? 'checked' : ''} style="opacity:0;width:0;height:0">
                    <span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background-color:${prefs.sms ? '#FFD700' : '#333'};transition:.3s;border-radius:24px">
                        <span style="position:absolute;content:'';height:18px;width:18px;left:3px;bottom:3px;background-color:${prefs.sms ? '#000' : '#888'};transition:.3s;border-radius:50%;transform:${prefs.sms ? 'translateX(20px)' : 'none'}"></span>
                    </span>
                    </label>
                </div>
              </div>
              <button id="notif-save"
                style="width:100%;height:44px;border-radius:12px;background:#FFD700;border:none;
                  color:#0D0D0D;font:700 14px/1 Inter,sans-serif;cursor:pointer">
                Save Preferences
              </button>
            </div>
          </div>`;

        document.body.appendChild(overlay);

        // Bind interactive toggles
        ['email', 'push', 'sms'].forEach(id => {
            const input = overlay.querySelector(`#pref-${id}`);
            const track = input?.nextElementSibling;
            const thumb = track?.firstElementChild;
            input?.addEventListener('change', (e) => {
                const checked = e.target.checked;
                if(track) track.style.backgroundColor = checked ? '#FFD700' : '#333';
                if(thumb) {
                    thumb.style.transform = checked ? 'translateX(20px)' : 'none';
                    thumb.style.backgroundColor = checked ? '#000' : '#888';
                }
            });
        });

        const close = (animate = true) => {
            if (!animate) { overlay.remove(); return; }
            const sheet = overlay.querySelector('#settings-sheet');
            if (sheet) sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
            setTimeout(() => overlay.remove(), 250);
        };

        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#settings-close')?.addEventListener('click', () => close());

        overlay.querySelector('#notif-save')?.addEventListener('click', async () => {
             const newPrefs = {
                 email: overlay.querySelector('#pref-email')?.checked || false,
                 push: overlay.querySelector('#pref-push')?.checked || false,
                 sms: overlay.querySelector('#pref-sms')?.checked || false
             };
             
             if(newPrefs.push && Notification.permission !== 'granted') {
                 try {
                     const perm = await Notification.requestPermission();
                     if(perm !== 'granted') newPrefs.push = false;
                 } catch(err) { newPrefs.push = false; }
             }

             const btn = overlay.querySelector('#notif-save');
             btn.textContent = 'Saving...'; btn.disabled = true;

             if(this.user?.uid) {
                 try {
                     await FirebaseDB.upsertUserProfile(this.user.uid, { preferences: newPrefs });
                     window.showToast?.('Preferences saved ✓', 'success');
                     if(this.profile) this.profile.preferences = newPrefs;
                     close();
                 } catch(err) {
                     window.showToast?.('Failed to save preferences', 'error');
                     btn.textContent = 'Save Preferences'; btn.disabled = false;
                 }
             } else {
                 close();
             }
        });
    }

    async _openBondsSheet() {
        document.getElementById('settings-sheet-overlay')?.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;
        document.body.appendChild(overlay);

        let listHtml = `<div style="text-align:center;padding:40px 20px;color:#A09882">Loading bonds...</div>`;
        
        const renderSheet = () => {
            overlay.innerHTML = `
              <div id="settings-sheet" style="
                width:100%;max-width:480px;height:75vh;
                background:#111;border-top:1px solid #2A2A2A;
                border-radius:24px 24px 0 0;padding-bottom:env(safe-area-bottom,16px);
                animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
                display:flex;flex-direction:column;
              ">
                <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;flex-shrink:0"></div>
                <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px;flex-shrink:0">
                  <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700">My Spolia Bonds</h2>
                  <button id="settings-close"
                    style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                      display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">✕</button>
                </div>
                <div style="padding:0 20px 20px;overflow-y:auto;flex:1">
                  ${listHtml}
                </div>
              </div>`;

            const close = (animate = true) => {
                if (!animate) { overlay.remove(); return; }
                const sheet = overlay.querySelector('#settings-sheet');
                if (sheet) sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
                overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
                setTimeout(() => overlay.remove(), 250);
            };

            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            overlay.querySelector('#settings-close')?.addEventListener('click', () => close());
        };
        
        renderSheet();

        try {
            const bonds = await FirebaseDB.getMyBonds(this.user?.uid);
            const currentUid = this.user?.uid;
            if (bonds.length === 0) {
                listHtml = `<div style="text-align:center;padding:40px 20px;color:#A09882">
                  <div style="font-size:40px;margin-bottom:16px">🔒</div>
                  No active bonds yet. Place a Spolia Bond from any listing to get started.
                </div>`;
            } else {
                const STATUS_COLOR = {
                    pending: '#FFA000', active: '#4CAF82', confirmed: '#66BB6A',
                    disputed: '#E05C5C', released: '#A09882'
                };
                listHtml = `<div style="display:flex;flex-direction:column;gap:12px">
                    ${bonds.map(b => {
                        const isSeller = b.sellerUid === currentUid;
                        const role = isSeller ? 'SELLER' : 'BUYER';
                        const roleColor = isSeller ? '#9B59B6' : '#4B9FD4';
                        const statusColor = STATUS_COLOR[b.status] || '#A09882';
                        const date = b.createdAt?.toDate
                            ? b.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                            : '';
                        const chatVisible = b.status !== 'released';
                        return `
                        <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;padding:16px;cursor:pointer"
                          onclick="document.getElementById('settings-close').click(); window.navigate?.('bond-detail',{bondId:'${b.id}'})">
                          <!-- Top row -->
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
                            <div style="display:flex;align-items:center;gap:8px">
                              <span style="font:600 10px/1 Inter;color:${roleColor};background:rgba(75,159,212,0.1);padding:3px 7px;border-radius:4px;letter-spacing:0.06em">${role}</span>
                              <span style="font:500 11px Inter;color:${statusColor};background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;text-transform:uppercase">${b.status}</span>
                            </div>
                            <span style="font:400 11px Inter;color:#5C5647">${date}</span>
                          </div>
                          <!-- Title + amount -->
                          <div style="font:600 14px/1.3 Inter;color:#F5F0E8;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                            ${b.listingTitle || 'Spolia Bond'}
                          </div>
                          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
                            <span style="font:700 16px Inter;color:#FFD700">₹${(b.depositAmount||0).toLocaleString('en-IN')} <span style="font:400 11px Inter;color:#5C5647">deposit</span></span>
                            ${chatVisible ? `
                              <button onclick="event.stopPropagation(); document.getElementById('settings-close').click(); window.navigate?.('chat',{bondId:'${b.id}',bondData:${JSON.stringify({sellerUid:b.sellerUid,buyerUid:b.buyerUid,sellerName:b.sellerName,buyerName:b.buyerName}).replace(/"/g,'&quot;')}})"
                                style="display:flex;align-items:center;gap:4px;height:28px;padding:0 10px;border-radius:6px;
                                  background:#1E1E1E;border:1px solid #2A2A2A;color:#A09882;font:600 11px Inter;cursor:pointer">
                                💬 Chat
                              </button>` : ''}
                          </div>
                        </div>`; }).join('')}
                </div>`;
            }
            renderSheet();
        } catch (err) {
            listHtml = `<div style="text-align:center;padding:40px 20px;color:#FF4444">Failed to load bonds.</div>`;
            renderSheet();
        }
    }


    _openSettings() {
        const u = this.profile || {};
        const auth = this.user;
        const roleInfo = ROLE_MAP[u.role] || null;

        // Remove any existing settings sheet
        document.getElementById('settings-sheet-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'settings-sheet-overlay';
        overlay.style.cssText = `
          position:fixed;inset:0;z-index:600;
          background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
          display:flex;align-items:flex-end;justify-content:center;
          animation:fadeIn 200ms ease;
        `;

        overlay.innerHTML = `
          <style>
            @keyframes slideUp   { from { transform:translateY(100%) } to { transform:translateY(0) } }
            @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
            @keyframes slideDown { from { transform:translateY(0) } to { transform:translateY(100%) } }
          </style>
          <div id="settings-sheet" style="
            width:100%;max-width:480px;
            background:#111;border-top:1px solid #2A2A2A;
            border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);
            animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            max-height:90vh;overflow-y:auto;
          ">
            <!-- Handle -->
            <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;"></div>

            <!-- Header -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 12px">
              <h2 style="font:700 18px/1 'Playfair Display',Georgia,serif;color:#FFD700">Settings</h2>
              <button id="settings-close" aria-label="Close settings"
                style="width:32px;height:32px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
                  display:flex;align-items:center;justify-content:center;cursor:pointer;color:#A09882;font-size:16px">
                ✕
              </button>
            </div>

            <!-- Edit Profile -->
            <div style="padding:0 20px 4px">
              <div style="font:600 11px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">Edit Profile</div>

              <div style="margin-bottom:12px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">Display Name</label>
                <input id="settings-name" type="text"
                  value="${(auth?.displayName || u.displayName || '').replace(/"/g,'&quot;')}"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:400 14px/1 Inter,sans-serif;
                    outline:none;caret-color:#FFD700"
                  placeholder="Your full name">
              </div>

              <div style="margin-bottom:16px">
                <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;display:block;margin-bottom:6px">Entity / Firm</label>
                <input id="settings-entity" type="text"
                  value="${(u.entity || '').replace(/"/g,'&quot;')}"
                  style="width:100%;box-sizing:border-box;height:44px;background:#1A1A1A;border:1px solid #2A2A2A;
                    border-radius:12px;padding:0 14px;color:#F5F0E8;font:400 14px/1 Inter,sans-serif;
                    outline:none;caret-color:#FFD700"
                  placeholder="e.g. Peroneira Designs">
              </div>

              <button id="settings-save"
                style="width:100%;height:44px;border-radius:12px;background:#FFD700;border:none;
                  color:#0D0D0D;font:700 14px/1 Inter,sans-serif;cursor:pointer;margin-bottom:20px;
                  transition:opacity 150ms">
                Save Changes
              </button>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:#1A1A1A;margin:0 20px"></div>

            <!-- Your Role -->
            <div style="padding:16px 20px">
              <div style="font:600 11px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">Your Role</div>
              <div style="display:flex;align-items:center;gap:10px;background:#1A1A1A;
                border:1px solid #2A2A2A;border-radius:12px;padding:12px 14px">
                <span style="font-size:22px">${roleInfo?.icon || '👤'}</span>
                <div>
                  <div style="font:600 14px/1 Inter,sans-serif;color:#F5F0E8">${roleInfo?.label || 'Member'}</div>
                  ${u.credentialNumber ? `<div style="font:400 12px/1 Inter,sans-serif;color:#5C5647;margin-top:3px">${u.credentialNumber}</div>` : ''}
                </div>
              </div>
              <div style="font:400 11px/1.4 Inter,sans-serif;color:#3A3A3A;margin-top:8px">To change your role or credential, contact support.</div>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:#1A1A1A;margin:0 20px"></div>

            <!-- App Info -->
            <div style="padding:16px 20px">
              <div style="font:600 11px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">App Info</div>
              <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;overflow:hidden">
                <div style="display:flex;align-items:center;justify-content:space-between;
                  padding:14px 16px;border-bottom:1px solid #222">
                  <span style="font:400 14px/1 Inter,sans-serif;color:#A09882">Version</span>
                  <span style="font:600 13px/1 Inter,sans-serif;color:#5C5647">Spolia v1.0 Beta</span>
                </div>
                <button id="settings-support"
                  style="width:100%;display:flex;align-items:center;justify-content:space-between;
                    padding:14px 16px;background:none;border:none;border-bottom:1px solid #222;
                    color:#F5F0E8;font:400 14px/1 Inter,sans-serif;cursor:pointer">
                  <span>Help &amp; Support</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                <button id="settings-privacy"
                  style="width:100%;display:flex;align-items:center;justify-content:space-between;
                    padding:14px 16px;background:none;border:none;
                    color:#F5F0E8;font:400 14px/1 Inter,sans-serif;cursor:pointer">
                  <span>Privacy Policy</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:#1A1A1A;margin:0 20px"></div>

            <!-- Sign Out -->
            <div style="padding:16px 20px 8px">
              <button id="settings-signout"
                style="width:100%;height:48px;border-radius:12px;background:rgba(224,92,92,0.08);
                  border:1px solid rgba(224,92,92,0.25);
                  color:#E05C5C;font:600 14px/1 Inter,sans-serif;cursor:pointer">
                🚪 Sign Out
              </button>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);

        // Focus first input
        setTimeout(() => overlay.querySelector('#settings-name')?.focus(), 350);

        const close = (animate = true) => {
            if (!animate) { overlay.remove(); return; }
            const sheet = overlay.querySelector('#settings-sheet');
            if (sheet) {
                sheet.style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            }
            overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
            setTimeout(() => overlay.remove(), 250);
        };

        // Close on backdrop click
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        overlay.querySelector('#settings-close')?.addEventListener('click', () => close());

        // Save Changes
        overlay.querySelector('#settings-save')?.addEventListener('click', async () => {
            const nameVal = overlay.querySelector('#settings-name')?.value?.trim();
            const entityVal = overlay.querySelector('#settings-entity')?.value?.trim();

            if (!nameVal) { window.showToast?.('Display name cannot be empty', 'error'); return; }

            const saveBtn = overlay.querySelector('#settings-save');
            if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; }

            try {
                const uid = this.user?.uid || window.App?.currentUser?.uid;
                if (uid) {
                    await FirebaseDB.upsertUserProfile(uid, {
                        displayName: nameVal,
                        entity: entityVal || ''
                    });
                    // Update auth display name if changed
                    if (nameVal !== auth?.displayName && FirebaseAuth.updateProfile) {
                        await FirebaseAuth.updateProfile({ displayName: nameVal }).catch(() => {});
                    }
                    // Update local cache
                    if (window.App?.currentUserProfile) {
                        window.App.currentUserProfile.displayName = nameVal;
                        window.App.currentUserProfile.entity = entityVal || '';
                    }
                    if (this.profile) {
                        this.profile.displayName = nameVal;
                        this.profile.entity = entityVal || '';
                    }
                }
                window.showToast?.('Profile updated ✓', 'success');
                close();
            } catch (err) {
                console.error('[Settings] Save failed:', err);
                window.showToast?.('Save failed. Try again.', 'error');
                if (saveBtn) { saveBtn.textContent = 'Save Changes'; saveBtn.disabled = false; }
            }
        });

        // Support
        overlay.querySelector('#settings-support')?.addEventListener('click', () => {
            navigator.clipboard?.writeText('support@spolia.in')
                .then(() => window.showToast?.('support@spolia.in copied!', 'success'))
                .catch(() => window.showToast?.('Contact support@spolia.in', 'info'));
        });

        // Privacy
        overlay.querySelector('#settings-privacy')?.addEventListener('click', () =>
            window.showToast?.('Privacy policy coming soon', 'info'));

        // Sign out from settings
        overlay.querySelector('#settings-signout')?.addEventListener('click', async () => {
            if (confirm('Sign out of Spolia?')) {
                close(false);
                if (this._unsubscribe) { this._unsubscribe(); this._unsubscribe = null; }
                await window.signOut?.();
            }
        });
    }

    onActivate() {
        // STEP 1: Get auth user synchronously — always set after login
        this.user = FirebaseAuth.getCurrentUser?.() || window.App?.currentUser;
        const authUser = this.user;

        // STEP 2: Render IMMEDIATELY from whatever we have right now (no await).
        if (authUser && !this.profile) {
            const cached = window.App?.currentUserProfile;
            this.profile = (cached?.uid) ? cached : {
                uid:              authUser.uid,
                displayName:      authUser.displayName || 'Professional',
                email:            authUser.email       || '',
                phoneNumber:      authUser.phoneNumber  || '',
                photoURL:         authUser.photoURL     || null,
                role:             null,
                verified:         false,
                onboardingComplete: false,
                wallet:  { balance: 0, currency: '₹', pendingBonds: 0 },
                impact:  { co2Saved: 0, transactions: 0, weightRescued: 0 }
            };
        }

        // ── DEMO MODE: pre-fill listings from MOCK data, skip Firestore ─────────
        const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
        if (isDemo) {
            const demoListingIds = (this.profile?.listings || []).map(l => l.id || l);
            this.listings = demoListingIds.length
                ? MOCK_LISTINGS.filter(l => demoListingIds.includes(l.id))
                : MOCK_LISTINGS.slice(0, 4);
            this.render(this.profile);
            return;
        }

        this.render(this.profile);   // instant, sync — no skeleton if we have auth

        if (!authUser?.uid) return;  // not signed in, nothing more to do

        // STEP 3: Fetch Firestore data in background — update view when it arrives
        FirebaseDB.getUserProfile(authUser.uid)
            .then(fresh => {
                if (fresh?.uid) {
                    this.profile = fresh;
                    if (window.App) window.App.currentUserProfile = fresh;
                    this.render(this.profile);
                } else {
                    // Doc missing — create it silently
                    FirebaseDB.upsertUserProfile(authUser.uid, this.profile).catch(() => {});
                }
            })
            .catch(() => {});  // already rendered from auth data — ignore errors

        // STEP 4: Fetch listings in background
        FirebaseDB.getMyListings(authUser.uid)
            .then(l => { this.listings = l || []; this.render(this.profile); })
            .catch(() => {});

        // STEP 5: Subscribe to real-time profile changes
        if (this._unsubscribe) this._unsubscribe();
        this._unsubscribe = FirebaseDB.listenToUserProfile(authUser.uid, (live) => {
            if (live?.uid) {
                this.profile = live;
                if (window.App) window.App.currentUserProfile = live;
                this.render(live);
            }
        });
    }
}
