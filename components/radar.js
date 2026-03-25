// components/radar.js — The Radar Discovery Feed
import { FirebaseDB, MOCK_LISTINGS, MOCK_NOTIFICATIONS } from '../firebase-config.js';
import { getExpiryUrgency, urgencyBadgeHtml } from '../utils/expiry.js';

export class RadarScreen {
  constructor(el) {
    this.el = el;
    this.activeFilter = 'all';
    this.listings = [];
    this.unsubscribe = null;
    this.unsubNotif = null;
    this.userLocation = null;
    this._unreadCount = 0;
    this._notifications = [];
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
    this._bindNotif();
  }

  onActivate() {
    this._getUserLocation();
    this._loadListings(this.activeFilter);

    // Demo mode: skip Firestore, use pre-seeded MOCK_NOTIFICATIONS
    const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
    if (isDemo) {
      if (!this._notifications.length) {
        this._notifications = MOCK_NOTIFICATIONS;
        this._unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length;
      }
      this._updateBellBadge();
      return;
    }

    // Subscribe to notifications for badge (live users)
    const uid = window.App?.currentUser?.uid;
    if (uid) {
      if (this.unsubNotif) this.unsubNotif();
      this.unsubNotif = FirebaseDB.listenToNotifications(uid, (notifs) => {
        this._notifications = notifs;
        this._unreadCount = notifs.filter(n => !n.read).length;
        this._updateBellBadge();
      });
    }
  }

  onDeactivate() {
    if (this.unsubNotif) { this.unsubNotif(); this.unsubNotif = null; }
  }

