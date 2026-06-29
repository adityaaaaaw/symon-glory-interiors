'use strict';

/**
 * Priority Engine
 *
 * Determines booking priority based on:
 *   - estimatedBudget (INR numeric value)
 *   - propertyType    (e.g., 'Residential', 'Commercial', 'Villa', 'Office', etc.)
 *   - numRooms        (number of rooms/spaces)
 *
 * Priority Levels (highest to lowest): Urgent → High → Medium → Low
 */

/**
 * Priority display metadata
 */
const PRIORITY_METADATA = {
  Urgent: {
    label: 'Urgent',
    color: '#DC2626',       // Red-600
    bgColor: '#FEF2F2',     // Red-50
    badgeClass: 'badge-urgent',
    description: 'Requires immediate attention',
    icon: '🔴',
  },
  High: {
    label: 'High',
    color: '#D97706',       // Amber-600
    bgColor: '#FFFBEB',     // Amber-50
    badgeClass: 'badge-high',
    description: 'High priority project',
    icon: '🟠',
  },
  Medium: {
    label: 'Medium',
    color: '#2563EB',       // Blue-600
    bgColor: '#EFF6FF',     // Blue-50
    badgeClass: 'badge-medium',
    description: 'Standard priority project',
    icon: '🔵',
  },
  Low: {
    label: 'Low',
    color: '#16A34A',       // Green-600
    bgColor: '#F0FDF4',     // Green-50
    badgeClass: 'badge-low',
    description: 'Low priority project',
    icon: '🟢',
  },
};

/**
 * Valid priority levels (in descending order)
 */
const PRIORITY_LEVELS = ['Urgent', 'High', 'Medium', 'Low'];

/**
 * Compute the booking priority based on business rules.
 *
 * Priority Rules (evaluated in order, first match wins):
 *
 *   URGENT:
 *     - Budget >= ₹20,00,000 (2,000,000)
 *     - OR (Commercial property AND Budget >= ₹10,00,000)
 *
 *   HIGH:
 *     - Budget >= ₹10,00,000 (1,000,000)
 *     - OR numRooms >= 5
 *
 *   MEDIUM:
 *     - Budget >= ₹5,00,000 (500,000)
 *     - OR numRooms >= 3
 *
 *   LOW:
 *     - Everything else
 *
 * @param {number|string} estimatedBudget - Estimated project budget in INR
 * @param {string} propertyType          - Type of property (e.g., 'Commercial', 'Residential')
 * @param {number|string} numRooms        - Number of rooms/spaces in the project
 * @returns {'Urgent'|'High'|'Medium'|'Low'} Priority level string
 *
 * @example
 * computePriority(2500000, 'Residential', 4); // → 'Urgent'
 * computePriority(1500000, 'Commercial', 2);  // → 'Urgent'
 * computePriority(1200000, 'Residential', 3); // → 'High'
 * computePriority(600000, 'Residential', 4);  // → 'High'
 * computePriority(500000, 'Residential', 2);  // → 'Medium'
 * computePriority(300000, 'Residential', 1);  // → 'Low'
 */
const computePriority = (estimatedBudget, propertyType, numRooms) => {
  // Normalise inputs
  const budget = parseFloat(estimatedBudget) || 0;
  const rooms = parseInt(numRooms, 10) || 0;
  const propType = typeof propertyType === 'string' ? propertyType.trim() : '';
  const isCommercial = propType.toLowerCase() === 'commercial';

  // Rule 1: URGENT
  if (budget >= 2_000_000 || (isCommercial && budget >= 1_000_000)) {
    return 'Urgent';
  }

  // Rule 2: HIGH
  if (budget >= 1_000_000 || rooms >= 5) {
    return 'High';
  }

  // Rule 3: MEDIUM
  if (budget >= 500_000 || rooms >= 3) {
    return 'Medium';
  }

  // Rule 4: LOW (default)
  return 'Low';
};

/**
 * Get display metadata for a given priority level.
 *
 * @param {'Urgent'|'High'|'Medium'|'Low'} priority - Priority level string
 * @returns {{ label: string, color: string, bgColor: string, badgeClass: string, description: string, icon: string }}
 *   Display metadata for the priority
 *
 * @example
 * const meta = getPriorityLabel('High');
 * // → { label: 'High', color: '#D97706', bgColor: '#FFFBEB', badgeClass: 'badge-high', ... }
 */
const getPriorityLabel = (priority) => {
  if (!priority || !PRIORITY_METADATA[priority]) {
    console.warn(
      `[priorityEngine] getPriorityLabel() called with unknown priority: "${priority}". Defaulting to 'Low'.`
    );
    return PRIORITY_METADATA['Low'];
  }

  return PRIORITY_METADATA[priority];
};

/**
 * Get all priority levels in descending order (Urgent → Low).
 *
 * @returns {string[]} Array of priority level strings
 */
const getAllPriorityLevels = () => [...PRIORITY_LEVELS];

module.exports = {
  computePriority,
  getPriorityLabel,
  getAllPriorityLevels,
  PRIORITY_LEVELS,
  PRIORITY_METADATA,
};
