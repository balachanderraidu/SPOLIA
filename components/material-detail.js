// components/material-detail.js — Material Detail & Spolia Bond
import { FirebaseDB, MOCK_LISTINGS } from '../firebase-config.js';
import { DisputeScreen } from './dispute.js';

export class MaterialDetailScreen {
    constructor(el) {
        this.el = el;
        this.listing = null;
    }

    render(listing = null) {
        this.listing = listing || MOCK_LISTINGS[0];
        const l = this.listing;

        this.el.innerHTML = `
      <!-- Hero Image (no header — immersive) -->
      <div style="position:relative">
        <div class="material-hero-img" style="font-size:80px"
          role="img" aria-label="${l.title} material photo">
          ${this._emoji(l.type)}
        </div>
        <!-- Overlay controls -->
        <div style="position:absolute;top:env(safe-area-inset-top,16px);left:0;right:0;padding:16px;display:flex;justify-content:space-between;z-index:10">
          <button onclick="window.navigate('radar')" class="icon-btn"
            style="background:rgba(0,0,0,0.5);border-color:rgba(255,255,255,0.2);color:#fff" aria-label="Go back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <button class="icon-btn"
            style="background:rgba(0,0,0,0.5);border-color:rgba(255,255,255,0.2);color:#fff" aria-label="Share listing"
            onclick="window.showToast('Share link copied!','success')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        ${l.bondProtected ? `
          <div style="position:absolute;top:env(safe-area-inset-top,16px);right:72px;padding-top:16px">
            <span class="badge badge--bond">🔒 Bond</span>
          </div>` : ''}
      </div>

      <!-- Content -->
      <div style="padding-top:0;padding-bottom:120px">
        <!-- Title Section -->
        <div style="padding:var(--space-md)">
          <h1 style="font:var(--text-h1);color:var(--color-text-primary);margin-bottom:6px">${l.title}</h1>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:22px">👤</span>
            <div>
              <span style="font:var(--text-caption);color:var(--color-text-secondary)">${l.seller?.name}</span>
              ${l.verified ? `<span class="badge badge--verified" style="padding:1px 5px;font-size:9px;margin-left:4px">✓</span>` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">${l.distance} km · ${l.location?.label}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge badge--type">${l.type?.toUpperCase()}</span>
            ${l.bondProtected ? `<span class="badge badge--bond">🔒 Bond Protected</span>` : ''}
            <span class="badge badge--ai">✨ AI Estimated</span>
          </div>
        </div>

        <div class="divider" style="margin: 0"></div>

        <!-- Description -->
        <div style="padding:var(--space-md)">
          <h2 style="font:var(--text-h3);color:var(--color-text-secondary);margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase">About</h2>
          <p style="font:var(--text-body);color:var(--color-text-secondary);line-height:1.7">${l.description}</p>
        </div>

        <!-- Specifications -->
        <div class="section-header" style="padding-top:0">
          <h2 class="section-header__title">Specifications</h2>
        </div>
        <div class="data-grid" style="margin:0 var(--space-md) var(--space-md)">
          <div class="data-tile">
            <span class="data-tile__value gold">${l.currency}${l.price}/${l.unit}</span>
            <span class="data-tile__label">Price per unit</span>
          </div>
          <div class="data-tile">
            <span class="data-tile__value">${l.quantity} ${l.unit}</span>
            <span class="data-tile__label">Available</span>
          </div>
          ${l.specs ? Object.entries(l.specs).map(([k, v]) => `
            <div class="data-tile">
              <span class="data-tile__value">${v}</span>
              <span class="data-tile__label">${k.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>`).join('') : ''}
        </div>

        <!-- CO₂ Impact -->
        <div style="margin:0 var(--space-md) var(--space-md);display:flex;align-items:center;gap:10px;
          background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);border-radius:var(--radius-sm);padding:12px">
          <span style="font-size:24px">🌱</span>
          <div>
            <div style="font:var(--text-body);color:var(--color-green);font-weight:600">${l.co2Saved} kg CO₂ saved</div>
            <div style="font:var(--text-caption);color:var(--color-text-muted)">vs. producing equivalent new material</div>
          </div>
        </div>

        <!-- Spolia Bond Box -->
        <div class="bond-box" role="complementary" aria-label="Spolia Bond guarantee information">
          <div class="bond-box__header">
            <span style="font-size:22px">🔒</span>
            <span class="bond-box__title">The Spolia Bond</span>
            <span class="badge badge--bond" style="margin-left:auto">PROTECTED</span>
          </div>
          <p class="bond-box__desc">
            A <strong style="color:var(--color-gold)">refundable ₹8,000 deposit</strong> is held in escrow when you commit to this listing.
            Released to the seller upon verified pickup.
            If material quality doesn't match the listing, the bond protects you.
          </p>
          <div style="display:flex;gap:12px;margin-top:12px;font:var(--text-caption);color:var(--color-text-muted)">
            <span>✓ Quality verified</span>
            <span>✓ Escrow held</span>
            <span>✓ Dispute covered</span>
          </div>
        </div>

        <!-- Dispute Link -->
        <div style="padding:0 var(--space-md)">
          <button style="width:100%;text-align:center;font:var(--text-caption);color:var(--color-text-muted);padding:8px;background:none;border:none;cursor:pointer"
            onclick="window.navigate('dispute')">
            ⚠️ Report a Quality Issue with this listing
          </button>
        </div>
      </div>

      <!-- Sticky CTA -->
      <div style="position:fixed;bottom:var(--nav-height);left:50%;transform:translateX(-50%);
        width:100%;max-width:480px;padding:var(--space-md);background:rgba(13,13,13,0.95);
        backdrop-filter:blur(12px);border-top:1px solid var(--color-border);z-index:150">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div>
            <span style="font:var(--text-h2);color:var(--color-gold)">${l.currency}${(l.price * l.quantity).toLocaleString('en-IN')}</span>
            <span style="font:var(--text-caption);color:var(--color-text-muted);margin-left:4px">total · ${l.quantity} ${l.unit}</span>
          </div>
          <span class="co2-tag">🌱 ${l.co2Saved}kg</span>
        </div>
        <button class="btn btn--bond" onclick="window.showToast('Spolia Bond checkout coming soon!','info')">
          🔒 Secure with Spolia Bond — ₹8,000
          <span class="btn__sub">Refundable deposit · Quality guaranteed</span>
        </button>
      </div>
    `;
    }

    onActivate(params = {}) {
        if (params.listingId) {
            FirebaseDB.getListing(params.listingId).then(listing => {
                if (listing) this.render(listing);
            });
        }
    }

    _emoji(type) {
        const map = { stone: '🪨', marble: '🪨', steel: '⚙️', wood: '🪵', brick: '🧱', glass: '🔷' };
        return map[type] || '📦';
    }
}
