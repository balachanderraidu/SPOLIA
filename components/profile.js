// components/profile.js — User Profile & Wallet
import { FirebaseAuth, MOCK_USER_PROFILE } from '../firebase-config.js';

export class ProfileScreen {
    constructor(el) {
        this.el = el;
        this.user = MOCK_USER_PROFILE;
    }

    render() {
        const u = this.user;
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
        <div class="user-hero__avatar">👤</div>
        <h2 class="user-hero__name">${u.displayName}</h2>
        <div class="user-hero__entity">${u.entity}</div>
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;flex-wrap:wrap">
          <span class="badge badge--verified">✓ VERIFIED</span>
          <span class="badge badge--type">ARCHITECT</span>
          <span class="badge badge--bond" style="font-size:10px">COA ${u.coaNumber}</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:4px;margin-top:8px">
          ${'⭐'.repeat(Math.floor(u.bondRating))}
          <span style="font:var(--text-caption);color:var(--color-text-secondary);margin-left:4px">${u.bondRating} Bond Rating</span>
        </div>
      </div>

      <!-- Wallet Card -->
      <div style="padding:var(--space-md)">
        <div class="wallet-card">
          <div>
            <div class="wallet-card__label">Spolia Wallet</div>
            <div class="wallet-card__value">${u.wallet.currency}${u.wallet.balance.toLocaleString('en-IN')}</div>
            <div class="wallet-card__sub">${u.wallet.pendingBonds} Active Bonds · ₹12,000 in escrow</div>
          </div>
          <button class="btn btn--outline" style="width:auto;height:36px;padding:0 16px;font-size:12px"
            onclick="window.showToast('Withdrawal feature coming soon','info')">
            Withdraw
          </button>
        </div>
      </div>

      <!-- Impact Mini Card -->
      <div style="margin:0 var(--space-md) var(--space-md);background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);border-radius:var(--radius-card);padding:var(--space-md)">
        <div style="font:var(--text-label);color:var(--color-green);letter-spacing:0.06em;margin-bottom:12px">🌱 YOUR IMPACT</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${(u.impact.co2Saved / 1000).toFixed(1)}T</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">CO₂ Saved</div>
          </div>
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${u.impact.transactions}</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">Transactions</div>
          </div>
          <div>
            <div style="font:600 18px/1 var(--font-body);color:var(--color-green)">${(u.impact.weightRescued / 1000).toFixed(2)}T</div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">Diverted</div>
          </div>
        </div>
      </div>

      <!-- My Listings -->
      <div class="section-header">
        <h2 class="section-header__title">My Listings</h2>
        <span class="section-header__action" onclick="window.showToast('My Listings page coming soon','info')">View All</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 var(--space-md) var(--space-md)">
        ${[
                { title: 'Reclaimed Travertine', price: '₹180/sqft', status: 'Active', statusClass: 'badge--ai', emoji: '🪨' },
                { title: 'Teak Rafters', price: '₹4,200/pc', status: 'Pending', statusClass: 'badge--amber', emoji: '🪵' }
            ].map(l => `
          <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden;cursor:pointer"
            onclick="window.showToast('Listing detail coming soon','info')">
            <div style="height:100px;background:var(--color-bg-elevated);display:flex;align-items:center;justify-content:center;font-size:36px">${l.emoji}</div>
            <div style="padding:10px">
              <div style="font:var(--text-caption);color:var(--color-text-primary);font-weight:500;margin-bottom:4px">${l.title}</div>
              <div style="font:var(--text-caption);color:var(--color-gold)">${l.price}</div>
              <div style="margin-top:6px"><span class="badge ${l.statusClass}" style="font-size:9px">${l.status}</span></div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Settings List -->
      <div class="section-header">
        <h2 class="section-header__title">Account</h2>
      </div>

      <div style="margin:0 var(--space-md) var(--space-xl);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden">
        ${[
                { icon: '📄', label: 'Verification Documents', action: () => window.showToast('Document vault coming soon', 'info') },
                { icon: '🔔', label: 'Notification Preferences', action: () => window.showToast('Notifications coming soon', 'info') },
                { icon: '👥', label: 'Refer a Colleague', action: () => window.showToast('Referral program coming soon', 'info') },
            ].map((item, i, arr) => `
          <button id="setting-${i}" style="width:100%;display:flex;align-items:center;gap:12px;padding:14px 16px;
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

    _bindActions() {
        this.el.querySelectorAll('[id^="setting-"]').forEach((btn, i) => {
            const actions = [
                () => window.showToast('Document vault coming soon', 'info'),
                () => window.showToast('Notifications coming soon', 'info'),
                () => window.showToast('Referral program coming soon', 'info'),
            ];
            btn.addEventListener('click', actions[i]);
        });

        this.el.querySelector('#signout-btn')?.addEventListener('click', () => {
            if (confirm('Sign out of Spolia?')) {
                FirebaseAuth.signOut().then(() => window.showToast('Signed out', 'info'));
            }
        });
    }

    onActivate() { /* profile always fresh */ }
}
