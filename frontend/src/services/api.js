/**
 * Glory Simon Interiors — API Client
 * Fetch-based HTTP client with JWT authentication interceptor.
 *
 * On 401: clears localStorage + redirects to /login automatically.
 * All responses are parsed as JSON and returned directly.
 * Blob responses (PDF export) are handled separately.
 */

const BASE_URL = '/api';
const TOKEN_KEY = 'gsi_auth_token';

/* ── Token Helpers ─────────────────────────────────────────────── */

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('gsi_user');
}

/* ── Core Request Helper ───────────────────────────────────────── */

/**
 * Make an authenticated fetch request.
 * @param {string} method  — HTTP verb (GET, POST, PUT, PATCH, DELETE)
 * @param {string} path    — API path starting with /
 * @param {*}      body    — Request body (will be JSON.stringify'd)
 * @param {object} options — Extra fetch options (e.g. headers override)
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiRequest(method, path, body = undefined, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    method: method.toUpperCase(),
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, config);
  } catch (networkError) {
    throw new Error('Network error — please check your connection and try again.');
  }

  // Auto-logout on 401
  if (response.status === 401) {
    clearAuthToken();
    // Redirect to login, preserving current path as state
    const currentPath = window.location.pathname;
    window.location.href = `/login${currentPath !== '/login' ? `?redirect=${encodeURIComponent(currentPath)}` : ''}`;
    throw new Error('Session expired. Please log in again.');
  }

  // Handle blob responses
  if (options.responseType === 'blob') {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }
    return response.blob();
  }

  // Parse JSON
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { success: false, message: text || `HTTP ${response.status}` };
  }

  if (!response.ok) {
    const err = new Error(data?.message || `Request failed with status ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

/* ── Convenience Wrappers ─────────────────────────────────────── */

const get    = (path, opts)         => apiRequest('GET',    path, undefined, opts);
const post   = (path, body, opts)   => apiRequest('POST',   path, body, opts);
const put    = (path, body, opts)   => apiRequest('PUT',    path, body, opts);
const patch  = (path, body, opts)   => apiRequest('PATCH',  path, body, opts);
const del    = (path, opts)         => apiRequest('DELETE', path, undefined, opts);

/** Build a query string from a params object or URLSearchParams */
function buildQuery(params) {
  if (!params) return '';
  const sp = params instanceof URLSearchParams ? params : new URLSearchParams(
    Object.fromEntries(
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
    )
  );
  const str = sp.toString();
  return str ? `?${str}` : '';
}

/* ============================================================
   AUTH API
   ============================================================ */

export const authAPI = {
  /**
   * Register a new account.
   * @param {{ full_name, email, password, mobile_number, role_name, address?, city?, pincode? }} data
   */
  register(data) {
    return post('/auth/register', data);
  },

  /**
   * Log in and receive a JWT token.
   * @param {{ email: string, password: string }} data
   */
  login(data) {
    return post('/auth/login', data);
  },

  /**
   * Verify token and fetch the current authenticated user.
   */
  getMe() {
    return get('/auth/me');
  },

  /**
   * Update the authenticated user's profile.
   * @param {{ full_name?, mobile_number?, address?, city?, pincode?, current_password?, new_password? }} data
   */
  updateProfile(data) {
    return put('/auth/profile', data);
  },
};

/* ============================================================
   BOOKINGS API
   ============================================================ */

export const bookingAPI = {
  /**
   * Get all bookings (Admin). Supports filters.
   * @param {{ status?, priority?, client_id?, project_type_id?, search?, page?, limit? }} params
   */
  getAll(params) {
    return get(`/bookings${buildQuery(params)}`);
  },

  /**
   * Get a single booking by ID.
   * @param {number|string} id
   */
  getById(id) {
    return get(`/bookings/${id}`);
  },

  /**
   * Get bookings for the currently authenticated client.
   * @param {{ status?, page?, limit? }} params
   */
  getMy(params) {
    return get(`/bookings/my${buildQuery(params)}`);
  },

  /**
   * Create a new site visit booking.
   * @param {{ property_type, project_type_id, address, city, pincode, preferred_visit_date, slot_id, num_rooms, estimated_budget?, project_description? }} data
   */
  create(data) {
    return post('/bookings', data);
  },

  /**
   * Update booking status (Admin only).
   * @param {number|string} id
   * @param {{ status: string, notes?: string }} data
   */
  updateStatus(id, data) {
    return patch(`/bookings/${id}/status`, data);
  },

  /**
   * Cancel a booking.
   * @param {number|string} id
   * @param {{ cancellation_reason: string }} data
   */
  cancel(id, data) {
    return patch(`/bookings/${id}/cancel`, data);
  },

  /**
   * Reschedule a booking to a new slot/date.
   * @param {number|string} id
   * @param {{ slot_id: number, preferred_visit_date: string }} data
   */
  reschedule(id, data) {
    return patch(`/bookings/${id}/reschedule`, data);
  },
};

