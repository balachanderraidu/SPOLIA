// components/onboarding.js — Professional Verification Wizard (3-step: Role → Credential → Confirm)
// Phone is verified at login — this wizard collects the professional role & credential only.
import { FirebaseAuth, FirebaseDB, FirebaseStorage } from '../firebase-config.js';

const ROLES = [
    { id: 'architect',  icon: '🏛️', label: 'Architect',         sub: 'COA Registration',      credential: 'COA Registration Number', placeholder: 'CA/2019/47821' },
    { id: 'designer',   icon: '🎨', label: 'Interior Designer', sub: 'NCIDQ / Portfolio',     credential: 'Membership / Portfolio URL', placeholder: 'NCIDQ-12345 or link' },
    { id: 'contractor', icon: '🏗️', label: 'Contractor',        sub: 'Trade License / GSTIN', credential: 'GSTIN / Trade Licence No.', placeholder: '27AABCU9603R1ZX' },
    { id: 'vendor',     icon: '🏪', label: 'Material Vendor',   sub: 'Business Registration', credential: 'MSME / Registration No.',   placeholder: 'UDYAM-MH-01-0001234' }
];

export class OnboardingScreen {
    constructor(el) {
        this.el = el;
        this.step = 1;           // 1=role, 2=credential, 3=confirm
        this.selectedRole = null;
        this.credentialNumber = '';
        this.docFile = null;
        this.submitting = false;
    }

    render() {
        this.el.innerHTML = `
      <div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">
        ${this._currentStep()}
      </div>`;
        this._bind();
    }

