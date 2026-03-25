import { FirebaseDB, MOCK_BONDS } from '../firebase-config.js';

export class BondDetailScreen {
  constructor(el) {
    this.el = el;
    this.bondId = null;
    this.bond = null;
  }

  render() {
    return `<div id="bond-detail-content" style="padding-bottom:120px;animation:fadeIn 400ms ease">
              <div style="padding:40px 20px;text-align:center;color:#A09882">Loading Bond Details...</div>
            </div>`;
  }

  async onActivate(params) {
    if (!params?.bondId) {
      window.navigate?.('profile');
      return;
    }
    this.bondId = params.bondId;

    // Set header
    const header = document.querySelector('.app-header');
    if (header) {
      header.innerHTML = `
        <button class="icon-btn" onclick="window.goBack?.('profile')" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <span class="app-header__title">Spolia Bond</span>
        <div style="width:40px"></div>
      `;
    }

    // ── DEMO MODE: look up from MOCK_BONDS ─────────────────────────────────
    const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
    if (isDemo) {
      const demoBond = MOCK_BONDS.find(b => b.id === this.bondId) || MOCK_BONDS[1]; // default to active bond
      this.bond = demoBond;
      this._renderBond();
      return;
    }

    // ── LIVE MODE ──────────────────────────────────────────────────────────
    try {
      this.bond = await FirebaseDB.getBond(this.bondId);
      if (!this.bond) {
        const user = window.App?.currentUser;
        if (user) {
          const bonds = await FirebaseDB.getMyBonds(user.uid);
          this.bond = bonds.find(b => b.id === this.bondId) || null;
        }
      }
      if (!this.bond) throw new Error('Bond not found');
      this._renderBond();
    } catch (err) {
      this.el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#FF4444">Failed to load Spolia Bond.</div>`;
    }
  }

