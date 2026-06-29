// backend/tests/slot.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { signToken } = require('../src/utils/jwtUtils');

let mockIsSlotDuplicate = false;

jest.mock('../src/config/db', () => ({
  query: jest.fn((sql, params) => {
    // Auth check
    if (sql.includes('FROM users u') || sql.includes('FROM users')) {
      const userId = params[0];
      const roleId = userId === 1 ? 1 : 2;
      const roleName = userId === 1 ? 'Admin' : 'Client';
      return Promise.resolve([
        [{ id: userId, email: userId === 1 ? 'admin@glorysimon.com' : 'client@gmail.com', role_id: roleId, role_name: roleName, is_active: 1 }]
      ]);
    }
    // Duplicate check
    if (sql.includes('SELECT id FROM slots WHERE slot_date = ?')) {
      return Promise.resolve([
        mockIsSlotDuplicate ? [{ id: 15 }] : []
      ]);
    }
    // Fetch slots list (v_slot_availability)
    if (sql.includes('v_slot_availability')) {
      return Promise.resolve([
        [{ id: 1, slot_date: '2026-07-01', start_time: '09:00:00', end_time: '11:00:00', available_spots: 3, availability_label: 'Available', is_active: 1 }]
      ]);
    }
    // Insert slot result
    if (sql.includes('INSERT INTO slots')) {
      return Promise.resolve([
        { insertId: 20 }
      ]);
    }
    // Fetch newly created slot
    if (sql.includes('SELECT * FROM slots WHERE id = ?')) {
      return Promise.resolve([
        [{ id: params[0], slot_date: '2026-08-01', start_time: '14:00:00', end_time: '16:00:00', max_bookings: 5, current_bookings: 0, is_active: 1 }]
      ]);
    }
    // Default fallback
    return Promise.resolve([[], []]);
  }),
  withTransaction: jest.fn((callback) => callback({ execute: jest.fn() })),
  testConnection: jest.fn(() => Promise.resolve()),
}));

describe('Slot Endpoints', () => {
  let adminToken;
  let clientToken;

  beforeAll(() => {
    adminToken = signToken(
      { id: 1, email: 'admin@glorysimon.com', role_id: 1, role_name: 'Admin' }
    );
    clientToken = signToken(
      { id: 10, email: 'client@gmail.com', role_id: 2, role_name: 'Client' }
    );
  });

  beforeEach(() => {
    mockIsSlotDuplicate = false;
    jest.clearAllMocks();
  });

  describe('GET /api/slots', () => {
    it('should return available slots for a date without login requirements', async () => {
      const res = await request(app)
        .get('/api/slots?date=2026-07-01');

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1); // slotController returns data, not slots
    });
  });

  describe('POST /api/slots', () => {
    it('should allow admin to create slots', async () => {
      const res = await request(app)
        .post('/api/slots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          slot_date: '2026-08-01',
          start_time: '14:00:00',
          end_time: '16:00:00',
          max_bookings: 5
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.slot).toHaveProperty('id', 20);
    });

    it('should reject client trying to create a slot', async () => {
      const res = await request(app)
        .post('/api/slots')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          slot_date: '2026-08-01',
          start_time: '14:00:00',
          end_time: '16:00:00',
          max_bookings: 5
        });

      expect(res.statusCode).toEqual(403); // RBAC rejects client
      expect(res.body.success).toBe(false);
    });
  });
});
