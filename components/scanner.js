// components/scanner.js — AI Scanner (Beta)
import { scanMaterial, estimateCO2Savings } from '../utils/gemini.js';
import { FirebaseDB } from '../firebase-config.js';

export class ScannerScreen {
    constructor(el) {
        this.el = el;
        this.stream = null;
        this.scanResult = null;
        this.scanning = false;
    }

    render() {
        this.el.innerHTML = `
      <div class="scanner-screen" style="height:100%;display:flex;flex-direction:column">
        <!-- Camera view -->
        <div class="scanner-camera" style="flex:1;position:relative">
          <video id="camera-video" autoplay playsinline muted
            style="width:100%;height:100%;object-fit:cover;background:#000"></video>

          <!-- Dark overlay outside reticle -->
          <div class="scanner-overlay" id="scanner-overlay"
            style="position:absolute;inset:0;background:rgba(0,0,0,0.55);pointer-events:none"></div>

          <!-- Header (overlaid) -->
          <div style="position:absolute;top:0;left:0;right:0;padding:env(safe-area-inset-top,16px) 16px 16px;
            display:flex;align-items:center;gap:12px;z-index:10;
            background:linear-gradient(to bottom,rgba(0,0,0,0.6),transparent)">
            <button onclick="window.navigate('radar')" class="icon-btn" aria-label="Back"
              style="background:rgba(0,0,0,0.4);border-color:rgba(255,255,255,0.15);color:#fff">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            <h1 style="flex:1;font:var(--text-h2);color:#fff;text-align:center">AI Scanner</h1>
            <span class="badge badge--ai" style="font-size:10px">BETA</span>
          </div>

          <!-- Reticle -->
          <div class="scanner-reticle" role="img" aria-label="Scanning target area">
            <div class="reticle-corner reticle-corner--tl"></div>
            <div class="reticle-corner reticle-corner--tr"></div>
            <div class="reticle-corner reticle-corner--bl"></div>
            <div class="reticle-corner reticle-corner--br"></div>
            <div class="scan-line" id="scan-line"></div>
          </div>

          <!-- Scan hint -->
          <div class="scanner-hint" id="scanner-hint">
            <span class="live-dot"></span>
            <span class="scanner-hint__text" id="scanner-hint-text">Point at a material to scan</span>
          </div>

          <!-- Scan trigger button -->
          <button id="capture-btn"
            style="position:absolute;bottom:120px;left:50%;transform:translateX(-50%);
              width:72px;height:72px;border-radius:50%;
              background:var(--color-green);border:4px solid rgba(255,255,255,0.3);
              display:flex;align-items:center;justify-content:center;z-index:10;
              box-shadow:0 4px 20px rgba(76,175,130,0.4);transition:transform 150ms"
            aria-label="Capture and scan material">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0D0D0D" stroke-width="2">
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
              <rect x="7" y="7" width="10" height="10" rx="1"/>
            </svg>
          </button>
        </div>

        <!-- Result Bottom Sheet -->
        <div class="bottom-sheet" id="result-sheet" role="dialog" aria-label="Scan result" aria-hidden="true">
          <div class="bottom-sheet__handle"></div>
          <div id="sheet-content"><!-- populated by _showResult() --></div>
        </div>
      </div>
    `;

        this._bindCapture();
    }

    onActivate() {
        this._startCamera();
    }