  _renderBond() {
    if (!this.bond) return;

    const b = this.bond;
    const currentUid = window.App?.currentUser?.uid;
    const isSeller = currentUid && b.sellerUid === currentUid;
    const isBuyer  = currentUid && b.buyerUid  === currentUid;

    const createdAt = b.createdAt?.toDate
      ? b.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Recently';

    const STATUS_MAP = {
      'pending':   { label: 'AWAITING PICKUP',  color: '#FFA000', bg: 'rgba(255,160,0,0.1)' },
      'active':    { label: 'ESCROW ACTIVE',    color: '#4CAF82', bg: 'rgba(76,175,130,0.1)' },
      'confirmed': { label: 'PICKUP CONFIRMED', color: '#66BB6A', bg: 'rgba(102,187,106,0.1)' },
      'completed': { label: 'COMPLETED ✔',     color: '#66BB6A', bg: 'rgba(102,187,106,0.08)' },
      'disputed':  { label: 'DISPUTED',          color: '#FF4444', bg: 'rgba(255,68,68,0.1)'  },
      'released':  { label: 'FUNDS RELEASED',   color: '#A09882', bg: 'rgba(255,255,255,0.05)' }
    };

    const statusObj = STATUS_MAP[b.status] || STATUS_MAP.pending;

    // ── Action buttons (role-aware) ───────────────────────────────
    const canConfirm = isSeller && (b.status === 'active' || b.status === 'pending');
    const canDispute = isBuyer  && (b.status === 'active' || b.status === 'pending');
    const chatAllowed = b.status !== 'released';

    const actionButtons = `
      <!-- Chat button (always shown while bond is live) -->
      ${chatAllowed ? `
        <button id="btn-open-chat" class="btn btn--secondary"
          style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:15px;margin-bottom:12px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Message ${isSeller ? 'Buyer' : 'Seller'}
          <span style="font:400 11px/1 var(--font-body);opacity:0.7;">· Walled</span>
        </button>` : ''}

      <!-- Seller confirm pickup CTA -->
      ${canConfirm ? `
        <button id="btn-confirm-pickup" class="btn btn--primary"
          style="background:linear-gradient(135deg,#4CAF82,#2E7D52);font-size:15px;margin-bottom:12px">
          ✅ Confirm Pickup & Release Funds
        </button>` : ''}

      <!-- Buyer dispute CTA -->
      ${canDispute ? `
        <button id="btn-open-dispute" class="btn btn--red"
          style="font-size:14px;margin-bottom:12px">
          ⚠️ Report Quality Issue
        </button>` : ''}

      <!-- Rate seller (buyer only, after release) -->
      ${isBuyer && b.status === 'released' ? `
        <button id="btn-rate-seller" class="btn btn--outline"
          style="font-size:14px;margin-bottom:12px;border-color:#FFD70044;color:#FFD700">
          ⭐ Rate Your Experience
        </button>` : ''}
    `;

    const html = `
      <div style="padding:16px 20px">

        <!-- Status Banner -->
        <div style="background:${statusObj.bg};border:1px solid ${statusObj.color}40;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px">
            <div style="font:600 11px Inter;color:${statusObj.color};letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px">Status</div>
            <div style="font:700 20px 'Playfair Display',serif;color:#F5F0E8">${statusObj.label}</div>
        </div>

        <!-- Amount & Bond Info -->
        <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.2)">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5" style="margin-bottom:12px">
                <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0110 0v4"></path>
            </svg>
            <div style="font:400 14px Inter;color:#A09882;margin-bottom:4px">Secured in Spolia Bond Vault</div>
            <div style="font:700 32px 'Playfair Display',serif;color:#FFD700;margin-bottom:12px">
                ₹${(b.depositAmount || 0).toLocaleString('en-IN')}
            </div>
            <div style="display:inline-block;padding:4px 12px;background:#111;border:1px dashed #333;border-radius:6px;font:400 12px Inter;color:#A09882">
                Bond ID: <span style="color:#F5F0E8;font-family:monospace">${b.id.substring(0, 8).toUpperCase()}</span>
            </div>
        </div>

        <!-- Action buttons -->
        <div style="margin-bottom:24px">
          ${actionButtons}
        </div>

        <!-- Details List -->
        <div style="margin-bottom:24px">
            <h3 style="font:600 13px Inter;color:#F5F0E8;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.05em">Transaction Details</h3>
            <div style="background:#1A1A1A;border:1px solid #2A2A2A;border-radius:12px;overflow:hidden">
                <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2A2A2A">
                    <span style="font:400 13px Inter;color:#A09882">Date Created</span>
                    <span style="font:500 13px Inter;color:#F5F0E8">${createdAt}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2A2A2A">
                    <span style="font:400 13px Inter;color:#A09882">Listing</span>
                    <button class="btn-link" onclick="window.navigate?.('material-detail',{listingId:'${b.listingId}'})"
                      style="font:500 13px Inter;color:#FFD700;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer">
                        View Item ↗
                    </button>
                </div>
                <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2A2A2A">
                    <span style="font:400 13px Inter;color:#A09882">Logistics</span>
                    <button class="btn-link" onclick="window.navigate?.('logistics',{bondId:'${b.id}'})"
                      style="font:500 13px Inter;color:#FFD700;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer">
                        View Route ↗
                    </button>
                </div>
                <div style="display:flex;justify-content:space-between;padding:14px 16px">
                    <span style="font:400 13px Inter;color:#A09882">CO₂ Offsets</span>
                    <span style="font:500 13px Inter;color:#4CAF82">${b.co2Saved || 0} kg</span>
                </div>
            </div>
        </div>

        <!-- Terms Footer -->
        <div style="background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.15);border-radius:12px;padding:16px">
            <h4 style="font:600 12px Inter;color:#FFD700;margin-bottom:8px">About Spolia Bonds</h4>
            <p style="font:400 11px/1.5 Inter;color:#A09882;margin:0">
                Funds are held securely in escrow until the seller confirms successful handover.
                If the material quality drastically differs, the buyer may report an issue to freeze funds and trigger a manual review.
            </p>
        </div>

      </div>
    `;

    this.el.innerHTML = html;
    this._bindActions();
  }

  _bindActions() {
    const b = this.bond;

    // ── Chat button ───────────────────────────────────────────────
    this.el.querySelector('#btn-open-chat')?.addEventListener('click', () => {
      const currentUid = window.App?.currentUser?.uid;
      const isSeller = currentUid === b.sellerUid;
      window.navigate?.('chat', {
        bondId: b.id,
        bondData: b,
        otherParty: {
          name: isSeller ? (b.buyerName || 'Buyer') : (b.sellerName || 'Seller'),
          role: isSeller ? 'buyer' : 'seller'
        }
      });
    });

    // ── Confirm pickup (seller) ──────────────────────────────────
    this.el.querySelector('#btn-confirm-pickup')?.addEventListener('click', async () => {
      const btn = this.el.querySelector('#btn-confirm-pickup');
      btn.textContent = 'Confirming…';
      btn.disabled = true;

      // ── DEMO MODE ────────────────────────────────────────────────
      const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1200));
        window.showToast?.('✅ Pickup Confirmed! Funds released to seller. 🎉 CO₂ saved: ' + (b.co2Saved || 240) + ' kg', 'success', 5000);
        setTimeout(() => window.navigate?.('radar'), 2500);
        return;
      }

