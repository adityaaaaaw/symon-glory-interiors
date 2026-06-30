/**
 * Glory Simon Interiors - Site Visit Booking System
 * Express Application Entry Point
 */

require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const morgan        = require('morgan');
const compression   = require('compression');
const rateLimit     = require('express-rate-limit');
const path          = require('path');
const fs            = require('fs');

const { testConnection, query } = require('./config/db');
const { hashPassword } = require('./utils/hashUtils');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes         = require('./routes/auth.routes');
const bookingRoutes      = require('./routes/booking.routes');
const slotRoutes         = require('./routes/slot.routes');
const assignmentRoutes   = require('./routes/assignment.routes');
const reportRoutes       = require('./routes/report.routes');
const dashboardRoutes    = require('./routes/dashboard.routes');
const calendarRoutes     = require('./routes/calendar.routes');
const notificationRoutes = require('./routes/notification.routes');
const aiRoutes           = require('./routes/ai.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ─── Ensure upload and log directories exist ──────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const logDir    = process.env.LOG_DIR    || './logs';
[uploadDir, logDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs : parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 min
  max      : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),
  standardHeaders: true,
  legacyHeaders  : false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});
app.use(globalLimiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max     : 20,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

// ─── Static Files (uploaded photos) ──────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  res.json({
    success  : true,
    message  : 'Glory Simon Interiors API is running',
    timestamp: new Date().toISOString(),
    version  : '1.0.0',
    env      : process.env.NODE_ENV || 'development',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/slots',         slotRoutes);
app.use('/api/assignments',   assignmentRoutes);
app.use('/api/reports',       reportRoutes);
app.use('/api/dashboard',     dashboardRoutes);
app.use('/api/calendar',      calendarRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai',            aiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // CORS errors
  if (err.message && err.message.startsWith('CORS policy')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'A record with these details already exists.',
    });
  }

  // MySQL foreign key constraint
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      success: false,
      message: 'Cannot delete: this record is referenced by other data.',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An internal server error occurred.',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function ensureAdminExists() {
  try {
    const email = 'admin@glorysimon.com';
    const password = 'Admin@123';
    const hashedPassword = await hashPassword(password);
    
    // Check if the administrator already exists
    const [rows] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      // Create a default administrator (role_id = 1 is Admin)
      await query(
        `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number, is_active, created_at, updated_at)
         VALUES (?, ?, 1, 'Glory Simon', '+919876500001', 1, NOW(), NOW())`,
        [email, hashedPassword]
      );
    } else {
      // Update existing admin's password to Admin@123
      const adminId = rows[0].id;
      await query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [hashedPassword, adminId]
      );
    }

    console.log('Default Administrator');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (err) {
    console.error('Failed to ensure default administrator exists:', err.message);
  }
}

async function startServer() {
  await testConnection();
  await ensureAdminExists();

  app.listen(PORT, () => {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  🏠 Glory Simon Interiors — Booking System API');
    console.log('══════════════════════════════════════════════════');
    console.log(`  🚀 Server   : http://localhost:${PORT}`);
    console.log(`  🩺 Health   : http://localhost:${PORT}/api/health`);
    console.log(`  🌍 Env      : ${process.env.NODE_ENV || 'development'}`);
    console.log('══════════════════════════════════════════════════\n');
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app; // exported for testing
