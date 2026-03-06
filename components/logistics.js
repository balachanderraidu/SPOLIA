// components/logistics.js — Logistics & Pickup Verification
import { loadMap, getRoute } from '../utils/maps.js';

export class LogisticsScreen {
    constructor(el) {
        this.el = el;
        this.selectedPartner = 'porter';
    }

    render() {
        this.el.innerHTML = `
      <header class="page-header">
        <div style="display:flex;align-items:center;gap:12px">
          <button onclick="window.navigate('radar')" class="icon-btn" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 class="page-header__title">Pickup Route</h1>
            <p class="page-header__subtitle">Bandra West → Andheri West</p>
          </div>
        </div>
        <span class="badge badge--type">STONE</span>
      </header>

      <div style="padding-bottom:var(--space-xl)">
        <!-- Map -->
        <div class="map-container" id="logistics-map" style="margin-top:var(--space-sm)">
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="1.5">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style="font:var(--text-caption);color:var(--color-text-muted)">Map loads with Google Maps API</span>
          </div>
        </div>

        <!-- Route Info Strip -->
        <div style="margin:var(--space-sm) var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:10px;height:10px;border-radius:50%;background:var(--color-gold)"></div>
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">Bandra West</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">Andheri West</span>
            <div style="width:10px;height:10px;border-radius:50%;background:var(--color-blue)"></div>
          </div>
          <div style="text-align:right">
            <span style="font:600 13px/1 var(--font-body);color:var(--color-text-primary)">4.2 km · 18 min</span>
          </div>
        </div>

        <!-- Logistics Partner Selection -->
        <div class="section-header">
          <h2 class="section-header__title">Choose Logistics Partner</h2>
        </div>

        ${[
                { id: 'porter', emoji: '🚛', name: 'Porter', desc: 'Tempo · Up to 500 kg', eta: 'Available Now', price: '₹1,200' },
                { id: 'ubermoto', emoji: '🏍️', name: 'Uber Moto', desc: 'Bike · Up to 20 kg', eta: '3 min away', price: '₹180' },
                { id: 'selfpickup', emoji: '🚘', name: 'Self-Pickup', desc: 'Your vehicle · Flexible', eta: 'Anytime', price: '₹0' },
            ].map(p => `
          <div class="logistics-option ${p.id === this.selectedPartner ? 'selected' : ''}"
            data-partner="${p.id}" role="radio" aria-checked="${p.id === this.selectedPartner}" tabindex="0">
            <div class="logistics-option__icon">${p.emoji}</div>
            <div style="flex:1">
              <div class="logistics-option__name">${p.name}</div>
              <div class="logistics-option__eta">${p.desc} · ${p.eta}</div>
            </div>
            <div style="text-align:right">
              <div class="logistics-option__price">${p.price}</div>
              ${p.id === this.selectedPartner ? '<div style="font:var(--text-caption);color:var(--color-gold)">Selected</div>' : ''}
            </div>
          </div>`).join('')}

        <!-- QR Code -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🔐 Pickup Verification QR</h2>
        </div>
        <div class="qr-card">
          <div class="qr-box" aria-label="QR code for pickup verification">
            <svg width="140" height="140" viewBox="0 0 140 140" fill="none" style="border-radius:4px">
              <rect width="140" height="140" fill="white"/>
              <!-- Simplified QR pattern for demo -->
              <rect x="10" y="10" width="40" height="40" fill="#0D0D0D" rx="2"/>
              <rect x="15" y="15" width="30" height="30" fill="white" rx="1"/>
              <rect x="20" y="20" width="20" height="20" fill="#0D0D0D" rx="1"/>
              <rect x="90" y="10" width="40" height="40" fill="#0D0D0D" rx="2"/>
              <rect x="95" y="15" width="30" height="30" fill="white" rx="1"/>
              <rect x="100" y="20" width="20" height="20" fill="#0D0D0D" rx="1"/>
              <rect x="10" y="90" width="40" height="40" fill="#0D0D0D" rx="2"/>
              <rect x="15" y="95" width="30" height="30" fill="white" rx="1"/>
              <rect x="20" y="100" width="20" height="20" fill="#0D0D0D" rx="1"/>
              <rect x="60" y="10" width="8" height="8" fill="#0D0D0D"/>
              <rect x="75" y="10" width="8" height="8" fill="#0D0D0D"/>
              <rect x="60" y="25" width="8" height="8" fill="#0D0D0D"/>
              <rect x="10" y="60" width="8" height="8" fill="#0D0D0D"/>
              <rect x="25" y="75" width="8" height="8" fill="#0D0D0D"/>
              <rect x="60" y="60" width="8" height="8" fill="#0D0D0D"/>
              <rect x="75" y="75" width="8" height="8" fill="#0D0D0D"/>
              <rect x="90" y="60" width="8" height="8" fill="#0D0D0D"/>
              <rect x="105" y="75" width="8" height="8" fill="#0D0D0D"/>
              <rect x="120" y="60" width="8" height="8" fill="#0D0D0D"/>
            </svg>
          </div>
          <div style="font:var(--text-h3);color:var(--color-text-primary);margin-bottom:4px">Show at Site</div>
          <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-bottom:2px">Bond ID: <span style="color:var(--color-gold);font-weight:600">BOND-2847</span></div>
          <div style="font:var(--text-caption);color:var(--color-text-muted)">Valid for 24 hours · One-time use</div>
        </div>

        <!-- Confirm Button -->
        <div style="padding:0 var(--space-md);display:flex;flex-direction:column;gap:8px">
          <button class="btn btn--gold" id="confirm-logistics"
            onclick="window.showToast('Porter booked! QR code is active.','success')">
            🚛 Confirm &amp; Book Porter
          </button>
          <button class="btn btn--outline"
            onclick="window.showToast('Bond details coming soon','info')">
            View Bond Details
          </button>
        </div>
      </div>
    `;

        this._bindPartnerSelection();
    }

    _bindPartnerSelection() {
        this.el.querySelectorAll('.logistics-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectedPartner = option.dataset.partner;
                this.el.querySelectorAll('.logistics-option').forEach(o => {
                    const sel = o.dataset.partner === this.selectedPartner;
                    o.classList.toggle('selected', sel);
                    o.setAttribute('aria-checked', sel);
                });
                window.showToast(`${option.querySelector('.logistics-option__name').textContent} selected`, 'info');
            });
        });
    }

    onActivate() {
        const mapEl = this.el.querySelector('#logistics-map');
        if (mapEl) loadMap(mapEl, { lat: 19.076, lng: 72.877 });
    }
}