      try {
        await FirebaseDB.updateBondStatus(b.id, 'released');

        // Update seller wallet + impact stats
        const uid = window.App?.currentUser?.uid;
        if (uid) {
          FirebaseDB.updateUserStats(uid, {
            walletDelta:       b.depositAmount || 0,
            pendingBondsDelta: -1,
            txDelta:           1,
            co2Delta:          b.co2Saved     || 0
          }).catch(() => {});
        }

        window.showToast?.('Pickup confirmed! Funds released to seller. 🎉', 'success', 5000);

        // Mark listing as sold
        if (b.listingId) {
          FirebaseDB.markListingSold(b.listingId).catch(() => {});
        }

        // Notify the buyer
        if (b.buyerUid) {
          FirebaseDB.addNotification(b.buyerUid, {
            type: 'bond_status',
            title: 'Bond Completed ✅',
            body: `Your Spolia Bond for "${b.listingTitle || 'your order'}" has been completed. Enjoy your material!`,
            bondId: b.id
          }).catch(() => {});
        }

        // Refresh the screen
        setTimeout(() => this.onActivate({ bondId: b.id }), 1200);

      } catch (err) {
        window.showToast?.('Failed to confirm. Please try again.', 'error');
        btn.textContent = '✅ Confirm Pickup & Release Funds';
        btn.disabled = false;
      }
    });



    // ── Dispute button (buyer) ────────────────────────────────────
    this.el.querySelector('#btn-open-dispute')?.addEventListener('click', () => {
      window.navigate?.('dispute', {
        bondId: b.id,
        listingId: b.listingId,
        listingTitle: b.listingTitle || null
      });
    });

    // ── Rate seller (buyer on released bond) ──────────────────────
    this.el.querySelector('#btn-rate-seller')?.addEventListener('click', () => {
      this._openRatingSheet();
    });
  }

  _openRatingSheet() {
    const b = this.bond;
    let selectedRating = 0;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;
      display:flex;align-items:flex-end;justify-content:center`;

    overlay.innerHTML = `
      <div style="width:100%;max-width:480px;background:#1A1A1A;border-radius:24px 24px 0 0;
        padding:24px 20px 40px;animation:slideUp 300ms ease">
        <div style="width:40px;height:4px;background:#2A2A2A;border-radius:4px;margin:0 auto 20px"></div>
        <h3 style="font:700 18px/1 'Playfair Display',serif;color:#F5F0E8;margin-bottom:4px">
          Rate ${b.sellerName || 'Seller'}
        </h3>
        <p style="font:400 13px Inter;color:#A09882;margin-bottom:24px">
          How was your experience with this transaction?
        </p>

        <!-- Stars -->
        <div id="star-row" style="display:flex;justify-content:center;gap:12px;margin-bottom:20px">
          ${[1,2,3,4,5].map(n => `
            <button data-star="${n}" style="font-size:36px;background:none;border:none;cursor:pointer;
              opacity:0.3;transition:opacity 200ms,transform 200ms">⭐</button>
          `).join('')}
        </div>

        <!-- Optional comment -->
        <textarea id="rating-comment" rows="2" placeholder="Leave a note for the seller (optional)"
          style="width:100%;background:#111;border:1px solid #2A2A2A;border-radius:10px;padding:12px;
            color:#F5F0E8;font:14px Inter;resize:none;box-sizing:border-box;margin-bottom:16px"></textarea>

        <button id="submit-rating-btn" class="btn btn--gold" disabled style="font-size:15px">
          Submit Rating
        </button>

        <button id="skip-rating-btn" style="display:block;margin:12px auto 0;background:none;border:none;
          color:#5C5647;font:400 13px Inter;cursor:pointer">Skip for now</button>
      </div>`;

    document.body.appendChild(overlay);

    // Wire stars
    overlay.querySelectorAll('[data-star]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedRating = parseInt(btn.dataset.star);
        overlay.querySelectorAll('[data-star]').forEach((s, i) => {
          s.style.opacity = i < selectedRating ? '1' : '0.3';
          s.style.transform = i < selectedRating ? 'scale(1.1)' : 'scale(1)';
        });
        overlay.querySelector('#submit-rating-btn').disabled = false;
      });
    });

    overlay.querySelector('#skip-rating-btn')?.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#submit-rating-btn')?.addEventListener('click', async () => {
      const comment = overlay.querySelector('#rating-comment')?.value?.trim() || '';
      const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
      if (isDemo) {
        await new Promise(r => setTimeout(r, 600));
        overlay.remove();
        window.showToast?.(`⭐`.repeat(selectedRating) + ` Rating submitted! Thank you for your feedback.`, 'success');
        return;
      }
      await FirebaseDB.submitRating({
        bondId: b.id,
        sellerUid: b.sellerUid,
        rating: selectedRating,
        comment
      });
      overlay.remove();
      window.showToast?.(`Thanks! You rated ${selectedRating} ⭐`, 'success');
    });
  }
}
