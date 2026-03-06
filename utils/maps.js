// ──────────────────────────────────────────────────────────────────
// utils/maps.js  —  Google Maps API utility stub
// ──────────────────────────────────────────────────────────────────

// TODO: Replace with your Google Maps API key
const MAPS_API_KEY = "AIzaSyAS9r3UMZzAvYDtT1KoF79BG2nPFxXvQn0";

/**
 * Calculate the straight-line distance between two geo-coordinates.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometers
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

/**
 * Get the user's current position via Geolocation API.
 * @returns {Promise<{lat: number, lng: number}>}
 */
export async function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            // Default to Mumbai if geolocation unavailable
            resolve({ lat: 19.076, lng: 72.877 });
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve({ lat: 19.076, lng: 72.877 }), // Fallback to Mumbai
            { timeout: 5000 }
        );
    });
}

/**
 * Load a Google Map into a container element.
 * @param {HTMLElement} container
 * @param {Object} center - { lat, lng }
 * @param {Array} markers - Array of { lat, lng, title, icon }
 * @returns {google.maps.Map|null}
 */
export function loadMap(container, center, markers = []) {
    console.log("[Maps] loadMap() stub — Google Maps SDK not yet loaded");
    // Example:
    // const map = new google.maps.Map(container, {
    //   center,
    //   zoom: 13,
    //   styles: DARK_MAP_STYLE
    // });
    // markers.forEach(m => {
    //   new google.maps.Marker({ position: { lat: m.lat, lng: m.lng }, map, title: m.title });
    // });
    // return map;
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#5C5647;font-size:13px;">Map will load here when Maps API is connected</div>`;
    return null;
}

/**
 * Get route directions between two points.
 * @param {Object} origin - { lat, lng }
 * @param {Object} destination - { lat, lng }
 * @param {string} mode - "DRIVING" | "TWO_WHEELER"
 * @returns {Promise<Object>} Route response
 */
export async function getRoute(origin, destination, mode = "DRIVING") {
    console.log("[Maps] getRoute() stub");
    // Example:
    // const directionsService = new google.maps.DirectionsService();
    // return directionsService.route({ origin, destination, travelMode: mode });
    return {
        distance: "4.2 km",
        duration: "18 min",
        polyline: []
    };
}

// Dark map style to match app theme
export const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#161616" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#A09882" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0D0D0D" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2A2A2A" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1E1E1E" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#252525" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#2A2A2A" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0D0D0D" }] }
];
