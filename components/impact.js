// components/impact.js — Impact Dashboard
export class ImpactScreen {
    constructor(el) {
        this.el = el;
        this.animRan = false;
    }

    render() {
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
          <div class="ring-chart" role="img" aria-label="14.5 tons CO2 saved, 72% of annual goal">
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
            <div class="stat-card__value">₹2.8Cr</div>
            <div class="stat-card__label">Material Value Rescued</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">847</div>
            <div class="stat-card__label">Transactions</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">124 T</div>
            <div class="stat-card__label">Weight Diverted</div>
          </div>
        </div>

        <!-- Your Contribution -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🌱 Your Contribution</h2>
          <span class="section-header__action">View All</span>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-md)">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:50%;background:var(--color-bg-elevated);border:2px solid var(--color-gold);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
              👤
            </div>
            <div>
              <div style="font:var(--text-h3);color:var(--color-text-primary)">Arjun Mehta</div>
              <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
                <span style="font:var(--text-caption);color:var(--color-text-secondary)">Architect</span>
                <span class="badge badge--verified" style="padding:1px 6px;font-size:9px">✓ VERIFIED</span>
              </div>
            </div>
          </div>

          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font:var(--text-caption);color:var(--color-text-secondary)">CO₂ Saved</span>
              <span style="font:var(--text-caption);color:var(--color-green);font-weight:600">3,840 kg / 5,000 kg goal</span>
            </div>
            <div class="progress-bar"><div class="progress-bar__fill" id="co2-bar" style="width:0%"></div></div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px">
              <span style="font:var(--text-caption);color:var(--color-text-secondary)">Transactions</span>
              <span style="font:var(--text-caption);color:var(--color-gold);font-weight:600">12 / 20 milestone</span>
            </div>
            <div class="progress-bar"><div class="progress-bar__fill gold" id="tx-bar" style="width:0%"></div></div>
          </div>
        </div>

        <!-- City Leaderboard -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🏆 City Leaderboard</h2>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden">
          ${[
                { rank: 1, city: 'Mumbai', co2: '14.5T', pct: 100 },
                { rank: 2, city: 'Bangalore', co2: '9.2T', pct: 63 },
                { rank: 3, city: 'Pune', co2: '5.8T', pct: 40 },
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
          <div style="font:var(--text-h3);color:var(--color-green)">You've helped save 3,840 kg of CO₂</div>
          <div style="font:var(--text-caption);color:var(--color-text-muted);margin:4px 0 12px">Equivalent to planting ~192 trees</div>
          <button class="btn btn--outline" style="height:40px;font-size:13px" onclick="window.showToast('Share feature coming soon!','info')">
            📤 Share Your Impact
          </button>
        </div>
      </div>
    `;
    }

    onActivate() {
        if (!this.animRan) {
            this.animRan = true;
            requestAnimationFrame(() => setTimeout(() => this._animate(), 300));
        }
    }

    _animate() {
        // Ring animation
        const ring = this.el.querySelector('#ring-fill');
        const valueEl = this.el.querySelector('#ring-value');
        const TARGET = 14.5;
        const CIRCUMFERENCE = 597;
        const FILL_RATIO = 0.72;

        if (ring) {
            ring.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
            ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - FILL_RATIO);
        }

        // Counting animation
        if (valueEl) {
            let start = 0;
            const dur = 1500;
            const startTime = performance.now();
            const tick = (now) => {
                const progress = Math.min((now - startTime) / dur, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                valueEl.textContent = (ease * TARGET).toFixed(1);
                if (progress < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        // Progress bars
        setTimeout(() => {
            const co2Bar = this.el.querySelector('#co2-bar');
            const txBar = this.el.querySelector('#tx-bar');
            if (co2Bar) co2Bar.style.width = '76.8%';
            if (txBar) txBar.style.width = '60%';
        }, 200);
    }
}
