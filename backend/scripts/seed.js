/**
 * Glory Simon Interiors - Site Visit Booking System
 * Database Seeder Script
 *
 * Generates realistic seed data with properly bcrypt-hashed passwords.
 *
 * Usage:
 *   npm run seed
 *
 * Default credentials after seeding:
 *   Admin:          admin@glorysimon.com         / Admin@Glory123
 *   Designer 1:     priya.design@glorysimon.com  / Glory@123
 *   Designer 2:     karthik.design@glorysimon.com / Glory@123
 *   Designer 3:     sneha.design@glorysimon.com  / Glory@123
 *   Engineer 1:     raj.engineer@glorysimon.com  / Glory@123
 *   Engineer 2:     anand.engineer@glorysimon.com / Glory@123
 *   Engineer 3:     divya.engineer@glorysimon.com / Glory@123
 *   Clients:        client01@gmail.com ... client10@gmail.com / Client@123
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');

// ─── Database Connection ──────────────────────────────────────────────────────
async function getConnection() {
  return mysql.createConnection({
    host     : process.env.DB_HOST     || 'localhost',
    port     : parseInt(process.env.DB_PORT || '3306', 10),
    user     : process.env.DB_USER     || 'root',
    password : process.env.DB_PASSWORD || '',
    database : process.env.DB_NAME     || 'glory_simon_booking',
    multipleStatements: true,
  });
}

// ─── Helper: hash password ────────────────────────────────────────────────────
async function hash(plain) {
  return bcrypt.hash(plain, 10);
}

// ─── Helper: random date between two dates ───────────────────────────────────
function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

// ─── Helper: random item from array ─────────────────────────────────────────
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main Seeder ─────────────────────────────────────────────────────────────
async function seed() {
  const conn = await getConnection();

  console.log('\n🌱 Glory Simon Interiors — Database Seeder Started\n');

  try {
    await conn.execute('SET FOREIGN_KEY_CHECKS = 0');

    // ── Clear existing data (preserve roles and project_types) ────────────────
    const tablesToClear = [
      'quotations', 'followups', 'activity_logs', 'notifications',
      'site_photos', 'measurements', 'visit_reports',
      'assignments', 'bookings', 'slots',
      'site_engineers', 'designers', 'clients', 'users',
    ];
    for (const table of tablesToClear) {
      await conn.execute(`TRUNCATE TABLE ${table}`);
    }
    console.log('✅ Cleared existing seed data');

    await conn.execute('SET FOREIGN_KEY_CHECKS = 1');

    // ── Hash passwords ────────────────────────────────────────────────────────
    const adminPass    = await hash('Admin@Glory123');
    const staffPass    = await hash('Glory@123');
    const clientPass   = await hash('Client@123');

    // ─────────────────────────────────────────────────────────────────────────
    // USERS — Admin (role_id = 1)
    // ─────────────────────────────────────────────────────────────────────────
    const [adminResult] = await conn.execute(
      `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number) VALUES (?, ?, 1, ?, ?)`,
      ['admin@glorysimon.com', adminPass, 'Glory Simon', '+919876500001']
    );
    const adminUserId = adminResult.insertId;
    console.log(`✅ Admin user created (id: ${adminUserId})`);

    // ─────────────────────────────────────────────────────────────────────────
    // USERS — Designers (role_id = 3)
    // ─────────────────────────────────────────────────────────────────────────
    const designerData = [
      { name: 'Priya Raghunathan',  email: 'priya.design@glorysimon.com',    mobile: '+919876500011', spec: 'Modern Minimalist & Scandinavian', exp: 6 },
      { name: 'Karthik Sundar',     email: 'karthik.design@glorysimon.com',  mobile: '+919876500012', spec: 'Contemporary & Luxury Interiors',   exp: 8 },
      { name: 'Sneha Balakrishnan', email: 'sneha.design@glorysimon.com',    mobile: '+919876500013', spec: 'Traditional & Fusion Decor',          exp: 4 },
    ];

    const designerUserIds = [];
    for (const d of designerData) {
      const [res] = await conn.execute(
        `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number) VALUES (?, ?, 3, ?, ?)`,
        [d.email, staffPass, d.name, d.mobile]
      );
      designerUserIds.push(res.insertId);
      await conn.execute(
        `INSERT INTO designers (user_id, specialization, experience_yrs, status) VALUES (?, ?, ?, 'Active')`,
        [res.insertId, d.spec, d.exp]
      );
    }
    console.log(`✅ ${designerData.length} designers created`);

    // ─────────────────────────────────────────────────────────────────────────
    // USERS — Site Engineers (role_id = 4)
    // ─────────────────────────────────────────────────────────────────────────
    const engineerData = [
      { name: 'Raj Selvam',         email: 'raj.engineer@glorysimon.com',    mobile: '+919876500021', spec: 'Civil & Structural',          exp: 7 },
      { name: 'Anand Kumar',        email: 'anand.engineer@glorysimon.com',  mobile: '+919876500022', spec: 'MEP & Electrical Works',      exp: 5 },
      { name: 'Divya Nair',         email: 'divya.engineer@glorysimon.com',  mobile: '+919876500023', spec: 'Finishing & Quality Control', exp: 6 },
    ];

    const engineerUserIds = [];
    for (const e of engineerData) {
      const [res] = await conn.execute(
        `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number) VALUES (?, ?, 4, ?, ?)`,
        [e.email, staffPass, e.name, e.mobile]
      );
      engineerUserIds.push(res.insertId);
      await conn.execute(
        `INSERT INTO site_engineers (user_id, specialization, experience_yrs, status) VALUES (?, ?, ?, 'Active')`,
        [res.insertId, e.spec, e.exp]
      );
    }
    console.log(`✅ ${engineerData.length} site engineers created`);

    // ─────────────────────────────────────────────────────────────────────────
    // USERS — Clients (role_id = 2)
    // ─────────────────────────────────────────────────────────────────────────
    const clientData = [
      { name: 'Arun Krishnamurthy', email: 'client01@gmail.com', mobile: '+919790001001', city: 'Chennai',    pincode: '600001', address: '12, Anna Nagar East, Chennai' },
      { name: 'Meena Subramaniam',  email: 'client02@gmail.com', mobile: '+919790001002', city: 'Coimbatore', pincode: '641001', address: '45, RS Puram, Coimbatore' },
      { name: 'Venkat Rajan',       email: 'client03@gmail.com', mobile: '+919790001003', city: 'Chennai',    pincode: '600040', address: '8, Adyar Main Road, Chennai' },
      { name: 'Lakshmi Devi',       email: 'client04@gmail.com', mobile: '+919790001004', city: 'Madurai',    pincode: '625001', address: '23, KK Nagar, Madurai' },
      { name: 'Suresh Pillai',      email: 'client05@gmail.com', mobile: '+919790001005', city: 'Chennai',    pincode: '600016', address: '5, Nungambakkam High Rd, Chennai' },
      { name: 'Kavitha Mohan',      email: 'client06@gmail.com', mobile: '+919790001006', city: 'Trichy',     pincode: '620001', address: '78, Thillai Nagar, Trichy' },
      { name: 'Ramesh Babu',        email: 'client07@gmail.com', mobile: '+919790001007', city: 'Chennai',    pincode: '600078', address: '33, Velachery Main Road, Chennai' },
      { name: 'Anitha Sundaram',    email: 'client08@gmail.com', mobile: '+919790001008', city: 'Bangalore',  pincode: '560001', address: '15, Indiranagar, Bangalore' },
      { name: 'Prakash Natarajan',  email: 'client09@gmail.com', mobile: '+919790001009', city: 'Chennai',    pincode: '600020', address: '67, T Nagar, Chennai' },
      { name: 'Sindhu Venkatesan',  email: 'client10@gmail.com', mobile: '+919790001010', city: 'Hyderabad',  pincode: '500001', address: '90, Banjara Hills, Hyderabad' },
    ];

    const clientIds = []; // stores clients.id (not users.id)
    const clientUserIds = [];
    for (const c of clientData) {
      const [uRes] = await conn.execute(
        `INSERT INTO users (email, password_hash, role_id, full_name, mobile_number) VALUES (?, ?, 2, ?, ?)`,
        [c.email, clientPass, c.name, c.mobile]
      );
      const [cRes] = await conn.execute(
        `INSERT INTO clients (user_id, address, city, pincode) VALUES (?, ?, ?, ?)`,
        [uRes.insertId, c.address, c.city, c.pincode]
      );
      clientIds.push(cRes.insertId);
      clientUserIds.push(uRes.insertId);
    }
    console.log(`✅ ${clientData.length} clients created`);

    // ─────────────────────────────────────────────────────────────────────────
    // SLOTS — Generate 60 days of slots from today
    // ─────────────────────────────────────────────────────────────────────────
    const defaultSlots = [
      { start: '09:00:00', end: '11:00:00' },
      { start: '11:00:00', end: '13:00:00' },
      { start: '14:00:00', end: '16:00:00' },
      { start: '16:00:00', end: '18:00:00' },
    ];

    const slotIds = [];
    const today = new Date();

    // Generate slots for next 60 days (skip Sundays)
    for (let i = -10; i <= 60; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      if (d.getDay() === 0) continue; // skip Sundays
      const dateStr = d.toISOString().split('T')[0];

      for (const slot of defaultSlots) {
        const [res] = await conn.execute(
          `INSERT IGNORE INTO slots (slot_date, start_time, end_time, max_bookings, current_bookings, is_active, created_by)
           VALUES (?, ?, ?, 3, 0, 1, ?)`,
          [dateStr, slot.start, slot.end, adminUserId]
        );
        if (res.insertId) slotIds.push(res.insertId);
      }
    }
    console.log(`✅ ${slotIds.length} time slots created (60-day range)`);

    // ─────────────────────────────────────────────────────────────────────────
    // BOOKINGS — 20 realistic bookings
    // ─────────────────────────────────────────────────────────────────────────
    const bookingStatuses = [
      'Pending', 'Confirmed', 'Assigned', 'Scheduled',
      'In Progress', 'Completed', 'Cancelled',
    ];

    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    const propertyTypes = ['Residential', 'Commercial'];

    const projectDescriptions = [
      'We recently purchased a 3BHK apartment and need complete interior design. Prefer a modern minimalist style with neutral tones.',
      'Looking to redesign our modular kitchen with island counter and soft-close cabinets. Budget is flexible for premium materials.',
      'Need full home interior for our newly constructed villa. Open to contemporary design with natural wood accents.',
      'Require commercial office interior for 40-seat IT company. Need modern cubicles, conference room, and reception design.',
      'Our master bedroom needs a complete revamp with walk-in wardrobe, false ceiling, and ambient lighting.',
      'Restaurant redesign project. Need a warm, inviting ambiance with booth seating for 60 pax.',
      'New 2BHK apartment interior. Looking for space-saving furniture and compact design solutions.',
      'Retail showroom interior for clothing brand. Need display racks, trial rooms, and brand-aligned decor.',
      'Home office setup for WFH professional. Need ergonomic furniture, acoustic panels, and proper lighting.',
      'Living room and dining area combined design for open-plan apartment. Modern Scandinavian style preferred.',
      'Complete false ceiling with cove lighting for 3 bedrooms and living room. Need crown molding accents.',
      'Bathroom renovation for two bathrooms. Premium tiles, rain shower, and heated floors required.',
      'Studio apartment full interior with Murphy bed, compact kitchen, and multi-functional furniture.',
      'Traditional South Indian style home interior blending classic with contemporary elements.',
      'Cafe interior for 30-seat outlet. Need industrial chic style with exposed brick and Edison bulb lighting.',
      'Premium villa interior — 4 bedrooms, 3 bathrooms, home theatre, and terrace garden design.',
      'Corporate boardroom interior — executive seating for 20, video conferencing setup, premium finish.',
      'Guest house interior — 6 rooms with attached bathrooms, common lounge, and dining area.',
      'Newlywed couple seeking romantic bedroom design with dressing room and en-suite bathroom upgrade.',
      'Playroom and study room design for two kids — colorful, safe materials, and organized storage.',
    ];

    const bookingIds = [];

    for (let i = 0; i < 20; i++) {
      const clientId      = clientIds[i % clientIds.length];
      const projectTypeId = (i % 10) + 1;
      const propertyType  = i < 14 ? 'Residential' : 'Commercial';
      const numRooms      = pick([1, 2, 3, 4, 5, 6]);
      const budget        = pick([150000, 300000, 500000, 750000, 1000000, 1500000, 2000000, 3500000]);
      const slotId        = slotIds[(i * 7) % slotIds.length];
      const status        = bookingStatuses[i % bookingStatuses.length];

      // Priority based on budget (mirrors AI engine logic)
      let priority = 'Low';
      if (budget >= 2000000) priority = 'Urgent';
      else if (budget >= 1000000) priority = 'High';
      else if (budget >= 500000) priority = 'Medium';

      // Fetch client address details and slot_date first
      const [cRows] = await conn.execute('SELECT address, city, pincode FROM clients WHERE id = ?', [clientId]);
      const [sRows] = await conn.execute('SELECT slot_date FROM slots WHERE id = ?', [slotId]);
      const clientProfile = cRows[0];
      const slotRecord = sRows[0];

      const [bRes] = await conn.execute(
        `INSERT INTO bookings
         (client_id, property_type, project_type_id, address, city, pincode,
          preferred_visit_date, slot_id, num_rooms, estimated_budget,
          project_description, status, priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clientId, propertyType, projectTypeId, clientProfile.address, clientProfile.city, clientProfile.pincode,
          slotRecord.slot_date, slotId, numRooms, budget,
          projectDescriptions[i], status, priority,
        ]
      );
      bookingIds.push(bRes.insertId);
    }
    console.log(`✅ 20 bookings created`);

    // ─────────────────────────────────────────────────────────────────────────
    // ASSIGNMENTS — Assign staff to confirmed/assigned/completed bookings
    // ─────────────────────────────────────────────────────────────────────────
    const assignableStatuses = ['Assigned', 'Scheduled', 'In Progress', 'Completed'];
    let assignmentCount = 0;

    for (let i = 0; i < bookingIds.length; i++) {
      // Get booking status
      const [rows] = await conn.execute(`SELECT status FROM bookings WHERE id = ?`, [bookingIds[i]]);
      const status = rows[0]?.status;

      if (assignableStatuses.includes(status)) {
        const designerUid = designerUserIds[i % designerUserIds.length];
        const engineerUid = engineerUserIds[i % engineerUserIds.length];

        await conn.execute(
          `INSERT INTO assignments (booking_id, staff_role, staff_user_id, assigned_by_user_id, status)
           VALUES (?, 'Designer', ?, ?, 'Active')`,
          [bookingIds[i], designerUid, adminUserId]
        );

        await conn.execute(
          `INSERT INTO assignments (booking_id, staff_role, staff_user_id, assigned_by_user_id, status)
           VALUES (?, 'Site Engineer', ?, ?, 'Active')`,
          [bookingIds[i], engineerUid, adminUserId]
        );

        assignmentCount += 2;
      }
    }
    console.log(`✅ ${assignmentCount} staff assignments created`);

    // ─────────────────────────────────────────────────────────────────────────
    // VISIT REPORTS — Create for completed bookings
    // ─────────────────────────────────────────────────────────────────────────
    let reportCount = 0;
    for (let i = 0; i < bookingIds.length; i++) {
      const [rows] = await conn.execute(
        `SELECT b.status, b.preferred_visit_date, a.staff_user_id
         FROM bookings b
         LEFT JOIN assignments a ON a.booking_id = b.id AND a.staff_role = 'Designer' AND a.status = 'Active'
         WHERE b.id = ?`,
        [bookingIds[i]]
      );
      if (!rows[0] || rows[0].status !== 'Completed') continue;

      const submittedBy = rows[0].staff_user_id || designerUserIds[0];
      const visitDate   = rows[0].preferred_visit_date;

      const [rRes] = await conn.execute(
        `INSERT INTO visit_reports
         (booking_id, submitted_by_user_id, visit_date, observations, design_suggestions,
          material_suggestions, budget_estimate, summary, follow_up_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bookingIds[i],
          submittedBy,
          visitDate,
          'Site inspection completed. The property is in excellent condition with good natural lighting. Existing flooring requires replacement. Walls are ready for painting after minor patching.',
          'Recommend open-plan living concept with partition walls removed. Install false ceiling with ambient LED cove lighting. Use large-format tiles for a seamless look. Incorporate built-in storage solutions.',
          'Italian marble tiles for flooring (600x600mm). Premium MDF board for furniture. Toughened glass for partition. Asian Paints Royale for walls. Havells LED fixtures for lighting.',
          Math.floor(Math.random() * 800000) + 300000,
          'The site visit has been completed successfully. The property presents an excellent opportunity for a modern interior transformation. Key areas identified include the living room expansion, kitchen remodelling, and master bedroom upgrade. Estimated timeline: 45-60 working days.',
          'Quotation to be prepared within 3 working days. Client prefers morning meetings. Follow up with material catalogue by end of week. Schedule design presentation for next week.',
        ]
      );

      // Add measurements for 3 rooms
      const rooms = [
        { name: 'Living Room',   l: 18.5, w: 14.0, h: 10.0 },
        { name: 'Master Bedroom', l: 14.0, w: 12.0, h: 10.0 },
        { name: 'Kitchen',       l: 12.0, w: 10.0, h: 10.0 },
      ];
      for (const rm of rooms) {
        await conn.execute(
          `INSERT INTO measurements (visit_report_id, room_name, length_ft, width_ft, height_ft, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [rRes.insertId, rm.name, rm.l, rm.w, rm.h, 'Measured with laser measuring tool. All dimensions verified.']
        );
      }

      reportCount++;
    }
    console.log(`✅ ${reportCount} visit reports with measurements created`);

    // ─────────────────────────────────────────────────────────────────────────
    // NOTIFICATIONS — Sample notifications
    // ─────────────────────────────────────────────────────────────────────────
    const notifRows = [];
    for (let i = 0; i < Math.min(bookingIds.length, 10); i++) {
      const clientUserId = clientUserIds[i % clientUserIds.length];
      const bookingId    = bookingIds[i];

      notifRows.push([
        clientUserId, bookingId,
        'Booking Confirmation',
        `Your site visit booking (reference pending) has been received. Our team will confirm within 24 hours. For queries, call +91-98765-00001.`,
        'In-App', 'Sent',
      ]);

      notifRows.push([
        clientUserId, bookingId,
        'Visit Booking Confirmation',
        `Dear Client,\n\nThank you for booking a site visit with Glory Simon Interiors.\n\nYour booking details have been recorded and our team is reviewing the request.\n\nRegards,\nGlory Simon Interiors Team`,
        'Email', 'Sent',
      ]);

      notifRows.push([
        clientUserId, bookingId,
        '🏠 Site Visit Booked',
        `Hello! Your site visit with *Glory Simon Interiors* has been booked.\n\nWe will confirm your slot shortly. Stay tuned! 🎨\n\n📞 +91-98765-00001`,
        'WhatsApp', 'Pending',
      ]);
    }

    for (const row of notifRows) {
      await conn.execute(
        `INSERT INTO notifications (user_id, booking_id, title, message, type, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        row
      );
    }
    console.log(`✅ ${notifRows.length} notifications seeded`);

    // ─────────────────────────────────────────────────────────────────────────
    // ACTIVITY LOGS
    // ─────────────────────────────────────────────────────────────────────────
    await conn.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, 'DATABASE_SEEDED', 'system', NULL, '{"message":"Seed script executed successfully"}', '127.0.0.1')`,
      [adminUserId]
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Summary
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n✅ ════════════════════════════════════════════');
    console.log('   Glory Simon Interiors — Seed Complete!');
    console.log('═══════════════════════════════════════════════');
    console.log('\n📋 Seeded Records:');
    console.log('   • 1  Admin');
    console.log('   • 3  Interior Designers');
    console.log('   • 3  Site Engineers');
    console.log('   • 10 Clients');
    console.log(`   • ${slotIds.length} Time Slots (60-day range)`);
    console.log('   • 20 Bookings');
    console.log(`   • ${assignmentCount} Staff Assignments`);
    console.log(`   • ${reportCount} Visit Reports`);
    console.log(`   • ${notifRows.length} Notifications`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Admin:     admin@glorysimon.com          / Admin@Glory123');
    console.log('   Designer:  priya.design@glorysimon.com   / Glory@123');
    console.log('   Engineer:  raj.engineer@glorysimon.com   / Glory@123');
    console.log('   Client:    client01@gmail.com            / Client@123');
    console.log('\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

seed();
