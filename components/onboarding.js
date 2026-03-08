// components/onboarding.js — Verification Wizard (Stitch-designed UI)
import { FirebaseAuth, FirebaseDB, FirebaseStorage } from '../firebase-config.js';

const ROLES = [
    { id: 'architect',  icon: '🏛️', label: 'Architect',         sub: 'COA Registration',         credential: 'COA Number',              placeholder: 'CA/2019/47821' },
    { id: 'designer',   icon: '🎨', label: 'Interior Designer', sub: 'NCIDQ / Portfolio',         credential: 'Membership / Portfolio URL', placeholder: 'NCIDQ-12345 or URL' },
    { id: 'contractor', icon: '🏗️', label: 'Contractor',        sub: 'Trade License / GSTIN',    credential: 'GSTIN Number',            placeholder: '27AABCU9603R1ZX' },
    { id: 'vendor',     icon: '🏪', label: 'Material Vendor',   sub: 'Business Registration',    credential: 'Registration Number',     placeholder: 'MSME / Trade Reg No.' }
];

export class OnboardingScreen {
    constructor(el) {
        this.el = el;
        this.step = 1;
        this.selectedRole = null;
        this.credentialNumber = '';
        this.docFile = null;
        this.submitting = false;
    }

    render() {
        this.el.innerHTML = `
      <div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">
        ${this._renderCurrentStep()}
      </div>`;
        this._bindEvents();
    }

    _renderCurrentStep() {
        if (this.step === 1) return this._step1HTML();
        if (this.step === 2) return this._step2HTML();
        return this._step3HTML();
    }

    // ── Step 1: Role selection ──────────────────────────────────────
    _step1HTML() {
        const role = this.selectedRole;
        return `
      <!-- Header -->
      <div style="display:flex;align-items:center;padding:max(env(safe-area-inset-top),18px) 20px 0;gap:12px">
        <button id="back-btn" aria-label="Back"
          style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
            display:flex;align-items:center;justify-content:center;cursor:pointer;color:#F5F0E8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style="flex:1;text-align:center;font:600 15px/1 Inter,sans-serif;color:#F5F0E8">Verification</span>
        <span style="font:400 12px/1 Inter,sans-serif;color:#5C5647;width:36px;text-align:right">1 of 3</span>
      </div>

      <!-- Progress bars -->
      <div style="display:flex;gap:6px;padding:14px 20px 0">
        <div style="flex:1;height:3px;border-radius:2px;background:#FFD700"></div>
        <div style="flex:1;height:3px;border-radius:2px;background:#2A2A2A"></div>
        <div style="flex:1;height:3px;border-radius:2px;background:#2A2A2A"></div>
      </div>

      <!-- Content -->
      <div style="padding:28px 20px;flex:1;display:flex;flex-direction:column">
        <h1 style="font:700 30px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 10px">
          Who are you?
        </h1>
        <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0 0 28px">
          Spolia is exclusive. Access requires professional verification.
        </p>

        <!-- 2×2 Role Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:32px">
          ${ROLES.map(r => `
            <button class="role-card" data-role="${r.id}" aria-pressed="${r.id === role}"
              style="background:#1A1A1A;border:1.5px solid ${r.id === role ? '#FFD700' : '#2A2A2A'};
                border-radius:16px;padding:18px 12px 16px;cursor:pointer;text-align:center;
                display:flex;flex-direction:column;align-items:center;gap:8px;
                position:relative;transition:border-color 150ms,background 150ms;
                ${r.id === role ? 'background:#1A1500' : ''}">
              ${r.id === role ? `
                <span style="position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;
                  background:#FFD700;color:#0D0D0D;display:flex;align-items:center;justify-content:center;
                  font-size:11px;font-weight:700;line-height:1">✓</span>` : ''}
              <span style="font-size:30px;line-height:1">${r.icon}</span>
              <span style="font:600 13px/1.3 Inter,sans-serif;color:${r.id === role ? '#FFD700' : '#F5F0E8'}">${r.label}</span>
              <span style="font:400 10px/1.3 Inter,sans-serif;color:#5C5647">${r.sub}</span>
            </button>`).join('')}
        </div>

        <div style="flex:1"></div>
        <button id="continue-btn" ${!role ? 'disabled' : ''}
          style="width:100%;height:52px;border-radius:14px;border:none;cursor:${role ? 'pointer' : 'not-allowed'};
            background:${role ? '#FFD700' : '#2A2A2A'};
            color:${role ? '#0D0D0D' : '#5C5647'};
            font:600 15px/1 Inter,sans-serif;transition:all 200ms;
            display:flex;align-items:center;justify-content:center;gap:8px">
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;text-align:center;margin-top:14px">
          Verification takes 24 hours. Your data is never shared.
        </p>
      </div>`;
    }

