// components/tools.js — Site Tools: Weight Calculator, Coverage Calculator, Logistics Estimator
export class ToolsScreen {
    constructor(el) {
        this.el = el;
        this.calcTab = 'weight';
    }

    render() {
        this.el.innerHTML = `
      <header class="page-header">
        <h1 class="page-header__title">Site Tools</h1>
        <p class="page-header__subtitle">Calculators &amp; logistics</p>
      </header>

      <div style="padding-bottom:var(--space-xl)">

        <!-- ── Weight / Coverage Calculator ── -->
        <div class="section-header">
          <h2 class="section-header__title">📐 Calculator</h2>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);overflow:hidden">

          <!-- Tabs -->
          <div style="display:flex;border-bottom:1px solid var(--color-border)" role="tablist">
            ${[
                { id: 'weight', label: 'Logistics Weight' },
                { id: 'coverage', label: 'Coverage Area' }
            ].map(t => `
              <button class="calc-tab ${t.id === this.calcTab ? 'active' : ''}" data-tab="${t.id}"
                role="tab" aria-selected="${t.id === this.calcTab}"
                style="flex:1;padding:12px 8px;background:none;border:none;
                color:${t.id === this.calcTab ? 'var(--color-gold)' : 'var(--color-text-muted)'};
                font:600 13px var(--font-body);cursor:pointer;
                border-bottom:2px solid ${t.id === this.calcTab ? 'var(--color-gold)' : 'transparent'};
                transition:all 150ms">
                ${t.label}
              </button>`).join('')}
          </div>

          <div style="padding:var(--space-md)">

            <!-- Weight Tab -->
            <div id="tab-weight" style="display:${this.calcTab === 'weight' ? 'block' : 'none'}">
              <div class="form-field" style="padding:0;margin-bottom:12px">
                <label class="form-label" for="calc-mat">Material Type</label>
                <select class="form-select" id="calc-mat">
                  <option value="2400">Concrete (2,400 kg/m³)</option>
                  <option value="1900">Debris / Rubble (1,900 kg/m³)</option>
                  <option value="1600">Soil (1,600 kg/m³)</option>
                  <option value="1500">Gravel (1,500 kg/m³)</option>
                  <option value="800">Brick (800 kg/m³)</option>
                  <option value="7850">Steel / Rebar (7,850 kg/m³)</option>
                  <option value="600">Teak Wood (600 kg/m³)</option>
                  <option value="2700">Marble / Stone (2,700 kg/m³)</option>
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
                <div class="form-field" style="padding:0;margin-bottom:0">
                  <label class="form-label" for="calc-l">L (ft)</label>
                  <input type="number" id="calc-l" class="form-input" placeholder="10" min="0">
                </div>
                <div class="form-field" style="padding:0;margin-bottom:0">
                  <label class="form-label" for="calc-w">W (ft)</label>
                  <input type="number" id="calc-w" class="form-input" placeholder="10" min="0">
                </div>
                <div class="form-field" style="padding:0;margin-bottom:0">
                  <label class="form-label" for="calc-d">D (ft)</label>
                  <input type="number" id="calc-d" class="form-input" placeholder="1" min="0">
                </div>
              </div>
              <button class="btn btn--gold" id="calc-weight-btn" style="font-size:14px">Calculate Weight</button>
            </div>

            <!-- Coverage Tab -->
            <div id="tab-coverage" style="display:${this.calcTab === 'coverage' ? 'block' : 'none'}">
              <div class="form-field" style="padding:0;margin-bottom:12px">
                <label class="form-label" for="cov-type">Unit Type</label>
                <select class="form-select" id="cov-type">
                  <option value="tile">Tiles (2×2 ft standard)</option>
                  <option value="brick">Bricks (Standard 9×4×3 inch)</option>
                  <option value="paint">Paint (Liters, double coat)</option>
                  <option value="plywood">Plywood Sheets (8×4 ft)</option>
                </select>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
                <div class="form-field" style="padding:0;margin-bottom:0">
                  <label class="form-label" for="cov-l">Length (ft)</label>
                  <input type="number" id="cov-l" class="form-input" placeholder="12" min="0">
                </div>
                <div class="form-field" style="padding:0;margin-bottom:0">
                  <label class="form-label" for="cov-w">Width (ft)</label>
                  <input type="number" id="cov-w" class="form-input" placeholder="10" min="0">
                </div>
              </div>
              <button class="btn btn--gold" id="calc-coverage-btn" style="font-size:14px">Calculate Units</button>
            </div>

            <!-- Result -->
            <div id="calc-result" style="display:none;margin-top:12px;background:var(--color-green-dim);border:1px solid rgba(76,175,130,0.2);border-radius:var(--radius-sm);padding:var(--space-md);text-align:center">
              <div style="font:var(--text-caption);color:var(--color-green);letter-spacing:0.06em;margin-bottom:4px">ESTIMATION</div>
              <div id="calc-display" style="font:700 28px/1 var(--font-body);color:var(--color-text-primary);margin-bottom:12px">—</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <button class="btn btn--outline" style="height:36px;font-size:12px"
                  onclick="window.navigate('radar');window.showToast('Searching listings...','info')">
                  🔍 Find This Qty
                </button>
                <button class="btn btn--outline" style="height:36px;font-size:12px"
                  onclick="window.showToast('Post listing coming soon','info')">
                  📝 Post This Qty
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Logistics Estimator ── -->
        <div class="section-header" style="margin-top:var(--space-md)">
          <h2 class="section-header__title">🚛 Logistics Estimator</h2>
        </div>

        <div style="margin:0 var(--space-md);background:var(--color-bg-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-md)">
          <div class="form-field" style="padding:0;margin-bottom:12px">
            <label class="form-label" for="trans-w">Weight (Tons)</label>
            <input type="number" id="trans-w" class="form-input" placeholder="e.g. 2.5" min="0" step="0.1">
          </div>

          <div id="trans-result" style="display:none;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.2);border-radius:var(--radius-sm);padding:var(--space-sm) var(--space-md);margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:16px">
              <div style="font-size:32px" id="trans-icon">🛻</div>
              <div>
                <div style="font:700 15px/1 var(--font-body);color:var(--color-gold)" id="trans-vehicle">Pickup</div>
                <div style="font:var(--text-caption);color:var(--color-text-secondary);margin-top:2px">Estimated cost: <strong style="color:var(--color-text-primary)" id="trans-cost">₹500</strong></div>
              </div>
            </div>
          </div>

          <!-- Live availability -->
          <div style="border-top:1px solid var(--color-border);padding-top:12px">
            <div style="font:var(--text-caption);color:var(--color-text-muted);margin-bottom:10px;letter-spacing:0.04em">LIVE AVAILABILITY</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="background:#fff;color:#000;padding:2px 7px;border-radius:4px;font:700 10px var(--font-body)">UBER</span>
                <span style="font:var(--text-caption);color:var(--color-text-secondary)">Moto (250 kg)</span>
              </div>
              <span style="font:var(--text-caption);color:var(--color-green)">⚡ 2 min · 0.8 km</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="background:#2979FF;color:#fff;padding:2px 7px;border-radius:4px;font:700 10px var(--font-body)">PORTER</span>
                <span style="font:var(--text-caption);color:var(--color-text-secondary)">Tata Ace (1.5 T)</span>
              </div>
              <span style="font:var(--text-caption);color:var(--color-green)">⚡ 8 min · 3.2 km</span>
            </div>
          </div>
        </div>
      </div>
    `;

        this._bindEvents();
    }

