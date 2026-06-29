// backend/tests/integration.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { signToken } = require('../src/utils/jwtUtils');

jest.mock('../src/config/db', () => ({
  query: jest.fn((sql, params) => {
    // Auth check
    if (sql.includes('FROM users u') || sql.includes('FROM users')) {
      const userId = params[0];
      const roleId = userId === 10 ? 2 : userId === 1 ? 1 : 3;
      const roleName = userId === 10 ? 'Client' : userId === 1 ? 'Admin' : 'Designer';
      return Promise.resolve([
        [{ id: userId, email: userId === 10 ? 'client@gmail.com' : userId === 1 ? 'admin@glorysimon.com' : 'designer1@glorysimon.com', role_id: roleId, role_name: roleName, is_active: 1 }]
      ]);
    }
    // Client profile lookup
    if (sql.includes('FROM clients WHERE user_id = ?')) {
      return Promise.resolve([
        [{ id: 2, user_id: 10 }]
      ]);
    }
    // Project types lookup
    if (sql.includes('FROM project_types')) {
      return Promise.resolve([
        [{ id: 2, name: 'Modular Kitchen', is_active: 1 }]
      ]);
    }
    // Slots lookup
    if (sql.includes('FROM slots')) {
      return Promise.resolve([
        [{ id: 5, slot_date: '2026-07-10', start_time: '09:00:00', end_time: '11:00:00', current_bookings: 1, max_bookings: 3, is_active: 1 }]
      ]);
    }
    // Fetch booking details
    if (sql.includes('FROM bookings b') || sql.includes('FROM bookings')) {
      return Promise.resolve([
        [{ id: 101, client_id: 2, booking_ref: 'GS-1234', status: 'Pending', preferred_visit_date: '2026-07-10', slot_id: 5, num_rooms: 1, estimated_budget: 450000, project_type_name: 'Modular Kitchen', slot_date: '2026-07-10', start_time: '09:00:00', end_time: '11:00:00' }]
      ]);
    }
    // Validate assignment designer check
    if (sql.includes('FROM users WHERE id = ?') && params[0] === 3) {
      return Promise.resolve([
        [{ id: 3, role_id: 3, full_name: 'Priya Design', email: 'priya@glorysimon.com' }]
      ]);
    }
    // Active assignment check
    if (sql.includes('FROM assignments')) {
      return Promise.resolve([
        [{ id: 1, booking_id: 101, staff_role: 'Designer', staff_name: 'Priya Design', status: 'Active', staff_user_id: 3 }]
      ]);
    }
    // Check existing report (returns none during creation check)
    if (sql.includes('FROM visit_reports WHERE booking_id = ?') && !sql.includes('vr.')) {
      return Promise.resolve([
        []
      ]);
    }
    // Fetch visit report detail
    if (sql.includes('FROM visit_reports')) {
      return Promise.resolve([
        [{ id: 50, booking_id: 101, submitted_by_user_id: 3, visit_date: '2026-07-10', observations: 'Optimal', design_suggestions: 'U-shaped', material_suggestions: 'Acrylic', budget_estimate: 500000, summary: 'Concluded' }]
      ]);
    }
    // Fetch measurements
    if (sql.includes('FROM measurements')) {
      return Promise.resolve([
        [{ id: 1, visit_report_id: 50, room_name: 'Kitchen Area', length_ft: 12.5, width_ft: 10, height_ft: 9.5, notes: 'Includes window frame' }]
      ]);
    }
    // Fetch user details for notification
    if (sql.includes('SELECT full_name, email, mobile_number FROM users')) {
      return Promise.resolve([
        [{ full_name: 'Jane Client', email: 'client@gmail.com', mobile_number: '9876543210' }]
      ]);
    }
    // Client detail join query
    if (sql.includes('FROM clients cl')) {
      return Promise.resolve([
        [{ user_id: 10, full_name: 'Jane Client', email: 'client@gmail.com', mobile_number: '9876543210' }]
      ]);
    }
    // Default fallback
    return Promise.resolve([[], []]);
  }),
  withTransaction: jest.fn((callback) => {
    const conn = {
      execute: jest.fn().mockImplementation((sql, params) => {
        if (sql.includes('INSERT INTO bookings')) {
          return Promise.resolve([{ insertId: 101 }]);
        }
        if (sql.includes('INSERT INTO assignments')) {
          return Promise.resolve([{ insertId: 1 }]);
        }
        if (sql.includes('INSERT INTO visit_reports')) {
          return Promise.resolve([{ insertId: 50 }]);
        }
        if (sql.includes('SELECT id FROM visit_reports')) {
          return Promise.resolve([[], []]);
        }
        return Promise.resolve([[], []]);
      })
    };
    return callback(conn);
  }),
  testConnection: jest.fn(() => Promise.resolve()),
}));

describe('Complete Site Visit Booking System Integration Flow', () => {
  let adminToken;
  let clientToken;
  let designerToken;

  beforeAll(() => {
    adminToken = signToken(
      { id: 1, email: 'admin@glorysimon.com', role_id: 1, role_name: 'Admin' }
    );
    clientToken = signToken(
      { id: 10, email: 'client@gmail.com', role_id: 2, role_name: 'Client' }
    );
    designerToken = signToken(
      { id: 3, email: 'designer1@glorysimon.com', role_id: 3, role_name: 'Designer' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should walk through the complete site visit booking and fulfillment lifecycle', async () => {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Client Books a Site Visit
    // ─────────────────────────────────────────────────────────────────────────
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        property_type: 'Residential',
        project_type_id: 2, // Modular Kitchen
        address: 'Flat 402, Golden Crest',
        city: 'Chennai',
        pincode: '600002',
        preferred_visit_date: '2026-07-10',
        slot_id: 5,
        num_rooms: 1,
        estimated_budget: 450000,
        project_description: 'Modular kitchen with island counter',
      });

    expect(bookRes.statusCode).toEqual(201);
    expect(bookRes.body.success).toBe(true);
    expect(bookRes.body.booking).toHaveProperty('id', 101);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Admin Confirms Booking & Assigns Staff
    // ─────────────────────────────────────────────────────────────────────────
    const assignRes = await request(app)
      .post('/api/assignments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        booking_id: 101,
        designer_user_id: 3,
        notes: 'Take high-end laminate brochures'
      });

    expect(assignRes.statusCode).toEqual(201);
    expect(assignRes.body.success).toBe(true);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Designer submits visit report
    // ─────────────────────────────────────────────────────────────────────────
    const reportRes = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${designerToken}`)
      .send({
        booking_id: 101,
        visit_date: '2026-07-10',
        observations: 'Kitchen dimensions are optimal. Good natural lighting.',
        design_suggestions: 'U-shaped modular kitchen layout',
        material_suggestions: 'Acrylic cabinets with Quartz countertop',
        budget_estimate: 500000,
        summary: 'Consultation concluded. Client likes neutral colors.',
        measurements: [
          { room_name: 'Kitchen Area', length_ft: 12.5, width_ft: 10.0, height_ft: 9.5, notes: 'Includes window frame' }
        ]
      });

    expect(reportRes.statusCode).toEqual(201);
    expect(reportRes.body.success).toBe(true);
    expect(reportRes.body.data).toHaveProperty('id', 50); // reportController returns data with id, not report_id
  });
});
