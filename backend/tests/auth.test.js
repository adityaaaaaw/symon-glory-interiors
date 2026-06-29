// backend/tests/auth.test.js
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

// Mock the DB layer in tests
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  withTransaction: jest.fn((callback) => callback({ execute: jest.fn() })),
  testConnection: jest.fn(() => Promise.resolve()),
}));

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new client user successfully', async () => {
      // Mock unique email check: return no existing user
      db.query.mockResolvedValueOnce([[]]);
      
      // Mock unique mobile number check: return no existing user
      db.query.mockResolvedValueOnce([[]]);
      
      // Mock insert user
      db.query.mockResolvedValueOnce([{ insertId: 10 }]);
      
      // Mock insert client profile
      db.query.mockResolvedValueOnce([{ insertId: 1 }]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Jane Doe',
          mobile_number: '9876543210',
          email: 'janedoe@example.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('id', 10);
    });

    it('should fail registration if email already exists', async () => {
      // Mock existing email: return a user row
      db.query.mockResolvedValueOnce([[{ id: 1 }]]);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Duplicate User',
          mobile_number: '9876543210',
          email: 'existing@example.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('exists');
    });

    it('should fail validation on weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Bad Password',
          mobile_number: '9876543210',
          email: 'weak@example.com',
          password: '123',
        });

      expect(res.statusCode).toEqual(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      // Mock user lookup
      db.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: 'admin@glorysimon.com',
            password_hash: hashedPassword,
            role_id: 1,
            full_name: 'Admin User',
            mobile_number: '9876543210',
            is_active: 1,
            role_name: 'Admin',
          },
        ],
      ]);

      // Mock last login update
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@glorysimon.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role_name).toEqual('Admin');
    });

    it('should fail login with incorrect password', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password@123', 10);

      db.query.mockResolvedValueOnce([
        [
          {
            id: 1,
            email: 'admin@glorysimon.com',
            password_hash: hashedPassword,
            role_id: 1,
            full_name: 'Admin User',
            is_active: 1,
            role_name: 'Admin',
          },
        ],
      ]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@glorysimon.com',
          password: 'WrongPassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });
  });
});
