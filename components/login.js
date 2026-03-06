// components/login.js — Login / Landing Screen
// Design from Stitch: SPOLIA Premium Landing Screen
import { FirebaseAuth } from '../firebase-config.js';

export class LoginScreen {
    constructor(el) {
        this.el = el;
    }

    render() {
        this.el.innerHTML = `
      <div style="
        min-height:100vh;width:100%;
        background:linear-gradient(180deg,#0D0D0D 0%,#111008 50%,#0D0D0D 100%);
        display:flex;flex-direction:column;align-items:center;
        padding:env(safe-area-inset-top,48px) 24px env(safe-area-inset-bottom,40px);
        overflow-y:auto;box-sizing:border-box;position:relative
      ">

        <!-- Material texture gradient overlay -->
        <div style="
          position:absolute;inset:0;pointer-events:none;
          background:radial-gradient(ellipse 80% 40% at 50% 30%,rgba(255,215,0,0.04) 0%,transparent 70%);
          z-index:0
        "></div>

        <!-- Content -->
        <div style="position:relative;z-index:1;width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;flex:1">

          <!-- Spacer top -->
          <div style="flex:1;min-height:32px"></div>

          <!-- Wordmark -->
          <div style="text-align:center;margin-bottom:8px">
            <div style="
              font-family:'Playfair Display',Georgia,serif;
              font-size:52px;font-weight:700;
              color:#FFD700;letter-spacing:6px;line-height:1
            ">SPOLIA</div>
            <div style="
              font-family:Inter,sans-serif;font-size:12px;font-weight:400;
              color:#5C5647;letter-spacing:0.2em;text-transform:uppercase;
              margin-top:8px
            ">The Second Life of Design</div>
          </div>

          <!-- Material accent line -->
          <div style="
            width:48px;height:1px;background:linear-gradient(90deg,transparent,#FFD700,transparent);
            margin:24px 0 28px
          "></div>

          <!-- Hero material image area -->
          <div style="
            width:100%;height:200px;border-radius:16px;
            background:linear-gradient(135deg,#161208 0%,#1a1506 30%,#0f0f0a 70%,#161208 100%);
            border:1px solid rgba(255,215,0,0.12);
            overflow:hidden;position:relative;margin-bottom:32px;
            display:flex;align-items:center;justify-content:center;gap:16px
          ">
            <!-- Material swatches -->
            ${[
                { emoji: '🪨', label: 'Travertine', color: 'rgba(180,160,120,0.15)' },
                { emoji: '🪵', label: 'Burma Teak', color: 'rgba(140,80,40,0.15)' },
                { emoji: '⚙️', label: 'Steel', color: 'rgba(100,120,150,0.15)' }
            ].map(m => `
              <div style="
                display:flex;flex-direction:column;align-items:center;gap:6px;
                background:${m.color};border:1px solid rgba(255,215,0,0.08);
                border-radius:12px;padding:16px 12px
              ">
                <span style="font-size:28px">${m.emoji}</span>
                <span style="font:600 10px/1 Inter,sans-serif;color:#A09882;letter-spacing:0.06em;text-transform:uppercase">${m.label}</span>
              </div>
            `).join('')}
            <!-- Gradient overlay -->
            <div style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(13,13,13,0.6) 0%,transparent 50%)"></div>
          </div>

          <!-- Professional badges -->
          <div style="display:flex;gap:8px;margin-bottom:32px;flex-wrap:wrap;justify-content:center">
            ${[
                { icon: '🏛', label: 'Architects', sub: 'COA Verified' },
                { icon: '🏗', label: 'Contractors', sub: 'GSTIN Verified' },
                { icon: '🏪', label: 'Vendors', sub: 'Registered' }
            ].map(b => `
              <div style="
                display:flex;flex-direction:column;align-items:center;gap:4px;
                background:#161616;border:1px solid rgba(255,215,0,0.2);
                border-radius:12px;padding:10px 14px;min-width:88px
              ">
                <span style="font-size:18px">${b.icon}</span>
                <span style="font:600 11px/1 Inter,sans-serif;color:#F5F0E8">${b.label}</span>
                <span style="font:400 10px/1 Inter,sans-serif;color:#5C5647">${b.sub}</span>
              </div>
            `).join('')}
          </div>

          <!-- Verified only label -->
          <div style="
            font:600 10px/1 Inter,sans-serif;
            color:#5C5647;letter-spacing:0.15em;text-transform:uppercase;
            margin-bottom:28px;display:flex;align-items:center;gap:8px
          ">
            <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,#2A2A2A)"></div>
            Verified professionals only
            <div style="flex:1;height:1px;background:linear-gradient(90deg,#2A2A2A,transparent)"></div>
          </div>

          <!-- Google Sign-In Button -->
          <button id="google-signin-btn" style="
            width:100%;height:56px;border-radius:12px;
            background:#FFD700;color:#0D0D0D;border:none;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:12px;
            font:600 15px/1 Inter,sans-serif;letter-spacing:0.01em;
            box-shadow:0 4px 24px rgba(255,215,0,0.25);
            transition:transform 120ms,box-shadow 120ms,background 120ms;
            position:relative;overflow:hidden
          " aria-label="Sign in with Google">
            <!-- Google icon -->
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span id="signin-text">Sign in with Google</span>
          </button>

          <!-- Apply link -->
          <button id="apply-btn" style="
            background:none;border:none;margin-top:16px;cursor:pointer;
            font:400 13px/1 Inter,sans-serif;color:#FFD700;
            display:flex;align-items:center;gap:4px
          ">
            New to Spolia? Apply for access
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          <div style="flex:1;min-height:24px"></div>

          <!-- Footer -->
          <div style="font:400 11px/1.5 Inter,sans-serif;color:#5C5647;text-align:center">
            By signing in, you agree to Spolia's<br>
            <span style="color:#A09882">Terms of Service</span> &amp; <span style="color:#A09882">Privacy Policy</span>
          </div>
        </div>
      </div>
    `;

        this._bindEvents();
    }

    _bindEvents() {
        const btn = this.el.querySelector('#google-signin-btn');
        const applyBtn = this.el.querySelector('#apply-btn');

        btn?.addEventListener('click', () => this._signIn());

        applyBtn?.addEventListener('click', () => {
            window.navigate?.('onboarding');
        });

        // Hover effect
        btn?.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-1px)';
            btn.style.boxShadow = '0 8px 32px rgba(255,215,0,0.35)';
        });
        btn?.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.boxShadow = '0 4px 24px rgba(255,215,0,0.25)';
        });
    }

    async _signIn() {
        const btn = this.el.querySelector('#google-signin-btn');
        const textEl = this.el.querySelector('#signin-text');
        if (!btn || !textEl) return;

        btn.disabled = true;
        textEl.textContent = 'Signing in...';
        btn.style.background = '#B89A00';

        try {
            await FirebaseAuth.signInWithGoogle();
            // Auth state change will trigger navigation in app.js
        } catch (err) {
            console.error('[Login] Sign-in failed:', err);
            window.showToast?.('Sign-in failed. Please try again.', 'error');
            btn.disabled = false;
            textEl.textContent = 'Sign in with Google';
            btn.style.background = '#FFD700';
        }
    }

    onActivate() { }
}
