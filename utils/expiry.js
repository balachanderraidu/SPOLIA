// utils/expiry.js — Near-Expiry Rescue Utilities
// Spolia's core mission: rescue materials (cement, paint, tiles)
// before they expire and go to landfill.

/**
 * Compute urgency level from an expiryDate Firestore Timestamp or ISO string.
 * Returns: { level: 'critical'|'urgent'|'soon'|null, daysLeft, label, color, emoji }
 */
export function getExpiryUrgency(expiryDate) {
    if (!expiryDate) return { level: null, daysLeft: null, label: null };

    let date;
    if (expiryDate?.toDate) {
        date = expiryDate.toDate();
    } else if (typeof expiryDate === 'string') {
        date = new Date(expiryDate);
    } else {
        date = new Date(expiryDate);
    }

    if (isNaN(date.getTime())) return { level: null, daysLeft: null, label: null };

    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        return { level: 'expired', daysLeft, label: 'Expired', color: '#5C5647', emoji: '⚫' };
    }
    if (daysLeft <= 3) {
        return { level: 'critical', daysLeft, label: `${daysLeft}d left`, color: '#E05C5C', emoji: '🔴' };
    }
    if (daysLeft <= 10) {
        return { level: 'urgent', daysLeft, label: `${daysLeft}d left`, color: '#FFA000', emoji: '🟠' };
    }
    if (daysLeft <= 30) {
        return { level: 'soon', daysLeft, label: `${daysLeft}d left`, color: '#FFD700', emoji: '🟡' };
    }
    return { level: null, daysLeft, label: null, color: null, emoji: null };
}

/**
 * Returns a human-readable countdown string.
 * e.g. "Expires in 3 days", "Expires today", "Expired 2 days ago"
 */
export function expiryCountdown(expiryDate) {
    const { level, daysLeft } = getExpiryUrgency(expiryDate);
    if (!level && daysLeft === null) return null;
    if (level === 'expired') return `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''} ago`;
    if (daysLeft === 0) return 'Expires today';
    if (daysLeft === 1) return 'Expires tomorrow';
    return `Expires in ${daysLeft} days`;
}

/**
 * Materials that commonly have expiry/use-by dates.
 * Used to decide whether to show the expiry field in listing-create.
 */
export const EXPIRY_MATERIALS = new Set([
    'cement', 'paint', 'plumbing', 'bulk', 'other'
]);

/**
 * Returns the urgency badge HTML string for use in card/detail views.
 */
export function urgencyBadgeHtml(expiryDate, compact = false) {
    const { level, label, color, emoji } = getExpiryUrgency(expiryDate);
    if (!level || level === 'expired') return '';

    if (compact) {
        return `<span style="
            display:inline-flex;align-items:center;gap:3px;
            font:700 10px/1 Inter,sans-serif;
            color:${color};background:${color}18;
            border:1px solid ${color}44;
            padding:2px 6px;border-radius:20px;
            letter-spacing:0.04em;flex-shrink:0">
            ${emoji} ${label}
        </span>`;
    }

    return `<span style="
        display:inline-flex;align-items:center;gap:4px;
        font:700 11px/1 Inter,sans-serif;
        color:${color};background:${color}15;
        border:1px solid ${color}40;
        padding:4px 10px;border-radius:20px;
        animation:${level === 'critical' ? 'pulse 1.5s ease infinite' : 'none'}">
        ${emoji} RESCUE · ${label.toUpperCase()}
    </span>`;
}
