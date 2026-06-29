/**
 * Glory Simon Interiors - Site Visit Booking System
 * Email Service — Nodemailer SMTP
 *
 * Sends branded HTML emails for every booking lifecycle event.
 * Falls back to console logging in dev mode when SMTP is not configured.
 * Every send attempt also saves a notifications record to the DB.
 */

'use strict';

const nodemailer = require('nodemailer');
const { query }  = require('../config/db');

// ─── Branding constants ───────────────────────────────────────────────────────
const BRAND = {
  name       : 'Glory Simon Interiors',
  tagline    : 'Transforming Spaces, Enriching Lives',
  email      : process.env.COMPANY_EMAIL  || 'info@glorysimoneinteriors.com',
  phone      : process.env.COMPANY_PHONE  || '+91 98765 43210',
  website    : process.env.COMPANY_WEBSITE || 'www.glorysimoneinteriors.com',
  address    : process.env.COMPANY_ADDRESS || 'Chennai, Tamil Nadu, India',
  colorGold  : '#C9A84C',
  colorDark  : '#1A1209',
  colorCream : '#FDF8EE',
  colorLight : '#F5EDD6',
};

// ─── Transporter setup ────────────────────────────────────────────────────────
const smtpConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD;

let transporter = null;

if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host  : process.env.SMTP_HOST,
    port  : parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth  : {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
  });

  // Verify connection on startup (non-blocking)
  transporter.verify((err) => {
    if (err) {
      console.warn('⚠️  Email transporter verification failed:', err.message);
    } else {
      console.log('✅ Email transporter ready');
    }
  });
} else {
  console.log('ℹ️  SMTP not configured — emails will be logged to console (dev mode)');
}

// ─── Shared HTML shell ────────────────────────────────────────────────────────
/**
 * Wraps email body content in a fully branded HTML email shell.
 * @param {string} bodyHtml  - The inner HTML content of the email
 * @param {string} preheader - Short preview text shown in inbox list
 */
