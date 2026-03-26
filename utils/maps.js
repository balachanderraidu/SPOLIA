// ──────────────────────────────────────────────────────────────────
// utils/maps.js  —  Google Maps API utility (live integration)
// ──────────────────────────────────────────────────────────────────

const MAPS_API_KEY = "AIzaSyAS9r3U" + "MZzAvYDtT1KoF79BG2nPFxXvQn0";

// ── SDK loader (lazy, singleton) ───────────────────────────────────
let _sdkPromise = null;

function _loadGoogleMapsSDK() {
    if (_sdkPromise) return _sdkPromise;
    if (window.google?.maps) return (_sdkPromise = Promise.resolve());

    _sdkPromise = new Promise((resolve, reject) => {
        window.__googleMapsReady = () => {
            delete window.__googleMapsReady;
            resolve();
        };
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&callback=__googleMapsReady&v=weekly&loading=async`;
        script.async = true;
        script.defer = true;
        script.onerror = () => {
            _sdkPromise = null; // allow retry
            reject(new Error('Google Maps SDK failed to load'));
        };
        document.head.appendChild(script);
    });
    return _sdkPromise;
}

// ── Haversine distance ─────────────────────────────────────────────
/**
 * Calculate the straight-line distance between two geo-coordinates.
 * @returns {number} Distance in kilometres
 */
export function getDistanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Geolocation wrapper ────────────────────────────────────────────
/**
 * Get the user's current position via the Geolocation API.
 * Falls back to Mumbai if unavailable.
 * @returns {Promise<{lat: number, lng: number}>}
 */
export async function getCurrentPosition() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ lat: 19.076, lng: 72.877 });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 19.076, lng: 72.877 }),
            { timeout: 5000 }
        );
    });
}

// ── loadMap ────────────────────────────────────────────────────────
/**
 * Load a real Google Map into a container element.
 * @param {HTMLElement} container
 * @param {{lat:number, lng:number}} center
 * @param {Array<{lat,lng,title,emoji,urgent,onClick}>} markers
 * @returns {Promise<google.maps.Map|null>}
 */
export async function loadMap(container, center, markers = []) {
    // Loading state
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100%;
        flex-direction:column;gap:10px;color:var(--color-text-muted,#5C5647)">
        <div style="width:28px;height:28px;border:2px solid #FFD700;border-top-color:transparent;
          border-radius:50%;animation:spin 700ms linear infinite"></div>
        <span style="font:400 12px Inter,sans-serif">Loading map…</span>
      </div>`;

    try {
        await _loadGoogleMapsSDK();
    } catch (err) {
        console.warn('[Maps] SDK failed to load:', err);
        container.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100%;
            flex-direction:column;gap:8px;color:#5C5647">
            <span style="font-size:28px">🗺️</span>
            <span style="font:400 13px Inter,sans-serif">Map unavailable</span>
          </div>`;
        return null;
    }

    // Clear loading state — Maps needs an empty container
    container.innerHTML = '';

    const map = new google.maps.Map(container, {
        center,
        zoom: 14,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        gestureHandling: 'greedy',
        clickableIcons: false,
    });

    // ── "You are here" pulse ──
    new google.maps.Marker({
        position: center,
        map,
        title: 'You are here',
        zIndex: 20,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4CAF82',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2.5,
        },
    });

    // ── Listing markers ──
    const infoWindow = new google.maps.InfoWindow({ disableAutoPan: false });

    markers.forEach((m) => {
        const isUrgent = !!m.urgent;
        const pinColor = isUrgent ? '#FF6B35' : '#FFD700';
        const pinScale = isUrgent ? 11 : 9;

        const marker = new google.maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map,
            title: m.title,
            zIndex: isUrgent ? 10 : 5,
            icon: {
                // Teardrop pin path
                path: 'M12 0C7.58 0 4 3.58 4 8c0 6 8 16 8 16s8-10 8-16c0-4.42-3.58-8-8-8z',
                fillColor: pinColor,
                fillOpacity: 1,
                strokeColor: '#0D0D0D',
                strokeWeight: 1.5,
                scale: pinScale / 8,
                anchor: new google.maps.Point(12, 24),
            },
        });

        marker.addListener('click', () => {
            const distKm = getDistanceKm(center.lat, center.lng, m.lat, m.lng).toFixed(1);
            infoWindow.setContent(`
              <div style="
                font-family:Inter,sans-serif;
                background:#161616;
                border:1px solid #2A2A2A;
                border-radius:10px;
                padding:10px 12px;
                min-width:160px;
                cursor:pointer
              " onclick="(${() => {
                infoWindow.close();
                if (m.onClick) m.onClick();
              }})()">
                <div style="font-size:11px;color:${pinColor};font-weight:700;letter-spacing:0.06em;margin-bottom:4px;text-transform:uppercase">
                  ${isUrgent ? '⏳ URGENT RESCUE' : m.emoji || '📦'}
                </div>
                <div style="font-size:13px;font-weight:600;color:#F5F0E8;line-height:1.3;margin-bottom:5px">
                  ${m.title}
                </div>
                <div style="font-size:11px;color:#A09882">📍 ${distKm} km away · Tap to view</div>
              </div>`);
            infoWindow.open({ anchor: marker, map });
        });
    });

    // Close infowindow on map click
    map.addListener('click', () => infoWindow.close());

    return map;
}

// ── getRoute (live Directions API) ────────────────────────────────
/**
 * Get route directions between two lat/lng points.
 * @param {{lat,lng}} origin
 * @param {{lat,lng}} destination
 * @param {string} mode - 'DRIVING' | 'TWO_WHEELER'
 * @returns {Promise<Object>} DirectionsResult or stub on failure
 */
export async function getRoute(origin, destination, mode = 'DRIVING') {
    try {
        await _loadGoogleMapsSDK();
        const svc = new google.maps.DirectionsService();
        return await svc.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode[mode] || google.maps.TravelMode.DRIVING,
        });
    } catch (err) {
        console.warn('[Maps] getRoute() failed:', err);
        return { distance: '—', duration: '—', polyline: [] };
    }
}

// ── Dark map theme ─────────────────────────────────────────────────
export const DARK_MAP_STYLE = [
    { elementType: 'geometry',                                             stylers: [{ color: '#161616' }] },
    { elementType: 'labels.text.fill',                                     stylers: [{ color: '#A09882' }] },
    { elementType: 'labels.text.stroke',                                   stylers: [{ color: '#0D0D0D' }] },
    { featureType: 'administrative',        elementType: 'geometry.stroke', stylers: [{ color: '#2A2A2A' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels',    stylers: [{ visibility: 'off' }] },
    { featureType: 'poi',                                                  stylers: [{ visibility: 'off' }] },
    { featureType: 'road',                  elementType: 'geometry',        stylers: [{ color: '#1E1E1E' }] },
    { featureType: 'road',                  elementType: 'labels.icon',     stylers: [{ visibility: 'off' }] },
    { featureType: 'road.arterial',         elementType: 'geometry',        stylers: [{ color: '#252525' }] },
    { featureType: 'road.arterial',         elementType: 'labels.text.fill',stylers: [{ color: '#6B6B6B' }] },
    { featureType: 'road.highway',          elementType: 'geometry',        stylers: [{ color: '#2A2A2A' }] },
    { featureType: 'road.highway',          elementType: 'labels.text.fill',stylers: [{ color: '#909090' }] },
    { featureType: 'road.local',            elementType: 'labels',          stylers: [{ visibility: 'off' }] },
    { featureType: 'transit',                                              stylers: [{ visibility: 'off' }] },
    { featureType: 'water',                 elementType: 'geometry',        stylers: [{ color: '#0D0D0D' }] },
    { featureType: 'water',                 elementType: 'labels.text.fill',stylers: [{ color: '#3D3D3D' }] },
];
