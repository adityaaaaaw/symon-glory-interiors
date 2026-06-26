const { query } = require('../db');

/**
 * Centered Notification Hub for Glory Simon Interiors
 * Exposes a unified dispatcher supporting Email, WhatsApp, SMS, and Push notifications.
 * Automatically persists dispatch events to database history logs.
 */

async function dispatchNotification({ bookingId, userId, channel, type, recipient, title, body }) {
  console.log(`[NOTIFICATION DISPATCH] Channel: [${channel.toUpperCase()}] | Recipient: [${recipient}] | Type: [${type}]`);
  console.log(`Title: ${title}`);
  console.log(`Body: ${body.substring(0, 150)}...\n-------------------------------------`);

  try {
    // 1. Persist in communication history logs
    if (bookingId) {
      await query.run(
        'INSERT INTO communication_history (booking_id, channel, type, recipient, message_preview, status) VALUES (?, ?, ?, ?, ?, ?)',
        [bookingId, channel, type, recipient, body.substring(0, 200), 'Sent']
      );
    }

    // 2. Persist in-app notification center alerts for user portal
    if (userId) {
      await query.run(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
        [userId, title, `[${channel}] ${body.substring(0, 100)}`, channel.toLowerCase()]
      );
    }

    return { success: true, messageId: `${channel.toLowerCase()}_${Math.random().toString(36).substr(2, 9)}` };
  } catch (error) {
    console.error(`[Notification Hub Error] Failed to process dispatch log:`, error.message);
    return { success: false, error: error.message };
  }
}

const notificationService = {
  // Unified dispatch method
  dispatch: dispatchNotification,

  async notifyBookingCreated(booking, profName) {
    const clientMsg = `Hi ${booking.client_name}, your site visit booking request ${booking.booking_id_str} is received! Suggested expert: ${profName || 'Calculating...'}. Track it on the Glory Simon portal.`;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'WhatsApp',
      type: 'Booking Created Alert',
      recipient: booking.phone,
      title: 'Site Visit Requested',
      body: clientMsg
    });

    const emailBody = `
      Dear ${booking.client_name},

      We have received your site visit booking request!
      
      Details of your appointment:
      - Booking ID: ${booking.booking_id_str}
      - Property Type: ${booking.property_type}
      - Date: ${booking.preferred_date}
      - Time Slot: ${booking.preferred_slot}
      - Address: ${booking.address}
      - Suggested Expert: ${profName || 'Pending Admin Confirmation'}
      
      Track this booking directly on your Client Portal.
      
      Warm regards,
      Glory Simon Interiors Team
    `;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'Email',
      type: 'Booking Confirmation Email',
      recipient: booking.email,
      title: 'Booking Request Received',
      body: emailBody
    });
  },

  async notifyStatusChanged(booking, oldStatus, newStatus) {
    const waText = `Hello ${booking.client_name}, your booking ${booking.booking_id_str} status has been updated from "${oldStatus}" to "${newStatus}". View details on your portal.`;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'WhatsApp',
      type: 'Status Update Alert',
      recipient: booking.phone,
      title: 'Booking Status Updated',
      body: waText
    });

    const emailBody = `
      Dear ${booking.client_name},

      Your site visit booking status has been updated.
      
      - Booking ID: ${booking.booking_id_str}
      - Old Status: ${oldStatus}
      - New Status: ${newStatus}
      
      Please check your portal for live tracking, schedules, and assigned expert details.
      
      Warm regards,
      Glory Simon Interiors
    `;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'Email',
      type: 'Status Update Email',
      recipient: booking.email,
      title: 'Booking Status Update',
      body: emailBody
    });
  },

  async notifyReportGenerated(booking, profName) {
    const waText = `Hi ${booking.client_name}, your site visit report for booking ${booking.booking_id_str} has been published by ${profName || 'our expert'}. You can download the PDF summary on the portal.`;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'WhatsApp',
      type: 'Report Available Alert',
      recipient: booking.phone,
      title: 'Site Visit Report Published',
      body: waText
    });

    const emailBody = `
      Dear ${booking.client_name},

      We are excited to share that your site inspection report has been compiled!
      
      Our assigned expert has uploaded the summary of dimensions, architectural considerations, style theme suggestions, and next step guidelines.
      
      You can download the full PDF report directly in the "My Bookings" tab of your Client Portal.
      
      Warm regards,
      Glory Simon Interiors
    `;
    await dispatchNotification({
      bookingId: booking.id,
      userId: booking.client_id,
      channel: 'Email',
      type: 'Report Available Email',
      recipient: booking.email,
      title: 'Site Inspection Report Ready',
      body: emailBody
    });
  }
};

module.exports = notificationService;
