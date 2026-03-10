// components/vendors.js — Vendor Deals (Official Outlet Clearance)
import { MOCK_VENDORS } from '../firebase-config.js';

export class VendorsScreen {
    constructor(el) {
        this.el = el;
        this.filter = 'all';
    }

    render() {
        this.el.innerHTML = `
      <header class="page-header">
        <div>
          <h1 class="page-header__title">Vendors</h1>
          <p class="page-header__subtitle">Official outlet deals &amp; clearance</p>
        </div>
        <button class="btn btn--outline" style="width:auto;height:32px;padding:0 14px;font-size:12px"
          onclick="window.open('mailto:partners@spolia.in?subject=Vendor%20Partner%20Inquiry', '_blank')">
          Partner Login
        </button>
      </header>

      <!-- Filter chips -->
      <div style="display:flex;gap:8px;padding:var(--space-sm) var(--space-md);overflow-x:auto" class="filter-scroll">
        ${[
                { id: 'all', label: '✦ All Deals', color: 'var(--color-gold)' },
                { id: 'expiry', label: '⏳ Near Expiry', color: '#FF9800' },
                { id: 'discount', label: '🏷️ Clearance', color: '#E53935' },
            ].map(f => `
          <button class="filter-chip ${f.id === this.filter ? 'active' : ''}" data-filter="${f.id}"
            style="${f.id === this.filter ? `background:${f.color};color:#0D0D0D;border-color:${f.color}` : ''}">
            ${f.label}
          </button>`).join('')}
      </div>

      <!-- Vendor cards -->
      <div id="vendor-grid" style="display:flex;flex-direction:column;gap:var(--space-sm);padding:0 var(--space-md) var(--space-xl)">
        ${this._renderCards(MOCK_VENDORS)}
      </div>
    `;

        this._bindFilters();
    }

    _renderCards(vendors) {
        const filtered = this.filter === 'all' ? vendors : vendors.filter(v => v.tag === this.filter);

        return filtered.map(v => `
      <div class="material-card" style="display:block;padding:0;overflow:hidden"
        onclick="window.showToast('${v.vendor} — redirecting to payment...','info')">

        <!-- Top strip -->
        <div style="padding:var(--space-sm) var(--space-md);border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary)">${v.vendor}</div>
            <div style="font:var(--text-caption);color:var(--color-gold)">${v.dist}</div>
          </div>
          <span style="background:${v.tag === 'expiry' ? '#FF9800' : '#E53935'};color:#fff;font:700 11px/1 var(--font-body);padding:4px 10px;border-radius:999px">
            ${v.tag === 'expiry' ? '⏳' : '🏷️'} ${v.desc}
          </span>
        </div>

        <div style="padding:var(--space-sm) var(--space-md) var(--space-sm)">
          <!-- Icon + title -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div style="width:48px;height:48px;background:var(--color-bg-elevated);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">
              ${v.icon}
            </div>
            <div style="flex:1">
              <div style="font:var(--text-body);color:var(--color-text-primary);font-weight:600">${v.title}</div>
              <span class="badge badge--bond" style="font-size:9px;margin-top:4px">-${v.off} OFF</span>
              ${v.co2Saved ? `<span class="co2-tag" style="margin-left:4px;font-size:9px">🌱 ${v.co2Saved}kg</span>` : ''}
            </div>
          </div>

          <!-- Price row -->
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font:var(--text-caption);color:var(--color-text-muted);text-decoration:line-through">${v.currency}${v.oldPrice.toLocaleString('en-IN')}${v.unit ? '/' + v.unit : ''}</span>
              <span style="font:700 20px/1 var(--font-body);color:var(--color-gold)">${v.currency}${v.price.toLocaleString('en-IN')}${v.unit ? '/' + v.unit : ''}</span>
            </div>
            <button class="btn btn--gold" style="width:auto;height:36px;padding:0 20px;font-size:13px"
              onclick="event.stopPropagation(); window.open('https://wa.me/919876543210?text=Hi%2C%20I%20saw%20${encodeURIComponent(v.title)}%20on%20Spolia%20and%20I%20would%20like%20to%20purchase%20it.', '_blank')">
              Buy Now
            </button>
          </div>
        </div>
      </div>
    `).join('');
    }

    _bindFilters() {
        this.el.querySelectorAll('[data-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.filter = btn.dataset.filter;
                const grid = this.el.querySelector('#vendor-grid');
                if (grid) grid.innerHTML = this._renderCards(MOCK_VENDORS);
                this.el.querySelectorAll('[data-filter]').forEach(b => {
                    b.classList.toggle('active', b.dataset.filter === this.filter);
                    b.style.cssText = b.dataset.filter === this.filter
                        ? 'background:var(--color-gold);color:#0D0D0D;border-color:var(--color-gold);flex-shrink:0'
                        : 'flex-shrink:0';
                });
            });
        });
    }

    onActivate() { }
}
