// backend/tests/booking.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { signToken } = require('../src/utils/jwtUtils');

let mockIsSlotFull = false;

jest.mock('../src/config/db', () => ({
  query: jest.fn((sql, params) => {
    // Auth check
    if (sql.includes('FROM users u') || sql.includes('FROM users')) {
      return Promise.resolve([
        [{ id: 10, email: 'client@gmail.com', role_id: 2, role_name: 'Client', is_active: 1 }]
      ]);
    }
    // Client profile lookup
    if (sql.includes('FROM clients')) {
      return Promise.resolve([
        [{ id: 2, user_id: 10 }]
      ]);
    }
    // Project types lookup
    if (sql.includes('FROM project_types')) {
      return Promise.resolve([
        [{ id: 1, name: 'Modular Kitchen', is_active: 1 }]
      ]);
    }
    // Slots lookup
    if (sql.includes('FROM slots')) {
      return Promise.resolve([
        [{
          id: 5,
          slot_date: '2026-07-01',
          start_time: '09:00:00',
          end_time: '11:00:00',
          current_bookings: mockIsSlotFull ? 3 : 1,
          max_bookings: 3,
          is_active: 1
        }]
      ]);
    }
    // Booking count or summary view
    if (sql.includes('v_bookings_summary') || sql.includes('COUNT(*) AS total')) {
      return Promise.resolve([
        [{ total: 2 }]
      ]);
    }
    // Booking list or details
    if (sql.includes('FROM bookings b') || sql.includes('bookings')) {
      return Promise.resolve([
        [
          { id: 101, booking_ref: 'GS-1234', client_id: 2, status: 'Pending', preferred_visit_date: '2026-07-01', slot_id: 5, num_rooms: 3, estimated_budget: 800000, project_type_name: 'Modular Kitchen', slot_date: '2026-07-01', start_time: '09:00:00', end_time: '11:00:00' },
          { id: 102, booking_ref: 'GS-5678', client_id: 2, status: 'Confirmed', preferred_visit_date: '2026-07-02', slot_id: 5, num_rooms: 2, estimated_budget: 500000, project_type_name: 'Modular Kitchen', slot_date: '2026-07-02', start_time: '11:00:00', end_time: '13:00:00' }
        ]
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
        return Promise.resolve([[], []]);
      })
    };
    return callback(conn);
  }),
  testConnection: jest.fn(() => Promise.resolve()),
}));

describe('Booking Endpoints', () => {
  let clientToken;

  beforeAll(() => {
    clientToken = signToken(
      { id: 10, email: 'client@gmail.com', role_id: 2, role_name: 'Client', full_name: 'Jane Client' }
    );
  });

  beforeEach(() => {
    mockIsSlotFull = false;
    jest.clearAllMocks();
  });

  describe('POST /api/bookings', () => {
    it('should allow clients to create a booking successfully', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          property_type: 'Residential',
          project_type_id: 1,
          address: '123 Luxury Ave',
          city: 'Chennai',
          pincode: '600001',
          preferred_visit_date: '2026-07-01',
          slot_id: 5,
          num_rooms: 3,
          estimated_budget: 800000,
          project_description: 'Full modular design',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking).toHaveProperty('id', 101);
    });

    it('should reject booking if visit date is in the past', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          property_type: 'Residential',
          project_type_id: 1,
          address: '123 Luxury Ave',
          city: 'Chennai',
          pincode: '600001',
          preferred_visit_date: '2020-01-01', // Past date
          slot_id: 5,
          num_rooms: 3,
          estimated_budget: 800000,
          project_description: 'Full modular design',
        });

      expect(res.statusCode).toEqual(422); // Validation catches past date
      expect(res.body.success).toBe(false);
    });

    it('should reject booking if slot is full', async () => {
      mockIsSlotFull = true;

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          property_type: 'Residential',
          project_type_id: 1,
          address: '123 Luxury Ave',
          city: 'Chennai',
          pincode: '600001',
          preferred_visit_date: '2026-07-01',
          slot_id: 5,
          num_rooms: 3,
          estimated_budget: 800000,
          project_description: 'Full modular design',
        });

      expect(res.statusCode).toEqual(409); // Controller returns 409 Conflict when full
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('booked');
    });
  });

  describe('GET /api/bookings/my', () => {
    it('should fetch own bookings list', async () => {
      const res = await request(app)
        .get('/api/bookings/my')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookings).toHaveLength(2);
    });
  });
});
