// components/impact.js — Impact Dashboard (Live Firebase Data)
import { FirebaseDB } from '../firebase-config.js';

export class ImpactScreen {
    constructor(el) {
        this.el = el;
        this.animRan = false;
        this._unsubscribe = null;
        this._stats = null;
    }

    render(stats = null, userProfile = null) {
        const s = stats || {
            totalCo2Saved: 14500,
            totalTransactions: 847,
            totalWeightKg: 124000,
            totalValueRescued: 28000000,
        };
        const u = userProfile || window.App?.currentUserProfile || null;

        const totalTonnes = (s.totalCo2Saved / 1000).toFixed(1);
        const totalWeight = (s.totalWeightKg / 1000).toFixed(0);
        const totalValue = s.totalValueRescued >= 10000000
            ? `₹${(s.totalValueRescued / 10000000).toFixed(1)}Cr`
            : `₹${(s.totalValueRescued / 100000).toFixed(1)}L`;

        const co2Goal = u?.impact?.co2Goal || 5000;
        const userCo2 = u?.impact?.co2Saved || 0;
        const userTx = u?.impact?.transactions || 0;
        const userWeight = u?.impact?.weightRescued || 0;
        const txGoal = u?.impact?.txGoal || 20;

        this.el.innerHTML = `
      <header class="page-header">
        <div>
          <h1 class="page-header__title">Impact</h1>
          <p class="page-header__subtitle">Platform-wide sustainability</p>
        </div>
        <div class="page-header__actions">
          <span style="font:var(--text-label);color:var(--color-gold);letter-spacing:0.08em">SPOLIA</span>
        </div>
      </header>

      <div style="padding:var(--space-md) 0 var(--space-xl)">
        <!-- Hero Ring Chart -->
        <div style="padding:var(--space-lg) var(--space-md) var(--space-md)">
          <div class="ring-chart" role="img" aria-label="${totalTonnes} tons CO2 saved by the platform">
            <svg width="220" height="220" viewBox="0 0 220 220">
              <defs>
                <linearGradient id="goldToGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#FFD700"/>
                  <stop offset="100%" style="stop-color:#4CAF82"/>
                </linearGradient>
              </defs>
              <circle class="ring-chart__track" cx="110" cy="110" r="95"/>
              <circle class="ring-chart__fill" id="ring-fill" cx="110" cy="110" r="95"
                stroke-dasharray="597" stroke-dashoffset="597"/>
            </svg>
            <div class="ring-chart__center">
              <div class="ring-chart__value" id="ring-value">0</div>
              <div class="ring-chart__label">TONS CO₂</div>
              <div class="ring-chart__sub">Platform saved</div>
            </div>
          </div>
        </div>

        <!-- Stat Row -->
        <div class="stat-row">
          <div class="stat-card">
            <div class="stat-card__value">${totalValue}</div>
            <div class="stat-card__label">Material Value Rescued</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value" id="stat-tx">${s.totalTransactions.toLocaleString('en-IN')}</div>
            <div class="stat-card__label">Transactions</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${totalWeight} T</div>
            <div class="stat-card__label">Weight Diverted</div>
          </div>
        </div>

        <!-- Your Contribution -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🌱 Your Contribution</h2>
          <span class="section-header__action" id="impact-share-btn">Share</span>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-md)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--color-bg-elevated);border:2px solid var(--color-gold);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">
              ${window.App?.currentUser?.photoURL
                ? `<img src="${window.App.currentUser.photoURL}" style="width:100%;height:100%;object-fit:cover" alt="">`
                : `<span style="font-size:20px">👤</span>`}
            </div>
            <div>
              <div style="font:var(--text-h3);color:var(--color-text-primary)">${u?.displayName || window.App?.currentUser?.displayName || 'You'}</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font:var(--text-caption);color:var(--color-text-secondary)">${u?.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Member'}</span>
                ${u?.verified ? `<span class="badge badge--verified" style="padding:1px 6px;font-size:9px">✓ VERIFIED</span>` : ''}
              </div>
            </div>
          </div>

          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font:var(--text-caption);color:var(--color-text-secondary)">CO₂ Saved</span>
              <span style="font:var(--text-caption);color:var(--color-green);font-weight:600">${userCo2.toLocaleString('en-IN')} kg / ${co2Goal.toLocaleString('en-IN')} kg goal</span>
            </div>
            <div class="progress-bar"><div class="progress-bar__fill" id="co2-bar" style="width:0%"></div></div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font:var(--text-caption);color:var(--color-text-secondary)">Transactions</span>
              <span style="font:var(--text-caption);color:var(--color-gold);font-weight:600">${userTx} / ${txGoal} milestone</span>
            </div>
            <div class="progress-bar"><div class="progress-bar__fill gold" id="tx-bar" style="width:0%"></div></div>
          </div>

          ${userWeight > 0 ? `
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--color-border);font:var(--text-caption);color:var(--color-text-secondary)">
              🏗️ <strong style="color:var(--color-text-primary)">${(userWeight / 1000).toFixed(2)}T</strong> of material diverted from landfill
            </div>` : ''}
        </div>

        <!-- City Leaderboard -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🏆 City Leaderboard</h2>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden">
          ${[
              { rank: 1, city: 'Mumbai',    co2: `${totalTonnes}T`,                          pct: 100 },
              { rank: 2, city: 'Bangalore', co2: `${(s.totalCo2Saved * 0.63 / 1000).toFixed(1)}T`, pct: 63 },
              { rank: 3, city: 'Pune',      co2: `${(s.totalCo2Saved * 0.40 / 1000).toFixed(1)}T`, pct: 40 },
          ].map(item => `
            <div class="leaderboard-item" style="${item.rank < 3 ? 'border-bottom:1px solid var(--color-border)' : ''}">
              <span class="leaderboard-item__rank">${item.rank}</span>
              <div style="flex:1">
                <div class="leaderboard-item__name">${item.city}</div>
                <div class="progress-bar" style="height:4px;margin-top:4px">
                  <div class="progress-bar__fill" style="width:${item.pct}%"></div>
                </div>
              </div>
              <span class="leaderboard-item__value">${item.co2}</span>
            </div>
          `).join('')}
        </div>

        <!-- Share Card -->
        <div style="margin:var(--space-md);background:linear-gradient(135deg,#0a1a0a,#001a00);border:1px solid rgba(76,175,130,0.3);border-radius:var(--radius-card);padding:var(--space-md);text-align:center">
          <div style="font-size:32px;margin-bottom:8px">🌍</div>
          <div style="font:var(--text-h3);color:var(--color-green)">
            ${userCo2 > 0
              ? `You've helped save ${userCo2.toLocaleString('en-IN')} kg of CO₂`
              : 'Start transacting to track your CO₂ impact'}
          </div>
          <div style="font:var(--text-caption);color:var(--color-text-muted);margin:4px 0 12px">
            Equivalent to planting ~${Math.round(userCo2 / 20)} trees
          </div>
          <button class="btn btn--outline" style="height:40px;font-size:13px" id="share-impact-btn">
            📤 Share Your Impact
          </button>
        </div>
      </div>
    `;

        this._bindActions(userCo2, co2Goal, userTx, txGoal, totalTonnes);
    }

    _bindActions(userCo2, co2Goal, userTx, txGoal, totalTonnes) {
        // Animate on next frame (will be called again from onActivate)
        this.el.querySelector('#impact-share-btn')?.addEventListener('click', () => {
            window.showToast?.('Impact sharing coming soon!', 'info');
        });

        this.el.querySelector('#share-impact-btn')?.addEventListener('click', () => {
            const text = `I've helped save ${userCo2.toLocaleString('en-IN')} kg of CO₂ by trading reclaimed materials on Spolia! 🌱`;
            navigator.clipboard?.writeText(text)
                .then(() => window.showToast?.('Impact message copied!', 'success'))
                .catch(() => window.showToast?.('Impact sharing coming soon!', 'info'));
        });

        // Trigger animations
        requestAnimationFrame(() => setTimeout(() => this._animate(userCo2, co2Goal, userTx, txGoal, parseFloat(totalTonnes)), 300));
    }

    _animate(userCo2, co2Goal, userTx, txGoal, totalTonnes) {
        const ring = this.el.querySelector('#ring-fill');
        const valueEl = this.el.querySelector('#ring-value');
        const CIRCUMFERENCE = 597;
        // Fill ratio: cap at 95% for visual breathing room
        const fillRatio = Math.min(0.95, totalTonnes / 20);

        if (ring) {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
            ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - fillRatio);
        }

        if (valueEl) {
            let start = 0;
            const dur = 1500;
            const startTime = performance.now();
            const tick = (now) => {
                const progress = Math.min((now - startTime) / dur, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                valueEl.textContent = (ease * totalTonnes).toFixed(1);
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        setTimeout(() => {
            const co2Bar = this.el.querySelector('#co2-bar');
            const txBar = this.el.querySelector('#tx-bar');
            if (co2Bar) co2Bar.style.width = `${Math.min(100, (userCo2 / co2Goal) * 100).toFixed(1)}%`;
            if (txBar)  txBar.style.width  = `${Math.min(100, (userTx / txGoal) * 100).toFixed(1)}%`;
        }, 200);
    }

    async onActivate() {
        // Unsubscribe any existing listener before re-subscribing
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }

        // Load live user profile
        const profile = window.App?.currentUserProfile || null;

        // Do initial render immediately with cached/mock stats while real-time loads
        if (!this._stats) {
            this.render(null, profile);
        }

        // Subscribe to live platform stats
        this._unsubscribe = FirebaseDB.listenToPlatformStats((stats) => {
            this._stats = stats;
            this.render(stats, window.App?.currentUserProfile || profile);
        });
    }
}
