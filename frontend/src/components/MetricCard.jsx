/**
 * MetricCard.jsx
 * Glass-effect stats/metric card for dashboard displays.
 * Shows: icon, large value, title, subtitle, and optional trend indicator.
 * Supports loading shimmer state.
 */

import { useEffect, useRef } from 'react';

/**
 * Maps color prop to CSS variable class suffix for the icon circle.
 */
const COLOR_MAP = {
  gold: 'metric-icon-gold',
  blue: 'metric-icon-blue',
  green: 'metric-icon-green',
  red: 'metric-icon-red',
  purple: 'metric-icon-purple',
  teal: 'metric-icon-teal',
};

/**
 * Formats a numeric value for display.
 * Numbers >= 1000 get comma-separated formatting.
 */
function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    return val.toLocaleString('en-IN');
  }
  return String(val);
}

/**
 * MetricCard component
 *
 * @param {string}      title     - Card title label
 * @param {number|string} value   - The primary metric number or value
 * @param {string}      subtitle  - Secondary descriptor below value
 * @param {string}      icon      - Emoji string or React node for the icon area
 * @param {number}      trend     - Positive = up (green ▲), negative = down (red ▼)
 * @param {'gold'|'blue'|'green'|'red'|'purple'|'teal'} color - Icon circle accent color
 * @param {boolean}     loading   - When true, renders shimmer placeholder
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'gold',
  loading = false,
}) {
  const cardRef = useRef(null);

  // Subtle tilt effect on mouse move (glass card feel)
  useEffect(() => {
    const card = cardRef.current;
    if (!card || loading) return;

    const handleMouseMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -4;
      const rotateY = ((x - cx) / cx) * 4;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [loading]);

  const iconColorClass = COLOR_MAP[color] ?? COLOR_MAP.gold;

  // ── Loading shimmer state ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="metric-card metric-card-loading" aria-busy="true" aria-label="Loading metric">
        <div className="metric-card-inner">
          <div className="metric-icon-wrap shimmer shimmer-circle" />
          <div className="metric-body">
            <div className="shimmer shimmer-text shimmer-text-lg" style={{ width: '60%' }} />
            <div className="shimmer shimmer-text" style={{ width: '40%', marginTop: '8px' }} />
            <div className="shimmer shimmer-text shimmer-text-sm" style={{ width: '70%', marginTop: '6px' }} />
          </div>
        </div>
        <div className="shimmer shimmer-text shimmer-text-sm" style={{ width: '30%', marginTop: '12px' }} />
      </div>
    );
  }

  // ── Trend indicator ────────────────────────────────────────────────────────
  const hasTrend = trend !== null && trend !== undefined;
  const trendUp = hasTrend && trend >= 0;
  const trendAbs = hasTrend ? Math.abs(trend) : 0;

  return (
    <div
      ref={cardRef}
      className="metric-card"
      style={{ transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
    >
      <div className="metric-card-inner">
        {/* Icon circle */}
        <div className={`metric-icon-wrap ${iconColorClass}`} aria-hidden="true">
          {typeof icon === 'string' ? (
            <span className="metric-icon-emoji">{icon}</span>
          ) : (
            icon
          )}
        </div>

        {/* Body */}
        <div className="metric-body">
          <div className="metric-value" aria-label={`${title}: ${formatValue(value)}`}>
            {formatValue(value)}
          </div>
          <div className="metric-title">{title}</div>
          {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        </div>
      </div>

      {/* Trend row */}
      {hasTrend && (
        <div className={`metric-trend ${trendUp ? 'metric-trend-up' : 'metric-trend-down'}`}>
          <span className="metric-trend-arrow" aria-hidden="true">
            {trendUp ? '▲' : '▼'}
          </span>
          <span className="metric-trend-value">
            {trendAbs}%
          </span>
          <span className="metric-trend-label">
            {trendUp ? 'vs last period' : 'vs last period'}
          </span>
        </div>
      )}
    </div>
  );
}
