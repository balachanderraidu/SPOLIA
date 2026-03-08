// components/onboarding.js — Verification Wizard (4-step: Role → Phone OTP → Credential → Confirm)
// Collects 2 details every time: phone (instant OTP) + professional credential (async review)
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
        this.step = 1;           // 1=role, 2=phone OTP, 3=credential, 4=confirm
        this.selectedRole = null;
        this.phoneVerified = false;
        this.verifiedPhone = '';
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

    _currentStep() {
        if (this.step === 1) return this._step1();
        if (this.step === 2) return this._step2();
        if (this.step === 3) return this._step3();
        return this._step4();
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
        <span style="font:400 12px/1 Inter,sans-serif;color:#5C5647;width:36px;text-align:right">${stepNum} of 4</span>
      </div>
      <div style="display:flex;gap:6px;padding:14px 20px 0">
        ${[1,2,3,4].map(n => `<div style="flex:1;height:3px;border-radius:2px;background:${n <= stepNum ? '#FFD700' : '#2A2A2A'}"></div>`).join('')}
      </div>`;
    }

    // ── Step 1: Who are you ────────────────────────────────────────
    _step1() {
        const r = this.selectedRole;
        return `
      ${this._header('Verification', 1)}
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
      </div>`;
    }

    // ── Step 2: Phone OTP ──────────────────────────────────────────
    _step2() {
        const user = FirebaseAuth.getCurrentUser();
        // If user already has a verified phone, skip straight to credential step
        const alreadyHasPhone = user?.phoneNumber;
        if (alreadyHasPhone) {
            this.phoneVerified = true;
            this.verifiedPhone = user.phoneNumber;
            // will auto-advance on bind
        }

        return `
      ${this._header('Verify Phone', 2)}
      <div style="padding:28px 20px;flex:1;display:flex;flex-direction:column;gap:20px">
        <div>
          <h1 style="font:700 26px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 8px">
            ${alreadyHasPhone ? 'Phone Verified ✓' : 'Your Phone Number'}
          </h1>
          <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0">
            ${alreadyHasPhone
              ? `Already verified: <strong style="color:#4CAF82">${user.phoneNumber}</strong>`
              : 'We need to verify your phone. This takes 30 seconds.'}
          </p>
        </div>

        ${alreadyHasPhone ? `
          <div style="background:rgba(76,175,130,0.08);border:1px solid rgba(76,175,130,0.2);
            border-radius:14px;padding:16px 18px;display:flex;align-items:center;gap:12px">
            <span style="font-size:24px">✅</span>
            <div>
              <div style="font:600 13px/1 Inter,sans-serif;color:#4CAF82;margin-bottom:4px">Phone Verified</div>
              <div style="font:400 12px/1 Inter,sans-serif;color:#5C5647">${user.phoneNumber}</div>
            </div>
          </div>
          <div style="flex:1"></div>
          <button id="continue-btn" style="width:100%;height:52px;border-radius:14px;border:none;cursor:pointer;
            background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;
            display:flex;align-items:center;justify-content:center;gap:8px">
            Continue to Credentials
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>` : `

          <div style="display:flex;gap:8px">
            <div style="height:52px;padding:0 14px;background:#1A1A1A;border:1.5px solid #2A2A2A;
              border-radius:12px;display:flex;align-items:center;gap:6px;min-width:78px">
              <span style="font-size:16px">🇮🇳</span>
              <span style="font:500 15px/1 Inter,sans-serif;color:#F5F0E8">+91</span>
            </div>
            <input id="phone-input" type="tel" inputmode="numeric" maxlength="10" placeholder="9876543210"
              style="flex:1;height:52px;box-sizing:border-box;background:#1A1A1A;border:1.5px solid #2A2A2A;
                border-radius:12px;color:#F5F0E8;font:400 17px/1 Inter,sans-serif;padding:0 16px;outline:none"
              onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">
          </div>

          <div id="otp-section" style="display:none;flex-direction:column;gap:16px">
            <p style="font:400 13px/1.5 Inter,sans-serif;color:#5C5647;margin:0">
              Enter the 6-digit code sent to your number.
            </p>
            <div style="display:flex;gap:8px;justify-content:center">
              ${Array.from({length:6},(_,i) => `
                <input class="otp-d" type="text" inputmode="numeric" maxlength="1" data-idx="${i}"
                  style="width:42px;height:54px;text-align:center;background:#1A1A1A;
                    border:1.5px solid #2A2A2A;border-radius:12px;color:#FFD700;
                    font:700 20px/1 Inter,sans-serif;outline:none"
                  onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">`).join('')}
            </div>
          </div>

          <div style="flex:1"></div>
          <button id="send-otp-btn" style="width:100%;height:52px;border-radius:14px;border:none;cursor:pointer;
            background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;
            display:flex;align-items:center;justify-content:center;gap:8px">
            Send Verification Code
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <button id="verify-otp-btn" style="display:none;width:100%;height:52px;border-radius:14px;border:none;cursor:not-allowed;
            background:#2A2A2A;color:#5C5647;font:600 15px/1 Inter,sans-serif">
            Verify Code
          </button>`}
      </div>`;
    }

    // ── Step 3: Professional credential ───────────────────────────
    _step3() {
        const role = ROLES.find(r => r.id === this.selectedRole);
        return `
      ${this._header('Your Credentials', 3)}
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

        <!-- Two-verification summary -->
        <div style="display:flex;gap:8px">
          <div style="flex:1;background:rgba(76,175,130,0.08);border:1px solid rgba(76,175,130,0.2);
            border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:18px;margin-bottom:4px">📱</div>
            <div style="font:600 10px/1 Inter,sans-serif;color:#4CAF82;letter-spacing:0.06em;text-transform:uppercase">Phone</div>
            <div style="font:400 10px/1.3 Inter,sans-serif;color:#5C5647;margin-top:3px">Verified ✓</div>
          </div>
          <div style="flex:1;background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);
            border-radius:12px;padding:12px;text-align:center">
            <div style="font-size:18px;margin-bottom:4px">${role?.icon}</div>
            <div style="font:600 10px/1 Inter,sans-serif;color:#F5A623;letter-spacing:0.06em;text-transform:uppercase">Credential</div>
            <div style="font:400 10px/1.3 Inter,sans-serif;color:#5C5647;margin-top:3px">Pending review</div>
          </div>
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

    // ── Step 4: Confirmation ───────────────────────────────────────
    _step4() {
        const role = ROLES.find(r => r.id === this.selectedRole);
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
          You'll receive an SMS when approved.
        </p>

        <!-- What's verified -->
        <div style="width:100%;max-width:360px;background:#1A1A1A;border:1px solid #2A2A2A;
          border-radius:20px;padding:20px 24px;margin-bottom:28px;text-align:left">
          <div style="font:600 10px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:16px">VERIFICATION STATUS</div>
          ${[
            ['📱 Phone', this.verifiedPhone || FirebaseAuth.getCurrentUser()?.phoneNumber || '—', '#4CAF82', '✓ Verified'],
            [`${role?.icon} Role`, role?.label || '—', '#F5A623', '⏳ Pending 24h'],
            ['🔑 Credential', this.credentialNumber || '—', '#F5A623', '⏳ Pending 24h'],
          ].map(([k, v, c, status]) => `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;
              padding:10px 0;border-bottom:1px solid #1E1E1E">
              <div>
                <div style="font:500 12px/1 Inter,sans-serif;color:#5C5647;margin-bottom:3px">${k}</div>
                <div style="font:600 13px/1 Inter,sans-serif;color:#F5F0E8">${v}</div>
              </div>
              <span style="font:600 10px/1 Inter,sans-serif;color:${c};padding:4px 8px;
                background:${c}18;border-radius:999px;white-space:nowrap;margin-top:2px">${status}</span>
            </div>`).join('')}
        </div>

        <button id="explore-btn" style="width:100%;max-width:360px;height:52px;border-radius:14px;
          border:1.5px solid #2A2A2A;background:transparent;color:#FFD700;
          font:600 14px/1 Inter,sans-serif;cursor:pointer">
          Explore in Demo Mode →
        </button>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;margin-top:12px">
          Browse the platform while we review your application.
        </p>
      </div>`;
    }

    // ── Binding ────────────────────────────────────────────────────
    _bind() {
        const rerender = () => {
            this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._currentStep()}</div>`;
            this._bind();
        };

        // Back button
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            if (this.step === 1) window.navigate?.('login');
            else { this.step--; rerender(); }
        });

        // Step 1: role cards + continue
        this.el.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('click', () => { this.selectedRole = card.dataset.role; rerender(); });
        });

        // Step 1 continue
        if (this.step === 1) {
            this.el.querySelector('#continue-btn')?.addEventListener('click', () => {
                if (!this.selectedRole) return;
                this.step = 2;
                rerender();
            });
        }

        // Step 2: already-has-phone continue
        if (this.step === 2 && this.phoneVerified) {
            // auto-advance if user already has phone from sign-in method
            setTimeout(() => {
                this.step = 3; rerender();
            }, 100);
        }

        // Step 2: send OTP + verify
        if (this.step === 2 && !this.phoneVerified) {
            const sendBtn  = this.el.querySelector('#send-otp-btn');
            const verifyBtn = this.el.querySelector('#verify-otp-btn');
            const otpSection = this.el.querySelector('#otp-section');
            const phoneInput = this.el.querySelector('#phone-input');

            // Continue when already verified
            this.el.querySelector('#continue-btn')?.addEventListener('click', () => {
                this.step = 3; rerender();
            });

            sendBtn?.addEventListener('click', async () => {
                const raw = phoneInput?.value?.replace(/\D/g, '');
                if (!raw || raw.length !== 10) { window.showToast?.('Enter a valid 10-digit number', 'error'); return; }
                this.verifiedPhone = `+91${raw}`;
                sendBtn.disabled = true;
                sendBtn.textContent = 'Sending…';
                try {
                    await FirebaseAuth.sendOTP(this.verifiedPhone);
                    sendBtn.style.display = 'none';
                    otpSection.style.display = 'flex';
                    verifyBtn.style.display = 'block';
                    this._bindOTPDigits(verifyBtn);
                } catch (err) {
                    console.error('[Onboarding] sendOTP error:', err);
                    window.showToast?.(err.message || 'Could not send OTP', 'error');
                    sendBtn.disabled = false;
                    sendBtn.textContent = 'Send Verification Code';
                }
            });
        }

        // Step 3: doc upload + submit
        if (this.step === 3) {
            const zone = this.el.querySelector('#doc-zone');
            const input = this.el.querySelector('#doc-input');
            zone?.addEventListener('click', () => input?.click());
            zone?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') input?.click(); });
            input?.addEventListener('change', () => {
                if (input.files[0]) { this.docFile = input.files[0]; rerender(); }
            });
            this.el.querySelector('#cred-input')?.addEventListener('input', e => { this.credentialNumber = e.target.value; });
            this.el.querySelector('#submit-btn')?.addEventListener('click', () => this._submit());
        }

        // Step 4
        this.el.querySelector('#explore-btn')?.addEventListener('click', () => window.navigate?.('radar'));
    }

    _bindOTPDigits(verifyBtn) {
        const digits = [...this.el.querySelectorAll('.otp-d')];
        const getCode = () => digits.map(d => d.value).join('');

        digits.forEach((d, i) => {
            d.addEventListener('input', () => {
                d.value = d.value.replace(/\D/g,'').slice(-1);
                if (d.value && i < 5) digits[i+1].focus();
                const done = getCode().length === 6;
                verifyBtn.disabled = !done;
                verifyBtn.style.background = done ? '#FFD700' : '#2A2A2A';
                verifyBtn.style.color = done ? '#0D0D0D' : '#5C5647';
                verifyBtn.style.cursor = done ? 'pointer' : 'not-allowed';
            });
            d.addEventListener('keydown', e => { if (e.key === 'Backspace' && !d.value && i > 0) digits[i-1].focus(); });
            d.addEventListener('paste', e => {
                const v = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
                v.split('').forEach((ch,j) => { if (digits[j]) digits[j].value = ch; });
                digits[Math.min(v.length,5)].focus(); e.preventDefault();
                verifyBtn.disabled = v.length<6;
                verifyBtn.style.background = v.length===6 ? '#FFD700' : '#2A2A2A';
                verifyBtn.style.color = v.length===6 ? '#0D0D0D' : '#5C5647';
            });
        });
        setTimeout(() => digits[0].focus(), 80);

        verifyBtn.addEventListener('click', async () => {
            const code = getCode();
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying…';
            try {
                const user = FirebaseAuth.getCurrentUser();
                if (user) {
                    await FirebaseAuth.linkPhone(code);
                } else {
                    await FirebaseAuth.confirmOTP(code);
                }
                this.phoneVerified = true;
                window.showToast?.('Phone verified ✓', 'success');
                this.step = 3;
                this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._currentStep()}</div>`;
                this._bind();
            } catch (err) {
                console.error('[Onboarding] OTP verify error:', err);
                window.showToast?.(err.code === 'auth/invalid-verification-code'
                    ? 'Wrong code — try again.' : 'Verification failed.', 'error');
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify Code';
            }
        });
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
                try { docUrl = await FirebaseStorage.uploadCOADocument(this.docFile, user.uid); }
                catch(e) { console.warn('[Onboarding] doc upload failed:', e); }
            }
            if (user) {
                await FirebaseDB.submitVerificationApplication(user.uid, {
                    role: this.selectedRole,
                    credentialNumber: this.credentialNumber,
                    phone: this.verifiedPhone || user.phoneNumber || null,
                    docUrl
                });
            }
            window.showToast?.('Application submitted! ✦', 'success');
            this.step = 4;
            this.el.innerHTML = `<div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;overflow-y:auto">${this._currentStep()}</div>`;
            this._bind();
        } catch (err) {
            console.error('[Onboarding] submit error:', err);
            window.showToast?.('Submission failed. Please try again.', 'error');
            if (btn) { btn.textContent = 'Submit Application ✦'; btn.disabled = false; }
        } finally {
            this.submitting = false;
        }
    }

    onActivate() {}
}
