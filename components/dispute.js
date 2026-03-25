// components/dispute.js — Report Quality Issue
import { FirebaseDB } from '../firebase-config.js';

export class DisputeScreen {
    constructor(el) {
        this.el = el;
        this.photos = [];
        this.selectedResolution = 'refund-full';
        // Context passed via onActivate
        this.listingId = null;
        this.listingTitle = null;
        this.bondId = null;
    }

    render() {
        this.el.innerHTML = `
      <header class="page-header">
        <div style="display:flex;align-items:center;gap:12px">
          <button id="back-btn" class="icon-btn" aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <h1 class="page-header__title">Report Issue</h1>
            ${this.listingTitle ? `<p class="page-header__subtitle" style="margin:0">${this.listingTitle}</p>` : ''}
          </div>
        </div>
      </header>

      <div style="padding-bottom:var(--space-xl)">
        <!-- Warning Banner -->
        <div style="margin:var(--space-md);background:var(--color-red-dim);border:1px solid rgba(224,92,92,0.25);
          border-left:3px solid var(--color-red);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-md)"
          role="alert">
          <div style="font:600 13px/1.4 var(--font-body);color:var(--color-red);margin-bottom:4px">⚠️ Before You Continue</div>
          <div style="font:var(--text-caption);color:var(--color-text-secondary);line-height:1.5">
            Filing a Quality Dispute will <strong style="color:var(--color-text-primary)">freeze the Spolia Bond</strong> until the issue is resolved.
            False or frivolous claims may result in account suspension.
          </div>
        </div>

        <!-- Issue Type -->
        <div class="form-field">
          <label class="form-label" for="issue-type">What is the issue?</label>
          <select class="form-select" id="issue-type" name="issue-type">
            <option value="mismatch">Material doesn't match description</option>
            <option value="quantity">Quantity is less than listed</option>
            <option value="damage">Material is damaged / broken</option>
            <option value="missing">Material not at pickup location</option>
            <option value="seller">Seller unresponsive / no-show</option>
            <option value="other">Other</option>
          </select>
        </div>

        <!-- Description -->
        <div class="form-field">
          <label class="form-label" for="issue-desc">Describe the mismatch</label>
          <textarea class="form-textarea" id="issue-desc" name="issue-desc"
            placeholder="e.g. The marble slabs had visible cracks not mentioned in the listing. The colour also appears different from the photos..."
            rows="4" maxlength="1000"></textarea>
          <div style="font:var(--text-caption);color:var(--color-text-muted);text-align:right;margin-top:4px">
            <span id="desc-count">0</span>/1000
          </div>
        </div>

        <!-- Photo Upload -->
        <div style="padding:0 var(--space-md) var(--space-md)">
          <label class="form-label">Upload Photo Evidence</label>
          <div class="upload-zone" id="upload-zone" role="button" tabindex="0" aria-label="Upload photos">
            <div class="upload-zone__icon">📷</div>
            <div class="upload-zone__text">Tap to upload or drag photos here</div>
            <div class="upload-zone__sub">JPEG, PNG · Up to 5 photos · Max 5MB each</div>
          </div>
          <input type="file" id="photo-input" accept="image/*" multiple style="display:none">
          <!-- Photo Preview Row -->
          <div id="photo-previews" style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"></div>
        </div>

        <!-- Bond ID (read-only) -->
        <div class="form-field">
          <label class="form-label" for="bond-id">Bond ID</label>
          <input class="form-input" id="bond-id" type="text" value="${this.bondId || 'BOND-XXXX'}" readonly
            style="background:var(--color-bg-base);color:var(--color-gold);font-weight:600">
        </div>

        <!-- Resolution Choice -->
        <div style="padding:0 var(--space-md) var(--space-md)">
          <label class="form-label">Requested Resolution</label>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--color-border);border:1px solid var(--color-border);border-radius:var(--radius-button);overflow:hidden;margin-top:4px"
            role="radiogroup" aria-label="Choose resolution type">
            ${[
                { id: 'refund-full',    label: 'Full Refund' },
                { id: 'refund-partial', label: 'Partial Refund' },
                { id: 'replacement',   label: 'Replacement' }
            ].map(opt => `
              <button class="resolution-opt ${opt.id === this.selectedResolution ? 'active' : ''}"
                data-res="${opt.id}" role="radio" aria-checked="${opt.id === this.selectedResolution}"
                style="padding:10px 8px;background:${opt.id === this.selectedResolution ? 'var(--color-gold)' : 'var(--color-bg-elevated)'};
                color:${opt.id === this.selectedResolution ? '#0D0D0D' : 'var(--color-text-secondary)'};
                border:none;cursor:pointer;font:600 12px/1.3 var(--font-body);transition:all 150ms">
                ${opt.label}
              </button>`).join('')}
          </div>
        </div>

        <!-- Submit -->
        <div style="padding:0 var(--space-md)">
          <button class="btn btn--red" id="submit-dispute" style="font-size:15px">
            ⚠️ Submit Dispute Report
          </button>
          <p style="font:var(--text-caption);color:var(--color-text-muted);text-align:center;margin-top:12px;line-height:1.5">
            A Spolia mediator will review your report within <strong>48 hours</strong>.<br>
            You will be notified via email and in-app notification.
          </p>
        </div>
      </div>
    `;

        this._bindEvents();
    }

