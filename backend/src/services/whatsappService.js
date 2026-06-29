/**
 * Glory Simon Interiors - Site Visit Booking System
 * WhatsApp Service
 *
 * Generates professional WhatsApp message templates and persists them to the
 * notifications table (type='WhatsApp', status='Pending').
 *
 * When WHATSAPP_ENABLED=true and WHATSAPP_PROVIDER=twilio, messages are
 * actually sent via the Twilio API before being marked 'Sent'.
 *
 * Environment variables used:
 *   WHATSAPP_ENABLED        – 'true' to activate sending
 *   WHATSAPP_PROVIDER       – 'twilio' (only supported provider)
 *   TWILIO_ACCOUNT_SID      – Twilio Account SID
 *   TWILIO_AUTH_TOKEN       – Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM    – Twilio WhatsApp number e.g. whatsapp:+14155238886
 */

'use strict';

const { query } = require('../config/db');

// ─── Brand constants ──────────────────────────────────────────────────────────
const BRAND_NAME  = 'Glory Simon Interiors';
const BRAND_PHONE = process.env.COMPANY_PHONE || '+91 98765 43210';

// ─── WhatsApp configuration ───────────────────────────────────────────────────
const WA_ENABLED  = process.env.WHATSAPP_ENABLED === 'true';
const WA_PROVIDER = (process.env.WHATSAPP_PROVIDER || '').toLowerCase();

// ─── Twilio client (lazy-loaded) ──────────────────────────────────────────────
let twilioClient = null;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    throw new Error('Twilio credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) not set.');
  }

  try {
    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(sid, token);
    return twilioClient;
  } catch {
    throw new Error('twilio npm package not installed. Run: npm install twilio');
  }
}

// ─── Date formatter ───────────────────────────────────────────────────────────
/**
 * Formats a Date or ISO string into "DD Month YYYY" for messages.
 */
