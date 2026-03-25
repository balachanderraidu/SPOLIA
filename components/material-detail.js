// components/material-detail.js — Material Detail & Spolia Bond
import { FirebaseDB, MOCK_LISTINGS } from '../firebase-config.js';
import { getExpiryUrgency, expiryCountdown } from '../utils/expiry.js';

export class MaterialDetailScreen {
    constructor(el) {
        this.el = el;
        this.listing = null;
    }

    render(listing = null) {
        this.listing = listing || MOCK_LISTINGS[0];
        const l = this.listing;

        this.el.innerHTML = `
      <!-- Hero Image (no header — immersive) -->
      <div style="position:relative">
        <div class="material-hero-img" style="font-size:80px"
          role="img" aria-label="${l.title} material photo">
          ${this._heroContent(l)}
        </div>
        <!-- Overlay controls -->
        <div style="position:absolute;top:env(safe-area-inset-top,16px);left:0;right:0;padding:16px;display:flex;justify-content:space-between;z-index:10">
          <button id="back-btn" class="icon-btn"
            style="background:rgba(0,0,0,0.5);border-color:rgba(255,255,255,0.2);color:#fff" aria-label="Go back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <button class="icon-btn" id="share-btn"
            style="background:rgba(0,0,0,0.5);border-color:rgba(255,255,255,0.2);color:#fff" aria-label="Share listing">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          </button>
        </div>
        ${l.bondProtected ? `
          <div style="position:absolute;top:env(safe-area-inset-top,16px);right:72px;padding-top:16px">
            <span class="badge badge--bond">🔒 Bond</span>
          </div>` : ''}
      </div>

      <!-- Content -->
      <div style="padding-top:0;padding-bottom:120px">
        <!-- Title Section -->
        <div style="padding:var(--space-md)">
          <h1 style="font:var(--text-h1);color:var(--color-text-primary);margin-bottom:6px">${l.title}</h1>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <button id="seller-chip" style="
              display:flex;align-items:center;gap:8px;
              background:var(--color-bg-elevated);border:1px solid var(--color-border);
              border-radius:999px;padding:6px 12px 6px 6px;
              cursor:pointer;transition:background 120ms" aria-label="View seller profile">
              ${l.seller?.avatar
                ? `<img src="${l.seller.avatar}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(255,215,0,0.3)" alt="">`
                : `<span style="width:28px;height:28px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:14px">👤</span>`}
              <span style="font:600 12px/1 var(--font-body);color:var(--color-text-primary)">${l.seller?.name || 'Unknown'}</span>
              ${l.verified ? `<span class="badge badge--verified" style="padding:2px 6px;font-size:9px">✓</span>` : ''}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.4;margin-left:2px"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style="font:var(--text-caption);color:var(--color-text-secondary)">${l.distance} km · ${l.location?.label}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge badge--type">${l.type?.toUpperCase()}</span>
            ${l.bondProtected ? `<span class="badge badge--bond">🔒 Bond Protected</span>` : ''}
            <span class="badge badge--ai">✨ AI Estimated</span>
          </div>
        </div>

        <div class="divider" style="margin: 0"></div>

        <!-- Description -->
        <div style="padding:var(--space-md)">
          <h2 style="font:var(--text-h3);color:var(--color-text-secondary);margin-bottom:8px;letter-spacing:0.04em;text-transform:uppercase">About</h2>
          <p style="font:var(--text-body);color:var(--color-text-secondary);line-height:1.7">${l.description}</p>
        </div>

        <!-- Specifications -->
        <div class="section-header" style="padding-top:0">
          <h2 class="section-header__title">Specifications</h2>
        </div>
        <div class="data-grid" style="margin:0 var(--space-md) var(--space-md)">
          <div class="data-tile">
            <span class="data-tile__value gold">${l.currency}${l.price}/${l.unit}</span>
            <span class="data-tile__label">Price per unit</span>
          </div>
          <div class="data-tile">
            <span class="data-tile__value">${l.quantity} ${l.unit}</span>
            <span class="data-tile__label">Available</span>
          </div>
          ${l.specs ? Object.entries(l.specs).map(([k, v]) => `
            <div class="data-tile">
              <span class="data-tile__value">${v}</span>
              <span class="data-tile__label">${k.replace(/([A-Z])/g, ' $1').trim()}</span>
            </div>`).join('') : ''}
        </div>

        <!-- CO₂ Impact -->
        <div style="margin:0 var(--space-md) var(--space-md);display:flex;align-items:center;gap:10px;
          background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);border-radius:var(--radius-sm);padding:12px">
          <span style="font-size:24px">🌱</span>
          <div>
            <div style="font:var(--text-body);color:var(--color-green);font-weight:600">${l.co2Saved} kg CO₂ saved</div>
            <div style="font:var(--text-caption);color:var(--color-text-muted)">vs. producing equivalent new material</div>
          </div>
        </div>

        <!-- Near-Expiry Rescue Banner -->
        ${(() => {
          const { level, label, color, emoji } = getExpiryUrgency(l.expiryDate);
          if (!level || level === 'expired') return '';
          const countdown = expiryCountdown(l.expiryDate);
          const msgs = {
            critical: 'Act now — this material will likely be discarded if not rescued today.',
            urgent: 'This material is approaching its use-by date. Rescue it before it goes to waste.',
            soon: 'This listing has a limited shelf life. Bond early to avoid missing out.'
          };
          return `
          <div style="margin:0 var(--space-md) var(--space-md);
            background:${color}12;border:1px solid ${color}40;border-left:3px solid ${color};
            border-radius:var(--radius-sm);padding:12px 14px;
            ${level === 'critical' ? 'animation:pulse 1.8s ease infinite' : ''}">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-size:18px">${emoji}</span>
              <span style="font:700 13px/1 Inter,sans-serif;color:${color};text-transform:uppercase;letter-spacing:0.05em">
                RESCUE NEEDED · ${countdown?.toUpperCase()}
              </span>
            </div>
            <p style="font:400 12px/1.5 Inter,sans-serif;color:var(--color-text-secondary);margin:0">
              ${msgs[level] || ''}
            </p>
          </div>`;
        })()}

        <!-- Spolia Bond Box -->
        <div class="bond-box" role="complementary" aria-label="Spolia Bond guarantee information">
          <div class="bond-box__header">
            <span style="font-size:22px">🔒</span>
            <span class="bond-box__title">The Spolia Bond</span>
            <span class="badge badge--bond" style="margin-left:auto">PROTECTED</span>
          </div>
          <p class="bond-box__desc">
            A <strong style="color:var(--color-gold)">refundable ₹${this._depositAmount(l)} deposit</strong> is held in escrow when you commit to this listing.
            Released to the seller upon verified pickup.
            If material quality doesn't match the listing, the bond protects you.
          </p>
          <div style="display:flex;gap:12px;margin-top:12px;font:var(--text-caption);color:var(--color-text-muted)">
            <span>✓ Quality verified</span>
            <span>✓ Escrow held</span>
            <span>✓ Dispute covered</span>
          </div>
        </div>

        <!-- Dispute Link -->
        <div style="padding:0 var(--space-md)">
          <button id="dispute-btn" style="width:100%;text-align:center;font:var(--text-caption);color:var(--color-text-muted);padding:8px;background:none;border:none;cursor:pointer">
            ⚠️ Report a Quality Issue with this listing
          </button>
        </div>

        <!-- Similar Listings -->
        ${(() => {
          if (typeof MOCK_LISTINGS === 'undefined') return '';
          const similar = MOCK_LISTINGS.filter(s => s.id !== l.id && s.type === l.type).slice(0, 4);
          if (!similar.length) return '';
          const EMOJI_MAP = { stone:'🪨', marble:'🏛️', steel:'⚙️', wood:'🪵', brick:'🧱', bulk:'📦', plumbing:'🚰', cement:'🏗️' };
          const chips = similar.map(s => `
            <div onclick="window.navigate?.('material-detail',{listingId:'${s.id}'})"
              style="flex-shrink:0;width:160px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:12px;overflow:hidden;cursor:pointer">
              <div style="height:80px;background:#111;display:flex;align-items:center;justify-content:center;font-size:28px">
                ${s.imageUrls?.[0] ? `<img src="${s.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="">` : (EMOJI_MAP[s.type]||'📦')}
              </div>
              <div style="padding:8px 10px">
                <div style="font:600 11px/1.3 Inter;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:4px">${s.title}</div>
                <div style="font:700 12px/1 Inter;color:var(--color-gold)">₹${(s.price||0).toLocaleString('en-IN')}/${s.unit}</div>
              </div>
            </div>`).join('');
          return `
          <div style="padding:0 var(--space-md);margin-bottom:var(--space-md)">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="font:600 11px/1 Inter;color:var(--color-text-secondary);letter-spacing:0.08em;text-transform:uppercase">Similar Listings</span>
              <span style="flex:1;height:1px;background:var(--color-border)"></span>
            </div>
            <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none">
              ${chips}
            </div>
          </div>`;
        })()}
      </div>

      <!-- Sticky CTA -->
      <div style="position:fixed;bottom:var(--nav-height);left:50%;transform:translateX(-50%);
        width:100%;max-width:480px;padding:var(--space-md);background:rgba(13,13,13,0.95);
        backdrop-filter:blur(12px);border-top:1px solid var(--color-border);z-index:150">
          <!-- Sticky CTA layout: price left, co2 right, Bond button, Message button -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div>
              <span style="font:var(--text-h2);color:var(--color-gold)">${l.currency}${(l.price * l.quantity).toLocaleString('en-IN')}</span>
              <span style="font:var(--text-caption);color:var(--color-text-muted);margin-left:4px">total &middot; ${l.quantity} ${l.unit}</span>
            </div>
            <span class="co2-tag">🌱 ${l.co2Saved}kg</span>
          </div>
          <div style="display:flex;gap:10px">
            <button class="btn btn--bond" id="bond-btn" style="flex:1">
              🔒 Secure with Bond &mdash; ₹${this._depositAmount(l)}
              <span class="btn__sub">Refundable &middot; Quality guaranteed</span>
            </button>
            <button id="chat-btn" style="
              width:52px;height:52px;border-radius:14px;flex-shrink:0;
              background:var(--color-bg-elevated);border:1px solid var(--color-border);
              display:flex;align-items:center;justify-content:center;
              cursor:pointer;transition:background 120ms"
              aria-label="Message seller">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
      </div>
    `;

        this._bindActions();
    }

