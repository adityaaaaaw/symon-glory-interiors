const path = require('path');
const dotenv = require('dotenv');
// Load environment variables before importing db configuration
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { randomUUID } = require('crypto');

const { query, initDb } = require('./db');
const { autoAssignProfessional } = require('./utils/assignmentEngine');
const notificationService = require('./utils/mockEmailSms');

// Helper to look up booking by ID, UUID, or Booking Reference String
async function findBooking(identifier, tx = query) {
  if (!identifier) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
  if (isUuid) {
    return await tx.get('SELECT * FROM bookings WHERE uuid = ?', [identifier]);
  }
  if (/^\d+$/.test(identifier)) {
    return await tx.get('SELECT * FROM bookings WHERE id = ?', [parseInt(identifier, 10)]);
  }
  return await tx.get('SELECT * FROM bookings WHERE booking_id_str = ?', [identifier]);
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'glory_simon_secret_key_2026';

// ------------------------------------
// LOGGING HELPER
// ------------------------------------
function logEvent(category, message, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category.toUpperCase()}] ${message}`, Object.keys(details).length ? JSON.stringify(details) : '');
}

// Ensure Uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logEvent('system', 'Uploads directory created successfully.');
}

// ------------------------------------
// SECURITY MIDDLEWARES
// ------------------------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable CSP for clean charts/avatars rendering
}));

app.use(cors({
  origin: '*', // For development flexibility
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// Rate limit definitions
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // stricter limit for login/register
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Initialize Database on startup
initDb().then(() => {
  logEvent('system', 'Glory Simon Interiors Database initialized successfully.');
}).catch((err) => {
  logEvent('error', 'Critical database initialization failure', { error: err.message });
  process.exit(1);
});

// ------------------------------------
// AUTH & MIDDLEWARE LOGIC
// ------------------------------------
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    logEvent('auth', 'Token verification failed', { error: err.message });
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access forbidden. Administrator credentials required.' });
  }
  next();
}

// Helper for timeline logging
async function logActivity(bookingId, activityType, description, tx = query) {
  try {
    await tx.run(
      'INSERT INTO booking_activities (booking_id, activity_type, description) VALUES (?, ?, ?)',
      [bookingId, activityType, description]
    );
  } catch (err) {
    logEvent('error', 'Failed to log booking activity', { bookingId, error: err.message });
  }
}

// Multer storage for report images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, JPG, PNG, and WEBP image uploads are allowed.'));
  }
});

// ------------------------------------
// AUTH ENDPOINTS
// ------------------------------------

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await query.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      logEvent('auth', 'Failed login attempt: User not found', { email });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logEvent('auth', 'Failed login attempt: Incorrect password', { email });
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logEvent('auth', 'User logged in successfully', { email, role: user.role, userId: user.id });

    res.json({
      token,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar
    });
  } catch (err) {
    logEvent('error', 'Auth login error', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Register Client
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body || {};

  const normalizedName = String(name || '').trim();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(0, 10);

  const validationErrors = [];

  if (!normalizedName || normalizedName.length < 2) {
    validationErrors.push({ field: 'name', message: 'Full name is required.' });
  } else if (!/^[A-Za-z\s]+$/.test(normalizedName)) {
    validationErrors.push({ field: 'name', message: 'Only letters and spaces are allowed.' });
  }

  if (!normalizedEmail) {
    validationErrors.push({ field: 'email', message: 'Email address is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    validationErrors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }

  if (!normalizedPhone) {
    validationErrors.push({ field: 'phone', message: 'Phone number is required.' });
  } else if (!/^\d{10}$/.test(normalizedPhone)) {
    validationErrors.push({ field: 'phone', message: 'Phone number must be exactly 10 digits.' });
  }

  if (!password || String(password).length < 8) {
    validationErrors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  } else if (String(password).length > 64) {
    validationErrors.push({ field: 'password', message: 'Password cannot exceed 64 characters.' });
  } else if (!/[A-Z]/.test(String(password))) {
    validationErrors.push({ field: 'password', message: 'Password must contain at least one uppercase letter.' });
  } else if (!/[a-z]/.test(String(password))) {
    validationErrors.push({ field: 'password', message: 'Password must contain at least one lowercase letter.' });
  } else if (!/\d/.test(String(password))) {
    validationErrors.push({ field: 'password', message: 'Password must contain at least one number.' });
  } else if (!/[@$!%*?&#]/.test(String(password))) {
    validationErrors.push({ field: 'password', message: 'Password must contain at least one special character.' });
  }

  if (validationErrors.length > 0) {
    const firstError = validationErrors[0];
    return res.status(422).json({ message: firstError.message, field: firstError.field });
  }

  try {
    const existing = await query.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [normalizedEmail]);
    if (existing) {
      return res.status(400).json({ message: 'Email already exists.', field: 'email' });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(normalizedName)}`;
    const userId = randomUUID();

    const result = await query.run(
      'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, normalizedName, normalizedEmail, hashedPassword, 'client', normalizedPhone, avatarUrl]
    );

    const token = jwt.sign(
      { id: result.id, name: normalizedName, email: normalizedEmail, role: 'client' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    logEvent('auth', 'New client registered', { email: normalizedEmail, userId: result.id });

    res.status(201).json({
      token,
      id: result.id,
      name: normalizedName,
      email: normalizedEmail,
      role: 'client',
      phone: normalizedPhone,
      avatar: avatarUrl
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth register error', {
        message: err.message,
        stack: err.stack,
        body: { name, email, phone }
      });
    }
    logEvent('error', 'Auth register error', { error: err.message });
    res.status(500).json({ message: 'Server error while creating account.', error: process.env.NODE_ENV !== 'production' ? err.message : undefined });
  }
});

// ------------------------------------
// PROFESSIONALS ENDPOINTS (Protected)
// ------------------------------------