    async _startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            const video = this.el.querySelector('#camera-video');
            if (video) video.srcObject = this.stream;
        } catch (err) {
            console.warn('[Scanner] Camera access denied:', err);
            const hint = this.el.querySelector('#scanner-hint-text');
            if (hint) hint.textContent = 'Camera access required. Enable in browser settings.';
            this._demoMode();
        }
    }

    _demoMode() {
        const cameraEl = this.el.querySelector('.scanner-camera');
        if (!cameraEl) return;
        const video = cameraEl.querySelector('#camera-video');
        if (video) {
            video.style.display = 'none';
            cameraEl.style.background = 'linear-gradient(135deg, #1a1a1a, #0d0d0d)';
        }
    }

    _bindCapture() {
        const btn = this.el.querySelector('#capture-btn');
        btn?.addEventListener('click', () => this._captureAndScan());
    }

    async _captureAndScan() {
        if (this.scanning) return;
        this.scanning = true;

        const captureBtn = this.el.querySelector('#capture-btn');
        const hintText = this.el.querySelector('#scanner-hint-text');

        if (captureBtn) captureBtn.style.transform = 'translateX(-50%) scale(0.9)';
        if (hintText) hintText.textContent = 'Analysing material...';

        try {
            // Capture frame from video
            const video = this.el.querySelector('#camera-video');
            let base64 = '';
            if (video?.srcObject) {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                canvas.getContext('2d')?.drawImage(video, 0, 0);
                base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            }

            const result = await scanMaterial(base64);
            this.scanResult = result;

            // FIX: store scan result globally so listing-create can receive it
            window._lastScanResult = result;

            this._showResult(result);

        } catch (err) {
            console.error('[Scanner] Scan failed:', err);
            window.showToast?.('Scan failed. Please try again.', 'error');
            if (hintText) hintText.textContent = 'Point at a material to scan';
        } finally {
            this.scanning = false;
            if (captureBtn) captureBtn.style.transform = 'translateX(-50%) scale(1)';
        }
    }

    _showResult(result) {
        const sheet = this.el.querySelector('#result-sheet');
        const content = this.el.querySelector('#sheet-content');

        content.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
        <span class="badge badge--ai" style="font-size:12px">✨ AI Identified</span>
        <span style="font:var(--text-caption);color:var(--color-green)">${Math.round(result.confidence * 100)}% confident</span>
      </div>
      <h2 style="font:var(--text-h1);color:var(--color-text-primary);margin-bottom:4px">${result.materialType}</h2>
      <p style="font:var(--text-caption);color:var(--color-text-muted);margin-bottom:4px">
        Condition: <span style="color:var(--color-text-secondary)">${result.condition}</span>
      </p>

      <div class="data-grid">
        <div class="data-tile">
          <span class="data-tile__value">${result.estimatedQuantity.value.toLocaleString('en-IN')} ${result.estimatedQuantity.unit}</span>
          <span class="data-tile__label">Est. Quantity</span>
        </div>
        <div class="data-tile">
          <span class="data-tile__value gold">₹${(result.estimatedQuantity.value * result.estimatedPricePerUnit).toLocaleString('en-IN')}</span>
          <span class="data-tile__label">Est. Value</span>
        </div>
        <div class="data-tile">
          <span class="data-tile__value green">${result.co2SavedKg.toLocaleString('en-IN')} kg</span>
          <span class="data-tile__label">CO₂ Saved</span>
        </div>
        <div class="data-tile">
          <span class="data-tile__value">₹${result.estimatedPricePerUnit}/unit</span>
          <span class="data-tile__label">Market Rate</span>
        </div>
      </div>

      <p style="font:var(--text-caption);color:var(--color-text-secondary);line-height:1.6;margin-bottom:20px">${result.description}</p>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn--gold" id="list-btn">
          ✦ Edit &amp; List This
        </button>
        <button class="btn btn--outline" id="rescan-btn">
          Rescan
        </button>
      </div>
    `;

        sheet.setAttribute('aria-hidden', 'false');
        sheet.classList.add('visible');

        // Wire "List This" button properly with the scan result
        this.el.querySelector('#list-btn')?.addEventListener('click', () => {
            window.navigate?.('listing-create', { scanResult: result });
        });

        this.el.querySelector('#rescan-btn')?.addEventListener('click', () => {
            sheet.classList.remove('visible');
            sheet.setAttribute('aria-hidden', 'true');
            const hintText = this.el.querySelector('#scanner-hint-text');
            if (hintText) hintText.textContent = 'Point at a material to scan';
        });
    }
}