    // ── Step 2: Credential upload ───────────────────────────────────
    _step2HTML() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        return `
      <!-- Header -->
      <div style="display:flex;align-items:center;padding:max(env(safe-area-inset-top),18px) 20px 0;gap:12px">
        <button id="back-btn" aria-label="Back"
          style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
            display:flex;align-items:center;justify-content:center;cursor:pointer;color:#F5F0E8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style="flex:1;text-align:center;font:600 15px/1 Inter,sans-serif;color:#F5F0E8">Upload Credentials</span>
        <span style="font:400 12px/1 Inter,sans-serif;color:#5C5647;width:36px;text-align:right">2 of 3</span>
      </div>

      <!-- Progress bars -->
      <div style="display:flex;gap:6px;padding:14px 20px 0">
        <div style="flex:1;height:3px;border-radius:2px;background:#FFD700"></div>
        <div style="flex:1;height:3px;border-radius:2px;background:#FFD700"></div>
        <div style="flex:1;height:3px;border-radius:2px;background:#2A2A2A"></div>
      </div>

      <div style="padding:28px 20px;display:flex;flex-direction:column;gap:20px;flex:1">
        <div>
          <h1 style="font:700 26px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 8px">Your Credentials</h1>
          <p style="font:400 13px/1.6 Inter,sans-serif;color:#5C5647;margin:0">
            As a <strong style="color:#A09882">${role?.label}</strong>, provide your ${role?.sub?.toLowerCase()}.
          </p>
        </div>

        <!-- Role reminder chip -->
        <div style="display:inline-flex;align-items:center;gap:8px;background:#1A1500;border:1px solid #3A3000;
          border-radius:999px;padding:8px 14px;width:fit-content">
          <span style="font-size:16px">${role?.icon}</span>
          <span style="font:600 12px/1 Inter,sans-serif;color:#FFD700">${role?.label}</span>
        </div>

        <!-- Credential number -->
        <div>
          <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.06em;
            text-transform:uppercase;display:block;margin-bottom:8px">${role?.credential}</label>
          <input id="cred-input" type="text" value="${this.credentialNumber}"
            placeholder="${role?.placeholder || 'Enter your number'}"
            style="width:100%;height:52px;box-sizing:border-box;background:#1A1A1A;border:1.5px solid #2A2A2A;
              border-radius:12px;color:#F5F0E8;font:400 15px/1 Inter,sans-serif;padding:0 16px;
              outline:none;transition:border-color 150ms"
            onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">
        </div>

        <!-- Document upload -->
        <div>
          <label style="font:500 12px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.06em;
            text-transform:uppercase;display:block;margin-bottom:8px">Supporting Document</label>
          <div id="doc-zone" role="button" tabindex="0"
            style="width:100%;min-height:100px;box-sizing:border-box;background:#1A1A1A;
              border:1.5px dashed ${this.docFile ? '#4CAF82' : '#2A2A2A'};border-radius:12px;
              display:flex;flex-direction:column;align-items:center;justify-content:center;
              gap:6px;cursor:pointer;padding:20px;transition:border-color 150ms"
            aria-label="Upload credential document">
            <span style="font-size:24px">${this.docFile ? '✅' : '📄'}</span>
            <span style="font:500 13px/1 Inter,sans-serif;color:${this.docFile ? '#4CAF82' : '#F5F0E8'}">
              ${this.docFile ? this.docFile.name : 'Tap to upload document'}
            </span>
            <span style="font:400 11px/1 Inter,sans-serif;color:#5C5647">PDF, JPG, PNG · Max 10MB</span>
          </div>
          <input type="file" id="doc-input" accept=".pdf,image/*" style="display:none">
        </div>

        <div style="flex:1"></div>
        <button id="continue-btn"
          style="width:100%;height:52px;border-radius:14px;border:none;cursor:pointer;
            background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;
            display:flex;align-items:center;justify-content:center;gap:8px" id="continue-btn">
          Submit Application
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;text-align:center;margin-top:4px">
          Credentials are reviewed by our team and never shared publicly.
        </p>
      </div>`;
    }

    // ── Step 3: Confirmation ────────────────────────────────────────
    _step3HTML() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:60px 24px 40px;text-align:center">

        <!-- Animated check -->
        <div style="width:88px;height:88px;border-radius:50%;background:rgba(255,215,0,0.1);
          border:2px solid rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;
          font-size:40px;margin-bottom:28px">⏳</div>

        <h1 style="font:700 28px/1.3 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 12px">
          Application Submitted
        </h1>
        <p style="font:400 14px/1.7 Inter,sans-serif;color:#A09882;max-width:320px;margin:0 0 32px">
          Our team will verify your credentials within
          <strong style="color:#F5F0E8">24 hours</strong>.
          You'll receive an email when your account is approved.
        </p>

        <!-- Application summary card -->
        <div style="width:100%;max-width:360px;background:#1A1A1A;border:1px solid #2A2A2A;
          border-radius:20px;padding:20px 24px;margin-bottom:32px;text-align:left">
          <div style="font:600 10px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.12em;
            text-transform:uppercase;margin-bottom:16px">YOUR APPLICATION</div>
          ${[
              ['Role', `${role?.icon || ''} ${role?.label || '—'}`],
              ['Credential', this.credentialNumber || '—'],
              ['Status', '⏳ Under Review'],
              ['Timeline', '24 hours'],
          ].map(([k, v]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;
              padding:10px 0;border-bottom:1px solid #222;${k === 'Timeline' ? 'border-bottom:none' : ''}">
              <span style="font:400 13px/1 Inter,sans-serif;color:#5C5647">${k}</span>
              <span style="font:600 13px/1 Inter,sans-serif;color:${k === 'Status' ? '#F5A623' : '#F5F0E8'}">${v}</span>
            </div>`).join('')}
        </div>

        <button id="explore-btn"
          style="width:100%;max-width:360px;height:52px;border-radius:14px;
            border:1.5px solid #2A2A2A;background:transparent;color:#FFD700;
            font:600 15px/1 Inter,sans-serif;cursor:pointer">
          Explore in Demo Mode →
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;margin-top:14px">
          You can browse the app while your verification is being processed.
        </p>
      </div>`;
    }

    _bindEvents() {
        // Back button
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            if (this.step === 1) window.navigate?.('login');
            else { this.step--; this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._renderCurrentStep()}</div>`; this._bindEvents(); }
        });

        // Role cards (step 1)
        this.el.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedRole = card.dataset.role;
                this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._renderCurrentStep()}</div>`;
                this._bindEvents();
            });
        });

        // Continue / Submit button
        this.el.querySelector('#continue-btn')?.addEventListener('click', () => this._handleContinue());

        // Doc upload (step 2)
        const zone = this.el.querySelector('#doc-zone');
        const input = this.el.querySelector('#doc-input');
        zone?.addEventListener('click', () => input?.click());
        zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });
        input?.addEventListener('change', () => {
            if (input.files[0]) { this.docFile = input.files[0]; this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._renderCurrentStep()}</div>`; this._bindEvents(); }
        });

        // Credential input (step 2)
        this.el.querySelector('#cred-input')?.addEventListener('input', e => { this.credentialNumber = e.target.value; });

        // Explore (step 3)
        this.el.querySelector('#explore-btn')?.addEventListener('click', () => window.navigate?.('radar'));
    }

    async _handleContinue() {
        if (this.step === 1) {
            if (!this.selectedRole) return;
            this.step = 2;
            this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._renderCurrentStep()}</div>`;
            this._bindEvents();
            return;
        }

        // Step 2 → submit
        if (this.submitting) return;
        const cred = this.el.querySelector('#cred-input')?.value?.trim();
        if (!cred) { window.showToast?.('Please enter your credential number.', 'error'); return; }
        this.credentialNumber = cred;

        const btn = this.el.querySelector('#continue-btn');
        if (btn) { btn.textContent = 'Submitting…'; btn.disabled = true; }
        this.submitting = true;

        try {
            const user = FirebaseAuth.getCurrentUser();
            let docUrl = null;
            if (this.docFile && user) {
                try { docUrl = await FirebaseStorage.uploadCOADocument(this.docFile, user.uid); }
                catch (e) { console.warn('[Onboarding] doc upload failed:', e); }
            }
            if (user) {
                await FirebaseDB.submitVerificationApplication(user.uid, {
                    role: this.selectedRole, credentialNumber: this.credentialNumber, docUrl
                });
            }
            window.showToast?.('Application submitted! ✦', 'success');
            this.step = 3;
            this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._renderCurrentStep()}</div>`;
            this._bindEvents();
        } catch (err) {
            console.error('[Onboarding] submit failed:', err);
            window.showToast?.('Submission failed. Please try again.', 'error');
            if (btn) { btn.textContent = 'Submit Application'; btn.disabled = false; }
        } finally {
            this.submitting = false;
        }
    }

    onActivate() {
        if (this.step === 3) window.navigate?.('radar');
    }
}
