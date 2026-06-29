'use strict';

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Role IDs:
 *   Admin        = 1
 *   Client       = 2
 *   Designer     = 3
 *   Site Engineer = 4
 *
 * Prerequisites:
 *   - authMiddleware must run before these middlewares
 *   - req.user must be populated with { role_id, role_name }
 */

// Canonical role mapping (role name → role_id)
const ROLE_MAP = {
  Admin: 1,
  Client: 2,
  Designer: 3,
  'Site Engineer': 4,
};

// Reverse mapping (role_id → role name) for error messages
const ROLE_ID_MAP = Object.fromEntries(
  Object.entries(ROLE_MAP).map(([name, id]) => [id, name])
);

/**
 * Normalise a role name for case-insensitive comparison.
 * Accepts strings like "admin", "ADMIN", "Admin" and returns "Admin".
 */
const normaliseRoleName = (roleName) => {
  if (typeof roleName !== 'string') return null;
  const trimmed = roleName.trim();
  // Direct lookup (handles exact matches including spaces like "Site Engineer")
  const exactMatch = Object.keys(ROLE_MAP).find(
    (key) => key.toLowerCase() === trimmed.toLowerCase()
  );
  return exactMatch || null;
};

/**
 * requireRole(roleName)
 * Middleware factory — allows ONLY the specified role.
 *
 * @param {string} roleName - One of: 'Admin', 'Client', 'Designer', 'Site Engineer'
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/admin-only', authMiddleware, requireRole('Admin'), handler);
 */
const requireRole = (roleName) => {
  const normalised = normaliseRoleName(roleName);

  if (!normalised) {
    throw new Error(
      `[roleMiddleware] requireRole() called with unknown role: "${roleName}". ` +
        `Valid roles are: ${Object.keys(ROLE_MAP).join(', ')}`
    );
  }

  const requiredRoleId = ROLE_MAP[normalised];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorised. Authentication required.',
        data: null,
      });
    }

    if (req.user.role_id !== requiredRoleId) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires the '${normalised}' role. Your role is '${
          req.user.role_name || ROLE_ID_MAP[req.user.role_id] || 'Unknown'
        }'.`,
        data: null,
      });
    }

    next();
  };
};

/**
 * requireAnyRole(...roleNames)
 * Middleware factory — allows ANY of the specified roles.
 *
 * @param {...string} roleNames - One or more role names from: 'Admin', 'Client', 'Designer', 'Site Engineer'
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/staff', authMiddleware, requireAnyRole('Admin', 'Designer', 'Site Engineer'), handler);
 */
const requireAnyRole = (...roleNames) => {
  if (!roleNames || roleNames.length === 0) {
    throw new Error('[roleMiddleware] requireAnyRole() must receive at least one role name.');
  }

  // Validate and normalise all provided role names at middleware registration time
  const normalisedRoles = roleNames.map((roleName) => {
    const normalised = normaliseRoleName(roleName);
    if (!normalised) {
      throw new Error(
        `[roleMiddleware] requireAnyRole() called with unknown role: "${roleName}". ` +
          `Valid roles are: ${Object.keys(ROLE_MAP).join(', ')}`
      );
    }
    return normalised;
  });

  const allowedRoleIds = new Set(normalisedRoles.map((name) => ROLE_MAP[name]));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorised. Authentication required.',
        data: null,
      });
    }

    if (!allowedRoleIds.has(req.user.role_id)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires one of the following roles: [${normalisedRoles.join(
          ', '
        )}]. Your role is '${
          req.user.role_name || ROLE_ID_MAP[req.user.role_id] || 'Unknown'
        }'.`,
        data: null,
      });
    }

    next();
  };
};

module.exports = {
  requireRole,
  requireAnyRole,
  ROLE_MAP,
  ROLE_ID_MAP,
};