  _getUserLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          this.userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
          // Re-render listings with real distance if already loaded
          if (this.listings.length) this._renderListings(this.listings);
        },
        error => console.warn('[Radar] Geolocation error:', error),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  }

  // Haversine formula
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
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
          <button class="icon-btn" id="search-btn" aria-label="Search listings" title="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button class="icon-btn" id="map-btn" aria-label="Map view" title="Map view">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
              <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
            </svg>
          </button>
          <button class="icon-btn" id="notif-btn" aria-label="Notifications"
            style="position:relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
            <span id="notif-badge" style="
              display:none;position:absolute;top:6px;right:6px;
              width:8px;height:8px;border-radius:50%;
              background:var(--color-red);border:2px solid var(--color-bg-surface)"
              aria-label="Unread notifications"></span>
          </button>
        </div>
      </header>`;
  }

  _filters() {
    const chips = [
      { key: 'all',      label: 'All Materials',  urgent: false },
      { key: 'urgent',   label: '🔴 URGENT',       urgent: true  },
      { key: 'stone',    label: '🪨 Stone',        urgent: false },
      { key: 'marble',   label: '🏛️ Marble',       urgent: false },
      { key: 'steel',    label: '⚙️ Steel',        urgent: false },
      { key: 'wood',     label: '🪵 Wood',         urgent: false },
      { key: 'brick',    label: '🧱 Brick',        urgent: false },
      { key: 'plumbing', label: '🚰 Plumbing',     urgent: false },
      { key: 'cement',   label: '🏗️ Cement',       urgent: false },
      { key: 'bulk',     label: '📦 Bulk Lots',    urgent: false },
    ];

    return `
      <nav class="chip-row" role="tablist" aria-label="Material type filters">
        ${chips.map(c => `
          <button class="chip ${c.key === this.activeFilter ? 'active' : ''}"
            role="tab" data-filter="${c.key}" aria-selected="${c.key === this.activeFilter}"
            ${c.urgent ? 'style="border-color:rgba(224,92,92,0.4);color:#E05C5C"' : ''}>
            ${c.label}
          </button>`).join('')}
      </nav>`;
  }

  _bindNotif() {
    this.el.querySelector('#notif-btn')?.addEventListener('click', () =>
      this._openNotifPanel());
    this.el.querySelector('#search-btn')?.addEventListener('click', () =>
      this._openSearchOverlay());
    this.el.querySelector('#map-btn')?.addEventListener('click', () =>
      this._openMapView());
  }

  _updateBellBadge() {
    const badge = this.el.querySelector('#notif-badge');
    if (badge) badge.style.display = this._unreadCount > 0 ? 'block' : 'none';
  }

  _openNotifPanel() {
    document.getElementById('notif-panel-overlay')?.remove();
    const uid = window.App?.currentUser?.uid;

    // Mark all as read in Firestore
    if (uid && this._unreadCount > 0) {
      FirebaseDB.markNotificationsRead(uid).catch(() => {});
      this._unreadCount = 0;
      this._updateBellBadge();
    }

    const overlay = document.createElement('div');
    overlay.id = 'notif-panel-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:600;
      background:rgba(0,0,0,0.65);backdrop-filter:blur(4px);
      display:flex;align-items:flex-end;justify-content:center;
      animation:fadeIn 200ms ease;`;

    const notifs = this._notifications;
    let listHtml = '';
    if (!notifs.length) {
      listHtml = `
        <div style="text-align:center;padding:40px 20px">
          <div style="font-size:40px;margin-bottom:16px">🔔</div>
          <div style="font:400 14px var(--font-body);color:var(--color-text-muted)">
            No notifications yet.<br>Bond activity and messages will appear here.
          </div>
        </div>`;
    } else {
      listHtml = notifs.map(n => {
        const time = n.createdAt?.toDate
          ? this._relativeTime(n.createdAt.toDate())
          : '';
        const icon = {
          'bond_status': '🔒',
          'chat_message': '💬',
          'dispute': '⚠️',
          'system': '✦',
          'expiry_alert': '⏳',
          'rescue_badge': '🌱'
        }[n.type] || '✦';
        const actionHtml = n.bondId
          ? `onclick="document.getElementById('notif-panel-overlay').remove(); window.navigate?.('bond-detail',{bondId:'${n.bondId}'})"`
          : n.chatId
          ? `onclick="document.getElementById('notif-panel-overlay').remove(); window.navigate?.('chat',{bondId:'${n.chatId}'})"`
          : n.listingId
          ? `onclick="document.getElementById('notif-panel-overlay').remove(); window.navigate?.('material-detail',{listingId:'${n.listingId}'})"`
          : '';
        return `
          <div ${actionHtml} style="
            display:flex;gap:12px;padding:14px 20px;
            border-bottom:1px solid var(--color-border);
            cursor:${n.bondId || n.chatId || n.listingId ? 'pointer' : 'default'};
            background:${n.read ? 'transparent' : 'rgba(255,215,0,0.04)'};
            transition:background 150ms">
            <div style="font-size:22px;flex-shrink:0;margin-top:2px">${icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font:600 13px/1.3 var(--font-body);color:var(--color-text-primary);margin-bottom:3px">
                ${n.title || 'Notification'}
              </div>
              <div style="font:400 12px/1.5 var(--font-body);color:var(--color-text-secondary)">
                ${n.body || ''}
              </div>
              <div style="font:400 11px/1 var(--font-body);color:var(--color-text-muted);margin-top:5px">
                ${time}
              </div>
            </div>
            ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--color-gold);flex-shrink:0;margin-top:4px"></div>` : ''}
          </div>`;
      }).join('');
    }

    overlay.innerHTML = `
      <div id="notif-sheet" style="
        width:100%;max-width:480px;max-height:75vh;
        background:var(--color-bg-surface);border-top:1px solid var(--color-border);
        border-radius:24px 24px 0 0;padding-bottom:env(safe-area-inset-bottom,16px);
        animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1);
        display:flex;flex-direction:column;
        ">
        <div style="width:40px;height:4px;background:#333;border-radius:2px;margin:12px auto 0;flex-shrink:0"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px 10px;flex-shrink:0">
          <h2 style="font:700 18px/1 var(--font-display);color:var(--color-gold)">Notifications</h2>
          <button id="notif-close"
            style="width:32px;height:32px;border-radius:50%;background:var(--color-bg-elevated);
              border:1px solid var(--color-border);display:flex;align-items:center;
              justify-content:center;cursor:pointer;color:var(--color-text-secondary);font-size:16px">✕</button>
        </div>
        <div style="overflow-y:auto;flex:1">${listHtml}</div>
      </div>`;

    document.body.appendChild(overlay);
    const close = () => {
      overlay.querySelector('#notif-sheet').style.animation = 'slideDown 250ms cubic-bezier(0.32,0.72,0,1) forwards';
      overlay.style.animation = 'fadeIn 200ms ease reverse forwards';
      setTimeout(() => overlay.remove(), 250);
    };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('#notif-close')?.addEventListener('click', close);
  }

  _relativeTime(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
    if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }
    const feed = this.el.querySelector('#radar-feed');

    // ── DEMO MODE: use MOCK_LISTINGS, no Firestore call ──────────────────────
    const isDemo = (() => { try { return sessionStorage.getItem('spolia_demo') === '1'; } catch { return false; } })();
    if (isDemo) {
      let list = filter === 'urgent'
        ? MOCK_LISTINGS.filter(l => l.isUrgentRescue || (l.expiryDate && getExpiryUrgency(l.expiryDate).level))
        : filter === 'all'
        ? MOCK_LISTINGS
        : MOCK_LISTINGS.filter(l => l.type === filter || l.category === filter);

      // Urgent rescues bubble to top
      list = [...list].sort((a, b) => {
        const score = l => ({ critical: 3, urgent: 2, soon: 1 }[getExpiryUrgency(l.expiryDate).level] || 0);
        return score(b) - score(a);
      });

      this.listings = list;
      this._renderListings(list);

      // ── Activity Ticker: makes demo feel live ──
      clearInterval(this._tickerInterval);
      setTimeout(() => this._startActivityTicker(), 800);

      return;
    }

    // ── LIVE MODE ─────────────────────────────────────────────────────────────
    feed.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--color-text-muted)">
        <div style="font-size:28px;margin-bottom:8px">⏳</div>Loading radar...
      </div>`;

    this.unsubscribe = FirebaseDB.listenToRadar(filter, (listings) => {
      const activeListing = listings.filter(l => l.status !== 'sold');

      let filtered = filter === 'urgent'
        ? activeListing.filter(l => l.isUrgentRescue || (l.expiryDate && getExpiryUrgency(l.expiryDate).level))
        : filter === 'all'
        ? activeListing
        : activeListing.filter(l => l.type === filter || l.category === filter);

      filtered = [...filtered].sort((a, b) => {
        const urgencyScore = { critical: 3, urgent: 2, soon: 1 };
        const aScore = urgencyScore[getExpiryUrgency(a.expiryDate).level] || 0;
        const bScore = urgencyScore[getExpiryUrgency(b.expiryDate).level] || 0;
        return bScore - aScore;
      });

      this.listings = filtered;
      this._renderListings(filtered);
    });
  }

  _renderListings(listings) {
    const feed = this.el.querySelector('#radar-feed');
    if (!listings || !listings.length) {
      feed.innerHTML = `
        <div style="padding:48px 24px;text-align:center;color:var(--color-text-muted)">
          <div style="font-size:48px;margin-bottom:16px">📦</div>
          <p style="font:var(--text-body);margin-bottom:16px">No materials in this category nearby.</p>
          <button class="btn btn--gold" onclick="window.navigate('scanner')">✨ Be the first to post</button>
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
      // Near-expiry urgency badge
      const { level: urgLevel, label: urgLabel, color: urgColor, emoji: urgEmoji } = getExpiryUrgency(listing.expiryDate);
      const urgentBadge = urgLevel && urgLevel !== 'expired'
        ? `<span style="font:700 10px/1 Inter,sans-serif;color:${urgColor};background:${urgColor}18;border:1px solid ${urgColor}44;padding:2px 6px;border-radius:20px;letter-spacing:0.04em;flex-shrink:0">${urgEmoji} RESCUE · ${urgLabel.toUpperCase()}</span>`
        : '';
      const contentsHtml = listing.contents?.length
        ? `<div style="margin-top:6px;background:rgba(255,255,255,0.04);border-radius:6px;padding:6px 8px;font-size:11px;color:var(--color-text-muted)">
                ${listing.contents.map(c => `<span style="display:inline-block;margin-right:8px">${c.n}: <strong style="color:var(--color-text-secondary)">${c.q}</strong></span>`).join('')}
               </div>`
        : '';
      let calculatedDist = listing.distance;
      if (this.userLocation && listing.location) {
          calculatedDist = this._calculateDistance(
              this.userLocation.lat, this.userLocation.lng,
              listing.location.lat, listing.location.lng
          );
      }
      
      const distText = listing.community
        ? `<span style="color:var(--color-green)">⚡ Elevator (0 km)</span>`
        : `${calculatedDist} km`;

      return `
      <article class="material-card" data-id="${listing.id}" tabindex="0"
        role="button" aria-label="${listing.title}, ₹${listing.price} per ${listing.unit}"
        style="animation-delay:${i * 60}ms;${urgLevel === 'critical' ? 'border:1px solid rgba(224,92,92,0.5);box-shadow:0 0 0 1px rgba(224,92,92,0.15) inset' : ''}"
        onclick="window.navigate('material-detail', { listingId: '${listing.id}' })">
        <div class="material-card__thumb">
          ${listing.imageUrls?.[0]
          ? `<img src="${listing.imageUrls[0]}" alt="${listing.title}" onerror="this.parentElement.innerHTML='${this._emoji(listing.type)}'">` 
          : this._emoji(listing.type)}
        </div>
        <div class="material-card__body">
          <div class="material-card__title">${listing.title}</div>
          <div class="material-card__seller" style="display:flex;align-items:center;gap:6px">
            ${listing.seller?.avatar
              ? `<img src="${listing.seller.avatar}" alt="${listing.seller.name}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,215,0,0.3)" onerror="this.style.display='none'">`
              : ''}
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
            ${urgentBadge}
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

    // ── Community / RWA Listings strip ──────────────────────────────────────
    const communityListings = list.filter(l => l.community);
    if (communityListings.length) {
      const communityHtml = communityListings.map(l => `
        <div onclick="window.navigate?.('material-detail',{listingId:'${l.id}'})"
          style="flex-shrink:0;width:180px;background:var(--color-bg-elevated);
          border:1px solid rgba(76,175,130,0.3);border-radius:12px;padding:10px;cursor:pointer">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
            <span style="font-size:14px">🏘️</span>
            <span style="font:600 10px/1 Inter;color:var(--color-green);letter-spacing:0.05em">${l.community.toUpperCase()}</span>
          </div>
          <div style="font:600 12px/1.3 Inter;color:var(--color-text-primary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.title}</div>
          <div style="font:400 10px/1 Inter;color:var(--color-text-muted)">${l.location?.label} · ${l.distance} km</div>
          ${l.isUrgentRescue ? `<div style="margin-top:6px;font:700 9px/1 Inter;color:#FF6B35;letter-spacing:0.06em">⏳ ${l.daysToExpiry}D LEFT</div>` : ''}
        </div>`).join('');

      feed.insertAdjacentHTML('beforeend', `
        <div style="margin:4px 0;padding:0 16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <span style="font:600 11px/1 Inter;color:var(--color-green);letter-spacing:0.08em;text-transform:uppercase">🏘️ Community Listings</span>
            <span style="flex:1;height:1px;background:rgba(76,175,130,0.2)"></span>
            <span style="font:400 10px/1 Inter;color:var(--color-text-muted)">${communityListings.length} near you</span>
          </div>
          <div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none">
            ${communityHtml}
          </div>
        </div>`);
    }
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

  _startActivityTicker() {
    const feed = this.el.querySelector('#radar-feed');
    if (!feed) return;
    feed.querySelector('#activity-ticker')?.remove();

    const events = [
      { icon: '🔒', text: 'Priya Sharma just bonded — Reclaimed Italian Travertine' },
      { icon: '🌱', text: 'CPVC Pipes rescued 2 days before expiry in Chembur' },
      { icon: '✨', text: 'Rajan & Associates listed Burma Teak Rafters 3 min ago' },
      { icon: '🔒', text: 'Vikram Nair bonded — 5,000 Handmade Red Clay Bricks' },
      { icon: '⏳', text: 'Urgent: Block C Basement clearance — 6 days remaining' },
      { icon: '🌱', text: '480 kg CO₂ saved on a Travertine rescue in Bandra' },
      { icon: '✦', text: 'Heritage Salvage Co. just added Athangudi Tiles to Radar' },
      { icon: '🔒', text: 'Anjali Shah bonded — Reclaimed Chevron Oak Flooring' },
      { icon: '🏘️', text: 'Shapoorji Towers RWA: 80 GI pipes — URGENT, 4 days left' },
      { icon: '🌱', text: '620 kg CO₂ diverted — Office Furniture rescued in Andheri' },
      { icon: '✨', text: 'Zellige Moroccan Tiles just listed by Rohan Interiors' },
      { icon: '✅', text: '"Carrara Marble" SOLD — rescued before contractor disposal' },
    ];

    let idx = 0;
    const ticker = document.createElement('div');
    ticker.id = 'activity-ticker';
    ticker.style.cssText = [
      'margin:4px 16px 80px',
      'padding:10px 14px',
      'background:var(--color-bg-elevated)',
      'border:1px solid var(--color-border)',
      'border-radius:12px',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'overflow:hidden',
      'transition:opacity 300ms ease',
    ].join(';');

    const dot = document.createElement('span');
    dot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:var(--color-green);flex-shrink:0;animation:pulse 1.5s ease infinite';
    const textEl = document.createElement('span');
    textEl.style.cssText = 'font:400 12px/1.3 var(--font-body);color:var(--color-text-secondary);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';

    ticker.appendChild(dot);
    ticker.appendChild(textEl);
    feed.appendChild(ticker);

    const update = () => {
      const ev = events[idx % events.length];
      ticker.style.opacity = '0';
      setTimeout(() => {
        textEl.textContent = `${ev.icon}  ${ev.text}`;
        ticker.style.opacity = '1';
      }, 300);
      idx++;
    };
    update();
    this._tickerInterval = setInterval(update, 4500);
  }

  _openSearchOverlay() {
    document.getElementById('search-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:800;background:var(--color-bg-base);display:flex;flex-direction:column;animation:fadeIn 200ms ease';

    const EMOJI_MAP = { stone:'🪨', marble:'🏛️', steel:'⚙️', wood:'🪵', brick:'🧱', bulk:'📦', plumbing:'🚰', cement:'🏗️', metal:'🔩' };

    overlay.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:max(env(safe-area-inset-top),16px) 16px 12px;border-bottom:1px solid var(--color-border)">
        <div style="flex:1;background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:12px;display:flex;align-items:center;gap:8px;padding:0 12px;height:44px">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input id="search-input" type="search" placeholder="Search materials, locations, sellers…"
            style="flex:1;background:none;border:none;outline:none;color:var(--color-text-primary);font:400 15px/1 var(--font-body)" autofocus>
        </div>
        <button id="search-close" style="background:none;border:none;color:var(--color-text-secondary);font:500 14px/1 Inter;cursor:pointer;padding:4px 8px">Cancel</button>
      </div>
      <div id="search-results" style="flex:1;overflow-y:auto;padding:8px 0"></div>`;

    document.body.appendChild(overlay);

    const renderResults = (q = '') => {
      const terms = q.toLowerCase().trim();
      const filtered = !terms ? MOCK_LISTINGS.slice(0, 10) : MOCK_LISTINGS.filter(l =>
        l.title.toLowerCase().includes(terms) || l.type.toLowerCase().includes(terms) ||
        (l.location?.label || '').toLowerCase().includes(terms) || (l.seller?.name || '').toLowerCase().includes(terms)
      );
      const resultsEl = overlay.querySelector('#search-results');
      if (!resultsEl) return;
      if (!filtered.length) {
        resultsEl.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--color-text-muted)">No listings found for "${q}"</div>`;
        return;
      }
      resultsEl.innerHTML = filtered.map(l => `
        <div data-id="${l.id}" style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--color-border);cursor:pointer">
          <div style="width:44px;height:44px;border-radius:10px;overflow:hidden;background:var(--color-bg-elevated);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px">
            ${l.imageUrls?.[0] ? `<img src="${l.imageUrls[0]}" style="width:100%;height:100%;object-fit:cover" alt="">` : (EMOJI_MAP[l.type] || '📦')}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font:600 13px/1.3 Inter;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.title}</div>
            <div style="font:400 11px/1.3 Inter;color:var(--color-text-muted);margin-top:3px">${l.location?.label} · ${l.distance} km</div>
          </div>
          <div style="font:700 13px/1 Inter;color:var(--color-gold);flex-shrink:0">₹${(l.price||0).toLocaleString('en-IN')}<span style="font:400 10px Inter;color:var(--color-text-muted)">/${l.unit}</span></div>
        </div>`).join('');

      resultsEl.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => {
          overlay.remove();
          window.navigate?.('material-detail', { listingId: el.dataset.id });
        });
      });
    };

    renderResults();
    overlay.querySelector('#search-input')?.addEventListener('input', e => renderResults(e.target.value));
    overlay.querySelector('#search-close')?.addEventListener('click', () => overlay.remove());
  }

  _openMapView() {
    document.getElementById('map-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'map-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:800;background:rgba(0,0,0,0.8);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 200ms ease';

    const EMOJI_MAP = { stone:'🪨', marble:'🏛️', steel:'⚙️', wood:'🪵', brick:'🧱', bulk:'📦', plumbing:'🚰', cement:'🏗️' };
    const TYPE_COLOR = { stone:'#8B6914', marble:'#A09882', steel:'#6B9DBF', wood:'#78553A', brick:'#C05C3C', bulk:'#6E6E6E', plumbing:'#4B9FD4', cement:'#888', marble:'#CCC' };

    // Generate pseudo-random positions within the map canvas for each listing
    const pins = MOCK_LISTINGS.slice(0, 12).map((l, i) => ({
      ...l,
      x: 10 + (l.location?.lng ? ((l.location.lng - 72.82) / 0.1) * 60 + 10 : (i * 23) % 80),
      y: 10 + (l.location?.lat ? ((19.11 - l.location.lat) / 0.07) * 70 + 10 : (i * 17) % 80)
    }));

    const pinsHtml = pins.map(p => `
      <button data-id="${p.id}" style="position:absolute;left:${Math.min(85,Math.max(5, p.x))}%;top:${Math.min(85,Math.max(5, p.y))}%;
        transform:translate(-50%,-50%);background:var(--color-gold);color:#000;border:none;
        border-radius:20px;padding:3px 8px;cursor:pointer;white-space:nowrap;
        font:700 10px/1.4 Inter;box-shadow:0 2px 8px rgba(0,0,0,0.5);transition:transform 100ms"
        title="${p.title}" onmouseenter="this.style.transform='translate(-50%,-50%) scale(1.15)'"
        onmouseleave="this.style.transform='translate(-50%,-50%) scale(1)'">
        ${EMOJI_MAP[p.type]||'📦'} ${p.distance}km
      </button>`).join('');

    overlay.innerHTML = `
      <div style="width:100%;max-width:480px;background:var(--color-bg-surface);border-radius:24px 24px 0 0;
        padding:20px 20px max(24px,env(safe-area-inset-bottom));animation:slideUp 300ms cubic-bezier(0.32,0.72,0,1)">
        <div style="width:40px;height:4px;background:#2A2A2A;border-radius:2px;margin:0 auto 14px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h2 style="font:700 17px/1 var(--font-display);color:var(--color-gold)">📍 Radar Map — 5.2 km</h2>
          <button id="map-close" style="background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:50%;width:32px;height:32px;color:var(--color-text-secondary);cursor:pointer;font-size:14px">✕</button>
        </div>
        <!-- Map canvas -->
        <div style="position:relative;width:100%;height:260px;background:linear-gradient(135deg,#0d1117 0%,#1a1f2e 100%);border-radius:16px;overflow:hidden;margin-bottom:14px;border:1px solid var(--color-border)">
          <!-- Grid lines -->
          ${[20,40,60,80].map(v => `
            <div style="position:absolute;left:${v}%;top:0;bottom:0;border-left:1px solid rgba(255,255,255,0.04)"></div>
            <div style="position:absolute;top:${v}%;left:0;right:0;border-top:1px solid rgba(255,255,255,0.04)"></div>`).join('')}
          <!-- You are here crosshair -->
          <div style="position:absolute;left:45%;top:55%;transform:translate(-50%,-50%)">
            <div style="width:14px;height:14px;border-radius:50%;background:rgba(76,175,130,0.3);border:2px solid #4CAF82;animation:pulse 1.5s ease infinite;display:flex;align-items:center;justify-content:center">
              <div style="width:5px;height:5px;border-radius:50%;background:#4CAF82"></div>
            </div>
          </div>
          <!-- Listing pins -->
          ${pinsHtml}
          <!-- Distance rings -->
          <div style="position:absolute;left:45%;top:55%;transform:translate(-50%,-50%);width:100px;height:100px;border-radius:50%;border:1px dashed rgba(255,215,0,0.1)"></div>
          <div style="position:absolute;left:45%;top:55%;transform:translate(-50%,-50%);width:180px;height:180px;border-radius:50%;border:1px dashed rgba(255,215,0,0.06)"></div>
          <div style="position:absolute;bottom:8px;left:10px;font:500 9px Inter;color:rgba(255,255,255,0.3)">Mumbai · Demo Mode</div>
        </div>
        <p style="font:400 11px/1.4 Inter;color:var(--color-text-muted);text-align:center;margin:0">Tap a pin to view listing details</p>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#map-close')?.addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('[data-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.remove();
        window.navigate?.('material-detail', { listingId: btn.dataset.id });
      });
    });
  }

}
