// components/listing-create.js — Create Listing (Post-Scanner)
// Design from Stitch: SPOLIA Create Listing Form
import { FirebaseDB, FirebaseStorage } from '../firebase-config.js';
import { estimateCO2Savings } from '../utils/gemini.js';
import { EXPIRY_MATERIALS } from '../utils/expiry.js';

const MATERIAL_TYPES = [
    'stone', 'marble', 'steel', 'wood', 'brick', 'glass',
    'tile', 'plumbing', 'cement', 'bulk', 'metal', 'other'
];
const UNITS = ['sqft', 'pieces', 'kg', 'tonnes', 'bags', 'lots', 'sheets', 'metres'];

export class ListingCreateScreen {
    constructor(el) {
        this.el = el;
        this.photos = [];
        this.bondEnabled = true;
        this.scanData = null;     // pre-filled from scanner
    }

    render(scanData = null) {
        if (scanData) this.scanData = scanData;
        const d = this.scanData || {};

        this.el.innerHTML = `
      <div style="min-height:100%;background:var(--color-bg-base);padding-bottom:100px">
        <!-- Header -->
        <header class="page-header">
          <div style="display:flex;align-items:center;gap:12px">
            <button id="back-btn" class="icon-btn" aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1 class="page-header__title">Create Listing</h1>
          </div>
          ${d.materialType ? `<span class="badge badge--ai" style="font-size:10px">✨ AI Pre-filled</span>` : ''}
        </header>

        <!-- Photo Upload Strip -->
        <div style="padding:0 var(--space-md) var(--space-md)">
          <label class="form-label" style="display:block;margin-bottom:10px">Photos</label>
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:4px" id="photo-strip">
            ${this._renderPhotoSlots()}
          </div>
          <input type="file" id="photo-input" accept="image/*" multiple style="display:none">
        </div>

        <!-- Form -->
        <div class="form-field">
          <label class="form-label" for="listing-title">Material Title</label>
          <input class="form-input" id="listing-title" type="text"
            placeholder="e.g. Reclaimed Italian Travertine"
            value="${d.materialType || ''}">
        </div>

        <div class="form-field">
          <label class="form-label" for="listing-type">Material Type</label>
          <select class="form-select" id="listing-type">
            ${MATERIAL_TYPES.map(t => `
              <option value="${t}" ${d.category === t ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>
            `).join('')}
          </select>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;padding:0 var(--space-md) var(--space-md)">
          <div>
            <label class="form-label" for="listing-qty">Quantity</label>
            <input class="form-input" id="listing-qty" type="number" min="1"
              placeholder="e.g. 240"
              value="${d.estimatedQuantity?.value || ''}">
          </div>
          <div>
            <label class="form-label" for="listing-unit">Unit</label>
            <select class="form-select" id="listing-unit">
              ${UNITS.map(u => `
                <option value="${u}" ${d.estimatedQuantity?.unit === u ? 'selected' : ''}>${u}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label" for="listing-price">Price per unit (₹)</label>
          <input class="form-input" id="listing-price" type="number" min="1"
            placeholder="e.g. 180"
            value="${d.estimatedPricePerUnit || ''}">
        </div>

        <div class="form-field">
          <label class="form-label" for="listing-desc">Description</label>
          <textarea class="form-textarea" id="listing-desc" rows="3"
            placeholder="Describe the material, condition, provenance..."
            maxlength="500">${d.description || ''}</textarea>
        </div>

        <div class="form-field">
          <label class="form-label" for="listing-location">Pickup Location</label>
          <input class="form-input" id="listing-location" type="text"
            placeholder="e.g. Bandra West, Mumbai">
        </div>

        <!-- Near-Expiry Rescue Field (shown for perishable materials) -->
        <div class="form-field" id="expiry-field" style="display:none">
          <label class="form-label" for="listing-expiry" style="display:flex;align-items:center;gap:6px">
            <span style="color:#FFA000">⏳</span> Use-By / Batch Expiry Date
            <span style="font:400 11px Inter;color:var(--color-text-muted);margin-left:auto">Optional</span>
          </label>
          <input class="form-input" id="listing-expiry" type="date"
            style="color-scheme:dark"
            min="${new Date().toISOString().split('T')[0]}">
          <p style="font:var(--text-caption);color:#FFA000;margin:4px var(--space-md) 0;line-height:1.4">
            🔴 Listings expiring within 10 days get an <strong>URGENT RESCUE</strong> badge and appear first on the Radar.
          </p>
        </div>

        <!-- Bond Toggle -->
        <div style="margin:0 var(--space-md) var(--space-md);
          background:var(--color-bg-surface);border:1px solid var(--color-border);
          border-radius:var(--radius-card);padding:var(--space-md)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div>
              <div style="font:600 14px/1 Inter,sans-serif;color:var(--color-text-primary)">🔒 Spolia Bond Protection</div>
              <div style="font:var(--text-caption);color:var(--color-text-muted);margin-top:4px;line-height:1.4">
                Buyers pay a refundable deposit. You get paid on verified pickup.
              </div>
            </div>
            <!-- Toggle -->
            <div id="bond-toggle" role="switch" aria-checked="${this.bondEnabled}" tabindex="0"
              style="width:48px;height:28px;border-radius:14px;
                background:${this.bondEnabled ? 'var(--color-gold)' : 'var(--color-border)'};
                position:relative;cursor:pointer;transition:background 200ms;flex-shrink:0">
              <div style="position:absolute;top:3px;
                left:${this.bondEnabled ? '23px' : '3px'};
                width:22px;height:22px;border-radius:50%;
                background:${this.bondEnabled ? '#0D0D0D' : 'var(--color-text-muted)'};
                transition:left 200ms,background 200ms"></div>
            </div>
          </div>
        </div>

        <!-- CO2 Impact (read-only) -->
        <div id="co2-row" style="margin:0 var(--space-md) var(--space-md);
          display:flex;align-items:center;gap:10px;
          background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);
          border-radius:var(--radius-sm);padding:12px 16px">
          <span style="font-size:20px">🌱</span>
          <div>
            <div style="font:600 14px/1 Inter,sans-serif;color:var(--color-green)" id="co2-display">
              ${d.co2SavedKg ? `${d.co2SavedKg.toLocaleString('en-IN')} kg CO₂ saved` : 'Enter quantity to estimate CO₂ savings'}
            </div>
            <div style="font:var(--text-caption);color:var(--color-text-muted);margin-top:2px">
              vs. producing equivalent new material
            </div>
          </div>
        </div>

      </div>

      <!-- Sticky CTA -->
      <div style="position:fixed;bottom:var(--nav-height);left:50%;transform:translateX(-50%);
        width:100%;max-width:480px;padding:var(--space-md);
        background:rgba(13,13,13,0.95);backdrop-filter:blur(12px);
        border-top:1px solid var(--color-border);z-index:150">
        <button class="btn btn--gold" id="publish-btn" style="font-size:15px">
          ✦ Publish Listing
        </button>
      </div>
    `;

        this._bindEvents();
    }

    _renderPhotoSlots() {
        const slots = [];
        // Existing photos
        this.photos.forEach((p, i) => {
            slots.push(`
          <div style="width:88px;height:88px;border-radius:12px;overflow:hidden;flex-shrink:0;
            border:1px solid var(--color-border);position:relative">
            <img src="${p.url}" style="width:100%;height:100%;object-fit:cover" alt="Photo ${i + 1}">
            <button data-idx="${i}" class="remove-photo-btn"
              style="position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;
              background:var(--color-red);color:#fff;border:none;font-size:11px;cursor:pointer;
              display:flex;align-items:center;justify-content:center">✕</button>
          </div>`);
        });
        // Add photo slot
        if (this.photos.length < 6) {
            slots.push(`
          <button id="add-photo-btn"
            style="width:88px;height:88px;border-radius:12px;border:2px dashed var(--color-border);
            background:var(--color-bg-surface);display:flex;flex-direction:column;align-items:center;
            justify-content:center;gap:4px;cursor:pointer;flex-shrink:0">
            <span style="font-size:22px;color:var(--color-gold)">📷</span>
            <span style="font:600 10px/1 Inter,sans-serif;color:var(--color-text-muted)">Add Photo</span>
          </button>`);
        }
        return slots.join('');
    }

    _bindEvents() {
        // Back
        this.el.querySelector('#back-btn')?.addEventListener('click', () => window.goBack?.('scanner'));

        // Photo upload
        const photoInput = this.el.querySelector('#photo-input');
        this.el.querySelector('#add-photo-btn')?.addEventListener('click', () => photoInput?.click());
        photoInput?.addEventListener('change', () => {
            Array.from(photoInput.files).forEach(f => {
                if (this.photos.length < 6) {
                    this.photos.push({ file: f, url: URL.createObjectURL(f) });
                }
            });
            this._refreshPhotoStrip();
            photoInput.value = '';
        });

        // Remove photo
        this.el.querySelectorAll('.remove-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                URL.revokeObjectURL(this.photos[idx].url);
                this.photos.splice(idx, 1);
                this._refreshPhotoStrip();
            });
        });

        // Bond toggle
        const bondToggle = this.el.querySelector('#bond-toggle');
        bondToggle?.addEventListener('click', () => {
            this.bondEnabled = !this.bondEnabled;
            bondToggle.setAttribute('aria-checked', this.bondEnabled);
            bondToggle.style.background = this.bondEnabled ? 'var(--color-gold)' : 'var(--color-border)';
            bondToggle.querySelector('div').style.left = this.bondEnabled ? '23px' : '3px';
            bondToggle.querySelector('div').style.background = this.bondEnabled ? '#0D0D0D' : 'var(--color-text-muted)';
        });

        // CO2 auto-calc on qty/type change
        const qtyInput = this.el.querySelector('#listing-qty');
        const typeSelect = this.el.querySelector('#listing-type');
        const unitSelect = this.el.querySelector('#listing-unit');
        const updateCO2 = () => {
            const qty = parseFloat(qtyInput?.value) || 0;
            const type = typeSelect?.value || 'other';
            const unit = unitSelect?.value || 'kg';
            if (qty > 0) {
                const co2 = estimateCO2Savings(type, qty, unit);
                const display = this.el.querySelector('#co2-display');
                if (display) display.textContent = `${co2.toLocaleString('en-IN')} kg CO₂ saved`;
            }
        };
        qtyInput?.addEventListener('input', updateCO2);
        typeSelect?.addEventListener('change', updateCO2);
        unitSelect?.addEventListener('change', updateCO2);
        // Show expiry field for perishable materials
        typeSelect?.addEventListener('change', () => this._showExpiryField(typeSelect.value));
        if (typeSelect) this._showExpiryField(typeSelect.value); // on load

        // AI price discount hint on expiry date selection
        const expiryInput = this.el.querySelector('#listing-expiry');
        expiryInput?.addEventListener('change', () => {
            const expiryVal = expiryInput.value;
            if (!expiryVal) return;
            const daysLeft = Math.ceil((new Date(expiryVal) - Date.now()) / 86400000);
            const priceInput = this.el.querySelector('#listing-price');
            const currentPrice = parseFloat(priceInput?.value) || 0;
            let hint = '';
            if (daysLeft <= 3) {
                hint = `🔴 Critical — ${daysLeft} day(s) left. Consider pricing 40-50% below MRP to rescue fast.`;
            } else if (daysLeft <= 10) {
                hint = `🟠 Urgent — ${daysLeft} days left. A 25-35% discount drives 3× faster pickups.`;
            } else if (daysLeft <= 30) {
                hint = `🟡 ${daysLeft} days left. A 15-25% discount earns the RESCUE badge and Radar priority.`;
            }
            // Show/update hint
            let hintEl = this.el.querySelector('#expiry-price-hint');
            if (!hintEl) {
                hintEl = document.createElement('p');
                hintEl.id = 'expiry-price-hint';
                hintEl.style.cssText = 'font:400 11px/1.5 Inter;color:#FFA000;margin:4px var(--space-md) 0';
                expiryInput.parentElement?.appendChild(hintEl);
            }
            hintEl.textContent = hint;
        });


        // Publish
        this.el.querySelector('#publish-btn')?.addEventListener('click', () => this._publish());
    }

    _refreshPhotoStrip() {
        const strip = this.el.querySelector('#photo-strip');
        if (strip) strip.innerHTML = this._renderPhotoSlots();
        this._bindPhotoEvents();
    }

    _bindPhotoEvents() {
        const photoInput = this.el.querySelector('#photo-input');
        this.el.querySelector('#add-photo-btn')?.addEventListener('click', () => photoInput?.click());
        this.el.querySelectorAll('.remove-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                URL.revokeObjectURL(this.photos[idx].url);
                this.photos.splice(idx, 1);
                this._refreshPhotoStrip();
            });
        });
    }

    _showExpiryField(type) {
        const field = this.el.querySelector('#expiry-field');
        if (field) field.style.display = EXPIRY_MATERIALS.has(type) ? 'block' : 'none';
    }

    async _publish() {
        const title = this.el.querySelector('#listing-title')?.value?.trim();
        const type = this.el.querySelector('#listing-type')?.value;
        const qty = parseFloat(this.el.querySelector('#listing-qty')?.value);
        const unit = this.el.querySelector('#listing-unit')?.value;
        const price = parseFloat(this.el.querySelector('#listing-price')?.value);
        const desc = this.el.querySelector('#listing-desc')?.value?.trim();
        const location = this.el.querySelector('#listing-location')?.value?.trim();
        const expiryStr = this.el.querySelector('#listing-expiry')?.value || null;

        if (!title) { window.showToast?.('Please enter a material title', 'error'); return; }
        if (!qty || qty <= 0) { window.showToast?.('Please enter a valid quantity', 'error'); return; }
        if (!price || price <= 0) { window.showToast?.('Please enter a price', 'error'); return; }

        const btn = this.el.querySelector('#publish-btn');
        if (btn) { btn.textContent = 'Publishing...'; btn.disabled = true; }

        // ── DEMO MODE: show realistic feedback without touching Firestore
        const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
        if (isDemo) {
            await new Promise(r => setTimeout(r, 1400));
            if (btn) { btn.textContent = '✓ Listed!'; }
            window.showToast?.('🔒 Secure a Spolia Bond to publish live listings. This is a demo — your listing is preview-only.', 'info', 5000);
            setTimeout(() => window.navigate?.('radar'), 2500);
            return;
        }

        try {
            // Upload photos to Firebase Storage
            const imageUrls = [];
            for (const photo of this.photos) {
                const path = `listings/${Date.now()}_${photo.file.name}`;
                const url = await FirebaseStorage.uploadImage(photo.file, path);
                imageUrls.push(url);
            }

            // CO2 estimate
            const co2Saved = estimateCO2Savings(type, qty, unit);

            // Compute expiry + urgency
            const expiryDate = expiryStr ? new Date(expiryStr).toISOString() : null;
            const now = Date.now();
            const daysToExpiry = expiryDate
                ? Math.ceil((new Date(expiryDate) - now) / 86400000)
                : null;
            const isUrgentRescue = daysToExpiry !== null && daysToExpiry <= 10;

            // Create listing in Firestore
            const listingId = await FirebaseDB.createListing({
                title, type, quantity: qty, unit,
                price, currency: '₹',
                description: desc || '',
                location: { label: location || 'Mumbai' },
                bondProtected: this.bondEnabled,
                co2Saved,
                imageUrls,
                expiryDate,
                daysToExpiry,
                isUrgentRescue,
                verified: false   // pending manual verification
            });

            window.showToast?.('Listing published! 🎉 It will appear on the Radar shortly.', 'success');
            setTimeout(() => window.navigate?.('radar'), 2000);

        } catch (err) {
            console.error('[ListingCreate] Failed to publish:', err);
            window.showToast?.('Failed to publish listing. Please try again.', 'error');
            if (btn) { btn.textContent = '✦ Publish Listing'; btn.disabled = false; }
        }
    }

    onActivate(params = {}) {
        const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();

        if (params.scanResult) {
            this.photos = [];
            this.scanData = params.scanResult;
            this.render(params.scanResult);
        } else if (isDemo && !this.scanData) {
            // Pre-fill with the same demo scan result the scanner shows
            const demoScan = {
                materialType: 'Reclaimed Structural Steel (ISMB 250)',
                condition: 'Good — surface rust only, structurally sound',
                confidence: 0.94,
                estimatedQuantity: { value: 6, unit: 'pieces' },
                estimatedPricePerUnit: 11500,
                co2SavedKg: 1800,
                category: 'steel',
                description: 'AI identified this as ISMB 250-grade structural I-beams from demolition projects. Surface oxidation visible but cross-section integrity intact. Suitable for mezzanine frames, scaffolding, or heavy furniture fabrication.'
            };
            this.scanData = demoScan;
            this.render(demoScan);
        }
    }
}
