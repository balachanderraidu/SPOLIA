import { FirebaseDB } from '../firebase-config.js';

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
        <button class="icon-btn" onclick="window.navigate?.('profile')" aria-label="Back">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <span class="app-header__title">Bond Details</span>
        <div style="width:40px"></div>
      `;
    }

    try {
      this.bond = await this._fetchBond();
      if (!this.bond) throw new Error("Bond not found");
      this._renderBond();
    } catch (err) {
      this.el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:#FF4444">Failed to load Spolia Bond.</div>`;
    }
  }

  async _fetchBond() {
      // Direct fetch from firestore using getBonds/queries
      // Since getMyBonds is available, let's fetch matching one
      const user = window.App?.currentUser;
      if (!user) return null;
      const bonds = await FirebaseDB.getMyBonds(user.uid);
      return bonds.find(b => b.id === this.bondId);
  }

  _renderBond() {
    if (!this.bond) return;
    
    const b = this.bond;
    const createdAt = b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : 'Recently';
    
    // Status color mapping
    const STATUS_MAP = {
        'pending':  { label: 'AWAITING PICKUP', color: '#FFA000', bg: 'rgba(255,160,0,0.1)' },
        'active':   { label: 'ESCROW ACTIVE',   color: '#4CAF82', bg: 'rgba(76,175,130,0.1)' },
        'disputed': { label: 'DISPUTED',        color: '#FF4444', bg: 'rgba(255,68,68,0.1)' },
        'released': { label: 'FUNDS RELEASED',  color: '#A09882', bg: 'rgba(255,255,255,0.05)' }
    };

    const statusObj = STATUS_MAP[b.status] || STATUS_MAP.pending;

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
            <div style="display:inline-block;padding:4px 12px;background:#111;border:1px dashed #333;border-radius:6px;font:400 12px Inter;color:#A09882;margin-bottom:0">
                Bond ID: <span style="color:#F5F0E8;font-family:monospace">${b.id.substring(0,8).toUpperCase()}</span>
            </div>
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
                    <button class="btn-link" onclick="window.navigate?.('material-detail',{listingId:'${b.listingId}'})" style="font:500 13px Inter;color:#FFD700;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer">
                        View Item ↗
                    </button>
                </div>
                <div style="display:flex;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2A2A2A">
                    <span style="font:400 13px Inter;color:#A09882">Logistics</span>
                    <button class="btn-link" onclick="window.navigate?.('logistics',{bondId:'${b.id}'})" style="font:500 13px Inter;color:#FFD700;text-decoration:underline;background:none;border:none;padding:0;cursor:pointer">
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
                Funds are held securely in escrow until both parties confirm successful handover or 48 hours pass after pickup. 
                If the material quality drastically differs from the listing, you may <a href="#" onclick="event.preventDefault(); window.navigate?.('dispute',{bondId:'${b.id}'})" style="color:#CE93D8;text-decoration:underline">Report an Issue</a> to freeze funds and trigger a manual review.
            </p>
        </div>

      </div>
    `;

    this.el.innerHTML = html;
  }
}