    _heroContent(l) {
        if (l.imageUrls?.[0]) {
            return `<img src="${l.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="${l.title}" onerror="this.style.display='none'">`;
        }
        const map = { stone: '🪨', marble: '🪨', steel: '⚙️', wood: '🪵', brick: '🧱', glass: '🔷' };
        return map[l.type] || '📦';
    }

    _depositAmount(l) {
        // 10% of total value, min ₹2,000, max ₹50,000
        const total = (l.price || 0) * (l.quantity || 1);
        const deposit = Math.min(50000, Math.max(2000, Math.round(total * 0.10)));
        return deposit.toLocaleString('en-IN');
    }

    _depositAmountRaw(l) {
        const total = (l.price || 0) * (l.quantity || 1);
        return Math.min(50000, Math.max(2000, Math.round(total * 0.10)));
    }

    _bindActions() {
        this.el.querySelector('#back-btn')?.addEventListener('click', () => {
            const prev = window.App?.previousRoute;
            window.navigate?.(prev && prev !== 'material-detail' ? prev : 'radar');
        });

        this.el.querySelector('#share-btn')?.addEventListener('click', () => {
            const url = `${window.location.origin}?listing=${this.listing?.id}`;
            navigator.clipboard?.writeText(url)
                .then(() => window.showToast?.('Link copied!', 'success'))
                .catch(() => window.showToast?.('Share link copied!', 'success'));
        });

        this.el.querySelector('#dispute-btn')?.addEventListener('click', () => {
            window.navigate?.('dispute', {
                listingId: this.listing?.id,
                listingTitle: this.listing?.title,
                bondId: this.listing?.activeBondId || null
            });
        });

        this.el.querySelector('#bond-btn')?.addEventListener('click', () => this._secureBond());
        this.el.querySelector('#chat-btn')?.addEventListener('click', () => this._openChat());
        this.el.querySelector('#seller-chip')?.addEventListener('click', () => this._openSellerProfile());
    }