    _rerender() {
        this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._currentStep()}</div>`;
        this._bind();
    }

    _currentStep() {
        if (this.step === 1) return this._step1();
        if (this.step === 2) return this._step2();
        return this._step3();
    }

    _header(title, stepNum, backable = true) {
        return `
      <div style="display:flex;align-items:center;padding:max(env(safe-area-inset-top),18px) 20px 0;gap:12px">
        <button id="back-btn" ${!backable ? 'style="visibility:hidden"' : ''}
          style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;border:1px solid #2A2A2A;
            display:flex;align-items:center;justify-content:center;cursor:pointer;color:#F5F0E8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span style="flex:1;text-align:center;font:600 15px/1 Inter,sans-serif;color:#F5F0E8">${title}</span>
        <span style="font:400 12px/1 Inter,sans-serif;color:#5C5647;width:36px;text-align:right">${stepNum} of 3</span>
      </div>
      <div style="display:flex;gap:6px;padding:14px 20px 0">
        ${[1,2,3].map(n => `<div style="flex:1;height:3px;border-radius:2px;background:${n <= stepNum ? '#FFD700' : '#2A2A2A'}"></div>`).join('')}
      </div>`;
    }

    // ── Step 1: Who are you ────────────────────────────────────────
    _step1() {
        const r = this.selectedRole;
        return `
      ${this._header('Get Verified', 1, false)}
      <div style="padding:28px 20px;flex:1;display:flex;flex-direction:column">
        <h1 style="font:700 30px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 10px">Who are you?</h1>
        <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0 0 24px">
          Spolia is exclusive. Access requires professional verification.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:28px">
          ${ROLES.map(role => `
            <button class="role-card" data-role="${role.id}" aria-pressed="${role.id === r}"
              style="background:${role.id === r ? '#1A1500' : '#1A1A1A'};
                border:1.5px solid ${role.id === r ? '#FFD700' : '#2A2A2A'};
                border-radius:16px;padding:18px 12px 16px;cursor:pointer;text-align:center;
                display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;
                transition:border-color 150ms,background 150ms">
              ${role.id === r ? `<span style="position:absolute;top:8px;right:8px;width:20px;height:20px;
                  border-radius:50%;background:#FFD700;color:#0D0D0D;font:700 11px/20px Inter,sans-serif;
                  text-align:center">✓</span>` : ''}
              <span style="font-size:30px;line-height:1">${role.icon}</span>
              <span style="font:600 13px/1.3 Inter,sans-serif;color:${role.id === r ? '#FFD700' : '#F5F0E8'}">${role.label}</span>
              <span style="font:400 10px/1.3 Inter,sans-serif;color:#5C5647">${role.sub}</span>
            </button>`).join('')}
        </div>
        <div style="flex:1"></div>
        <button id="continue-btn" ${!r ? 'disabled' : ''}
          style="width:100%;height:52px;border-radius:14px;border:none;cursor:${r ? 'pointer' : 'not-allowed'};
            background:${r ? '#FFD700' : '#2A2A2A'};color:${r ? '#0D0D0D' : '#5C5647'};
            font:600 15px/1 Inter,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px">
          Continue
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;text-align:center;margin-top:14px">Verification takes 24 hours. Your data is never shared.</p>
        <button id="signout-escape" style="background:none;border:none;margin-top:8px;cursor:pointer;
          font:400 11px/1 Inter,sans-serif;color:#3A3A3A;display:block;width:100%;text-align:center">
          Wrong account? Sign out →
        </button>
      </div>`;
    }

    // ── Step 2: Professional credential ───────────────────────────
    _step2() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        return `
      ${this._header('Your Credentials', 2)}
      <div style="padding:28px 20px;flex:1;display:flex;flex-direction:column;gap:20px">
        <div>
          <h1 style="font:700 26px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 8px">
            Professional Credentials
          </h1>
          <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0">
            As a <strong style="color:#A09882">${role?.label}</strong>, provide your ${role?.sub?.toLowerCase()}.
            Our team verifies this within 24 hours.
          </p>
        </div>

        <div>
          <label style="font:500 11px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.08em;
            text-transform:uppercase;display:block;margin-bottom:8px">${role?.credential}</label>
          <input id="cred-input" type="text" value="${this.credentialNumber}"
            placeholder="${role?.placeholder || 'Enter your number'}"
            style="width:100%;height:52px;box-sizing:border-box;background:#1A1A1A;border:1.5px solid #2A2A2A;
              border-radius:12px;color:#F5F0E8;font:400 15px/1 Inter,sans-serif;padding:0 16px;outline:none"
            onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">
        </div>

        <div>
          <label style="font:500 11px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.08em;
            text-transform:uppercase;display:block;margin-bottom:8px">Supporting Document (Optional)</label>
          <div id="doc-zone" role="button" tabindex="0"
            style="min-height:88px;background:#1A1A1A;border:1.5px dashed ${this.docFile ? '#4CAF82' : '#2A2A2A'};
              border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;
              gap:6px;cursor:pointer;padding:16px">
            <span style="font-size:22px">${this.docFile ? '✅' : '📄'}</span>
            <span style="font:500 12px/1 Inter,sans-serif;color:${this.docFile ? '#4CAF82' : '#A09882'}">
              ${this.docFile ? this.docFile.name : 'Upload certificate / registration doc'}
            </span>
            <span style="font:400 10px/1 Inter,sans-serif;color:#5C5647">PDF, JPG, PNG · Max 10MB</span>
          </div>
          <input type="file" id="doc-input" accept=".pdf,image/*" style="display:none">
        </div>

        <div style="flex:1"></div>
        <button id="submit-btn" style="width:100%;height:52px;border-radius:14px;border:none;cursor:pointer;
          background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;
          display:flex;align-items:center;justify-content:center;gap:8px">
          Submit Application ✦
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;text-align:center;margin-top:4px">
          Credentials reviewed by our team within 24 hours.
        </p>
      </div>`;
    }

