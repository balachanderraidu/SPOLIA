// components/onboarding.js — Verification Onboarding Wizard
// Design from Stitch: SPOLIA Verification Step 1
import { FirebaseAuth, FirebaseStorage } from '../firebase-config.js';

const ROLES = [
    { id: 'architect', icon: '🏛', label: 'Architect', sub: 'COA Registration', credential: 'COA Number' },
    { id: 'designer', icon: '🎨', label: 'Interior Designer', sub: 'Professional portfolio', credential: 'Portfolio URL / Membership' },
    { id: 'contractor', icon: '🏗', label: 'Contractor', sub: 'Trade license / GSTIN', credential: 'GSTIN Number' },
    { id: 'vendor', icon: '🏪', label: 'Material Vendor', sub: 'Business registration', credential: 'Business Reg. Number' }
];

export class OnboardingScreen {
    constructor(el) {
        this.el = el;
        this.step = 1;
        this.selectedRole = null;
        this.credentialNumber = '';
        this.docFile = null;
    }

    render() {
        this.el.innerHTML = this._renderStep();
        this._bindEvents();
    }

    _renderStep() {
        if (this.step === 1) return this._step1();
        if (this.step === 2) return this._step2();
        return this._step3();
    }

    _header(title) {
        return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;padding-top:env(safe-area-inset-top,16px)">
        <button id="back-btn" class="icon-btn" aria-label="Back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span style="font:600 15px/1 Inter,sans-serif;color:var(--color-text-primary)">${title}</span>
        <span style="font:400 12px/1 Inter,sans-serif;color:var(--color-text-muted)">${this.step} of 3</span>
      </div>
      <!-- Progress bar -->
      <div style="display:flex;gap:4px;padding:0 24px 24px">
        ${[1, 2, 3].map(s => `
          <div style="flex:1;height:3px;border-radius:2px;
            background:${s <= this.step ? 'var(--color-gold)' : 'var(--color-border)'}"></div>
        `).join('')}
      </div>`;
    }

    _step1() {
        return `
      <div style="min-height:100%;background:var(--color-bg-base);display:flex;flex-direction:column">
        ${this._header('Verification')}
        <div style="padding:0 24px;flex:1">
          <h1 style="font:700 28px/1.2 'Playfair Display',Georgia,serif;color:var(--color-gold);margin-bottom:8px">Who are you?</h1>
          <p style="font:var(--text-body);color:var(--color-text-secondary);margin-bottom:28px;line-height:1.6">
            Spolia is exclusive. Access requires professional verification.
          </p>
          <!-- Role grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:32px">
            ${ROLES.map(r => `
              <button class="role-card ${r.id === this.selectedRole ? 'selected' : ''}" data-role="${r.id}"
                style="background:var(--color-bg-surface);
                  border:1px solid ${r.id === this.selectedRole ? 'var(--color-gold)' : 'var(--color-border)'};
                  border-radius:16px;padding:18px 12px;cursor:pointer;text-align:center;
                  display:flex;flex-direction:column;align-items:center;gap:8px;
                  transition:border-color 150ms,background 150ms;position:relative">
                ${r.id === this.selectedRole ? `
                  <span style="position:absolute;top:8px;right:8px;width:18px;height:18px;border-radius:50%;
                    background:var(--color-gold);display:flex;align-items:center;justify-content:center;
                    font-size:10px;color:#0D0D0D;font-weight:700">✓</span>` : ''}
                <span style="font-size:28px">${r.icon}</span>
                <span style="font:600 13px/1.2 Inter,sans-serif;color:var(--color-text-primary)">${r.label}</span>
                <span style="font:400 10px/1.3 Inter,sans-serif;color:var(--color-text-muted)">${r.sub}</span>
              </button>`).join('')}
          </div>
          <button id="continue-btn" class="btn btn--gold" ${!this.selectedRole ? 'disabled style="opacity:0.4"' : ''}>
            Continue →
          </button>
          <p style="font:400 11px/1.5 Inter,sans-serif;color:var(--color-text-muted);text-align:center;margin-top:16px">
            Verification takes 24 hours. Your data is never shared.
          </p>
        </div>
      </div>`;
    }

    _step2() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        return `
      <div style="min-height:100%;background:var(--color-bg-base);display:flex;flex-direction:column">
        ${this._header('Upload Credentials')}
        <div style="padding:0 24px;flex:1">
          <h1 style="font:700 28px/1.2 'Playfair Display',Georgia,serif;color:var(--color-gold);margin-bottom:8px">Your Credentials</h1>
          <p style="font:var(--text-body);color:var(--color-text-secondary);margin-bottom:28px;line-height:1.6">
            As a <strong style="color:var(--color-text-primary)">${role?.label}</strong>, provide your ${role?.sub?.toLowerCase()}.
          </p>

          <!-- Credential number input -->
          <div class="form-field">
            <label class="form-label" for="cred-input">${role?.credential}</label>
            <input class="form-input" id="cred-input" type="text"
              placeholder="e.g. ${this.selectedRole === 'architect' ? 'CA/2019/47821' : 'Enter your registration number'}"
              value="${this.credentialNumber}">
          </div>

          <!-- Document upload -->
          <div style="margin-bottom:24px">
            <label class="form-label">Supporting Document</label>
            <div class="upload-zone" id="doc-upload-zone" style="margin-top:4px">
              <div class="upload-zone__icon">${this.docFile ? '✅' : '📄'}</div>
              <div class="upload-zone__text">${this.docFile ? this.docFile.name : 'Tap to upload document'}</div>
              <div class="upload-zone__sub">PDF, JPG, PNG · Max 10MB</div>
            </div>
            <input type="file" id="doc-input" accept=".pdf,image/*" style="display:none">
          </div>

          <button id="continue-btn" class="btn btn--gold">
            Continue →
          </button>
        </div>
      </div>`;
    }

    _step3() {
        return `
      <div style="min-height:100%;background:var(--color-bg-base);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 24px;text-align:center">
        <div style="font-size:64px;margin-bottom:24px">⏳</div>
        <h1 style="font:700 28px/1.2 'Playfair Display',Georgia,serif;color:var(--color-gold);margin-bottom:12px">
          Application Submitted
        </h1>
        <p style="font:var(--text-body);color:var(--color-text-secondary);line-height:1.7;margin-bottom:8px;max-width:340px">
          Our team will verify your credentials and get back to you within <strong style="color:var(--color-text-primary)">24 hours</strong>.
        </p>
        <p style="font:var(--text-caption);color:var(--color-text-muted);margin-bottom:40px">
          You'll receive an email at the address linked to your Google account.
        </p>
        <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:16px;padding:20px;width:100%;max-width:360px;margin-bottom:32px">
          <div style="font:var(--text-label);color:var(--color-text-muted);letter-spacing:0.08em;margin-bottom:12px">YOUR APPLICATION</div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">Role</span>
            <span style="font:var(--text-caption);color:var(--color-text-primary);font-weight:600">
              ${ROLES.find(r => r.id === this.selectedRole)?.label}
            </span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">Status</span>
            <span style="font:var(--text-caption);color:var(--color-amber);font-weight:600">⏳ Under Review</span>
          </div>
        </div>
        <button class="btn btn--outline" onclick="window.navigate('radar')" style="max-width:360px">
          Explore in Demo Mode
        </button>
      </div>`;
    }

    _bindEvents() {
        const backBtn = this.el.querySelector('#back-btn');
        backBtn?.addEventListener('click', () => {
            if (this.step === 1) window.navigate?.('login');
            else { this.step--; this.el.innerHTML = this._renderStep(); this._bindEvents(); }
        });

        // Step 1: role selection
        this.el.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedRole = card.dataset.role;
                this.el.innerHTML = this._renderStep();
                this._bindEvents();
            });
        });

        // Continue button
        const continueBtn = this.el.querySelector('#continue-btn');
        continueBtn?.addEventListener('click', () => this._handleContinue());

        // Document upload (step 2)
        const zone = this.el.querySelector('#doc-upload-zone');
        const input = this.el.querySelector('#doc-input');
        zone?.addEventListener('click', () => input?.click());
        input?.addEventListener('change', () => {
            if (input.files[0]) {
                this.docFile = input.files[0];
                this.el.innerHTML = this._renderStep();
                this._bindEvents();
            }
        });

        // Credential input (step 2)
        const credInput = this.el.querySelector('#cred-input');
        credInput?.addEventListener('input', () => { this.credentialNumber = credInput.value; });
    }

    async _handleContinue() {
        if (this.step === 1 && !this.selectedRole) return;
        if (this.step < 3) {
            this.step++;
            this.el.innerHTML = this._renderStep();
            this._bindEvents();

            // Step 3: submit application
            if (this.step === 3) {
                window.showToast?.('Application submitted! We\'ll review within 24 hours.', 'success');
            }
        }
    }

    onActivate() { }
}