    _openSellerProfile() {
        const l = this.listing;
        if (!l?.seller) return;
        const s = l.seller;

        // Compute star rating from stats
        const rating = s.stats?.ratingCount > 0
            ? (s.stats.ratingSum / s.stats.ratingCount).toFixed(1)
            : null;
        const stars = rating ? '⭐'.repeat(Math.round(parseFloat(rating))) : '';

        const roleLabels = { architect: 'Architect 🏛️', contractor: 'Contractor 🏗️', vendor: 'Vendor 🏪', designer: 'Designer 🎨', verified: 'Verified Member ✓' };

        document.getElementById('seller-profile-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'seller-profile-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms ease';

        const avatarHtml = s.avatar
            ? `<img src="${s.avatar}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,215,0,0.4)" alt="${s.name}">`
            : `<div style="width:64px;height:64px;border-radius:50%;background:#222;display:flex;align-items:center;justify-content:center;font-size:28px">👤</div>`;

        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;background:var(--color-bg-surface);
            border-radius:24px 24px 0 0;border-top:1px solid var(--color-border);
            padding:24px 20px 32px;animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            padding-bottom:max(32px,env(safe-area-inset-bottom))">
            <div style="width:40px;height:4px;background:#2A2A2A;border-radius:2px;margin:0 auto 20px"></div>

            <!-- Seller header -->
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
              ${avatarHtml}
              <div style="flex:1">
                <div style="font:700 18px/1.2 var(--font-display);color:var(--color-gold);margin-bottom:4px">${s.name}</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                  ${s.badge ? `<span class="badge badge--bond" style="font-size:10px">${roleLabels[s.badge] || s.badge}</span>` : ''}
                  ${l.verified ? `<span class="badge badge--verified" style="font-size:10px">✓ VERIFIED</span>` : ''}
                </div>
                ${rating ? `<div style="font:400 12px/1 Inter;color:var(--color-text-secondary)">${stars} ${rating}/5 · ${s.stats.ratingCount} reviews</div>` : ''}
              </div>
            </div>

            <!-- Stats row -->
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;text-align:center">
              <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:12px;padding:12px">
                <div style="font:700 18px/1 Inter;color:var(--color-gold);margin-bottom:4px">${l.stats?.ratingCount || '—'}</div>
                <div style="font:400 10px/1.3 Inter;color:var(--color-text-muted)">Transactions</div>
              </div>
              <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:12px;padding:12px">
                <div style="font:700 18px/1 Inter;color:var(--color-green);margin-bottom:4px">${l.co2Saved} kg</div>
                <div style="font:400 10px/1.3 Inter;color:var(--color-text-muted)">CO₂ This Listing</div>
              </div>
              <div style="background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:12px;padding:12px">
                <div style="font:700 18px/1 Inter;color:var(--color-text-primary);margin-bottom:4px">4.8 ⭐</div>
                <div style="font:400 10px/1.3 Inter;color:var(--color-text-muted)">Bond Rating</div>
              </div>
            </div>

            <!-- CTAs -->
            <div style="display:flex;gap:10px">
              <button id="sp-chat" class="btn btn--outline" style="flex:1;height:44px;font-size:14px">
                💬 Message
              </button>
              <button id="sp-bond" class="btn btn--gold" style="flex:1;height:44px;font-size:14px">
                🔒 Bond Now
              </button>
            </div>
          </div>`;

        document.body.appendChild(overlay);
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        overlay.querySelector('#sp-chat')?.addEventListener('click', () => { overlay.remove(); this._openChat(); });
        overlay.querySelector('#sp-bond')?.addEventListener('click', () => { overlay.remove(); this._secureBond(); });
    }

    _openChat() {
        const l = this.listing;
        if (!l) return;

        // Demo chat seed: realistic back-and-forth
        const demoMsgs = [
            { from: 'seller', name: l.seller?.name || 'Seller', time: '2d ago',
              text: 'Hi! Yes, the material is still available. I can arrange viewing any day this week.' },
            { from: 'buyer', name: 'You', time: '2d ago',
              text: `Great! Can you confirm the exact quantity available and whether the ${l.specs ? Object.keys(l.specs)[0] : 'condition'} specs in the listing are accurate?` },
            { from: 'seller', name: l.seller?.name || 'Seller', time: '1d ago',
              text: `Yes, fully accurate. ${l.quantity} ${l.unit} available as listed. I can also share the original purchase invoice if needed for your records.` },
            { from: 'buyer', name: 'You', time: '12h ago',
              text: 'Perfect. I\'ll go ahead and secure the Spolia Bond. Can we do pickup this Saturday morning?' },
            { from: 'seller', name: l.seller?.name || 'Seller', time: '10h ago',
              text: 'Saturday 10am works for me. I\'ll SMS you the gate code the evening before. Looking forward to it!' },
        ];

        document.getElementById('chat-overlay')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'chat-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:700;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms ease';

        const avatarUrl = l.seller?.avatar || null;
        const avatarHtml = avatarUrl
            ? `<img src="${avatarUrl}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,215,0,0.4)" alt="">`
            : `<div style="width:36px;height:36px;border-radius:50%;background:#222;border:2px solid rgba(255,215,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px">👤</div>`;

        const msgsHtml = demoMsgs.map(m => `
          <div style="display:flex;flex-direction:${m.from === 'buyer' ? 'row-reverse' : 'row'};gap:8px;margin-bottom:16px;align-items:flex-end">
            ${m.from === 'seller' ? avatarHtml : `<div style="width:28px;height:28px;border-radius:50%;background:#FFD70033;border:1px solid #FFD700;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0">A</div>`}
            <div style="max-width:72%">
              <div style="font:400 11px/1 Inter,sans-serif;color:var(--color-text-muted);margin-bottom:4px;${m.from === 'buyer' ? 'text-align:right' : ''}">${m.name} &middot; ${m.time}</div>
              <div style="
                background:${m.from === 'buyer' ? 'rgba(255,215,0,0.12);border:1px solid rgba(255,215,0,0.2)' : 'var(--color-bg-elevated);border:1px solid var(--color-border)'};
                border-radius:${m.from === 'buyer' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
                padding:10px 13px;font:400 13px/1.5 Inter,sans-serif;color:var(--color-text-primary)">
                ${m.text}
              </div>
            </div>
          </div>`).join('');

        overlay.innerHTML = `
          <div style="width:100%;max-width:480px;height:82vh;background:var(--color-bg-surface);
            border-radius:24px 24px 0 0;border-top:1px solid var(--color-border);
            display:flex;flex-direction:column;animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
            padding-bottom:env(safe-area-inset-bottom,16px)">

            <!-- Chat header -->
            <div style="padding:16px 20px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:12px;flex-shrink:0">
              <button id="chat-close" style="width:32px;height:32px;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--color-text-secondary);flex-shrink:0">✕</button>
              ${avatarHtml}
              <div style="flex:1;min-width:0">
                <div style="font:600 14px/1 Inter,sans-serif;color:var(--color-text-primary);margin-bottom:2px">${l.seller?.name || 'Seller'}</div>
                <div style="font:400 11px/1 Inter,sans-serif;color:var(--color-green);display:flex;align-items:center;gap:4px">
                  <span style="width:6px;height:6px;border-radius:50%;background:var(--color-green);display:inline-block"></span> Online · Typically replies in 2h
                </div>
              </div>
              <span class="badge badge--bond" style="font-size:9px">🔒 Bond Protected</span>
            </div>

            <!-- Messages -->
            <div id="chat-msgs" style="flex:1;overflow-y:auto;padding:20px 16px">
              <div style="text-align:center;margin-bottom:20px">
                <span style="font:400 11px/1 Inter,sans-serif;color:var(--color-text-muted);background:var(--color-bg-elevated);padding:4px 12px;border-radius:99px">Listing: ${l.title}</span>
              </div>
              ${msgsHtml}
            </div>

            <!-- Compose -->
            <div style="padding:12px 16px;border-top:1px solid var(--color-border);display:flex;gap:10px;align-items:flex-end;flex-shrink:0">
              <div style="flex:1;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:20px;padding:10px 16px;min-height:44px;max-height:120px;overflow-y:auto;font:400 14px/1.5 Inter,sans-serif;color:var(--color-text-primary);cursor:text"
                contenteditable="true" id="chat-input" placeholder="Message ${l.seller?.name || 'seller'}..." style2="outline:none">
              </div>
              <button id="chat-send" style="width:44px;height:44px;border-radius:50%;background:var(--color-gold);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>`;

        document.body.appendChild(overlay);
        const msgs = overlay.querySelector('#chat-msgs');
        if (msgs) msgs.scrollTop = msgs.scrollHeight;

        const close = () => {
            overlay.querySelector('div').style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
            setTimeout(() => overlay.remove(), 240);
        };
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('#chat-close')?.addEventListener('click', close);
        overlay.querySelector('#chat-send')?.addEventListener('click', () => {
            window.showToast?.('Messaging is live after securing a Spolia Bond 🔒', 'info');
        });
        overlay.querySelector('#chat-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                window.showToast?.('Messaging is live after securing a Spolia Bond 🔒', 'info');
            }
        });
    }

