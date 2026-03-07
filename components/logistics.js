// components/logistics.js — Logistics & Pickup Verification
import { loadMap, getRoute } from '../utils/maps.js';
import { FirebaseDB } from '../firebase-config.js';

export class LogisticsScreen {
    constructor(el) {
        this.el = el;
        this.selectedPartner = 'porter';
        // Context from material-detail Bond flow
        this.listingId = null;
        this.listingTitle = null;
        this.bondId = null;
        this.pickupLocation = null;
        this.materialType = null;
        this.depositAmount = null;
    }

    render() {
        const pickup = this.pickupLocation?.label || 'Pickup Location';
        const typeLabel = this.materialType?.toUpperCase() || 'MATERIAL';

        this.el.innerHTML = `
      <header class="page-header">
        <div style="display:flex;align-items:center;gap:12px">
          <button id="back-btn" class="icon-btn" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 class="page-header__title">Pickup Route</h1>
            <p class="page-header__subtitle">${pickup} → Your site</p>
          </div>
        </div>
        <span class="badge badge--type">${typeLabel}</span>
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
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">${pickup}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">Your Site</span>
            <div style="width:10px;height:10px;border-radius:50%;background:var(--color-blue)"></div>
          </div>
          <div style="text-align:right">
            <span style="font:600 13px/1 var(--font-body);color:var(--color-text-primary)" id="route-info">Calculating...</span>
          </div>
        </div>

        <!-- Bond Status Banner -->
        ${this.bondId ? `
          <div style="margin:0 var(--space-md) var(--space-sm);background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.2);border-radius:var(--radius-sm);padding:12px 16px;display:flex;align-items:center;gap:10px">
            <span style="font-size:20px">🔒</span>
            <div>
              <div style="font:600 13px/1 var(--font-body);color:var(--color-gold)">Bond Active: ${this.bondId}</div>
              <div style="font:var(--text-caption);color:var(--color-text-muted);margin-top:2px">Deposit: ₹${(this.depositAmount || 0).toLocaleString?.('en-IN') || this.depositAmount} in escrow</div>
            </div>
          </div>` : ''}

        <!-- Logistics Partner Selection -->
        <div class="section-header">
          <h2 class="section-header__title">Choose Logistics Partner</h2>
        </div>

        ${[
            { id: 'porter',      emoji: '🚛', name: 'Porter',       desc: 'Tempo · Up to 500 kg', eta: 'Available Now', price: '₹1,200' },
            { id: 'ubermoto',    emoji: '🏍️', name: 'Uber Moto',    desc: 'Bike · Up to 20 kg',   eta: '3 min away',   price: '₹180' },
            { id: 'selfpickup',  emoji: '🚘', name: 'Self-Pickup',  desc: 'Your vehicle · Flexible', eta: 'Anytime',   price: '₹0' },
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
              <!-- QR pattern -->
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
          <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-bottom:2px">
            Bond ID: <span style="color:var(--color-gold);font-weight:600">${this.bondId || 'BOND-XXXX'}</span>
          </div>
          <div style="font:var(--text-caption);color:var(--color-text-muted)">Valid for 24 hours · One-time use</div>
        </div>

        <!-- Action Buttons -->
        <div style="padding:0 var(--space-md);display:flex;flex-direction:column;gap:8px">
          <button class="btn btn--gold" id="confirm-logistics">
            🚛 Confirm &amp; Book Transport
          </button>
          ${this.bondId ? `
            <button class="btn btn--outline" id="view-bond-btn">
              View Bond Details
            </button>` : ''}
        </div>
      </div>
    `;

        this._bindEvents();
    }

    _bindEvents() {
        // Back button
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            if (this.listingId) {
                window.navigate?.('material-detail', { listingId: this.listingId });
            } else {
                window.navigate?.('radar');
            }
        });

        // Partner selection
        this.el.querySelectorAll('.logistics-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectedPartner = option.dataset.partner;
                this.el.querySelectorAll('.logistics-option').forEach(o => {
                    const sel = o.dataset.partner === this.selectedPartner;
                    o.classList.toggle('selected', sel);
                    o.setAttribute('aria-checked', sel);
                });
                const name = option.querySelector('.logistics-option__name')?.textContent;
                window.showToast?.(`${name} selected`, 'info');
            });
        });

        // Confirm & book
        this.el.querySelector('#confirm-logistics')?.addEventListener('click', () => this._confirmBooking());

        // View bond details
        this.el.querySelector('#view-bond-btn')?.addEventListener('click', () => {
            if (this.listingId) {
                window.navigate?.('material-detail', { listingId: this.listingId });
            } else {
                window.showToast?.('Bond details: ' + (this.bondId || 'N/A'), 'info');
            }
        });
    }

    async _confirmBooking() {
        const btn = this.el.querySelector('#confirm-logistics');
        const partnerNames = { porter: 'Porter', ubermoto: 'Uber Moto', selfpickup: 'Self-Pickup' };
        const partner = partnerNames[this.selectedPartner] || 'Transport';

        if (btn) { btn.textContent = 'Booking...'; btn.disabled = true; }

        try {
            // Update bond status to "logistics_confirmed" in Firestore
            if (this.bondId) {
                await FirebaseDB.updateBondStatus(this.bondId, 'logistics_confirmed');
            }

            window.showToast?.(`${partner} booked! 🚛 QR code is now active.`, 'success');

            if (btn) {
                btn.innerHTML = `✓ ${partner} Booked`;
                btn.style.background = 'var(--color-green)';
                btn.style.color = '#fff';
            }

        } catch (err) {
            console.error('[Logistics] confirmBooking error:', err);
            window.showToast?.('Booking failed. Please try again.', 'error');
            if (btn) { btn.textContent = '🚛 Confirm & Book Transport'; btn.disabled = false; }
        }
    }

    onActivate(params = {}) {
        if (params.listingId)    this.listingId = params.listingId;
        if (params.listingTitle) this.listingTitle = params.listingTitle;
        if (params.bondId)       this.bondId = params.bondId;
        if (params.pickupLocation) this.pickupLocation = params.pickupLocation;
        if (params.materialType) this.materialType = params.materialType;
        if (params.depositAmount) this.depositAmount = params.depositAmount;

        // Re-render with fresh context
        this.render();

        // Try to load map after render
        const mapEl = this.el.querySelector('#logistics-map');
        if (mapEl && this.pickupLocation?.lat) {
            loadMap(mapEl, { lat: this.pickupLocation.lat, lng: this.pickupLocation.lng });
        } else if (mapEl) {
            loadMap(mapEl, { lat: 19.076, lng: 72.877 });
        }

        // Simulate route calculation
        const routeEl = this.el.querySelector('#route-info');
        if (routeEl) {
            setTimeout(() => {
                const dist = ((Math.random() * 5) + 0.5).toFixed(1);
                const mins = Math.round(dist * 4 + 8);
                routeEl.textContent = `${dist} km · ${mins} min`;
            }, 800);
        }
    }
}
