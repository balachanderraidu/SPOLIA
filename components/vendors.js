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

        if (!filtered.length) {
            return `<div style="text-align:center;padding:40px 20px;color:var(--color-text-muted)">
              <div style="font-size:36px;margin-bottom:12px">🔍</div>
              <div style="font:var(--text-body)">No deals in this category right now.</div>
            </div>`;
        }

        return filtered.map(v => `
      <div class="material-card" style="display:block;padding:0;overflow:hidden;cursor:pointer"
        onclick="window.showToast('Opening ${v.vendor} deal...','info')">

        <!-- Product image -->
        ${v.imageUrl ? `<div style="width:100%;height:140px;overflow:hidden;background:var(--color-bg-elevated)">
          <img src="${v.imageUrl}" alt="${v.title}" style="width:100%;height:100%;object-fit:cover" loading="lazy"
            onerror="this.style.display='none'">
        </div>` : ''}

        <!-- Top strip -->
        <div style="padding:var(--space-sm) var(--space-md);border-bottom:1px solid var(--color-border);display:flex;align-items:center;justify-content:space-between">
          <div>
            <div style="font:var(--text-caption);color:var(--color-text-secondary)">${v.vendor}</div>
            <div style="font:var(--text-caption);color:var(--color-gold)">📍 ${v.dist}</div>
          </div>
          <span style="background:${v.tag === 'expiry' ? '#FF9800' : '#E53935'};color:#fff;font:700 11px/1 var(--font-body);padding:4px 10px;border-radius:999px;white-space:nowrap">
            ${v.tag === 'expiry' ? '⏳' : '🏷️'} ${v.desc}
          </span>
        </div>

        <div style="padding:var(--space-sm) var(--space-md) var(--space-sm)">
          <!-- Icon + title -->
          <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:8px">
            <div style="width:44px;height:44px;background:var(--color-bg-elevated);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;margin-top:2px">
              ${v.icon}
            </div>
            <div style="flex:1">
              <div style="font:600 14px/1.3 var(--font-body);color:var(--color-text-primary);margin-bottom:4px">${v.title}</div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span class="badge badge--bond" style="font-size:9px">-${v.off} OFF</span>
                ${v.co2Saved ? `<span class="co2-tag" style="font-size:9px">🌱 ${v.co2Saved}kg CO₂</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Description -->
          ${v.desc2 ? `<div style="font:400 12px/1.5 var(--font-body);color:var(--color-text-secondary);margin-bottom:10px;border-left:2px solid var(--color-border);padding-left:10px">${v.desc2}</div>` : ''}

          <!-- Price row -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font:var(--text-caption);color:var(--color-text-muted);text-decoration:line-through">${v.currency}${v.oldPrice.toLocaleString('en-IN')}${v.unit ? '/' + v.unit : ''}</span>
              <span style="font:700 20px/1 var(--font-body);color:var(--color-gold)">${v.currency}${v.price.toLocaleString('en-IN')}${v.unit ? '/' + v.unit : ''}</span>
            </div>
            <button class="btn btn--gold" style="width:auto;height:36px;padding:0 16px;font-size:13px"
              onclick="event.stopPropagation(); window.open('https://wa.me/919876543210?text=Hi%2C%20I%20saw%20${encodeURIComponent(v.title)}%20on%20Spolia.%20I%20would%20like%20to%20purchase.%20Is%20it%20still%20available%3F', '_blank')">
              Enquire
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