    async _secureBond() {
        const l = this.listing;
        if (!l) return;

        const btn = this.el.querySelector('#bond-btn');
        if (btn) { btn.textContent = 'Processing...'; btn.disabled = true; }

        try {
            const depositAmount = this._depositAmountRaw(l);
            const currentUser = window.App?.currentUser;

            const bondId = await FirebaseDB.createBond({
                listingId: l.id,
                listingTitle: l.title,
                sellerUid: l.seller?.uid || null,
                sellerName: l.seller?.name || 'Seller',
                buyerName: currentUser?.displayName || 'Buyer',
                depositAmount,
                currency: l.currency || '₹',
                co2Saved: l.co2Saved || 0,
                weightKg: l.type === 'steel' ? (l.quantity * 10) : (l.quantity * 2),
            });

            // Notify the seller
            if (l.seller?.uid) {
                FirebaseDB.addNotification(l.seller.uid, {
                    type: 'bond_status',
                    title: 'New Spolia Bond 🔒',
                    body: `${currentUser?.displayName || 'A buyer'} has secured a bond on “${l.title}”. Coordinate pickup in the walled chat.`,
                    bondId
                }).catch(() => {});
            }

            window.showToast?.('Bond secured! 🔒 Your deposit is in escrow.', 'success');

            // Navigate to logistics with full context
            setTimeout(() => {
                window.navigate?.('logistics', {
                    listingId: l.id,
                    listingTitle: l.title,
                    bondId,
                    pickupLocation: l.location,
                    materialType: l.type,
                    depositAmount
                });
            }, 1200);

        } catch (err) {
            console.error('[MaterialDetail] createBond failed:', err);
            window.showToast?.('Failed to create bond. Please try again.', 'error');
            if (btn) {
                btn.innerHTML = `🔒 Secure with Spolia Bond — ₹${this._depositAmount(l)}<span class="btn__sub">Refundable deposit · Quality guaranteed</span>`;
                btn.disabled = false;
            }
        }
    }