    // ── Step 3: Confirmation ───────────────────────────────────────
    _step3() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        const user = FirebaseAuth.getCurrentUser();
        return `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
        padding:60px 24px 40px;text-align:center">
        <div style="width:88px;height:88px;border-radius:50%;background:rgba(255,215,0,0.08);
          border:2px solid rgba(255,215,0,0.25);display:flex;align-items:center;justify-content:center;
          font-size:40px;margin-bottom:28px">⏳</div>
        <h1 style="font:700 28px/1.3 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 12px">Application Submitted</h1>
        <p style="font:400 14px/1.7 Inter,sans-serif;color:#A09882;max-width:320px;margin:0 0 32px">
          Our team will verify your credentials within
          <strong style="color:#F5F0E8">24 hours</strong>.
          You'll receive a notification when approved.
        </p>

        <div style="width:100%;max-width:360px;background:#1A1A1A;border:1px solid #2A2A2A;
          border-radius:20px;padding:20px 24px;margin-bottom:28px;text-align:left">
          <div style="font:600 10px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">VERIFICATION STATUS</div>
          ${[
            ['🔑 Role', role?.label || '—', '#F5A623', '⏳ Pending 24h'],
            ['📋 Credential', this.credentialNumber || '—', '#F5A623', '⏳ Pending 24h'],
            ['📧 Account', user?.email || user?.phoneNumber || '—', '#4CAF82', '✓ Verified'],
          ].map(([k, v, c, status]) => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
              padding:10px 0;border-bottom:1px solid #1E1E1E">
              <div>
                <div style="font:500 12px/1 Inter,sans-serif;color:#5C5647;margin-bottom:3px">${k}</div>
                <div style="font:600 13px/1 Inter,sans-serif;color:#F5F0E8;word-break:break-all">${v}</div>
              </div>
              <span style="font:600 10px/1 Inter,sans-serif;color:${c};padding:4px 8px;
                background:${c}18;border-radius:999px;white-space:nowrap;margin-top:2px;flex-shrink:0;margin-left:8px">${status}</span>
            </div>`).join('')}
        </div>

        <button id="explore-btn" style="width:100%;max-width:360px;height:52px;border-radius:14px;
          border:none;background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;cursor:pointer">
          Explore Spolia →
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;margin-top:12px">
          You can browse the platform while we review your application.
        </p>
      </div>`;
    }

    // ── Binding ────────────────────────────────────────────────────
    _bind() {
        // Back button
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            if (this.step === 1) return; // Can't go back from first step (came from login)
            this.step--;
            this._rerender();
        });

        // Step 1: role cards + continue
        this.el.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => {
                this.selectedRole = card.dataset.role;
                this._rerender();
            });
        });

        if (this.step === 1) {
            this.el.querySelector('#continue-btn')?.addEventListener('click', () => {
                if (!this.selectedRole) return;
                this.step = 2;
                this._rerender();
            });
            this.el.querySelector('#signout-escape')?.addEventListener('click', async () => {
                await window.signOut?.();
            });
        }

        // Step 2: doc upload + submit
        if (this.step === 2) {
            const zone = this.el.querySelector('#doc-zone');
            const fileInput = this.el.querySelector('#doc-input');
            zone?.addEventListener('click', () => fileInput?.click());
            zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput?.click(); });
            fileInput?.addEventListener('change', () => {
                if (fileInput.files[0]) { this.docFile = fileInput.files[0]; this._rerender(); }
            });
            this.el.querySelector('#cred-input')?.addEventListener('input', e => {
                this.credentialNumber = e.target.value;
            });
            this.el.querySelector('#submit-btn')?.addEventListener('click', () => this._submit());
        }

        // Step 3: explore button
        if (this.step === 3) {
            this.el.querySelector('#explore-btn')?.addEventListener('click', () => {
                window.navigate?.('radar');
            });
        }
    }

    async _submit() {
        if (this.submitting) return;
        const cred = this.el.querySelector('#cred-input')?.value?.trim();
        if (!cred) { window.showToast?.('Please enter your credential number', 'error'); return; }
        this.credentialNumber = cred;
        const btn = this.el.querySelector('#submit-btn');
        if (btn) { btn.textContent = 'Submitting…'; btn.disabled = true; }
        this.submitting = true;
        try {
            const user = FirebaseAuth.getCurrentUser();
            let docUrl = null;
            if (this.docFile && user) {
                // Wrap upload in a 5-second timeout — if Storage rules aren't
                // deployed or connectivity is slow, skip file and proceed.
                const uploadWithTimeout = Promise.race([
                    FirebaseStorage.uploadCOADocument(this.docFile, user.uid),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('upload timeout')), 5000)
                    )
                ]);
                try { docUrl = await uploadWithTimeout; }
                catch (e) { console.warn('[Onboarding] doc upload skipped:', e.message); }
            }
            if (user) {
                await FirebaseDB.submitVerificationApplication(user.uid, {
                    role: this.selectedRole,
                    credentialNumber: this.credentialNumber,
                    docUrl
                });
            }
            window.showToast?.('Application submitted! ✦', 'success');
            this.step = 3;
            this._rerender();
        } catch (err) {
            console.error('[Onboarding] submit error:', err);
            window.showToast?.('Submission failed. Please try again.', 'error');
            if (btn) { btn.textContent = 'Submit Application ✦'; btn.disabled = false; }
        } finally {
            this.submitting = false;
        }
    }

    onActivate() {
        // Reset wizard state if user navigates back to onboarding from elsewhere
        // (e.g., if they somehow end up here again after having an account)
        // Usually onAuthStateChanged handles routing, but this is a safety net.
    }
}