    _bindEvents() {
        // Back button — return to bond-detail if we have a bond, else listing, else radar
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            window.goBack?.('radar');
        });

        // Character count
        const textarea = this.el.querySelector('#issue-desc');
        const counter = this.el.querySelector('#desc-count');
        textarea?.addEventListener('input', () => {
            if (counter) counter.textContent = textarea.value.length;
        });

        // Photo upload
        const zone = this.el.querySelector('#upload-zone');
        const input = this.el.querySelector('#photo-input');

        zone?.addEventListener('click', () => input?.click());
        zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });

        zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone?.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            Array.from(e.dataTransfer.files).forEach(f => this._addPhoto(f));
        });

        input?.addEventListener('change', () => {
            Array.from(input.files).forEach(f => this._addPhoto(f));
            input.value = '';
        });

        // Resolution toggle
        this.el.querySelectorAll('.resolution-opt').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectedResolution = btn.dataset.res;
                this.el.querySelectorAll('.resolution-opt').forEach(b => {
                    const active = b.dataset.res === this.selectedResolution;
                    b.classList.toggle('active', active);
                    b.setAttribute('aria-checked', active);
                    b.style.background = active ? 'var(--color-gold)' : 'var(--color-bg-elevated)';
                    b.style.color = active ? '#0D0D0D' : 'var(--color-text-secondary)';
                });
            });
        });

        // Submit
        this.el.querySelector('#submit-dispute')?.addEventListener('click', () => this._submit());
    }

    _addPhoto(file) {
        if (this.photos.length >= 5) {
            window.showToast?.('Maximum 5 photos allowed', 'error');
            return;
        }
        if (!file.type.startsWith('image/')) return;

        const url = URL.createObjectURL(file);
        this.photos.push({ file, url });
        this._renderPreviews();
    }

    _renderPreviews() {
        const container = this.el.querySelector('#photo-previews');
        if (!container) return;
        container.innerHTML = this.photos.map((p, i) => `
      <div style="position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;flex-shrink:0;
        border:1px solid var(--color-border)">
        <img src="${p.url}" style="width:100%;height:100%;object-fit:cover" alt="Evidence photo ${i + 1}">
        <button data-index="${i}"
          style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;
          background:var(--color-red);color:#fff;border:none;display:flex;align-items:center;justify-content:center;
          font-size:10px;cursor:pointer;line-height:1" aria-label="Remove photo">✕</button>
      </div>`).join('');

        container.querySelectorAll('[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index);
                URL.revokeObjectURL(this.photos[idx].url);
                this.photos.splice(idx, 1);
                this._renderPreviews();
            });
        });
    }

    async _submit() {
        const issueType = this.el.querySelector('#issue-type')?.value;
        const desc = this.el.querySelector('#issue-desc')?.value?.trim();

        if (!desc || desc.length < 20) {
            window.showToast?.('Please describe the issue in more detail (min 20 characters).', 'error');
            return;
        }

        const submitBtn = this.el.querySelector('#submit-dispute');
        if (submitBtn) {
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
        }

        try {
            const bondId = this.bondId || this.el.querySelector('#bond-id')?.value || null;

            await FirebaseDB.submitDispute({
                listingId: this.listingId || null,
                listingTitle: this.listingTitle || null,
                bondId,
                issueType,
                description: desc,
                resolution: this.selectedResolution,
                photoCount: this.photos.length,
                timestamp: new Date().toISOString()
            });

            // Freeze the bond status to 'disputed' + notify seller
            if (bondId) {
                FirebaseDB.updateBondStatus(bondId, 'disputed').catch(() => {});
                // Fetch bond to get sellerUid
                FirebaseDB.getBond(bondId).then(bond => {
                    if (bond?.sellerUid) {
                        FirebaseDB.addNotification(bond.sellerUid, {
                            type: 'dispute',
                            title: '⚠️ Quality Dispute Filed',
                            body: `A buyer has filed a dispute on "${bond.listingTitle || 'your listing'}". Bond funds are frozen pending review.`,
                            bondId
                        }).catch(() => {});
                    }
                }).catch(() => {});
            }

            window.showToast?.('Dispute submitted. A mediator will review within 48 hours.', 'success');
            setTimeout(() => {
                // Return to the listing if we have context, else radar
                if (this.listingId) {
                    window.navigate?.('material-detail', { listingId: this.listingId });
                } else {
                    window.navigate?.('radar');
                }
            }, 2000);
        } catch (err) {
            window.showToast?.('Failed to submit. Please try again.', 'error');
            if (submitBtn) {
                submitBtn.textContent = '⚠️ Submit Dispute Report';
                submitBtn.disabled = false;
            }
        }
    }


    onActivate(params = {}) {
        // Store context for this dispute flow
        if (params.bondId)        this.bondId = params.bondId;
        if (params.listingId)     this.listingId = params.listingId;
        if (params.listingTitle)  this.listingTitle = params.listingTitle;

        // Re-render to show updated context (title in header, bond ID in field)
        this.render();
    }
}