function formatDate(dateInput) {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('en-IN', {
    day  : '2-digit',
    month: 'long',
    year : 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Save notification record
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Inserts a WhatsApp notification row into the notifications table.
 *
 * @param {number|null} userId
 * @param {number|null} bookingId
 * @param {string}      title
 * @param {string}      message
 * @param {'Pending'|'Sent'|'Failed'} status
 * @returns {Promise<number|null>} Inserted notification id, or null on error
 */
async function saveWhatsAppNotification(userId, bookingId, title, message, status = 'Pending') {
  try {
    const [result] = await query(
      `INSERT INTO notifications
         (user_id, booking_id, title, message, type, status, is_read, created_at)
       VALUES (?, ?, ?, ?, 'WhatsApp', ?, 0, NOW())`,
      [userId || null, bookingId || null, title, message, status]
    );
    return result.insertId || null;
  } catch (err) {
    console.error('⚠️  Failed to save WhatsApp notification to DB:', err.message);
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Update notification status after send attempt
// ═════════════════════════════════════════════════════════════════════════════
async function updateNotificationStatus(notifId, status, sentAt = null) {
  if (!notifId) return;
  try {
    await query(
      `UPDATE notifications SET status = ?, sent_at = ? WHERE id = ?`,
      [status, sentAt ? sentAt : (status === 'Sent' ? new Date() : null), notifId]
    );
  } catch (err) {
    console.error('⚠️  Failed to update notification status:', err.message);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Actually send via Twilio (or log in dev mode)
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Attempt to send a WhatsApp message via Twilio.
 * If sending is disabled or Twilio is not configured, logs the message and returns success.
 *
 * @param {string} toNumber  - Recipient phone number e.g. +919876543210
 * @param {string} body      - Message body text
 * @returns {{ sent: boolean, sid: string|null, error: string|null }}
 */
async function dispatchViaProvider(toNumber, body) {
  if (!WA_ENABLED) {
    console.log('\n══════════════════════════════════════════════');
    console.log('💬 [DEV WhatsApp] To     :', toNumber);
    console.log('💬 [DEV WhatsApp] Message:', body.substring(0, 120), '...');
    console.log('══════════════════════════════════════════════\n');
    return { sent: false, sid: null, error: null };   // saved as Pending — not sent
  }

  if (WA_PROVIDER === 'twilio') {
    try {
      const from   = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      const client = getTwilioClient();
      const msg    = await client.messages.create({
        from,
        to  : `whatsapp:${toNumber}`,
        body,
      });
      console.log(`✅ WhatsApp sent via Twilio — SID: ${msg.sid}`);
      return { sent: true, sid: msg.sid, error: null };
    } catch (err) {
      console.error('❌ Twilio WhatsApp send failed:', err.message);
      return { sent: false, sid: null, error: err.message };
    }
  }

  console.warn(`⚠️  Unknown WhatsApp provider: "${WA_PROVIDER}". Message not sent.`);
  return { sent: false, sid: null, error: `Unknown provider: ${WA_PROVIDER}` };
}

// ═════════════════════════════════════════════════════════════════════════════
// Internal: Fetch user phone number from DB
// ═════════════════════════════════════════════════════════════════════════════
async function getUserPhone(userId) {
  if (!userId) return null;
  try {
    const [rows] = await query(
      `SELECT mobile_number FROM users WHERE id = ? AND is_active = 1 LIMIT 1`,
      [userId]
    );
    return rows.length ? rows[0].mobile_number : null;
  } catch {
    return null;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: generateBookingConfirmation
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Generate & save a WhatsApp booking confirmation message.
 * Optionally sends via Twilio if WHATSAPP_ENABLED=true.
 *
 * @param {number|null} userId
 * @param {number|null} bookingId
 * @param {{ clientName, bookingRef, visitDate, slotTime }} templateData
 * @returns {{ success: boolean, notificationId: number|null, message: string }}
 */
async function generateBookingConfirmation(userId, bookingId, templateData) {
  const {
    clientName = 'Valued Client',
    bookingRef = '—',
    visitDate  = '—',
    slotTime   = '—',
  } = templateData;

  const formattedDate = formatDate(visitDate);

  const title = `Booking Received – ${bookingRef}`;
  const body  =
`✦ *${BRAND_NAME}*

Hello *${clientName}*! 🙏

Your site visit booking has been *received* and is under review.

📋 *Booking Details:*
• Reference : *${bookingRef}*
• Preferred Date : ${formattedDate}
• Time Slot : ${slotTime}
• Status : ⏳ Pending Review

We will confirm your appointment within *24 hours*.

For any queries, call us at ${BRAND_PHONE}.

_Thank you for choosing ${BRAND_NAME}!_`;

  // Save as Pending first
  const notifId = await saveWhatsAppNotification(userId, bookingId, title, body, 'Pending');

  // Try to send
  const phone    = await getUserPhone(userId);
  let   finalStatus = 'Pending';

  if (phone && WA_ENABLED) {
    const result = await dispatchViaProvider(phone, body);
    finalStatus  = result.sent ? 'Sent' : (result.error ? 'Failed' : 'Pending');
    await updateNotificationStatus(notifId, finalStatus, result.sent ? new Date() : null);
  }

  return { success: true, notificationId: notifId, message: body };
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: generateVisitReminder
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Generate & save a WhatsApp visit reminder message (sent ~24h before visit).
 *
 * @param {number|null} userId
 * @param {number|null} bookingId
 * @param {{ clientName, bookingRef, visitDate, slotTime, staffName }} templateData
 * @returns {{ success: boolean, notificationId: number|null, message: string }}
 */
async function generateVisitReminder(userId, bookingId, templateData) {
  const {
    clientName = 'Valued Client',
    bookingRef = '—',
    visitDate  = '—',
    slotTime   = '—',
    staffName  = 'Our Team',
  } = templateData;

  const formattedDate = formatDate(visitDate);

  const title = `Visit Reminder – ${bookingRef}`;
  const body  =
`⏰ *Visit Reminder | ${BRAND_NAME}*

Hello *${clientName}*!

This is a reminder that your site visit is *tomorrow*. 🏠

📅 *Appointment Details:*
• Reference : *${bookingRef}*
• Date : *${formattedDate}*
• Time : *${slotTime}*
• Team Member : ${staffName}

✅ *Quick Checklist:*
• Ensure access to all rooms
• Have your design references ready
• Note down your budget expectations

Need to reschedule? Call us at ${BRAND_PHONE} immediately.

_See you tomorrow! — ${BRAND_NAME}_`;

  const notifId = await saveWhatsAppNotification(userId, bookingId, title, body, 'Pending');

  const phone = await getUserPhone(userId);
  let finalStatus = 'Pending';

  if (phone && WA_ENABLED) {
    const result = await dispatchViaProvider(phone, body);
    finalStatus  = result.sent ? 'Sent' : (result.error ? 'Failed' : 'Pending');
    await updateNotificationStatus(notifId, finalStatus, result.sent ? new Date() : null);
  }

  return { success: true, notificationId: notifId, message: body };
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: generateStatusUpdate
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Generate & save a WhatsApp status update message whenever booking status changes.
 *
 * @param {number|null} userId
 * @param {number|null} bookingId
 * @param {{ clientName, bookingRef, newStatus }} templateData
 * @returns {{ success: boolean, notificationId: number|null, message: string }}
 */
async function generateStatusUpdate(userId, bookingId, templateData) {
  const {
    clientName = 'Valued Client',
    bookingRef = '—',
    newStatus  = 'Updated',
  } = templateData;

  // Status-specific emoji and messaging
  const statusConfig = {
    Pending      : { emoji: '⏳', verb: 'received and is under review' },
    Confirmed    : { emoji: '✅', verb: 'confirmed! Our team will visit as scheduled' },
    Assigned     : { emoji: '👷', verb: 'assigned to our specialist team' },
    Scheduled    : { emoji: '📅', verb: 'scheduled — visit is coming up soon' },
    'In Progress': { emoji: '🔨', verb: 'currently in progress' },
    Completed    : { emoji: '🎉', verb: 'completed! Your report is ready' },
    Cancelled    : { emoji: '❌', verb: 'cancelled' },
  };

  const cfg   = statusConfig[newStatus] || { emoji: '🔔', verb: 'updated' };
  const title = `Booking ${newStatus} – ${bookingRef}`;
  const body  =
`${cfg.emoji} *Booking Update | ${BRAND_NAME}*

Hello *${clientName}*,

Your booking *${bookingRef}* has been ${cfg.verb}.

📊 *Current Status: ${newStatus}*

${newStatus === 'Completed'
  ? '🎨 Log into your portal to view your complete visit report and downloadable PDF.'
  : newStatus === 'Cancelled'
  ? `We're sorry to see your booking cancelled. Please contact us at ${BRAND_PHONE} if you'd like to rebook.`
  : `We'll keep you updated on any further developments.`}

Questions? Reach us at ${BRAND_PHONE}.

_${BRAND_NAME}_`;

  const notifId = await saveWhatsAppNotification(userId, bookingId, title, body, 'Pending');

  const phone = await getUserPhone(userId);
  let finalStatus = 'Pending';

  if (phone && WA_ENABLED) {
    const result = await dispatchViaProvider(phone, body);
    finalStatus  = result.sent ? 'Sent' : (result.error ? 'Failed' : 'Pending');
    await updateNotificationStatus(notifId, finalStatus, result.sent ? new Date() : null);
  }

  return { success: true, notificationId: notifId, message: body };
}

// ─── Module exports ───────────────────────────────────────────────────────────
module.exports = {
  generateBookingConfirmation,
  generateVisitReminder,
  generateStatusUpdate,
  // Expose internals for testing
  _saveWhatsAppNotification: saveWhatsAppNotification,
  _dispatchViaProvider     : dispatchViaProvider,
  _formatDate              : formatDate,
};
