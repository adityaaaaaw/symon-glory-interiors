/**
 * StatusBadge.jsx
 * Color-coded pill badge for booking status and priority values.
 * Uses CSS classes: .badge, .badge-{status-slug}, .badge-priority-{level}
 */

const STATUS_CONFIG = {
  // Booking statuses
  pending: {
    label: 'Pending',
    cssClass: 'badge-pending',
    dot: '#f59e0b',
  },
  confirmed: {
    label: 'Confirmed',
    cssClass: 'badge-confirmed',
    dot: '#3b82f6',
  },
  assigned: {
    label: 'Assigned',
    cssClass: 'badge-assigned',
    dot: '#8b5cf6',
  },
  scheduled: {
    label: 'Scheduled',
    cssClass: 'badge-scheduled',
    dot: '#14b8a6',
  },
  'in-progress': {
    label: 'In Progress',
    cssClass: 'badge-in-progress',
    dot: '#f97316',
  },
  completed: {
    label: 'Completed',
    cssClass: 'badge-completed',
    dot: '#22c55e',
  },
  cancelled: {
    label: 'Cancelled',
    cssClass: 'badge-cancelled',
    dot: '#ef4444',
  },
  // Priority levels
  low: {
    label: 'Low',
    cssClass: 'badge-priority-low',
    dot: '#6b7280',
  },
  medium: {
    label: 'Medium',
    cssClass: 'badge-priority-medium',
    dot: '#f59e0b',
  },
  high: {
    label: 'High',
    cssClass: 'badge-priority-high',
    dot: '#f97316',
  },
  urgent: {
    label: 'Urgent',
    cssClass: 'badge-priority-urgent',
    dot: '#ef4444',
  },
};

/**
 * Normalises an arbitrary status/priority string into a lookup key.
 * e.g. "In Progress" → "in-progress", "Urgent" → "urgent"
 */
function toKey(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * StatusBadge component
 *
 * @param {string}        status  - e.g. "Pending", "In Progress", "High", "Urgent"
 * @param {'sm'|'md'}     size    - Controls font/padding size (default "md")
 */
export default function StatusBadge({ status, size = 'md' }) {
  if (!status) return null;

  const key = toKey(status);
  const config = STATUS_CONFIG[key];

  // Fallback: render with a generic grey badge if the key is unknown
  const label = config?.label ?? status;
  const badgeCssClass = config?.cssClass ?? 'badge-default';
  const dotColor = config?.dot ?? '#9ca3af';

  const sizeClass = size === 'sm' ? 'badge-sm' : 'badge-md';

  return (
    <span className={`badge ${badgeCssClass} ${sizeClass}`} aria-label={`Status: ${label}`}>
      {/* Dot indicator */}
      <span
        className="badge-dot"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