    _bindEvents() {
        // Tab switching
        this.el.querySelectorAll('.calc-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                this.calcTab = btn.dataset.tab;
                this.el.querySelector('#calc-result').style.display = 'none';
                this.el.querySelectorAll('.calc-tab').forEach(b => {
                    b.classList.toggle('active', b.dataset.tab === this.calcTab);
                    b.style.color = b.dataset.tab === this.calcTab ? 'var(--color-gold)' : 'var(--color-text-muted)';
                    b.style.borderBottomColor = b.dataset.tab === this.calcTab ? 'var(--color-gold)' : 'transparent';
                });
                this.el.querySelectorAll('[id^="tab-"]').forEach(t => {
                    t.style.display = t.id === `tab-${this.calcTab}` ? 'block' : 'none';
                });
            });
        });

        // Weight calculator
        this.el.querySelector('#calc-weight-btn')?.addEventListener('click', () => {
            const l = parseFloat(this.el.querySelector('#calc-l').value) || 0;
            const w = parseFloat(this.el.querySelector('#calc-w').value) || 0;
            const d = parseFloat(this.el.querySelector('#calc-d').value) || 0;
            const density = parseFloat(this.el.querySelector('#calc-mat').value);

            if (l <= 0 || w <= 0 || d <= 0) {
                window.showToast('Please enter valid L × W × D dimensions', 'error');
                return;
            }

            const volCft = l * w * d;
            const volM3 = volCft / 35.315;
            const weightKg = volM3 * density;
            const tons = (weightKg / 1000).toFixed(2);

            this._showCalcResult(`${tons} Tons`);

            // Auto-fill logistics
            const transInput = this.el.querySelector('#trans-w');
            if (transInput) { transInput.value = tons; this._estimateTransport(); }
        });

        // Coverage calculator
        this.el.querySelector('#calc-coverage-btn')?.addEventListener('click', () => {
            const l = parseFloat(this.el.querySelector('#cov-l').value) || 0;
            const w = parseFloat(this.el.querySelector('#cov-w').value) || 0;
            const type = this.el.querySelector('#cov-type').value;

            if (l <= 0 || w <= 0) { window.showToast('Please enter area dimensions', 'error'); return; }

            const area = l * w;
            let result = '';
            if (type === 'tile') result = `${Math.ceil(area / 4)} Tiles (2×2)`;
            if (type === 'brick') result = `${Math.ceil(area * 5)} Bricks`;
            if (type === 'paint') result = `${(area / 100).toFixed(1)} Liters`;
            if (type === 'plywood') result = `${Math.ceil(area / 32)} Sheets (8×4)`;

            this._showCalcResult(result);
        });

        // Live logistics estimate
        this.el.querySelector('#trans-w')?.addEventListener('input', () => this._estimateTransport());
    }

    _showCalcResult(text) {
        const result = this.el.querySelector('#calc-result');
        const display = this.el.querySelector('#calc-display');
        if (result && display) {
            display.textContent = text;
            result.style.display = 'block';
        }
    }

    _estimateTransport() {
        const input = this.el.querySelector('#trans-w');
        const box = this.el.querySelector('#trans-result');
        const icon = this.el.querySelector('#trans-icon');
        const name = this.el.querySelector('#trans-vehicle');
        const cost = this.el.querySelector('#trans-cost');

        const weight = parseFloat(input?.value);
        if (!weight || weight <= 0) { if (box) box.style.display = 'none'; return; }

        box.style.display = 'flex';

        if (weight < 0.25) { icon.textContent = '🏍️'; name.textContent = 'Bike Delivery'; cost.textContent = '₹180'; }
        else if (weight < 1) { icon.textContent = '🛻'; name.textContent = 'Pickup / Bolero'; cost.textContent = '₹500'; }
        else if (weight < 2.5) { icon.textContent = '🚛'; name.textContent = 'Tata Ace (Porter)'; cost.textContent = '₹1,200'; }
        else if (weight < 7) { icon.textContent = '🚚'; name.textContent = 'Eicher (Medium)'; cost.textContent = '₹3,500'; }
        else { icon.textContent = '🚜'; name.textContent = 'Dumper / Truck'; cost.textContent = '₹6,000'; }
    }

    onActivate() { }
}