// Get all designers and engineers
app.get('/api/professionals', verifyToken, async (req, res) => {
  try {
    const designers = await query.all("SELECT *, 'designer' as role FROM designers");
    const engineers = await query.all("SELECT *, 'engineer' as role FROM site_engineers");
    res.json([...designers, ...engineers]);
  } catch (err) {
    logEvent('error', 'Get professionals failed', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Update availability of a professional
app.patch('/api/professionals/:role/:id/availability', verifyToken, async (req, res) => {
  const { role, id } = req.params;
  const { availability } = req.body; // 'Available', 'Busy', 'On Leave'
  try {
    const table = role === 'designer' ? 'designers' : 'site_engineers';
    await query.run(`UPDATE ${table} SET availability = ? WHERE id = ?`, [availability, id]);
    logEvent('assignment', `Professional availability updated`, { role, id, availability });
    res.json({ message: 'Availability status updated successfully.' });
  } catch (err) {
    logEvent('error', 'Update professional availability failed', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ------------------------------------
// BOOKINGS & WORKFLOW ENDPOINTS (Protected)
// ------------------------------------

// Get Bookings list
app.get('/api/bookings', verifyToken, async (req, res) => {
  const { client_id, role, search, status, date, professional_id, professional_role } = req.query;
  try {
    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    // Clients see only their own bookings
    if (req.user.role === 'client') {
      sql += ' AND client_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'designer') {
      const staff = await query.get('SELECT id FROM designers WHERE email = ?', [req.user.email]);
      if (staff) {
        sql += ' AND assigned_to_id = ? AND assigned_to_role = ?';
        params.push(staff.id, 'designer');
      } else {
        sql += ' AND 1=0';
      }
    } else if (req.user.role === 'engineer') {
      const staff = await query.get('SELECT id FROM site_engineers WHERE email = ?', [req.user.email]);
      if (staff) {
        sql += ' AND assigned_to_id = ? AND assigned_to_role = ?';
        params.push(staff.id, 'engineer');
      } else {
        sql += ' AND 1=0';
      }
    } else if (role !== 'admin' && client_id) {
      sql += ' AND client_id = ?';
      params.push(client_id);
    }

    if (search) {
      sql += ' AND (booking_id_str LIKE ? OR client_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND preferred_date = ?';
      params.push(date);
    }

    if (professional_id) {
      sql += ' AND assigned_to_id = ?';
      params.push(professional_id);
    }
    
    if (professional_role) {
      sql += ' AND assigned_to_role = ?';
      params.push(professional_role);
    }

    sql += ' ORDER BY id DESC';
    const list = await query.all(sql, params);
    res.json(list);
  } catch (err) {
    logEvent('error', 'Get bookings failed', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get booking details
app.get('/api/bookings/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    // Access control
    if (req.user.role === 'client' && booking.client_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    
    // Automatically load and attach media attachments
    const media = await query.all('SELECT * FROM booking_media WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    booking.media = media;
    
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Create Booking & Suggest Auto-Assignment (Transactional)
app.post('/api/bookings', verifyToken, async (req, res) => {
  const { client_id, client_name, phone, email, property_type, address, preferred_date, preferred_slot, notes } = req.body;
  const actualClientId = req.user.role === 'client' ? req.user.id : client_id;

  try {
    const booking = await query.transaction(async (tx) => {
      // 1. Generate unique Booking ID
      const maxRow = await tx.get('SELECT MAX(id) as maxId FROM bookings');
      const nextNum = (maxRow && maxRow.maxId ? maxRow.maxId : 0) + 1;
      const year = new Date().getFullYear();
      const bookingIdStr = `GSI-${year}-${String(nextNum).padStart(4, '0')}`;

      // 2. Run assignment engine
      const assignResult = await autoAssignProfessional({
        property_type,
        address,
        preferred_date,
        preferred_slot
      }, tx);

      const assigned_to_id = assignResult.success ? assignResult.assigned_to : null;
      const assigned_to_role = assignResult.success ? assignResult.assigned_role : null;
      const assignment_reason = assignResult.assignment_reason || 'Placed in waitlist due to schedule overload.';

      // 3. Save booking with 'Pending' status
      const bookingUuid = randomUUID();
      const result = await tx.run(
        `INSERT INTO bookings (uuid, booking_id_str, client_id, client_name, phone, email, property_type, address, preferred_date, preferred_slot, notes, status, assigned_to_id, assigned_to_role, assignment_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingUuid,
          bookingIdStr,
          actualClientId,
          client_name,
          phone,
          email,
          property_type,
          address,
          preferred_date,
          preferred_slot,
          notes || '',
          'Pending',
          assigned_to_id,
          assigned_to_role,
          assignment_reason
        ]
      );

      const bookingId = result.id;

      // 4. Log Timeline activities
      await logActivity(bookingId, 'Booking Created', `Site visit request ${bookingIdStr} submitted by ${client_name}.`, tx);
      
      if (assignResult.success) {
        await logActivity(
          bookingId, 
          'Assignment Suggested', 
          `System recommended assigning ${assignResult.professional.name} (${assigned_to_role === 'designer' ? 'Designer' : 'Site Engineer'}) based on region proximity & workload score.`,
          tx
        );
      } else {
        await logActivity(bookingId, 'Assignment Suggested', 'All professionals are currently busy. Placed in waitlist.', tx);
      }

      // Return generated booking data
      const bObj = await tx.get('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      bObj._suggestedName = assignResult.success ? assignResult.professional.name : null;
      return bObj;
    });

    logEvent('booking', 'Booking created successfully', { bookingId: booking.id, bookingIdStr: booking.booking_id_str });

    // Trigger notification (outside transaction so failure doesn't rollback db state)
    await notificationService.notifyBookingCreated(booking, booking._suggestedName);

    res.status(201).json(booking);
  } catch (err) {
    logEvent('error', 'Booking creation failed', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Admin Confirm/Override Professional Assignment (Transactional)
app.patch('/api/bookings/:id/assign', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { assigned_to_id, assigned_to_role, reason } = req.body;
  try {
    const updatedBooking = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Decrement workload of previous professional if active
      if (booking.status !== 'Pending' && booking.assigned_to_id) {
        const prevTable = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
        await tx.run(`UPDATE ${prevTable} SET workload = GREATEST(0, workload - 1) WHERE id = ?`, [booking.assigned_to_id]);
      }

      // Fetch new professional details
      const table = assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
      const prof = await tx.get(`SELECT * FROM ${table} WHERE id = ?`, [assigned_to_id]);
      if (!prof) {
        throw new Error('Selected professional not found.');
      }

      // Enforce Availability Policy
      if (prof.availability !== 'Available') {
        throw new Error(`Scheduling conflict! ${prof.name} is currently ${prof.availability} and cannot be assigned.`);
      }

      // Enforce Calendar Scheduling Conflict Policy
      const conflict = await tx.get(
        'SELECT booking_id_str FROM bookings WHERE assigned_to_id = ? AND assigned_to_role = ? AND preferred_date = ? AND preferred_slot = ? AND status NOT IN ("Cancelled") AND id != ?',
        [assigned_to_id, assigned_to_role, booking.preferred_date, booking.preferred_slot, booking.id]
      );
      if (conflict) {
        throw new Error(`Scheduling conflict! ${prof.name} is already assigned to another site visit (${conflict.booking_id_str}) during the ${booking.preferred_slot} slot on ${booking.preferred_date}.`);
      }

      const finalReason = reason || `Manually assigned by Administrator: ${prof.name} selected as lead ${assigned_to_role === 'designer' ? 'Designer' : 'Site Engineer'}.`;

      // Update booking to 'Assigned' status
      await tx.run(
        'UPDATE bookings SET assigned_to_id = ?, assigned_to_role = ?, assignment_reason = ?, status = ? WHERE id = ?',
        [assigned_to_id, assigned_to_role, finalReason, 'Assigned', booking.id]
      );

      // Increment workload of new professional
      await tx.run(`UPDATE ${table} SET workload = workload + 1 WHERE id = ?`, [assigned_to_id]);

      // Save to Assignments table
      await tx.run(
        'INSERT INTO assignments (booking_id, professional_id, professional_role, reason) VALUES (?, ?, ?, ?)',
        [booking.id, assigned_to_id, assigned_to_role, finalReason]
      );

      // Log Activity
      await logActivity(booking.id, 'Assignment Confirmed', `Assignment confirmed for ${prof.name} (${assigned_to_role === 'designer' ? 'Designer' : 'Site Engineer'}).`, tx);

      const updated = await tx.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      updated._oldStatus = booking.status;
      updated._profName = prof.name;
      return updated;
    });

    logEvent('assignment', 'Staff assigned to booking successfully', { bookingId: updatedBooking.id, staffId: assigned_to_id, role: assigned_to_role });

    // Send notifications
    await notificationService.notifyStatusChanged(updatedBooking, updatedBooking._oldStatus, 'Assigned');

    res.json({ message: 'Professional assigned successfully.', booking: updatedBooking });
  } catch (err) {
    logEvent('error', 'Staff assignment transaction failed', { bookingId: id, error: err.message });
    res.status(400).json({ message: err.message });
  }
});

// Update Booking Status Workflow
app.patch('/api/bookings/:id/status', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Pending', 'Assigned', 'Scheduled', 'Visit Completed', 'Cancelled'
  try {
    const updateDetails = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const oldStatus = booking.status;
      await tx.run('UPDATE bookings SET status = ? WHERE id = ?', [status, booking.id]);

      if (status === 'Scheduled') {
        await logActivity(booking.id, 'Visit Scheduled', `Site visit scheduled for ${booking.preferred_date} during slot ${booking.preferred_slot}.`, tx);
      } 
      
      else if (status === 'Visit Completed') {
        const profTable = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
        const prof = await tx.get(`SELECT name FROM ${profTable} WHERE id = ?`, [booking.assigned_to_id]);
        const profName = prof ? prof.name : 'our expert';

        const summary = `Site visit conducted successfully by ${profName} at the ${booking.client_name} ${booking.property_type} project located in ${booking.address.split(',')[2] || 'site address'}. Mapped spatial dimensions and vertical profiles.`;
        const recs = `1. Recommend space-saving layout to optimize custom footprints.\n2. Leverage natural lighting profiles.\n3. Incorporate minimalist theme profiles.`;
        const followUps = `Draft layout designs on client portal. Set up briefing call on dashboard.`;

        const reportUuid = randomUUID();
        // Save visit report
        await tx.run(
          'INSERT INTO visit_reports (uuid, booking_id, summary, recommendations, follow_ups) VALUES (?, ?, ?, ?, ?)',
          [reportUuid, booking.id, summary, recs, followUps]
        );

        await logActivity(booking.id, 'Visit Completed', `Inspection visit completed by ${profName}.`, tx);
        await logActivity(booking.id, 'Report Generated', 'Intelligent Visit Report compiled and uploaded to client portal.', tx);

        // Decrement professional workload
        if (booking.assigned_to_id) {
          await tx.run(`UPDATE ${profTable} SET workload = GREATEST(0, workload - 1) WHERE id = ?`, [booking.assigned_to_id]);
        }
        
        booking._profName = profName;
      } 
      
      else if (status === 'Cancelled') {
        await logActivity(booking.id, 'Cancelled', 'Booking cancelled by administrator/client. Released professional slots.', tx);
        
        // Decrement workload
        if (oldStatus !== 'Pending' && booking.assigned_to_id) {
          const table = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
          await tx.run(`UPDATE ${table} SET workload = GREATEST(0, workload - 1) WHERE id = ?`, [booking.assigned_to_id]);
        }
      }

      const updatedBooking = await tx.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      return { booking: updatedBooking, oldStatus, profName: booking._profName };
    });

    logEvent('booking', 'Booking status updated successfully', { bookingId: updateDetails.booking.id, oldStatus: updateDetails.oldStatus, newStatus: status });

    // Send notifications
    if (status === 'Visit Completed') {
      await notificationService.notifyReportGenerated(updateDetails.booking, updateDetails.profName);
    } else {
      await notificationService.notifyStatusChanged(updateDetails.booking, updateDetails.oldStatus, status);
    }

    res.json({ message: 'Booking status updated successfully.' });
  } catch (err) {
    logEvent('error', 'Status update failed', { bookingId: id, error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Cancel Booking Endpoint
app.patch('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) {
        throw new Error('Booking not found');
      }

      // Clients can only cancel their own bookings
      if (req.user.role === 'client' && booking.client_id !== req.user.id) {
        throw new Error('Access denied. Unauthorized to cancel this booking.');
      }

      if (booking.status === 'Cancelled') {
        return { booking, oldStatus: 'Cancelled', alreadyCancelled: true };
      }

      const oldStatus = booking.status;
      await tx.run("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [booking.id]);
      await logActivity(booking.id, 'Cancelled', `Booking cancelled by ${req.user.role === 'admin' ? 'administrator' : 'client'}. Slots released.`, tx);

      // Decrement professional workload if assigned
      if (oldStatus !== 'Pending' && booking.assigned_to_id) {
        const table = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
        await tx.run(`UPDATE ${table} SET workload = GREATEST(0, workload - 1) WHERE id = ?`, [booking.assigned_to_id]);
      }

      const updatedBooking = await tx.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      return { booking: updatedBooking, oldStatus };
    });

    logEvent('booking', 'Booking cancelled', { bookingId: result.booking.id, userId: req.user.id });

    if (!result.alreadyCancelled) {
      await notificationService.notifyStatusChanged(result.booking, result.oldStatus, 'Cancelled');
    }

    res.json({ message: 'Booking cancelled successfully.' });
  } catch (err) {
    logEvent('error', 'Cancel booking failed', { bookingId: id, error: err.message });
    res.status(400).json({ message: err.message });
  }
});

// Reschedule Booking Endpoint (with Slot Conflict Protection)
app.patch('/api/bookings/:id/reschedule', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { preferred_date, preferred_slot } = req.body;
  try {
    const result = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) {
        throw new Error('Booking not found');
      }

      if (req.user.role === 'client' && booking.client_id !== req.user.id) {
        throw new Error('Access denied. Unauthorized to reschedule this booking.');
      }

      // Check slot conflict if staff is already assigned
      if (booking.assigned_to_id) {
        const table = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
        const prof = await tx.get(`SELECT name FROM ${table} WHERE id = ?`, [booking.assigned_to_id]);
        
        const conflict = await tx.get(
          'SELECT booking_id_str FROM bookings WHERE assigned_to_id = ? AND assigned_to_role = ? AND preferred_date = ? AND preferred_slot = ? AND status NOT IN ("Cancelled") AND id != ?',
          [booking.assigned_to_id, booking.assigned_to_role, preferred_date, preferred_slot, booking.id]
        );

        if (conflict) {
          throw new Error(`Rescheduling conflict! ${prof ? prof.name : 'The assigned expert'} is already scheduled for another visit (${conflict.booking_id_str}) on ${preferred_date} during the ${preferred_slot} slot.`);
        }
      }

      const oldDate = booking.preferred_date;
      const oldSlot = booking.preferred_slot;

      // Update booking date & slot
      await tx.run(
        'UPDATE bookings SET preferred_date = ?, preferred_slot = ? WHERE id = ?',
        [preferred_date, preferred_slot, booking.id]
      );

      // Log timeline activity
      await logActivity(booking.id, 'Booking Rescheduled', `Rescheduled from ${oldDate} (${oldSlot}) to ${preferred_date} (${preferred_slot}).`, tx);

      const updated = await tx.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      return { booking: updated, oldDate, oldSlot };
    });

    logEvent('booking', 'Booking rescheduled successfully', { bookingId: result.booking.id, newDate: preferred_date, newSlot: preferred_slot });

    await notificationService.notifyStatusChanged(result.booking, `Scheduled at ${result.oldDate}`, `Rescheduled to ${preferred_date} (${preferred_slot})`);

    res.json({ message: 'Booking rescheduled successfully.', booking: result.booking });
  } catch (err) {
    logEvent('error', 'Reschedule booking failed', { bookingId: id, error: err.message });
    res.status(400).json({ message: err.message });
  }
});

// Submit Visit Report with Image Upload (Transactional & File Safe)
app.post('/api/bookings/:id/report', verifyToken, upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { summary, recommendations, follow_ups, material_suggestions } = req.body;
  
  if (!summary) {
    if (req.file) fs.unlinkSync(req.file.path); // clean uploaded file
    return res.status(400).json({ message: 'Summary is required to submit visit report.' });
  }

  try {
    const reportDetails = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) {
        throw new Error('Booking not found');
      }

      const existingReport = await tx.get('SELECT id FROM visit_reports WHERE booking_id = ?', [booking.id]);
      if (existingReport) {
        throw new Error('A visit report has already been submitted for this booking.');
      }

      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
      const reportUuid = randomUUID();

      // Save report
      await tx.run(
        'INSERT INTO visit_reports (uuid, booking_id, summary, recommendations, follow_ups, material_suggestions, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [reportUuid, booking.id, summary, recommendations || '', follow_ups || '', material_suggestions || '', imagePath]
      );

      // Complete booking status: move to 'Site Visit Completed'
      await tx.run("UPDATE bookings SET status = 'Site Visit Completed' WHERE id = ?", [booking.id]);

      // Release workload
      if (booking.assigned_to_id) {
        const table = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
        await tx.run(`UPDATE ${table} SET workload = GREATEST(0, workload - 1) WHERE id = ?`, [booking.assigned_to_id]);
      }

      // Log Activities
      await logActivity(booking.id, 'Visit Completed', 'Site inspection completed and report submitted.', tx);
      await logActivity(booking.id, 'Report Generated', 'Intelligent Visit Report compiled and uploaded to client portal.', tx);

      const updated = await tx.get('SELECT * FROM bookings WHERE id = ?', [booking.id]);
      const repObj = await tx.get('SELECT * FROM visit_reports WHERE booking_id = ?', [booking.id]);
      
      return { booking: updated, report: repObj };
    });

    logEvent('report', 'Visit report submitted successfully', { bookingId: reportDetails.booking.id, reportId: reportDetails.report.id });

    // Notify client
    const profTable = reportDetails.booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
    const prof = await query.get(`SELECT name FROM ${profTable} WHERE id = ?`, [reportDetails.booking.assigned_to_id]);
    const profName = prof ? prof.name : 'our expert';
    await notificationService.notifyReportGenerated(reportDetails.booking, profName);

    res.status(201).json({ message: 'Visit report submitted successfully.', report: reportDetails.report });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path); // clean uploaded file on error rollback
    logEvent('error', 'Visit report submission failed', { bookingId: id, error: err.message });
    res.status(400).json({ message: err.message });
  }
});

// Get Visit Report
app.get('/api/bookings/:id/report', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const report = await query.get('SELECT * FROM visit_reports WHERE booking_id = ?', [booking.id]);
    res.json(report || null);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get Timeline Activities for booking
app.get('/api/bookings/:id/activities', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const list = await query.all('SELECT * FROM booking_activities WHERE booking_id = ? ORDER BY id ASC', [booking.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get Assignment History for booking
app.get('/api/bookings/:id/assignments', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const list = await query.all(`
      SELECT a.*, 
             CASE WHEN a.professional_role = 'designer' THEN d.name ELSE se.name END as professional_name
      FROM assignments a
      LEFT JOIN designers d ON a.professional_role = 'designer' AND a.professional_id = d.id
      LEFT JOIN site_engineers se ON a.professional_role = 'engineer' AND a.professional_id = se.id
      WHERE a.booking_id = ? 
      ORDER BY a.id DESC
    `, [booking.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ------------------------------------
// NOTIFICATIONS CENTER
// ------------------------------------

// Get user notifications
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    let list;
    if (req.user.role === 'client') {
      list = await query.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [req.user.id]);
    } else {
      list = await query.all('SELECT * FROM notifications ORDER BY id DESC LIMIT 50');
    }
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Mark notification as read
app.patch('/api/notifications/:id/read', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// ------------------------------------
// ADMIN DASHBOARD STATS & CRUDS
// ------------------------------------

app.get('/api/dashboard/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const totalRow = await query.get('SELECT COUNT(*) as count FROM bookings');
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRow = await query.get('SELECT COUNT(*) as count FROM bookings WHERE preferred_date = ? AND status != "Cancelled"', [todayStr]);
    const pendingRow = await query.get('SELECT COUNT(*) as count FROM bookings WHERE status = "Pending"');
    const completedRow = await query.get('SELECT COUNT(*) as count FROM bookings WHERE status = "Visit Completed"');
    const cancelledRow = await query.get('SELECT COUNT(*) as count FROM bookings WHERE status = "Cancelled"');

    // Chart analytics data (monthly trend of visits)
    // We group by month formatted cleanly
    const trendDataRaw = await query.all(`
      SELECT DATE_FORMAT(preferred_date, '%b %Y') as month, COUNT(*) as visits 
      FROM bookings 
      WHERE status != 'Cancelled' 
      GROUP BY DATE_FORMAT(preferred_date, '%b %Y'), DATE_FORMAT(preferred_date, '%Y-%m')
      ORDER BY DATE_FORMAT(preferred_date, '%Y-%m') ASC
      LIMIT 6
    `);
    
    const trend = trendDataRaw.map(t => ({
      name: t.month,
      Visits: t.visits
    }));

    const propBreakdown = await query.all('SELECT property_type, COUNT(*) as count FROM bookings GROUP BY property_type');

    res.json({
      total: totalRow ? totalRow.count : 0,
      today: todayRow ? todayRow.count : 0,
      pending: pendingRow ? pendingRow.count : 0,
      completed: completedRow ? completedRow.count : 0,
      cancelled: cancelledRow ? cancelledRow.count : 0,
      trend,
      propBreakdown
    });
  } catch (err) {
    logEvent('error', 'Get dashboard stats failed', { error: err.message });
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Diagnostics Endpoint
app.get('/api/admin/diagnostics', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userCount = await query.get('SELECT COUNT(*) as count FROM users');
    const bookingCount = await query.get('SELECT COUNT(*) as count FROM bookings');
    const designerCount = await query.get('SELECT COUNT(*) as count FROM designers');
    const engineerCount = await query.get('SELECT COUNT(*) as count FROM site_engineers');
    
    const tables = ['users', 'designers', 'site_engineers', 'bookings', 'assignments', 'visit_reports', 'notifications', 'booking_activities'];
    const tableCounts = [];
    for (const t of tables) {
      const row = await query.get(`SELECT COUNT(*) as count FROM ${t}`);
      tableCounts.push({ tableName: t, rowCount: row ? row.count : 0 });
    }

    const recentBookings = await query.all('SELECT id, booking_id_str, client_name, email, phone, status, created_at FROM bookings ORDER BY id DESC LIMIT 10');
    const recentUsers = await query.all('SELECT id, name, email, role, phone, created_at FROM users ORDER BY id DESC LIMIT 10');

    res.json({
      activeDatabase: 'MYSQL',
      totalUsers: userCount ? userCount.count : 0,
      totalBookings: bookingCount ? bookingCount.count : 0,
      totalDesigners: designerCount ? designerCount.count : 0,
      totalEngineers: engineerCount ? engineerCount.count : 0,
      tableCounts,
      recentBookings,
      recentUsers
    });
  } catch (err) {
    logEvent('error', 'Diagnostics failed', { error: err.message });
    res.status(500).json({ message: 'Diagnostics query failed.', error: err.message });
  }
});

// Database Summary API
app.get('/api/admin/database/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const userCount = await query.get('SELECT COUNT(*) as count FROM users');
    const bookingCount = await query.get('SELECT COUNT(*) as count FROM bookings');
    const designerCount = await query.get('SELECT COUNT(*) as count FROM designers');
    const engineerCount = await query.get('SELECT COUNT(*) as count FROM site_engineers');
    const assignmentCount = await query.get('SELECT COUNT(*) as count FROM assignments');
    const reportCount = await query.get('SELECT COUNT(*) as count FROM visit_reports');
    const notificationCount = await query.get('SELECT COUNT(*) as count FROM notifications');

    res.json({
      activeDatabase: 'MYSQL',
      totalUsers: userCount ? userCount.count : 0,
      totalBookings: bookingCount ? bookingCount.count : 0,
      totalDesigners: designerCount ? designerCount.count : 0,
      totalEngineers: engineerCount ? engineerCount.count : 0,
      totalAssignments: assignmentCount ? assignmentCount.count : 0,
      totalReports: reportCount ? reportCount.count : 0,
      totalNotifications: notificationCount ? notificationCount.count : 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Summary query failed.', error: err.message });
  }
});

// Database Explorer Table APIs
app.get('/api/admin/database/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM users ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying users.', error: err.message });
  }
});

app.get('/api/admin/database/bookings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM bookings ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying bookings.', error: err.message });
  }
});

app.get('/api/admin/database/designers', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM designers ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying designers.', error: err.message });
  }
});

app.get('/api/admin/database/site-engineers', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM site_engineers ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying site-engineers.', error: err.message });
  }
});

app.get('/api/admin/database/assignments', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM assignments ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying assignments.', error: err.message });
  }
});

app.get('/api/admin/database/visit-reports', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM visit_reports ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying visit-reports.', error: err.message });
  }
});

app.get('/api/admin/database/notifications', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM notifications ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying notifications.', error: err.message });
  }
});

app.get('/api/admin/database/booking-activities', verifyToken, requireAdmin, async (req, res) => {
  try {
    const data = await query.all('SELECT * FROM booking_activities ORDER BY id DESC');
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error querying booking-activities.', error: err.message });
  }
});

// Staff CRUD: Designers
app.post('/api/admin/designers', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, phone, region, experience, availability } = req.body;
  try {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const result = await query.run(
      'INSERT INTO designers (name, email, phone, avatar, region, experience, availability) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || '', avatarUrl, region || '', experience || 0, availability || 'Available']
    );
    logEvent('assignment', 'New Designer added to database', { name, email });
    res.status(201).json({ id: result.id, name, email, phone, region, experience, availability, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create designer.', error: err.message });
  }
});

app.put('/api/admin/designers/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, region, experience, availability } = req.body;
  try {
    await query.run(
      'UPDATE designers SET name = ?, email = ?, phone = ?, region = ?, experience = ?, availability = ? WHERE id = ?',
      [name, email, phone, region, experience, availability, id]
    );
    logEvent('assignment', 'Designer details updated', { id, name });
    res.json({ message: 'Designer details updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update designer.', error: err.message });
  }
});

app.delete('/api/admin/designers/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM designers WHERE id = ?', [id]);
    logEvent('assignment', 'Designer deleted from database', { id });
    res.json({ message: 'Designer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete designer.', error: err.message });
  }
});

// Staff CRUD: Site Engineers
app.post('/api/admin/engineers', verifyToken, requireAdmin, async (req, res) => {
  const { name, email, phone, region, experience, availability } = req.body;
  try {
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
    const result = await query.run(
      'INSERT INTO site_engineers (name, email, phone, avatar, region, experience, availability) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone || '', avatarUrl, region || '', experience || 0, availability || 'Available']
    );
    logEvent('assignment', 'New Site Engineer added to database', { name, email });
    res.status(201).json({ id: result.id, name, email, phone, region, experience, availability, avatar: avatarUrl });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create engineer.', error: err.message });
  }
});

app.put('/api/admin/engineers/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, region, experience, availability } = req.body;
  try {
    await query.run(
      'UPDATE site_engineers SET name = ?, email = ?, phone = ?, region = ?, experience = ?, availability = ? WHERE id = ?',
      [name, email, phone, region, experience, availability, id]
    );
    logEvent('assignment', 'Site Engineer details updated', { id, name });
    res.json({ message: 'Site Engineer details updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update engineer.', error: err.message });
  }
});

app.delete('/api/admin/engineers/:id', verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM site_engineers WHERE id = ?', [id]);
    logEvent('assignment', 'Site Engineer deleted from database', { id });
    res.json({ message: 'Site Engineer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete engineer.', error: err.message });
  }
});

// ------------------------------------
// EXPORTS & REPORTS DOWNLOADS
// ------------------------------------

app.get('/api/reports/csv', async (req, res) => {
  try {
    const list = await query.all('SELECT booking_id_str, client_name, phone, email, property_type, address, preferred_date, preferred_slot, status FROM bookings ORDER BY id DESC');
    
    let csv = 'Booking ID,Client Name,Phone,Email,Property Type,Address,Preferred Date,Slot,Status\n';
    list.forEach(b => {
      csv += `"${b.booking_id_str}","${b.client_name}","${b.phone}","${b.email}","${b.property_type}","${b.address.replace(/"/g, '""')}","${b.preferred_date}","${b.preferred_slot}","${b.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings_report.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).send('Server error generating CSV report.');
  }
});

app.get('/api/reports/pdf/:bookingId', async (req, res) => {
  const { bookingId } = req.params;
  try {
    const booking = await findBooking(bookingId);
    if (!booking) {
      return res.status(404).send('Booking not found.');
    }
    const report = await query.get('SELECT * FROM visit_reports WHERE booking_id = ?', [booking.id]);
    if (!report) {
      return res.status(404).send('Inspection report not found.');
    }

    let professionalDetails = null;
    if (booking.assigned_to_id) {
      const table = booking.assigned_to_role === 'designer' ? 'designers' : 'site_engineers';
      professionalDetails = await query.get(`SELECT * FROM ${table} WHERE id = ?`, [booking.assigned_to_id]);
    }

    const htmlPdf = `
      <html>
      <head>
        <title>Glory Simon Interiors - Site Inspection Report</title>
        <style>
          body { font-family: 'Inter', sans-serif; color: #1E293B; margin: 40px; line-height: 1.6; }
          .header { border-bottom: 2px solid #D4A017; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: justify; }
          .logo { font-size: 24px; font-weight: bold; color: #1E293B; }
          .title { font-size: 22px; font-weight: bold; text-transform: uppercase; color: #D4A017; text-align: right; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .meta-table td { padding: 8px 12px; border: 1px solid #E5E7EB; font-size: 12px; vertical-align: top; }
          .meta-table td.label { font-weight: bold; background-color: #FAFAFA; width: 22%; }
          .section { margin-bottom: 25px; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #1E293B; margin-bottom: 10px; border-bottom: 1px solid #E5E7EB; padding-bottom: 5px; }
          .section-body { font-size: 12px; color: #475569; }
          .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #94A3B8; border-top: 1px solid #E5E7EB; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Glory Simon <span style="color:#D4A017">Interiors</span></div>
          <div class="title">Site Inspection Report</div>
        </div>
        <table class="meta-table">
          <tr>
            <td class="label">Booking ID</td>
            <td colspan="3"><strong>${booking.booking_id_str}</strong></td>
          </tr>
          <tr>
            <td class="label">Client Name</td>
            <td>${booking.client_name}</td>
            <td class="label">Client Contact Details</td>
            <td>
              Email: ${booking.email}<br/>
              Phone: ${booking.phone}
            </td>
          </tr>
          <tr>
            <td class="label">Property Type</td>
            <td>${booking.property_type}</td>
            <td class="label">Site Visit Address</td>
            <td>${booking.address}</td>
          </tr>
          <tr>
            <td class="label">Assigned Professional</td>
            <td>
              ${professionalDetails 
                ? `<strong>${professionalDetails.name}</strong><br/>Role: ${booking.assigned_to_role === 'designer' ? 'Interior Designer' : 'Site Engineer'}` 
                : 'Unassigned'}
            </td>
            <td class="label">Professional Contact</td>
            <td>
              ${professionalDetails 
                ? `Email: ${professionalDetails.email}<br/>Phone: ${professionalDetails.phone || 'N/A'}` 
                : 'N/A'}
            </td>
          </tr>
          <tr>
            <td class="label">Inspection Date</td>
            <td>${booking.preferred_date}</td>
            <td class="label">Preferred Slot</td>
            <td>${booking.preferred_slot}</td>
          </tr>
        </table>

        <div class="section">
          <div class="section-title">1. Visit Summary</div>
          <div class="section-body">${report.summary}</div>
        </div>

        <div class="section">
          <div class="section-title">2. Recommendations</div>
          <div class="section-body" style="white-space: pre-line;">${report.recommendations}</div>
        </div>

        <div class="section">
          <div class="section-title">3. Follow-up Actions</div>
          <div class="section-body" style="white-space: pre-line;">${report.follow_ups}</div>
        </div>

        ${report.image_path ? `
        <div class="section">
          <div class="section-title">4. Site Inspection Photo</div>
          <div class="section-body">
            <img src="http://localhost:5000${report.image_path}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #E5E7EB; margin-top: 10px;" />
          </div>
        </div>
        ` : ''}

        <div class="footer">
          &copy; ${new Date().getFullYear()} Glory Simon Interiors. All Rights Reserved. Prepared under GSI site inspection standards.
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=Report_${booking.booking_id_str}.html`);
    res.send(htmlPdf);
  } catch (err) {
    res.status(500).send('Server error generating report.');
  }
});

// ------------------------------------
// NEW SAAS ROUTING ADDITIONS: QUOTATIONS, MEDIA, NOTES, TASKS
// ------------------------------------

// Create/Send Quotation
app.post('/api/bookings/:id/quotation', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { subtotal, discount, gst, tax, grand_total, items } = req.body;
  
  if (!subtotal || !grand_total || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Quotation details and items are required.' });
  }

  try {
    const result = await query.transaction(async (tx) => {
      const booking = await findBooking(id, tx);
      if (!booking) throw new Error('Booking not found.');

      // Check if quotation already exists for this booking
      const existingQuotation = await tx.get('SELECT id FROM quotations WHERE booking_id = ?', [booking.id]);
      if (existingQuotation) {
        throw new Error('A quotation already exists for this booking.');
      }

      const quotationUuid = randomUUID();
      const qRes = await tx.run(
        'INSERT INTO quotations (uuid, booking_id, subtotal, discount, gst, tax, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [quotationUuid, booking.id, subtotal, discount || 0.0, gst || 18.0, tax || 0.0, grand_total, 'Pending']
      );

      const quotationId = qRes.id;

      for (const item of items) {
        const itemAmount = item.qty * item.unit_price;
        await tx.run(
          'INSERT INTO quotation_items (quotation_id, description, qty, unit_price, amount) VALUES (?, ?, ?, ?, ?)',
          [quotationId, item.description, item.qty, item.unit_price, itemAmount]
        );
      }

      // Update booking status to 'Quotation Sent'
      await tx.run('UPDATE bookings SET status = "Quotation Sent" WHERE id = ?', [booking.id]);
      await logActivity(booking.id, 'Quotation Dispatched', `Quotation GSI-Q-${quotationId} totaling INR ${grand_total} generated and sent to client.`, tx);

      // Notify Client
      const updatedBooking = { ...booking, status: 'Quotation Sent' };
      await notificationService.notifyStatusChanged(updatedBooking, booking.status, 'Quotation Sent');

      return { id: quotationId, uuid: quotationUuid, booking_id: booking.id, subtotal, discount, gst, tax, grand_total, status: 'Pending' };
    });

    res.status(201).json(result);
  } catch (err) {
    logEvent('error', 'Create quotation failed', { bookingId: id, error: err.message });
    res.status(400).json({ message: err.message });
  }
});

// Get Quotation for a booking
app.get('/api/bookings/:id/quotation', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    const quotation = await query.get('SELECT * FROM quotations WHERE booking_id = ?', [booking.id]);
    if (!quotation) return res.json(null);

    const items = await query.all('SELECT * FROM quotation_items WHERE quotation_id = ?', [quotation.id]);
    res.json({ ...quotation, items });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Update Quotation Status (Approve/Reject)
app.patch('/api/quotations/:uuid/status', verifyToken, async (req, res) => {
  const { uuid } = req.params;
  const { status, reason } = req.body; // 'Approved', 'Rejected'
  
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid quotation status.' });
  }

  try {
    const result = await query.transaction(async (tx) => {
      const quotation = await tx.get('SELECT * FROM quotations WHERE uuid = ?', [uuid]);
      if (!quotation) throw new Error('Quotation not found.');

      await tx.run('UPDATE quotations SET status = ?, reason = ? WHERE id = ?', [status, reason || null, quotation.id]);

      const booking = await tx.get('SELECT * FROM bookings WHERE id = ?', [quotation.booking_id]);
      if (booking) {
        const nextStatus = status === 'Approved' ? 'Quotation Approved' : 'Cancelled';
        await tx.run('UPDATE bookings SET status = ? WHERE id = ?', [nextStatus, booking.id]);
        await logActivity(booking.id, `Quotation ${status}`, `Quotation GSI-Q-${quotation.id} has been ${status.toLowerCase()} by the client.${reason ? ' Reason: ' + reason : ''}`, tx);

        // Notify
        const updatedBooking = { ...booking, status: nextStatus };
        await notificationService.notifyStatusChanged(updatedBooking, booking.status, nextStatus);
      }

      return quotation;
    });

    res.json({ message: `Quotation updated to ${status}.`, quotation: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Upload reference files
app.post('/api/bookings/:id/media', verifyToken, upload.array('media', 5), async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const uploadedMedia = [];
    await query.transaction(async (tx) => {
      for (const file of req.files) {
        const fileUrl = `/uploads/${file.filename}`;
        const resDb = await tx.run(
          'INSERT INTO booking_media (booking_id, file_name, file_url, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
          [booking.id, file.originalname, fileUrl, file.size, file.mimetype]
        );
        uploadedMedia.push({
          id: resDb.id,
          booking_id: booking.id,
          file_name: file.originalname,
          file_url: fileUrl,
          file_size: file.size,
          mime_type: file.mimetype
        });
      }
      await logActivity(booking.id, 'Media Uploaded', `${req.files.length} design reference files uploaded.`, tx);
    });

    res.status(201).json(uploadedMedia);
  } catch (err) {
    if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
    res.status(500).json({ message: 'Failed to upload media.', error: err.message });
  }
});

// Get Media for a booking
app.get('/api/bookings/:id/media', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const media = await query.all('SELECT * FROM booking_media WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    res.json(media);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get Notes
app.get('/api/bookings/:id/notes', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const notes = await query.all('SELECT * FROM booking_notes WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Add Note
app.post('/api/bookings/:id/notes', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { note_text } = req.body;
  if (!note_text) return res.status(400).json({ message: 'Note text is required.' });
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const author_name = req.user.name || 'Staff';
    const result = await query.run(
      'INSERT INTO booking_notes (booking_id, author_name, note_text) VALUES (?, ?, ?)',
      [booking.id, author_name, note_text]
    );
    await logActivity(booking.id, 'Note Added', `Internal note added by ${author_name}.`);
    res.status(201).json({ id: result.id, booking_id: booking.id, author_name, note_text, created_at: new Date() });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get CRM Tasks
app.get('/api/bookings/:id/tasks', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const tasks = await query.all('SELECT * FROM crm_tasks WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Add CRM Task
app.post('/api/bookings/:id/tasks', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, due_date, assigned_to_id } = req.body;
  if (!title || !due_date) return res.status(400).json({ message: 'Title and due date are required.' });
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const result = await query.run(
      'INSERT INTO crm_tasks (booking_id, title, due_date, status, assigned_to_id) VALUES (?, ?, ?, ?, ?)',
      [booking.id, title, due_date, 'Pending', assigned_to_id || null]
    );
    await logActivity(booking.id, 'Task Created', `CRM Task "${title}" scheduled for ${due_date}.`);
    res.status(201).json({ id: result.id, booking_id: booking.id, title, due_date, status: 'Pending', assigned_to_id });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Update Task Status
app.patch('/api/tasks/:taskId', verifyToken, async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    const task = await query.get('SELECT * FROM crm_tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    await query.run('UPDATE crm_tasks SET status = ? WHERE id = ?', [status, taskId]);
    await logActivity(task.booking_id, 'Task Updated', `CRM Task "${task.title}" marked as ${status.toLowerCase()}.`);
    res.json({ message: 'Task updated successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Get Communications History
app.get('/api/bookings/:id/communications', verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await findBooking(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    const list = await query.all('SELECT * FROM communication_history WHERE booking_id = ? ORDER BY id DESC', [booking.id]);
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  logEvent('system', `Glory Simon Interiors API server running on port ${PORT}`);
});


