// components/login.js — Sign In Screen (Google + Phone OTP)
import { FirebaseAuth } from '../firebase-config.js';

export class LoginScreen {
    constructor(el) {
        this.el = el;
        this._view = 'main'; // 'main' | 'phone' | 'otp'
        this._phone = '';
    }

    render() { this._renderMain(); }

    // ── Main landing ───────────────────────────────────────────────
    _renderMain() {
        this._view = 'main';
        this.el.innerHTML = `
      <div style="
        min-height:100dvh;width:100%;
        background:linear-gradient(180deg,#0D0D0D 0%,#111008 50%,#0D0D0D 100%);
        display:flex;flex-direction:column;align-items:center;
        padding:env(safe-area-inset-top,48px) 24px env(safe-area-inset-bottom,40px);
        overflow-y:auto;box-sizing:border-box;position:relative">

        <div style="position:absolute;inset:0;pointer-events:none;
          background:radial-gradient(ellipse 80% 40% at 50% 30%,rgba(255,215,0,0.04) 0%,transparent 70%);z-index:0"></div>

        <div style="position:relative;z-index:1;width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;flex:1">
          <div style="flex:1;min-height:32px"></div>

          <!-- Wordmark -->
          <div style="text-align:center;margin-bottom:8px">
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:52px;font-weight:700;color:#FFD700;letter-spacing:6px;line-height:1">SPOLIA</div>
            <div style="font-family:Inter,sans-serif;font-size:12px;font-weight:400;color:#5C5647;letter-spacing:0.2em;text-transform:uppercase;margin-top:8px">The Second Life of Design</div>
          </div>

          <div style="width:48px;height:1px;background:linear-gradient(90deg,transparent,#FFD700,transparent);margin:24px 0 28px"></div>

          <!-- Hero material swatches -->
          <div style="width:100%;height:200px;border-radius:16px;
            background:linear-gradient(135deg,#161208 0%,#1a1506 30%,#0f0f0a 70%,#161208 100%);
            border:1px solid rgba(255,215,0,0.12);overflow:hidden;position:relative;margin-bottom:32px;
            display:flex;align-items:center;justify-content:center;gap:16px">
            ${[
              { emoji: '🪨', label: 'Travertine' },
              { emoji: '🪵', label: 'Burma Teak' },
              { emoji: '⚙️', label: 'Steel' }
            ].map(m => `
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px;
                background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.08);border-radius:12px;padding:16px 12px">
                <span style="font-size:28px">${m.emoji}</span>
                <span style="font:600 10px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.06em;text-transform:uppercase">${m.label}</span>
              </div>`).join('')}
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(13,13,13,0.6) 0%,transparent 50%)"></div>
          </div>

          <!-- Professional badges -->
          <div style="display:flex;gap:8px;margin-bottom:28px;flex-wrap:wrap;justify-content:center">
            ${[
              { icon: '🏛', label: 'Architects', sub: 'COA Verified' },
              { icon: '🏗', label: 'Contractors', sub: 'GSTIN Verified' },
              { icon: '🏪', label: 'Vendors', sub: 'Registered' }
            ].map(b => `
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;
                background:#161616;border:1px solid rgba(255,215,0,0.2);border-radius:12px;padding:10px 14px;min-width:88px">
                <span style="font-size:18px">${b.icon}</span>
                <span style="font:600 11px/1 Inter,sans-serif;color:#F5F0E8">${b.label}</span>
                <span style="font:400 10px/1 Inter,sans-serif;color:#5C5647">${b.sub}</span>
              </div>`).join('')}
          </div>

          <!-- Divider label -->
          <div style="font:600 10px/1 Inter,sans-serif;color:#5C5647;letter-spacing:0.15em;text-transform:uppercase;
            margin-bottom:24px;display:flex;align-items:center;gap:8px;width:100%">
            <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,#2A2A2A)"></div>
            Verified professionals only
            <div style="flex:1;height:1px;background:linear-gradient(90deg,#2A2A2A,transparent)"></div>
          </div>

          <!-- Google Sign-In -->
          <button id="google-btn" style="
            width:100%;height:56px;border-radius:12px;background:#FFD700;color:#0D0D0D;border:none;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:12px;
            font:600 15px/1 Inter,sans-serif;box-shadow:0 4px 24px rgba(255,215,0,0.25);
            transition:transform 120ms,box-shadow 120ms;position:relative;overflow:hidden"
            aria-label="Sign in with Google">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span id="google-text">Sign in with Google</span>
          </button>

          <!-- Divider -->
          <div style="display:flex;align-items:center;gap:12px;width:100%;margin:14px 0">
            <div style="flex:1;height:1px;background:#1E1E1E"></div>
            <span style="font:400 11px/1 Inter,sans-serif;color:#3A3A3A">or</span>
            <div style="flex:1;height:1px;background:#1E1E1E"></div>
          </div>

          <!-- Phone Sign-In -->
          <button id="phone-btn" style="
            width:100%;height:52px;border-radius:12px;background:transparent;
            border:1.5px solid #2A2A2A;cursor:pointer;color:#F5F0E8;
            display:flex;align-items:center;justify-content:center;gap:10px;
            font:500 14px/1 Inter,sans-serif;transition:border-color 150ms"
            aria-label="Sign in with phone number">
            <span style="font-size:18px">📱</span>
            Sign in with Phone Number
          </button>

          <!-- Apply link -->
          <button id="apply-btn" style="background:none;border:none;margin-top:16px;cursor:pointer;
            font:400 13px/1 Inter,sans-serif;color:#FFD700;display:flex;align-items:center;gap:4px">
            New to Spolia? Apply for access
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <!-- Demo -->
          <button id="demo-btn" style="width:100%;height:48px;border-radius:12px;margin-top:12px;
            background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:10px;
            font:500 14px/1 Inter,sans-serif;color:#FFD700;transition:background 120ms">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Explore in Demo Mode
          </button>

          <div style="flex:1;min-height:24px"></div>
          <div style="font:400 11px/1.5 Inter,sans-serif;color:#5C5647;text-align:center">
            By signing in, you agree to Spolia's<br>
            <span style="color:#A09882">Terms of Service</span> &amp; <span style="color:#A09882">Privacy Policy</span>
          </div>
        </div>
      </div>`;
        this._bindMain();
    }

    // ── Phone number entry ─────────────────────────────────────────
    _renderPhone() {
        this._view = 'phone';
        this.el.innerHTML = `
      <div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;
        padding:max(env(safe-area-inset-top),20px) 24px 40px;box-sizing:border-box">

        <button id="back-btn" style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;
          border:1px solid #2A2A2A;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#F5F0E8;margin-bottom:32px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        <h1 style="font:700 28px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 8px">Your Phone</h1>
        <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0 0 32px">
          We'll send a one-time code to verify your number.
        </p>

        <!-- Phone input with country code -->
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <div style="height:52px;padding:0 14px;background:#1A1A1A;border:1.5px solid #2A2A2A;
            border-radius:12px;display:flex;align-items:center;gap:6px;min-width:80px">
            <span style="font-size:18px">🇮🇳</span>
            <span style="font:500 15px/1 Inter,sans-serif;color:#F5F0E8">+91</span>
          </div>
          <input id="phone-input" type="tel" inputmode="numeric" maxlength="10"
            placeholder="9876543210"
            style="flex:1;height:52px;box-sizing:border-box;background:#1A1A1A;border:1.5px solid #2A2A2A;
              border-radius:12px;color:#F5F0E8;font:400 17px/1 Inter,sans-serif;padding:0 16px;
              outline:none;letter-spacing:0.05em"
            onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">
        </div>
        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;margin:0 0 28px">
          Currently only Indian numbers (+91). International support coming soon.
        </p>

        <button id="send-otp-btn" style="width:100%;height:52px;border-radius:14px;border:none;
          background:#FFD700;color:#0D0D0D;font:600 15px/1 Inter,sans-serif;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px">
          Send OTP
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>

        <p style="font:400 11px/1.5 Inter,sans-serif;color:#3A3A3A;text-align:center;margin-top:16px">
          Standard SMS rates may apply.
        </p>
      </div>`;
        this._bindPhone();
    }

    // ── OTP verification ───────────────────────────────────────────
    _renderOTP(phone) {
        this._view = 'otp';
        const masked = '+91 ' + phone.slice(0, 2) + '••••' + phone.slice(-2);
        this.el.innerHTML = `
      <div style="min-height:100dvh;background:#0D0D0D;display:flex;flex-direction:column;
        padding:max(env(safe-area-inset-top),20px) 24px 40px;box-sizing:border-box">

        <button id="back-btn" style="width:36px;height:36px;border-radius:50%;background:#1A1A1A;
          border:1px solid #2A2A2A;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#F5F0E8;margin-bottom:32px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>

        <h1 style="font:700 28px/1.2 'Playfair Display',Georgia,serif;color:#FFD700;margin:0 0 8px">Enter Code</h1>
        <p style="font:400 14px/1.6 Inter,sans-serif;color:#5C5647;margin:0 0 32px">
          Sent to <strong style="color:#A09882">${masked}</strong>. Check your SMS.
        </p>

        <!-- 6-digit OTP input -->
        <div style="display:flex;gap:10px;justify-content:center;margin-bottom:24px">
          ${Array.from({length:6}, (_,i) => `
            <input class="otp-digit" type="text" inputmode="numeric" maxlength="1" data-idx="${i}"
              style="width:44px;height:56px;text-align:center;background:#1A1A1A;
                border:1.5px solid #2A2A2A;border-radius:12px;color:#FFD700;
                font:700 22px/1 Inter,sans-serif;outline:none;box-sizing:border-box;
                transition:border-color 150ms"
              onfocus="this.style.borderColor='#FFD700'" onblur="this.style.borderColor='#2A2A2A'">`).join('')}
        </div>

        <button id="verify-btn" disabled style="width:100%;height:52px;border-radius:14px;border:none;
          background:#2A2A2A;color:#5C5647;font:600 15px/1 Inter,sans-serif;cursor:not-allowed;margin-bottom:16px">
          Verify Code
        </button>

        <button id="resend-btn" style="background:none;border:none;cursor:pointer;
          font:400 13px/1 Inter,sans-serif;color:#FFD700;padding:8px">
          Resend Code
        </button>
      </div>`;
        this._bindOTP(phone);
    }

    // ── Binding ────────────────────────────────────────────────────
    _bindMain() {
        const googleBtn = this.el.querySelector('#google-btn');
        const googleText = this.el.querySelector('#google-text');

        googleBtn?.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.style.background = '#B89A00';
            if (googleText) googleText.textContent = 'Opening Google…';
            try {
                await FirebaseAuth.signInWithGoogle();
                // Success: onAuthStateChanged fires and routes the user automatically.
                // Keep button disabled to prevent double-click while routing.
            } catch (err) {
                // Restore button in all error cases
                googleBtn.disabled = false;
                googleBtn.style.background = '#FFD700';
                if (googleText) googleText.textContent = 'Sign in with Google';

                if (err.code === 'auth/popup-dismissed') {
                    // User closed the popup — silent restore, no toast needed
                    return;
                }
                if (err.code === 'auth/popup-blocked') {
                    window.showToast?.(
                        '🔔 Popups blocked — tap the address bar, allow popups, then try again.',
                        'error', 6000
                    );
                    return;
                }
                console.error('[Login] Google sign-in failed:', err);
                window.showToast?.(
                    err.message || 'Sign-in failed. Try phone number instead.',
                    'error'
                );
            }
        });

        this.el.querySelector('#phone-btn')?.addEventListener('click', () => this._renderPhone());
        this.el.querySelector('#apply-btn')?.addEventListener('click', () => window.navigate?.('onboarding'));
        this.el.querySelector('#demo-btn')?.addEventListener('click', () => { window.location.href = '/?demo=true'; });
    }

    _bindPhone() {
        this.el.querySelector('#back-btn')?.addEventListener('click', () => this._renderMain());
        const input = this.el.querySelector('#phone-input');
        const btn = this.el.querySelector('#send-otp-btn');

        btn?.addEventListener('click', async () => {
            const raw = input?.value?.replace(/\D/g, '');
            if (!raw || raw.length !== 10) {
                window.showToast?.('Enter a valid 10-digit number', 'error'); return;
            }
            this._phone = raw;
            const phone = `+91${raw}`;
            btn.disabled = true;
            btn.textContent = 'Sending…';
            try {
                await FirebaseAuth.sendOTP(phone);
                this._renderOTP(raw);
            } catch (err) {
                console.error('[Login] sendOTP failed:', err);
                window.showToast?.(err.message || 'Failed to send OTP', 'error');
                btn.disabled = false;
                btn.textContent = 'Send OTP';
            }
        });
    }

    _bindOTP(phone) {
        this.el.querySelector('#back-btn')?.addEventListener('click', () => this._renderPhone());

        const digits = [...this.el.querySelectorAll('.otp-digit')];
        const verifyBtn = this.el.querySelector('#verify-btn');

        const getCode = () => digits.map(d => d.value).join('');
        const updateVerify = () => {
            const done = getCode().length === 6;
            verifyBtn.disabled = !done;
            verifyBtn.style.background = done ? '#FFD700' : '#2A2A2A';
            verifyBtn.style.color = done ? '#0D0D0D' : '#5C5647';
            verifyBtn.style.cursor = done ? 'pointer' : 'not-allowed';
        };

        digits.forEach((d, i) => {
            d.addEventListener('input', () => {
                d.value = d.value.replace(/\D/g, '').slice(-1);
                if (d.value && i < 5) digits[i+1].focus();
                updateVerify();
            });
            d.addEventListener('keydown', e => {
                if (e.key === 'Backspace' && !d.value && i > 0) digits[i-1].focus();
            });
            d.addEventListener('paste', e => {
                const pasted = (e.clipboardData || window.clipboardData)
                    .getData('text').replace(/\D/g,'').slice(0,6);
                pasted.split('').forEach((ch, j) => { if (digits[j]) digits[j].value = ch; });
                digits[Math.min(pasted.length, 5)].focus();
                updateVerify(); e.preventDefault();
            });
        });
        setTimeout(() => digits[0].focus(), 100);

        verifyBtn?.addEventListener('click', async () => {
            const code = getCode();
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying…';
            try {
                const currentUser = FirebaseAuth.getCurrentUser();
                // Only link phone if user signed in via Google (not via phone itself)
                const isGoogleUser = currentUser?.providerData?.some(p => p.providerId === 'google.com') ?? false;
                if (isGoogleUser) {
                    await FirebaseAuth.linkPhone(code);
                } else {
                    await FirebaseAuth.confirmOTP(code);
                }
                window.showToast?.('Phone verified ✓', 'success');
                // auth state change will route to onboarding
            } catch (err) {
                console.error('[Login] OTP verify failed:', err);
                window.showToast?.(err.code === 'auth/invalid-verification-code'
                    ? 'Wrong code. Try again.' : 'Verification failed.', 'error');
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify Code';
            }
        });

        this.el.querySelector('#resend-btn')?.addEventListener('click', async () => {
            try {
                await FirebaseAuth.sendOTP(`+91${phone}`);
                window.showToast?.('New code sent', 'info');
            } catch(err) {
                window.showToast?.('Could not resend. Try again.', 'error');
            }
        });
    }

    onActivate() {
        // Reset to main view if coming back from elsewhere
        if (this._view !== 'main') this._renderMain();
        // Clean up any stale reCAPTCHA verifier from a previous OTP attempt
        FirebaseAuth.resetRecaptcha?.();
    }
}
