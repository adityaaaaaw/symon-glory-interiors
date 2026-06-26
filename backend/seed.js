require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { query, initDb } = require('./db');

const designerAvatars = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'
];

const engineerAvatars = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=200&q=80'
];

const firstNames = ['Amit', 'Sneha', 'Rohan', 'Priya', 'Vikram', 'Anjali', 'Rahul', 'Neha', 'Karan', 'Meera', 'Aditya', 'Siddharth', 'Tara', 'Varun', 'Pooja', 'Deepak', 'Aisha', 'Sanjay', 'Kriti', 'Arjun', 'Shruti', 'Kabir', 'Divya', 'Rajesh', 'Kavita', 'Manish', 'Komal', 'Alok', 'Ritu', 'Vijay', 'Shweta', 'Sunil', 'Preeti', 'Abhishek', 'Swati', 'Anil', 'Nisha', 'Ramesh', 'Renu', 'Suresh'];
const lastNames = ['Sharma', 'Reddy', 'Verma', 'Patel', 'Singh', 'Gupta', 'Das', 'Nair', 'Iyer', 'Rao', 'Roy', 'Joshi', 'Mehta', 'Malhotra', 'Sen', 'Phadnis', 'Thapar', 'Hegde', 'Dhawan', 'Kapoor', 'Kumar', 'Chawla', 'Bansal', 'Dubey', 'Trivedi', 'Pandey'];
const regions = ['Indiranagar', 'Bandra West', 'South Delhi', 'Salt Lake', 'HSR Layout', 'Koramangala', 'Whitefield', 'Gurgaon Phase 3', 'Noida Sector 62', 'Andheri East', 'Gachibowli', 'Juhu', 'Hitec City', 'Dwarka', 'Baniara'];
const propertyTypes = ['Apartment', 'Villa', 'Penthouse', 'Office', 'Retail Outlet', 'Modular Kitchen', 'Renovation Project'];

const slots = ['09:00 AM - 12:00 PM', '12:00 PM - 03:00 PM', '03:00 PM - 06:00 PM'];