/* ============================================================
   SLOTS API
   ============================================================ */

export const slotAPI = {
  /**
   * Get available slots for a specific date.
   * @param {string} date — YYYY-MM-DD
   */
  getByDate(date) {
    return get(`/slots${buildQuery({ date })}`);
  },

  /**
   * Get all slots within a date range (for calendar).
   * @param {string} from — YYYY-MM-DD
   * @param {string} to   — YYYY-MM-DD
   */
  getRange(from, to) {
    return get(`/slots/range${buildQuery({ from_date: from, to_date: to })}`);
  },

  /**
   * Create a new time slot (Admin).
   * @param {{ slot_date, start_time, end_time, max_bookings, is_active? }} data
   */
  create(data) {
    return post('/slots', data);
  },

  /**
   * Update an existing slot (Admin).
   * @param {number|string} id
   * @param {{ max_bookings?, is_active? }} data
   */
  update(id, data) {
    return put(`/slots/${id}`, data);
  },

  /**
   * Delete a slot (Admin).
   * @param {number|string} id
   */
  delete(id) {
    return del(`/slots/${id}`);
  },
};

/* ============================================================
   ASSIGNMENTS API
   ============================================================ */

export const assignmentAPI = {
  /**
   * Assign a designer or site engineer to a booking (Admin).
   * @param {{ booking_id, staff_role, staff_user_id, notes? }} data
   */
  assign(data) {
    return post('/assignments', data);
  },

  /**
   * Reassign staff for an existing booking (Admin).
   * @param {{ booking_id, staff_role, new_staff_user_id, notes? }} data
   */
  reassign(data) {
    return patch('/assignments/reassign', data);
  },

  /**
   * Get all assignments for a specific booking.
   * @param {number|string} bookingId
   */
  getByBooking(bookingId) {
    return get(`/assignments/booking/${bookingId}`);
  },

  /**
   * Get assignments for the currently authenticated staff member.
   * @param {{ status?, page?, limit? }} params
   */
  getMy(params) {
    return get(`/assignments/my${buildQuery(params)}`);
  },
};

/* ============================================================
   REPORTS API
   ============================================================ */

export const reportAPI = {
  /**
   * Submit a new visit report.
   * @param {{ booking_id, visit_date, observations, design_suggestions?, material_suggestions?, budget_estimate?, summary, follow_up_notes? }} data
   */
  create(data) {
    return post('/reports', data);
  },

  /**
   * Get the visit report for a booking.
   * @param {number|string} bookingId
   */
  getByBooking(bookingId) {
    return get(`/reports/booking/${bookingId}`);
  },

  /**
   * Add room measurements to a visit report.
   * @param {{ visit_report_id, measurements: Array<{ room_name, length_ft, width_ft, height_ft, notes? }> }} data
   */
  addMeasurements(data) {
    return post('/reports/measurements', data);
  },

  /**
   * Export a visit report as PDF blob.
   * @param {number|string} bookingId
   * @returns {Promise<Blob>}
   */
  exportPDF(bookingId) {
    return get(`/reports/booking/${bookingId}/export`, { responseType: 'blob' });
  },
};

/* ============================================================
   DASHBOARD API
   ============================================================ */

export const dashboardAPI = {
  /** Get admin dashboard metrics (counts, recent bookings, etc.) */
  getAdminMetrics() {
    return get('/dashboard/admin');
  },

  /** Get booking conversion funnel data */
  getConversionFunnel() {
    return get('/dashboard/conversion');
  },

  /** Get designer-specific dashboard metrics */
  getDesignerMetrics() {
    return get('/dashboard/designer');
  },

  /** Get site engineer-specific dashboard metrics */
  getEngineerMetrics() {
    return get('/dashboard/engineer');
  },

  /** Get client-specific dashboard metrics */
  getClientMetrics() {
    return get('/dashboard/client');
  },

  /** Get recent activity log entries */
  getRecentActivity() {
    return get('/dashboard/activity');
  },
};

/* ============================================================
   CALENDAR API
   ============================================================ */