    onActivate(params = {}) {
        if (params.listingId) {
            FirebaseDB.getListing(params.listingId)
                .then(listing => {
                    if (listing) {
                        this.render(listing);
                    } else {
                        // Listing not found — show a clear error state
                        this.el.innerHTML = `
                          <div style="min-height:100%;background:#0D0D0D;display:flex;flex-direction:column;
                            align-items:center;justify-content:center;padding:32px;text-align:center">
                            <div style="font-size:48px;margin-bottom:16px">📦</div>
                            <div style="font:700 18px/1.4 Inter,sans-serif;color:#F5F0E8;margin-bottom:8px">Listing Not Found</div>
                            <div style="font:400 13px/1.5 Inter,sans-serif;color:#5C5647;margin-bottom:24px">
                              This listing may have been removed or is no longer available.
                            </div>
                            <button onclick="window.navigate('radar')"
                              style="height:44px;padding:0 24px;border-radius:12px;background:#FFD700;
                                border:none;font:600 14px/1 Inter,sans-serif;color:#0D0D0D;cursor:pointer">
                              Back to Radar
                            </button>
                          </div>`;
                    }
                })
                .catch(() => {
                    window.showToast?.('Failed to load listing. Please try again.', 'error');
                    window.navigate?.('radar');
                });
        } else if (!this.listing) {
            this.render(MOCK_LISTINGS[0]);
        }
    }

    _emoji(type) {
        const map = { stone: '🪨', marble: '🪨', steel: '⚙️', wood: '🪵', brick: '🧱', glass: '🔷' };
        return map[type] || '📦';
    }
}