async function seed() {
  console.log('Seeding process initiated...');
  
  // 1. Initialize connection first
  await initDb();
  
  // 2. Drop all tables on active connection (disable foreign key checks to prevent lock-out)
  await query.exec('SET FOREIGN_KEY_CHECKS = 0');
  
  await query.exec('DROP TABLE IF EXISTS users');
  await query.exec('DROP TABLE IF EXISTS designers');
  await query.exec('DROP TABLE IF EXISTS site_engineers');
  await query.exec('DROP TABLE IF EXISTS bookings');
  await query.exec('DROP TABLE IF EXISTS booking_media');
  await query.exec('DROP TABLE IF EXISTS assignments');
  await query.exec('DROP TABLE IF EXISTS visit_reports');
  await query.exec('DROP TABLE IF EXISTS quotations');
  await query.exec('DROP TABLE IF EXISTS quotation_items');
  await query.exec('DROP TABLE IF EXISTS booking_notes');
  await query.exec('DROP TABLE IF EXISTS crm_tasks');
  await query.exec('DROP TABLE IF EXISTS communication_history');
  await query.exec('DROP TABLE IF EXISTS notifications');
  await query.exec('DROP TABLE IF EXISTS booking_activities');
  
  // Drop legacy ERP tables
  await query.exec('DROP TABLE IF EXISTS projects');
  await query.exec('DROP TABLE IF EXISTS quotations_legacy');
  await query.exec('DROP TABLE IF EXISTS materials');
  await query.exec('DROP TABLE IF EXISTS vendors');
  await query.exec('DROP TABLE IF EXISTS design_approvals');
  await query.exec('DROP TABLE IF EXISTS audit_logs');
  
  await query.exec('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Dropped all old tables successfully.');

  // 3. Re-initialize database tables fresh by running the database.sql schema migrations again
  await initDb();

  // Encrypt the standard seed passwords using bcrypt
  const clientHash = await bcrypt.hash('client123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  // 1. Seed Admin (1)
  await query.run(
    'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), 'Glory Simon (CEO)', 'ceo@glorysimon.com', adminHash, 'admin', '+91 98765 43210', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80']
  );

  // 2. Seed primary demo client Aditya
  const demoClientAvatar = 'https://api.dicebear.com/7.x/initials/svg?seed=Aditya';
  const demoClientRes = await query.run(
    'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), 'Aditya', 'adityaamancha2007@gmail.com', clientHash, 'client', '+91 7013352181', demoClientAvatar]
  );

  // 3. Seed 50 Clients (in users table)
  const clients = [
    {
      id: demoClientRes.id,
      name: 'Aditya',
      email: 'adityaamancha2007@gmail.com',
      phone: '+91 7013352181',
      avatar: demoClientAvatar
    }
  ];
  const clientEmails = new Set(['adityaamancha2007@gmail.com']);

  for (let i = 1; i <= 50; i++) {
    let fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    let lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    let fullName = `${fName} ${lName}`;
    let email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@example.com`;
    
    // Ensure email uniqueness
    while (clientEmails.has(email)) {
      fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      fullName = `${fName} ${lName}`;
      email = `${fName.toLowerCase()}.${lName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;
    }
    clientEmails.add(email);

    const phone = `+91 9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`;
    
    const res = await query.run(
      'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), fullName, email, clientHash, 'client', phone, avatar]
    );

    clients.push({
      id: res.id,
      name: fullName,
      email,
      phone,
      avatar
    });
  }
  console.log(`Successfully seeded ${clients.length} Clients.`);

  // 3. Seed 15 Designers
  const designers = [];
  for (let i = 1; i <= 15; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.d${i}@glorysimon.com`;
    const phone = `+91 8${Math.floor(100000000 + Math.random() * 900000000)}`;
    const avatar = designerAvatars[i % designerAvatars.length];
    const region = regions[i % regions.length];
    const rating = parseFloat((4.3 + Math.random() * 0.7).toFixed(1));
    const experience = Math.floor(4 + Math.random() * 10);
    const availability = i % 8 === 0 ? 'On Leave' : (i % 5 === 0 ? 'Busy' : 'Available');

    const res = await query.run(
      'INSERT INTO designers (name, email, phone, avatar, region, rating, workload, experience, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, avatar, region, rating, 0, experience, availability]
    );

    // Seed corresponding user credentials for designers as well
    const designerUserHash = await bcrypt.hash('designer123', 10);
    await query.run(
      'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), name, email, designerUserHash, 'designer', phone, avatar]
    );
    
    designers.push({
      id: res.id,
      name,
      phone,
      avatar,
      region,
      rating,
      availability
    });
  }
  console.log(`Successfully seeded ${designers.length} Designers.`);

  // 4. Seed 10 Site Engineers
  const engineers = [];
  for (let i = 1; i <= 10; i++) {
    const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const name = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}.eng${i}@glorysimon.com`;
    const phone = `+91 7${Math.floor(100000000 + Math.random() * 900000000)}`;
    const avatar = engineerAvatars[i % engineerAvatars.length];
    const region = regions[i % regions.length];
    const rating = parseFloat((4.1 + Math.random() * 0.8).toFixed(1));
    const experience = Math.floor(3 + Math.random() * 8);
    const availability = i % 6 === 0 ? 'On Leave' : (i % 4 === 0 ? 'Busy' : 'Available');

    const res = await query.run(
      'INSERT INTO site_engineers (name, email, phone, avatar, region, rating, workload, experience, availability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, phone, avatar, region, rating, 0, experience, availability]
    );

    const engineerUserHash = await bcrypt.hash('engineer123', 10);
    await query.run(
      'INSERT INTO users (uuid, name, email, password, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [randomUUID(), name, email, engineerUserHash, 'engineer', phone, avatar]
    );

    engineers.push({
      id: res.id,
      name,
      phone,
      avatar,
      region,
      rating,
      availability
    });
  }
  console.log(`Successfully seeded ${engineers.length} Site Engineers.`);

  // 5. Seed 100 Bookings with Status Progression
  const statuses = [
    'Draft', 'Pending', 'Confirmed', 'Assigned', 'Designer Accepted',
    'Site Visit Scheduled', 'Site Visit In Progress', 'Site Visit Completed',
    'Quotation Sent', 'Quotation Approved', 'Project Started', 'Project Completed', 'Cancelled'
  ];

  // Distribute statuses across 100 bookings
  const statusPool = [];
  const distributions = {
    'Draft': 5, 'Pending': 15, 'Confirmed': 10, 'Assigned': 15, 'Designer Accepted': 5,
    'Site Visit Scheduled': 10, 'Site Visit In Progress': 5, 'Site Visit Completed': 10,
    'Quotation Sent': 10, 'Quotation Approved': 5, 'Project Started': 5, 'Project Completed': 5, 'Cancelled': 5
  };

  Object.entries(distributions).forEach(([st, count]) => {
    for (let c = 0; c < count; c++) statusPool.push(st);
  });

  // Shuffle status pool
  statusPool.sort(() => Math.random() - 0.5);

  const baseDate = new Date();

  for (let i = 1; i <= 100; i++) {
    const client = clients[i % clients.length];
    const status = statusPool[i - 1];
    const year = new Date().getFullYear();
    const bookingIdStr = `GSI-${year}-${String(i).padStart(4, '0')}`;
    
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const address = `Plot ${Math.floor(10 + Math.random() * 200)}, 4th Cross, ${region}, Bengaluru`;
    
    const visitDate = new Date(baseDate);
    visitDate.setDate(baseDate.getDate() + (Math.floor(Math.random() * 60) - 30));
    const preferredDate = visitDate.toISOString().split('T')[0];
    const preferredSlot = slots[Math.floor(Math.random() * slots.length)];
    const notes = `Site visit inspection request for a premium ${propType.toLowerCase()} project. Focus on carpentry, custom veneers, ceiling alignments, and lighting channels.`;

    let assignedToId = null;
    let assignedToRole = null;
    let reason = null;

    const requiresRole = (propType.includes('Renovation') || propType.includes('Retail')) ? 'engineer' : 'designer';
    const list = requiresRole === 'designer' ? designers : engineers;
    
    let chosenProf = list.find(p => p.region === region && p.availability === 'Available');
    if (!chosenProf) {
      chosenProf = list.find(p => p.availability === 'Available');
    }
    if (!chosenProf) {
      chosenProf = list[0];
    }

    // Assign professionals for Assigned and forward statuses
    const activeAssign = !['Draft', 'Pending', 'Confirmed', 'Cancelled'].includes(status);
    if (activeAssign) {
      assignedToId = chosenProf.id;
      assignedToRole = requiresRole;
      reason = `Auto-assigned ${chosenProf.name} (${requiresRole === 'designer' ? 'Designer' : 'Site Engineer'}) based on workload optimization, location proximity (${chosenProf.region}), and high client rating (${chosenProf.rating}★).`;
      
      chosenProf.workload = (chosenProf.workload || 0) + 1;
    }

    // Insert booking
    const bookingUuid = randomUUID();
    const res = await query.run(
      `INSERT INTO bookings (uuid, booking_id_str, client_id, client_name, phone, email, property_type, address, preferred_date, preferred_slot, notes, status, assigned_to_id, assigned_to_role, assignment_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [bookingUuid, bookingIdStr, client.id, client.name, client.phone, client.email, propType, address, preferredDate, preferredSlot, notes, status, assignedToId, assignedToRole, reason]
    );

    const bookingDbId = res.id;

    // Seed assignments history log
    if (activeAssign && assignedToId) {
      await query.run(
        'INSERT INTO assignments (booking_id, professional_id, professional_role, reason) VALUES (?, ?, ?, ?)',
        [bookingDbId, assignedToId, assignedToRole, reason]
      );
      
      const table = assignedToRole === 'designer' ? 'designers' : 'site_engineers';
      await query.run(`UPDATE ${table} SET workload = workload + 1 WHERE id = ?`, [assignedToId]);
    }

    // Seed sample reference images in booking_media
    const seedMedia = i % 3 === 0;
    if (seedMedia) {
      const mediaTypes = ['image/jpeg', 'image/png'];
      const fileNames = ['site_layout.jpg', 'living_room_idea.png', 'kitchen_profile.jpg'];
      const numMedia = Math.floor(Math.random() * 2) + 1;
      for (let m = 0; m < numMedia; m++) {
        await query.run(
          'INSERT INTO booking_media (booking_id, file_name, file_url, file_size, mime_type) VALUES (?, ?, ?, ?, ?)',
          [
            bookingDbId,
            fileNames[m],
            `https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80`,
            245120 * (m + 1),
            mediaTypes[m % mediaTypes.length]
          ]
        );
      }
    }

    // Seed Activities Timeline
    await logActivity(bookingDbId, 'Booking Created', `Site visit booking request ${bookingIdStr} submitted by client ${client.name} for ${propType}.`);

    if (activeAssign) {
      await logActivity(bookingDbId, 'Assignment Suggested', `System recommended assigning ${chosenProf.name} (${requiresRole === 'designer' ? 'Designer' : 'Site Engineer'}) based on proximity.`);
      await logActivity(bookingDbId, 'Assignment Confirmed', `Assignment confirmed for ${chosenProf.name} by administrator.`);
    }

    // Visit Report Seeding (for bookings completed or further)
    const reportCreated = ['Site Visit Completed', 'Quotation Sent', 'Quotation Approved', 'Project Started', 'Project Completed'].includes(status);
    if (reportCreated) {
      await logActivity(bookingDbId, 'Site Visit Scheduled', `Visit scheduled for ${preferredDate} during slot ${preferredSlot}.`);
      await logActivity(bookingDbId, 'Site Visit In Progress', `Professional has arrived at the site location.`);
      await logActivity(bookingDbId, 'Site Visit Completed', `Inspection finished. Measurements and structural parameters logged.`);

      const reportUuid = randomUUID();
      const summary = `Site visit completed successfully for client ${client.name} at the ${propType} site. Measured floor spaces, verified wall alignments (found minor 2-degree incline in northern brick-work), and logged natural lighting entries.`;
      const recs = `1. Recommend custom wooden overlay cabinetry to optimize modular Kitchen space.\n2. Utilize soft ivory paints on walls to match luxury gold trim boundaries.\n3. Implement a minimalist deconstruct profile in living areas.`;
      const followUps = `Schedule 3D structural outline call on dashboard. Compile material estimates.`;
      const mats = `Veneers (Teak), Blum Soft-close hinges, Acrylic overlays (Champagne Gold), LED Warm Strips`;
      const budgetEst = parseFloat((120000 + Math.random() * 280000).toFixed(2));

      await query.run(
        'INSERT INTO visit_reports (uuid, booking_id, summary, recommendations, follow_ups, material_suggestions, budget_estimate, image_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [reportUuid, bookingDbId, summary, recs, followUps, mats, budgetEst, `/uploads/sample-report-${bookingDbId}.jpg`]
      );

      await logActivity(bookingDbId, 'Report Generated', `Intelligent Visit Report compiled and dispatched to client portal.`);
    }

    // Quotation Seeding
    const quotationCreated = ['Quotation Sent', 'Quotation Approved', 'Project Started', 'Project Completed'].includes(status);
    if (quotationCreated) {
      const qStatus = status === 'Quotation Sent' ? 'Pending' : (status === 'Cancelled' ? 'Rejected' : 'Approved');
      const subtotal = parseFloat((150000 + Math.random() * 300000).toFixed(2));
      const discount = 5.0; // 5% discount
      const subtotalAfterDiscount = subtotal * 0.95;
      const gst = 18.0;
      const tax = parseFloat((subtotalAfterDiscount * 0.18).toFixed(2));
      const grandTotal = parseFloat((subtotalAfterDiscount + tax).toFixed(2));

      const qUuid = randomUUID();
      const qRes = await query.run(
        'INSERT INTO quotations (uuid, booking_id, subtotal, discount, gst, tax, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [qUuid, bookingDbId, subtotal, discount, gst, tax, grandTotal, qStatus]
      );

      const quotationId = qRes.id;

      // Seed items
      const items = [
        { description: 'Premium Teak veneer cabinets (Living Area)', qty: 3, unit_price: 35000.0 },
        { description: 'Ceiling warm LED lighting strips (20 meters)', qty: 1, unit_price: 15000.0 },
        { description: 'Blum soft-close pull-out modular channels', qty: 6, unit_price: 4500.0 }
      ];

      for (const item of items) {
        const amount = item.qty * item.unit_price;
        await query.run(
          'INSERT INTO quotation_items (quotation_id, description, qty, unit_price, amount) VALUES (?, ?, ?, ?, ?)',
          [quotationId, item.description, item.qty, item.unit_price, amount]
        );
      }

      await logActivity(bookingDbId, 'Quotation Dispatched', `Quotation GSI-Q-${quotationId} totaling INR ${grandTotal} prepared and sent.`);

      if (status !== 'Quotation Sent') {
        await logActivity(bookingDbId, 'Quotation Approved', `Estimate GSI-Q-${quotationId} approved by client.`);
      }
      if (['Project Started', 'Project Completed'].includes(status)) {
        await logActivity(bookingDbId, 'Project Started', `Custom site interior fabrications started.`);
      }
      if (status === 'Project Completed') {
        await logActivity(bookingDbId, 'Project Completed', `Site construction completed. Luxury fit-outs delivered successfully!`);
      }
    }

    // Seed Notes, Tasks, and Communication history for CRM
    if (i % 4 === 0) {
      await query.run(
        'INSERT INTO booking_notes (booking_id, author_name, note_text) VALUES (?, ?, ?)',
        [bookingDbId, 'Glory Simon', `Checked moisture level at site. A bit damp on the eastern wall, recommend primer overlays before veneer cladding.`]
      );

      await query.run(
        'INSERT INTO crm_tasks (booking_id, title, due_date, status) VALUES (?, ?, ?, ?)',
        [bookingDbId, `Review teak samples with ${client.name}`, preferredDate, 'Pending']
      );

      await query.run(
        'INSERT INTO communication_history (booking_id, channel, type, recipient, message_preview) VALUES (?, ?, ?, ?, ?)',
        [bookingDbId, 'Email', 'Quotation Dispatched', client.email, `Dear ${client.name}, we have uploaded your interior estimate. Check client portal.`]
      );
      await query.run(
        'INSERT INTO communication_history (booking_id, channel, type, recipient, message_preview) VALUES (?, ?, ?, ?, ?)',
        [bookingDbId, 'WhatsApp', 'Booking Confirmation', client.phone, `Hi ${client.name}, your site inspection is scheduled for ${preferredDate}.`]
      );
    }

    // Seed standard notifications
    if (i % 2 === 0) {
      await query.run(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [client.id, 'Booking Schedule Updated', `Your visit slot is scheduled on ${preferredDate} during ${preferredSlot}.`, 'system']
      );
    }
  }

  console.log('Database Seeding Successful! All records created.');
}

async function logActivity(bookingId, activityType, description) {
  try {
    await query.run(
      'INSERT INTO booking_activities (booking_id, activity_type, description) VALUES (?, ?, ?)',
      [bookingId, activityType, description]
    );
  } catch (err) {
    console.error('Failed to log booking activity in seeding:', err.message);
  }
}

if (require.main === module) {
  seed().catch(err => {
    console.error('Seeding script failed:', err);
  });
}

module.exports = seed;