function buildEmailHtml(bodyHtml, preheader = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${BRAND.name}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    body { margin: 0; padding: 0; background-color: #F0EAD6; font-family: Georgia, 'Times New Roman', serif; }
    .email-wrapper { background-color: #F0EAD6; padding: 30px 0; }
    .email-container { max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,18,9,0.15); }
    .header { background: linear-gradient(135deg, ${BRAND.colorDark} 0%, #2D1F0A 50%, #1A1209 100%); padding: 36px 40px; text-align: center; }
    .logo-text { font-family: Georgia, serif; font-size: 28px; font-weight: bold; color: ${BRAND.colorGold}; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
    .logo-gem { font-size: 32px; margin-bottom: 6px; display: block; }
    .tagline { font-family: Georgia, serif; font-size: 12px; color: #BEA06A; letter-spacing: 3px; text-transform: uppercase; margin: 6px 0 0 0; }
    .header-divider { width: 60px; height: 2px; background: ${BRAND.colorGold}; margin: 14px auto 0; }
    .content { padding: 36px 40px; color: #2D1F0A; }
    .greeting { font-size: 18px; color: ${BRAND.colorDark}; margin: 0 0 16px 0; font-family: Georgia, serif; }
    .body-text { font-size: 15px; line-height: 1.7; color: #4A3728; margin: 0 0 16px 0; font-family: Arial, sans-serif; }
    .info-card { background: ${BRAND.colorCream}; border-left: 4px solid ${BRAND.colorGold}; border-radius: 4px; padding: 20px 24px; margin: 24px 0; }
    .info-card h3 { font-family: Georgia, serif; font-size: 14px; color: ${BRAND.colorGold}; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 14px 0; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-family: Arial, sans-serif; font-size: 14px; }
    .info-label { color: #7A6248; font-weight: 600; min-width: 140px; }
    .info-value { color: ${BRAND.colorDark}; font-weight: 400; }
    .ref-badge { display: inline-block; background: ${BRAND.colorDark}; color: ${BRAND.colorGold}; padding: 6px 16px; border-radius: 20px; font-family: 'Courier New', monospace; font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, ${BRAND.colorGold}, #A8823A); color: #1A1209; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin: 16px 0; }
    .divider { border: none; border-top: 1px solid #E8DCC8; margin: 28px 0; }
    .footer { background: ${BRAND.colorDark}; padding: 28px 40px; text-align: center; }
    .footer-brand { color: ${BRAND.colorGold}; font-family: Georgia, serif; font-size: 14px; font-weight: bold; letter-spacing: 1px; margin: 0 0 8px 0; }
    .footer-text { color: #8A7A62; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6; margin: 4px 0; }
    .footer-link { color: ${BRAND.colorGold}; text-decoration: none; }
    .highlight { color: ${BRAND.colorGold}; font-weight: bold; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .status-confirmed { background: #D4EDDA; color: #155724; }
    .status-assigned  { background: #D1ECF1; color: #0C5460; }
    .status-completed { background: #C9A84C22; color: #7A5C0A; border: 1px solid ${BRAND.colorGold}; }
    @media only screen and (max-width: 640px) {
      .email-container { border-radius: 0; }
      .content, .header, .footer { padding: 24px 20px; }
      .logo-text { font-size: 22px; }
      .info-row { flex-direction: column; }
    }
  </style>
</head>
<body>
  <span style="display:none;font-size:1px;color:#F0EAD6;max-height:0;overflow:hidden;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</span>
  <div class="email-wrapper">
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <span class="logo-gem">✦</span>
        <p class="logo-text">${BRAND.name}</p>
        <p class="tagline">${BRAND.tagline}</p>
        <div class="header-divider"></div>
      </div>
      <!-- Body -->
      <div class="content">
        ${bodyHtml}
        <hr class="divider" />
        <p class="body-text" style="font-size:13px; color:#7A6248;">
          If you have any questions, please contact us at
          <a href="mailto:${BRAND.email}" style="color:${BRAND.colorGold};">${BRAND.email}</a>
          or call <strong>${BRAND.phone}</strong>.
        </p>
      </div>
      <!-- Footer -->
      <div class="footer">
        <p class="footer-brand">${BRAND.name}</p>
        <p class="footer-text">${BRAND.address}</p>
        <p class="footer-text">
          <a href="mailto:${BRAND.email}" class="footer-link">${BRAND.email}</a> &nbsp;|&nbsp;
          <span>${BRAND.phone}</span>
        </p>
        <p class="footer-text" style="margin-top:12px; color:#5A4A36; font-size:11px;">
          © ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
          <br/>You are receiving this email because of a booking with us.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Info row helper ──────────────────────────────────────────────────────────
function infoRow(label, value) {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
    <tr>
      <td width="140" style="font-family:Arial,sans-serif;font-size:14px;color:#7A6248;font-weight:600;vertical-align:top;padding-right:8px;">${label}</td>
      <td style="font-family:Arial,sans-serif;font-size:14px;color:#1A1209;vertical-align:top;">${value || '—'}</td>
    </tr>
  </table>`;
}

// ─── DB: Save notification record ─────────────────────────────────────────────
/**
 * Persists a notification record (type='Email') to the notifications table.
 * Fails silently so an email send is never blocked by a DB error.
 */
async function saveEmailNotification(userId, bookingId, title, message, status = 'Sent') {
  try {
    await query(
      `INSERT INTO notifications
         (user_id, booking_id, title, message, type, status, is_read, sent_at, created_at)
       VALUES (?, ?, ?, ?, 'Email', ?, 0, NOW(), NOW())`,
      [userId || null, bookingId || null, title, message, status]
    );
  } catch (err) {
    console.error('⚠️  Failed to save email notification to DB:', err.message);
  }
}

// ─── Core send helper ─────────────────────────────────────────────────────────
/**
 * Sends an email (or logs it in dev mode).
 * @param {object} opts  - { to, subject, html, text }
 * @returns {{ success: boolean, messageId: string|null, error: string|null }}
 */
async function sendEmail({ to, subject, html, text }) {
  if (!smtpConfigured || !transporter) {
    // Dev mode — log to console
    console.log('\n═══════════════════════════════════════════');
    console.log('📧 [DEV EMAIL] To      :', to);
    console.log('📧 [DEV EMAIL] Subject :', subject);
    console.log('📧 [DEV EMAIL] Preview :', (text || '').substring(0, 120), '...');
    console.log('═══════════════════════════════════════════\n');
    return { success: true, messageId: `dev-${Date.now()}`, error: null };
  }

  try {
    const info = await transporter.sendMail({
      from   : `"${BRAND.name}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text   : text || subject,
    });
    return { success: true, messageId: info.messageId, error: null };
  } catch (err) {
    console.error('❌ Email send failed:', err.message);
    return { success: false, messageId: null, error: err.message };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// Exported email functions
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Send booking confirmation email to client after they submit a booking request.
 *
 * @param {string} toEmail
 * @param {{ clientName, bookingRef, visitDate, slotTime, projectType, city, userId, bookingId }} data
 */
async function sendBookingConfirmation(toEmail, data) {
  const {
    clientName   = 'Valued Client',
    bookingRef   = '—',
    visitDate    = '—',
    slotTime     = '—',
    projectType  = '—',
    city         = '—',
    userId       = null,
    bookingId    = null,
  } = data;

  const subject = `Booking Received – ${bookingRef} | ${BRAND.name}`;

  const bodyHtml = `
    <p class="greeting">Dear ${clientName},</p>
    <p class="body-text">
      Thank you for choosing <strong>${BRAND.name}</strong>. We have received your site visit
      booking request and our team will review it shortly.
    </p>
    <p class="body-text">Your booking reference is:</p>
    <p style="text-align:center;"><span class="ref-badge">${bookingRef}</span></p>

    <div class="info-card">
      <h3>📋 Booking Details</h3>
      ${infoRow('Project Type',    projectType)}
      ${infoRow('Preferred Date',  visitDate)}
      ${infoRow('Time Slot',       slotTime)}
      ${infoRow('City',            city)}
      ${infoRow('Status',          '<span class="status-badge" style="background:#FFF3CD;color:#856404;border:1px solid #FFEEBA;">Pending Review</span>')}
    </div>

    <p class="body-text">
      Our team will confirm your appointment within <strong>24 hours</strong>.
      You will receive another email once your booking is approved and a designer is assigned.
    </p>
    <p class="body-text" style="font-size:13px; color:#7A6248;">
      <em>Please keep your booking reference handy for all future correspondence.</em>
    </p>`;

  const textBody = `Dear ${clientName},\n\nThank you for booking with ${BRAND.name}.\nBooking Ref: ${bookingRef}\nPreferred Date: ${visitDate}\nTime: ${slotTime}\nProject: ${projectType}\nCity: ${city}\n\nWe will confirm within 24 hours.\n\n${BRAND.name}`;

  const html   = buildEmailHtml(bodyHtml, `Your booking ${bookingRef} has been received.`);
  const result = await sendEmail({ to: toEmail, subject, html, text: textBody });

  await saveEmailNotification(
    userId,
    bookingId,
    subject,
    textBody,
    result.success ? 'Sent' : 'Failed'
  );

  return { success: result.success, messageId: result.messageId };
}

/**
 * Send booking approval email after admin confirms the booking.
 *
 * @param {string} toEmail
 * @param {{ clientName, bookingRef, visitDate, slotTime, designerName, userId, bookingId }} data
 */
async function sendBookingApproval(toEmail, data) {
  const {
    clientName   = 'Valued Client',
    bookingRef   = '—',
    visitDate    = '—',
    slotTime     = '—',
    designerName = 'Our Designer',
    userId       = null,
    bookingId    = null,
  } = data;

  const subject = `Booking Confirmed ✓ – ${bookingRef} | ${BRAND.name}`;

  const bodyHtml = `
    <p class="greeting">Dear ${clientName},</p>
    <p class="body-text">
      Great news! Your site visit booking has been <strong class="highlight">confirmed</strong>.
      We look forward to visiting your property and helping you create a beautiful space.
    </p>
    <p class="body-text">Your booking reference is:</p>
    <p style="text-align:center;"><span class="ref-badge">${bookingRef}</span></p>

    <div class="info-card">
      <h3>✅ Confirmed Appointment</h3>
      ${infoRow('Visit Date',   `<strong>${visitDate}</strong>`)}
      ${infoRow('Time Slot',    `<strong>${slotTime}</strong>`)}
      ${infoRow('Designer',     designerName)}
      ${infoRow('Status',       '<span class="status-badge status-confirmed">Confirmed</span>')}
    </div>

    <p class="body-text">
      <strong>${designerName}</strong> will be heading your project. They may reach out to you
      prior to the visit to understand your requirements better.
    </p>
    <p class="body-text">
      Please ensure someone is available at the property during the scheduled visit window.
      Our team typically spends <strong>1–2 hours</strong> on-site for a thorough assessment.
    </p>
    <p class="body-text" style="font-size:13px; color:#7A6248;">
      <em>Need to reschedule? Contact us at least 24 hours before the visit.</em>
    </p>`;

  const textBody = `Dear ${clientName},\n\nYour booking ${bookingRef} is CONFIRMED.\nVisit Date: ${visitDate} at ${slotTime}\nDesigner: ${designerName}\n\nPlease ensure someone is available at the property.\n\n${BRAND.name}`;

  const html   = buildEmailHtml(bodyHtml, `Your booking ${bookingRef} is confirmed for ${visitDate}.`);
  const result = await sendEmail({ to: toEmail, subject, html, text: textBody });

  await saveEmailNotification(
    userId,
    bookingId,
    subject,
    textBody,
    result.success ? 'Sent' : 'Failed'
  );

  return { success: result.success, messageId: result.messageId };
}

/**
 * Send assignment notification to a designer or site engineer.
 *
 * @param {string} toEmail
 * @param {{ staffName, clientName, bookingRef, visitDate, slotTime, address, userId, bookingId }} data
 */
async function sendAssignmentNotification(toEmail, data) {
  const {
    staffName  = 'Team Member',
    clientName = 'Client',
    bookingRef = '—',
    visitDate  = '—',
    slotTime   = '—',
    address    = '—',
    userId     = null,
    bookingId  = null,
  } = data;

  const subject = `New Site Visit Assignment – ${bookingRef} | ${BRAND.name}`;

  const bodyHtml = `
    <p class="greeting">Dear ${staffName},</p>
    <p class="body-text">
      You have been <strong class="highlight">assigned</strong> to a new client site visit.
      Please review the details below and prepare accordingly.
    </p>

    <div class="info-card">
      <h3>📌 Assignment Details</h3>
      ${infoRow('Booking Ref',  `<span class="ref-badge" style="font-size:12px;padding:3px 10px;">${bookingRef}</span>`)}
      ${infoRow('Client Name',  clientName)}
      ${infoRow('Visit Date',   `<strong>${visitDate}</strong>`)}
      ${infoRow('Time Slot',    `<strong>${slotTime}</strong>`)}
      ${infoRow('Site Address', address)}
      ${infoRow('Status',       '<span class="status-badge status-assigned">Assigned</span>')}
    </div>

    <p class="body-text">
      <strong>Action Required:</strong> Please log into the portal to view complete client
      details, project requirements, and any specific instructions added by the admin.
    </p>
    <p class="body-text">
      Ensure you carry the site assessment checklist and any required measurement tools.
      Submit the visit report within <strong>24 hours</strong> of completing the visit.
    </p>
    <p class="body-text" style="font-size:13px; color:#7A6248;">
      <em>If you are unable to attend, please notify the admin immediately.</em>
    </p>`;

  const textBody = `Dear ${staffName},\n\nYou have been assigned a site visit.\nBooking Ref: ${bookingRef}\nClient: ${clientName}\nDate: ${visitDate} at ${slotTime}\nAddress: ${address}\n\nPlease log in to view full details.\n\n${BRAND.name}`;

  const html   = buildEmailHtml(bodyHtml, `New site visit assignment: ${bookingRef} on ${visitDate}.`);
  const result = await sendEmail({ to: toEmail, subject, html, text: textBody });

  await saveEmailNotification(
    userId,
    bookingId,
    subject,
    textBody,
    result.success ? 'Sent' : 'Failed'
  );

  return { success: result.success, messageId: result.messageId };
}

/**
 * Send visit reminder email to client 24h before the visit.
 *
 * @param {string} toEmail
 * @param {{ clientName, bookingRef, visitDate, slotTime, designerName, engineerName, userId, bookingId }} data
 */
async function sendVisitReminder(toEmail, data) {
  const {
    clientName   = 'Valued Client',
    bookingRef   = '—',
    visitDate    = '—',
    slotTime     = '—',
    designerName = 'Our Designer',
    engineerName = null,
    userId       = null,
    bookingId    = null,
  } = data;

  const subject = `Reminder: Site Visit Tomorrow – ${bookingRef} | ${BRAND.name}`;

  const staffInfo = engineerName
    ? `${infoRow('Designer', designerName)}${infoRow('Site Engineer', engineerName)}`
    : infoRow('Designer', designerName);

  const bodyHtml = `
    <p class="greeting">Dear ${clientName},</p>
    <p class="body-text">
      This is a friendly reminder that your <strong class="highlight">site visit is scheduled
      for tomorrow</strong>. Our team is looking forward to visiting your property!
    </p>
    <p class="body-text">Your booking reference is:</p>
    <p style="text-align:center;"><span class="ref-badge">${bookingRef}</span></p>

    <div class="info-card">
      <h3>⏰ Visit Reminder</h3>
      ${infoRow('Visit Date',  `<strong>${visitDate}</strong>`)}
      ${infoRow('Time Slot',   `<strong>${slotTime}</strong>`)}
      ${staffInfo}
    </div>

    <div class="info-card" style="border-left-color:#8B7355;">
      <h3 style="color:#8B7355;">📝 Preparation Checklist</h3>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#4A3728;margin:0;">
        ✔ &nbsp;Ensure access to all rooms that need assessment<br/>
        ✔ &nbsp;Have measurements or floor plans ready (if available)<br/>
        ✔ &nbsp;Prepare a list of your design preferences<br/>
        ✔ &nbsp;Keep your budget expectations in mind for discussion<br/>
        ✔ &nbsp;Have reference images of styles you like (optional)
      </p>
    </div>

    <p class="body-text" style="font-size:13px; color:#7A6248;">
      <em>Please contact us immediately if you need to reschedule: ${BRAND.phone}</em>
    </p>`;

  const textBody = `Dear ${clientName},\n\nReminder: Your site visit is TOMORROW.\nBooking Ref: ${bookingRef}\nDate: ${visitDate} at ${slotTime}\nDesigner: ${designerName}${engineerName ? '\nSite Engineer: ' + engineerName : ''}\n\nPlease ensure access to all rooms.\n\n${BRAND.name}`;

  const html   = buildEmailHtml(bodyHtml, `Your site visit is tomorrow at ${slotTime}.`);
  const result = await sendEmail({ to: toEmail, subject, html, text: textBody });

  await saveEmailNotification(
    userId,
    bookingId,
    subject,
    textBody,
    result.success ? 'Sent' : 'Failed'
  );

  return { success: result.success, messageId: result.messageId };
}

/**
 * Send completion notification to client after visit report is submitted.
 *
 * @param {string} toEmail
 * @param {{ clientName, bookingRef, reportSummary, userId, bookingId }} data
 */
async function sendCompletionNotification(toEmail, data) {
  const {
    clientName    = 'Valued Client',
    bookingRef    = '—',
    reportSummary = 'Your site visit has been completed and a detailed report has been prepared.',
    userId        = null,
    bookingId     = null,
  } = data;

  const subject = `Site Visit Completed – Report Ready | ${bookingRef} | ${BRAND.name}`;

  const bodyHtml = `
    <p class="greeting">Dear ${clientName},</p>
    <p class="body-text">
      We are pleased to inform you that your site visit has been
      <strong class="highlight">successfully completed</strong>. Our team has prepared a
      comprehensive assessment report for your property.
    </p>
    <p class="body-text">Your booking reference is:</p>
    <p style="text-align:center;"><span class="ref-badge">${bookingRef}</span></p>

    <div class="info-card">
      <h3>📊 Report Summary</h3>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#4A3728;line-height:1.7;margin:0;">
        ${reportSummary}
      </p>
    </div>

    <div class="info-card" style="border-left-color:#8B7355;">
      <h3 style="color:#8B7355;">🎨 What's Included in Your Report</h3>
      <p style="font-family:Arial,sans-serif;font-size:14px;color:#4A3728;margin:0;">
        ✦ &nbsp;Detailed room measurements<br/>
        ✦ &nbsp;Site observations and analysis<br/>
        ✦ &nbsp;Customised design suggestions<br/>
        ✦ &nbsp;Material & finish recommendations<br/>
        ✦ &nbsp;Preliminary budget estimate<br/>
        ✦ &nbsp;Recommended follow-up actions
      </p>
    </div>

    <p class="body-text">
      Please log into your portal to view the complete report, site photos, and
      detailed measurements. A PDF copy of the report is also available for download.
    </p>
    <p class="body-text">
      Our team will be in touch to discuss the next steps and assist you in moving forward
      with your dream interior. Thank you for trusting <strong>${BRAND.name}</strong>!
    </p>
    <p style="text-align:center;margin-top:24px;">
      <span class="status-badge status-completed">✦ Visit Completed</span>
    </p>`;

  const textBody = `Dear ${clientName},\n\nYour site visit (${bookingRef}) has been COMPLETED.\n\nSummary:\n${reportSummary}\n\nLog into your portal to view the full report and download the PDF.\n\nThank you for choosing ${BRAND.name}!`;

  const html   = buildEmailHtml(bodyHtml, `Your visit report for ${bookingRef} is ready.`);
  const result = await sendEmail({ to: toEmail, subject, html, text: textBody });

  await saveEmailNotification(
    userId,
    bookingId,
    subject,
    textBody,
    result.success ? 'Sent' : 'Failed'
  );

  return { success: result.success, messageId: result.messageId };
}

// ─── Module exports ───────────────────────────────────────────────────────────
module.exports = {
  sendBookingConfirmation,
  sendBookingApproval,
  sendAssignmentNotification,
  sendVisitReminder,
  sendCompletionNotification,
  // Expose internals for testing
  _sendEmail            : sendEmail,
  _saveEmailNotification: saveEmailNotification,
  _buildEmailHtml       : buildEmailHtml,
};
