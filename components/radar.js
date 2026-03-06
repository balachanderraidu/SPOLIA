// components/radar.js — The Radar Discovery Feed
import { FirebaseDB, MOCK_LISTINGS } from '../firebase-config.js';

export class RadarScreen {
  constructor(el) {
    this.el = el;
    this.activeFilter = 'all';
    this.listings = [];
    this.unsubscribe = null;
  }

  render() {
    this.el.innerHTML = `
      ${this._header()}
      ${this._filters()}
      <div id="radar-feed" class="feed" aria-label="Material listings feed" aria-live="polite">
        ${this._skeletons()}
      </div>
    `;
    this._bindFilters();
  }

  onActivate() {
    this._loadListings(this.activeFilter);
  }

  _header() {
    return `
      <header class="page-header">
        <div>
          <h1 class="page-header__title gold" style="font-family:var(--font-display)">The Radar</h1>
          <p class="page-header__subtitle">
            📍 Mumbai &middot; 5.2 km radius
            &nbsp;<span class="live-badge"><span class="live-dot"></span>LIVE</span>
          </p>
        </div>
        <div class="page-header__actions">
          <button class="icon-btn" id="notif-btn" aria-label="Notifications">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </button>
        </div>
      </header>`;
  }

  _filters() {
    const chips = [
      { key: 'all', label: 'All Materials' },
      { key: 'stone', label: '🪨 Stone' },
      { key: 'marble', label: '🏛️ Marble' },
      { key: 'steel', label: '⚙️ Steel' },
      { key: 'wood', label: '🪵 Wood' },
      { key: 'brick', label: '🧱 Brick' },
      { key: 'plumbing', label: '🚰 Plumbing' },
      { key: 'cement', label: '🏗️ Cement' },
      { key: 'bulk', label: '📦 Bulk Lots' },
    ];

    return `
      <nav class="chip-row" role="tablist" aria-label="Material type filters">
        ${chips.map(c => `
          <button class="chip ${c.key === this.activeFilter ? 'active' : ''}"
            role="tab" data-filter="${c.key}" aria-selected="${c.key === this.activeFilter}">
            ${c.label}
          </button>`).join('')}
      </nav>`;
  }

  _bindFilters() {
    this.el.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this.activeFilter = chip.dataset.filter;
        this.el.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.dataset.filter === this.activeFilter);
          c.setAttribute('aria-selected', c.dataset.filter === this.activeFilter);
        });
        this._loadListings(this.activeFilter);
      });
    });
  }

  _loadListings(filter) {
    if (this.unsubscribe) this.unsubscribe();
    const feed = this.el.querySelector('#radar-feed');
    feed.innerHTML = this._skeletons();

    this.unsubscribe = FirebaseDB.listenToRadar(filter, (listings) => {
      const filtered = filter === 'all'
        ? listings
        : listings.filter(l => l.type === filter || l.category === filter);
      this.listings = filtered;
      this._renderListings(filtered);
    });
  }

  _renderListings(listings) {
    const feed = this.el.querySelector('#radar-feed');
    if (!listings.length) {
      feed.innerHTML = `
        <div style="padding:48px 24px;text-align:center;color:var(--color-text-muted)">
          <div style="font-size:48px;margin-bottom:16px">📦</div>
          <p style="font:var(--text-body)">No materials in this category nearby.</p>
          <p style="font:var(--text-caption);margin-top:8px">Try expanding your search radius or check another category.</p>
        </div>`;
      return;
    }

    feed.innerHTML = listings.map((listing, i) => {
      const neighborBadge = listing.community
        ? `<span class="badge" style="background:linear-gradient(90deg,#FFD700,#FFA000);color:#000;font-size:10px">🏢 Neighbor</span>`
        : '';
      const archBadge = listing.archApproved
        ? `<span class="badge" style="background:rgba(156,39,176,0.2);color:#CE93D8;border:1px solid rgba(156,39,176,0.4);font-size:10px">✨ Arch. Appr</span>`
        : '';
      const contentsHtml = listing.contents?.length
        ? `<div style="margin-top:6px;background:rgba(255,255,255,0.04);border-radius:6px;padding:6px 8px;font-size:11px;color:var(--color-text-muted)">
                ${listing.contents.map(c => `<span style="display:inline-block;margin-right:8px">${c.n}: <strong style="color:var(--color-text-secondary)">${c.q}</strong></span>`).join('')}
               </div>`
        : '';
      const distText = listing.community
        ? `<span style="color:var(--color-green)">⚡ Elevator (0 km)</span>`
        : `${listing.distance} km`;

      return `
      <article class="material-card" data-id="${listing.id}" tabindex="0"
        role="button" aria-label="${listing.title}, ₹${listing.price} per ${listing.unit}"
        style="animation-delay:${i * 60}ms"
        onclick="window.navigate('material-detail', { listingId: '${listing.id}' })">
        <div class="material-card__thumb">
          ${listing.imageUrl
          ? `<img src="${listing.imageUrl}" alt="${listing.title}" onerror="this.parentElement.innerHTML='${this._emoji(listing.type)}'">`
          : this._emoji(listing.type)}
        </div>
        <div class="material-card__body">
          <div class="material-card__title">${listing.title}</div>
          <div class="material-card__seller">
            <span>${listing.seller?.name || 'Unknown'}</span>
            ${listing.verified ? `<span class="badge badge--verified" style="padding:1px 6px">✓</span>` : ''}
          </div>
          <div class="material-card__meta" style="flex-wrap:wrap;gap:4px">
            <span class="badge badge--type">${listing.type?.toUpperCase()}</span>
            <span class="distance-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              ${distText}
            </span>
            <span class="co2-tag">🌱 ${listing.co2Saved} kg CO₂</span>
            ${neighborBadge}${archBadge}
          </div>
          ${contentsHtml}
          <div class="material-card__footer">
            <div>
              <span class="material-card__price">${listing.currency}${listing.price.toLocaleString('en-IN')}</span>
              <span class="material-card__price-unit">/${listing.unit}</span>
            </div>
            ${listing.bondProtected ? `
              <span class="badge badge--bond" aria-label="Bond Protected">
                🔒 Bond
              </span>` : ''}
          </div>
        </div>
      </article>
    `;
    }).join('');

  }

  _skeletons() {
    return Array.from({ length: 3 }, () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton" style="width:80px;height:80px;border-radius:12px;flex-shrink:0"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:8px">
          <div class="skeleton" style="width:70%;height:15px;border-radius:4px"></div>
          <div class="skeleton" style="width:50%;height:12px;border-radius:4px"></div>
          <div class="skeleton" style="width:90%;height:12px;border-radius:4px"></div>
          <div class="skeleton" style="width:40%;height:18px;border-radius:4px;margin-top:4px"></div>
        </div>
      </div>`).join('');
  }

  _emoji(type) {
    const map = {
      stone: '🪨', marble: '🏛️', steel: '⚙️', wood: '🪵',
      brick: '🧱', glass: '🔷', tile: '⬛',
      plumbing: '🚰', cement: '🏗️', bulk: '📦', metal: '🔩'
    };
    return `<span style="font-size:32px;display:flex;align-items:center;justify-content:center;width:100%;height:100%">${map[type] || '📦'}</span>`;
  }

}
