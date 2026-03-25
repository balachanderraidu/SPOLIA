// ──────────────────────────────────────────────────────────────────
// components/admin.js — Spolia Admin Center (Dispute Resolution)
// ──────────────────────────────────────────────────────────────────

import { FirebaseDB } from '../firebase-config.js';

export class AdminScreen {
    constructor(el) {
        this.el = el;
        this.disputes = [];
    }

    render() {
        // Initial shell, populated dynamically in onActivate
        this.el.innerHTML = '';
    }

    async onActivate() {
        if (!window.App?.currentUserProfile || window.App.currentUserProfile.role !== 'admin') {
            window.showToast?.('Unauthorized access', 'error');
            this.el.innerHTML = '';
            window.navigate?.('radar');
            return;
        }

        this.renderLoading();
        this.disputes = await FirebaseDB.getDisputes('open');
        this.renderList();
    }

    renderLoading() {
        this.el.innerHTML = `<div style="padding:calc(env(safe-area-inset-top) + 20px) 20px 20px;text-align:center;color:var(--color-text-muted)">Loading disputes...</div>`;
    }

    renderList() {
        if (this.disputes.length === 0) {
            this.el.innerHTML = `
              <div style="padding:calc(env(safe-area-inset-top) + 20px) 20px 20px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
                    <button class="icon-btn" onclick="window.navigate?.('profile')" aria-label="Back">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                    </button>
                    <h1 style="font:var(--text-h2);color:var(--color-gold);margin:0">Admin Center</h1>
                </div>
                <div style="padding:40px;text-align:center;color:var(--color-text-muted);background:var(--color-bg-surface);border-radius:12px">
                  No open disputes. Clean queue! 🎉
                </div>
              </div>
            `;
            return;
        }

        const listHtml = this.disputes.map(d => `
          <div class="dispute-card" data-id="${d.id}" style="
            background:var(--color-bg-surface);border:1px solid var(--color-border);
            border-radius:12px;padding:16px;margin-bottom:12px;cursor:pointer">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span class="badge badge--type" style="background:var(--color-red-dim);color:var(--color-red)">${d.issueType || 'Dispute'}</span>
              <span style="font:var(--text-caption);color:var(--color-text-muted)">
                ${d.createdAt?.seconds ? new Date(d.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
              </span>
            </div>
            <div style="font:600 14px/1.3 var(--font-body);color:var(--color-text-primary);margin-bottom:4px">
              ${d.listingTitle || 'Unknown Listing'}
            </div>
            <div style="font:400 13px/1.5 var(--font-body);color:var(--color-text-secondary);
              display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">
              ${d.description}
            </div>
          </div>
        `).join('');

        this.el.innerHTML = `
          <div style="padding:calc(env(safe-area-inset-top) + 20px) 20px 20px;height:100dvh;overflow-y:auto;background:var(--color-bg-base)">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <button class="icon-btn" onclick="window.navigate?.('profile')" aria-label="Back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
                </button>
                <h1 style="font:var(--text-h2);color:var(--color-gold);margin:0">Disputes Queue</h1>
            </div>
            <p style="font:var(--text-body);color:var(--color-text-secondary);margin-bottom:20px">
              ${this.disputes.length} open issues requiring resolution.
            </p>
            ${listHtml}
          </div>
        `;

        this.el.querySelectorAll('.dispute-card').forEach(card => {
            card.addEventListener('click', () => {
                const dispute = this.disputes.find(d => d.id === card.dataset.id);
                if (dispute) this.renderDetail(dispute);
            });
        });
    }

    renderDetail(dispute) {
        this.el.innerHTML = `
          <div style="display:flex;flex-direction:column;height:100dvh;background:var(--color-bg-base)">
            <div style="display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top) + 14px) 16px 14px;
              background:var(--color-bg-surface);border-bottom:1px solid var(--color-border);flex-shrink:0;z-index:10">
              <button id="admin-back" class="icon-btn" aria-label="Back">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h1 style="font:600 16px/1 var(--font-body);color:var(--color-text-primary);margin:0">Resolve Dispute</h1>
            </div>

            <div style="flex:1;overflow-y:auto;padding:20px">
              <div style="background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:12px;padding:20px">
                <div style="margin-bottom:16px">
                  <div style="font:var(--text-caption);color:var(--color-text-muted);text-transform:uppercase;margin-bottom:4px">Listing</div>
                  <div style="font:600 16px/1.3 var(--font-body);color:var(--color-text-primary)">${dispute.listingTitle || 'Unknown'}</div>
                  <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:4px">Bond ID: ${dispute.bondId || 'N/A'}</div>
                </div>

                <div style="margin-bottom:16px">
                  <div style="font:var(--text-caption);color:var(--color-text-muted);text-transform:uppercase;margin-bottom:4px">Issue Reported</div>
                  <div style="background:var(--color-bg-elevated);border-radius:8px;padding:12px;font:400 14px/1.5 var(--font-body);color:var(--color-text-secondary)">
                    ${dispute.description}
                  </div>
                </div>

                <div style="margin-bottom:24px">
                  <div style="font:var(--text-caption);color:var(--color-text-muted);text-transform:uppercase;margin-bottom:4px">Requested Resolution</div>
                  <div style="font:600 14px/1.5 var(--font-body);color:var(--color-gold)">
                    ${dispute.resolution === 'refund' ? 'Full Refund' : dispute.resolution === 'partial' ? 'Partial Refund / Discount' : 'Replacement Material'}
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px">
                  <button class="btn btn--primary" id="res-refund" style="background:var(--color-red);color:#fff">
                    Approve Refund (Return to Buyer)
                  </button>
                  <button class="btn btn--outline" id="res-release">
                    Deny & Release Bond to Seller
                  </button>
                  <button class="btn btn--outline" id="res-dismiss" style="border-color:transparent;color:var(--color-text-muted)">
                    Dismiss (Keep Bond Active)
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;

        this.el.querySelector('#admin-back')?.addEventListener('click', () => this.renderList());

        const handleResolve = async (btnId, option) => {
            const btn = this.el.querySelector(`#${btnId}`);
            if (btn) { btn.textContent = 'Processing...'; btn.disabled = true; }
            try {
                await FirebaseDB.resolveDispute(dispute.id, dispute.bondId, option);
                window.showToast?.('Dispute resolved successfully', 'success');
                this.disputes = this.disputes.filter(d => d.id !== dispute.id);
                this.renderList();
            } catch (err) {
                if (btn) { btn.textContent = 'Failed'; btn.disabled = false; }
                window.showToast?.('Failed to resolve dispute', 'error');
            }
        };

        this.el.querySelector('#res-refund')?.addEventListener('click', () => handleResolve('res-refund', 'refund_buyer'));
        this.el.querySelector('#res-release')?.addEventListener('click', () => handleResolve('res-release', 'release_seller'));
        this.el.querySelector('#res-dismiss')?.addEventListener('click', () => handleResolve('res-dismiss', 'dismiss'));
    }
}