export const calendarAPI = {
  /**
   * Get calendar data for a given view and date.
   * @param {'month'|'week'|'day'} view
   * @param {string} date — YYYY-MM-DD (anchor date for the view)
   */
  getData(view, date) {
    return get(`/calendar${buildQuery({ view, date })}`);
  },
};

/* ============================================================
   NOTIFICATIONS API
   ============================================================ */

export const notificationAPI = {
  /**
   * Get all notifications for the current user.
   * @param {{ type?, is_read?, page?, limit? }} params
   */
  getAll(params) {
    return get(`/notifications${buildQuery(params)}`);
  },

  /** Get unread notification count for badge display. */
  getUnreadCount() {
    return get('/notifications/unread-count');
  },

  /**
   * Mark a specific notification as read.
   * @param {number|string} id
   */
  markRead(id) {
    return patch(`/notifications/${id}/read`);
  },

  /** Mark all notifications as read. */
  markAllRead() {
    return patch('/notifications/read-all');
  },
};

/* ============================================================
   AI API
   ============================================================ */

export const aiAPI = {
  /**
   * Detect booking priority using AI.
   * @param {{ project_description: string, estimated_budget?: number, num_rooms?: number }} data
   */
  detectPriority(data) {
    return post('/ai/priority', data);
  },

  /**
   * Generate a visit report summary using AI.
   * @param {{ booking_id: number, observations: string, measurements?: any[] }} data
   */
  generateSummary(data) {
    return post('/ai/summary', data);
  },

  /**
   * Generate a booking confirmation message.
   * @param {{ booking_id: number }} data
   */
  generateConfirmation(data) {
    return post('/ai/confirmation', data);
  },

  /**
   * Generate a visit reminder message.
   * @param {{ booking_id: number }} data
   */
  generateReminder(data) {
    return post('/ai/reminder', data);
  },

  /**
   * Generate a follow-up message.
   * @param {{ booking_id: number, follow_up_notes?: string }} data
   */
  generateFollowUp(data) {
    return post('/ai/follow-up', data);
  },
};

/* ============================================================
   USER MANAGEMENT API (Admin)
   ============================================================ */

export const userAPI = {
  /**
   * Get all users (Admin).
   * @param {{ role_id?, is_active?, search?, page?, limit? }} params
   */
  getAll(params) {
    return get(`/auth/users${buildQuery(params)}`);
  },

  /**
   * Get a user by ID (Admin).
   * @param {number|string} id
   */
  getById(id) {
    return get(`/auth/users/${id}`);
  },

  /**
   * Toggle user active status (Admin).
   * @param {number|string} id
   * @param {{ is_active: boolean }} data
   */
  toggleActive(id, data) {
    return patch(`/auth/users/${id}/status`, data);
  },
};


/* ============================================================
   PROJECT TYPES API
   ============================================================ */

export const projectTypeAPI = {
  /** Get all active project types. */
  getAll() {
    return get('/project-types');
  },
};

/* ============================================================
   QUOTATIONS API
   ============================================================ */

export const quotationAPI = {
  /**
   * Create a quotation (Admin/Designer).
   * @param {{ booking_id, item_details, subtotal, tax_percent, valid_until, notes? }} data
   */
  create(data) {
    return post('/quotations', data);
  },

  /**
   * Get all quotations (Admin).
   * @param {{ status?, page?, limit? }} params
   */
  getAll(params) {
    return get(`/quotations${buildQuery(params)}`);
  },

  /**
   * Get quotation by booking ID.
   * @param {number|string} bookingId
   */
  getByBooking(bookingId) {
    return get(`/quotations/booking/${bookingId}`);
  },

  /**
   * Update quotation status.
   * @param {number|string} id
   * @param {{ status: string }} data
   */
  updateStatus(id, data) {
    return patch(`/quotations/${id}/status`, data);
  },
};

/* ============================================================
   FOLLOW-UPS API
   ============================================================ */

export const followupAPI = {
  /**
   * Schedule a follow-up (Admin/Staff).
   * @param {{ booking_id, follow_up_date, notes? }} data
   */
  create(data) {
    return post('/followups', data);
  },

  /**
   * Get follow-ups for a booking.
   * @param {number|string} bookingId
   */
  getByBooking(bookingId) {
    return get(`/followups/booking/${bookingId}`);
  },

  /**
   * Mark a follow-up as complete.
   * @param {number|string} id
   * @param {{ notes?: string }} data
   */
  complete(id, data) {
    return patch(`/followups/${id}/complete`, data);
  },
};
