/**
 * Glory Simon Interiors - Site Visit Booking System
 * Firebase Cloud Messaging (FCM) Service
 *
 * Sends push notifications to users via FCM topics.
 * Because the users table has no fcm_token column, delivery uses per-user
 * topics named "user_<userId>" — the client app subscribes to this topic on login.
 *
 * Firebase Admin SDK is initialised in config/firebase.js.
 * This module imports the admin app from there and handles the case where
 * Firebase is not configured (missing credentials).
 *
 * Environment variables (set in config/firebase.js):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

'use strict';

const { query } = require('../config/db');

// ─── Load Firebase admin lazily ───────────────────────────────────────────────
let admin          = null;
let firebaseReady  = false;
let firebaseError  = null;

function loadFirebase() {
  if (admin !== null) return;   // already attempted

  try {
    // eslint-disable-next-line global-require
    const firebaseConfig = require('../config/firebase');
    admin         = firebaseConfig.admin;   // named export from config/firebase.js
    firebaseReady = true;
    console.log('✅ Firebase Admin SDK loaded for FCM');
  } catch (err) {
    firebaseError = err.message;
    console.warn('⚠️  Firebase not configured — FCM notifications disabled:', err.message);
  }
}

// Attempt load at module initialisation
loadFirebase();

// ─── In-memory FCM token map (fallback for token-based delivery) ──────────────
/**
 * Simple in-memory map of userId → FCM registration token.
 * Updated when users register their device token via the API.
 * In production, persist to a separate `user_fcm_tokens` table.
 *
 * @type {Map<number, string>}
 */
const fcmTokenMap = new Map();

/**
 * Store an FCM token for a user.
 * Called from the auth/device registration endpoint.
 *
 * @param {number} userId
 * @param {string} token
 */
function registerFcmToken(userId, token) {
  if (userId && token) {
    fcmTokenMap.set(Number(userId), token);
  }
}

/**
 * Remove an FCM token (e.g. on logout).
 * @param {number} userId
 */
function removeFcmToken(userId) {
  fcmTokenMap.delete(Number(userId));
}

// ─── Save in-app notification record ─────────────────────────────────────────
/**
 * Persists a push notification record to the notifications table.
 * Fails silently so push never blocks business logic.
 *
 * @param {number|null} userId
 * @param {number|null} bookingId
 * @param {string}      title
 * @param {string}      message
 * @param {'Sent'|'Failed'|'Pending'} status
 */
async function saveInAppNotification(userId, bookingId, title, message, status = 'Sent') {
  try {
    await query(
      `INSERT INTO notifications
         (user_id, booking_id, title, message, type, status, is_read, sent_at, created_at)
       VALUES (?, ?, ?, ?, 'In-App', ?, 0, NOW(), NOW())`,
      [userId || null, bookingId || null, title, message, status]
    );
  } catch (err) {
    console.error('⚠️  Failed to save In-App notification to DB:', err.message);
  }
}

// ─── Not-configured guard ─────────────────────────────────────────────────────
function notConfiguredResult() {
  return {
    success: false,
    message: `Firebase not configured: ${firebaseError || 'Unknown error'}`,
    messageId: null,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: sendToUser
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Send an FCM notification to a specific user.
 *
 * Strategy:
 *  1. If the user has a registered token in fcmTokenMap → use token delivery.
 *  2. Otherwise → use topic "user_<userId>" (client app must subscribe on login).
 *
 * @param {number}  userId
 * @param {{ title: string, body: string, data?: object }} payload
 * @param {number|null} bookingId  - For DB notification record
 * @returns {{ success: boolean, message: string, messageId: string|null }}
 */
async function sendToUser(userId, payload, bookingId = null) {
  if (!firebaseReady) return notConfiguredResult();

  const { title = 'Glory Simon Interiors', body = '', data = {} } = payload;

  // Sanitise data: FCM requires all values to be strings
  const sanitisedData = { bookingId: String(bookingId || ''), userId: String(userId), ...data };
  Object.keys(sanitisedData).forEach((k) => {
    sanitisedData[k] = String(sanitisedData[k]);
  });

  try {
    let messageId;
    const fcmToken = fcmTokenMap.get(Number(userId));

    if (fcmToken) {
      // Direct token delivery
      messageId = await admin.messaging().send({
        token       : fcmToken,
        notification: { title, body },
        data        : sanitisedData,
        android     : { priority: 'high' },
        apns        : { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    } else {
      // Topic-based delivery
      const topic = `user_${userId}`;
      messageId   = await admin.messaging().send({
        topic,
        notification: { title, body },
        data        : sanitisedData,
        android     : { priority: 'high' },
        apns        : { payload: { aps: { sound: 'default', badge: 1 } } },
      });
    }

    await saveInAppNotification(userId, bookingId, title, body, 'Sent');
    return { success: true, message: 'Notification sent', messageId };
  } catch (err) {
    console.error('❌ FCM sendToUser failed:', err.message);
    await saveInAppNotification(userId, bookingId, title, body, 'Failed');
    return { success: false, message: err.message, messageId: null };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: sendToTopic
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Send an FCM notification to all subscribers of a topic.
 * Useful for broadcast messages (e.g. all admins, all designers).
 *
 * @param {string} topic   - Topic name e.g. "admins", "designers"
 * @param {{ title: string, body: string, data?: object }} payload
 * @returns {{ success: boolean, message: string, messageId: string|null }}
 */
async function sendToTopic(topic, payload) {
  if (!firebaseReady) return notConfiguredResult();

  const { title = 'Glory Simon Interiors', body = '', data = {} } = payload;

  // Sanitise data values to strings
  const sanitisedData = { ...data };
  Object.keys(sanitisedData).forEach((k) => {
    sanitisedData[k] = String(sanitisedData[k]);
  });

  try {
    const messageId = await admin.messaging().send({
      topic,
      notification: { title, body },
      data        : sanitisedData,
      android     : { priority: 'high' },
      apns        : { payload: { aps: { sound: 'default' } } },
    });

    console.log(`✅ FCM topic "${topic}" notification sent — ID: ${messageId}`);
    return { success: true, message: `Sent to topic: ${topic}`, messageId };
  } catch (err) {
    console.error(`❌ FCM sendToTopic ("${topic}") failed:`, err.message);
    return { success: false, message: err.message, messageId: null };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: sendBookingUpdate
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Send a formatted booking status update notification to a user.
 * Automatically constructs the title/body based on the new status.
 *
 * @param {number}      userId
 * @param {number}      bookingId
 * @param {string}      status    - New booking status
 * @param {string|null} bookingRef
 * @returns {{ success: boolean, message: string, messageId: string|null }}
 */
async function sendBookingUpdate(userId, bookingId, status, bookingRef = null) {
  const refText = bookingRef ? ` (${bookingRef})` : '';

  // Status-specific notification content
  const statusMessages = {
    Pending      : { title: '⏳ Booking Received',      body: `Your booking${refText} has been received and is under review.` },
    Confirmed    : { title: '✅ Booking Confirmed',     body: `Great news! Your booking${refText} has been confirmed.` },
    Assigned     : { title: '👷 Team Assigned',         body: `A specialist team has been assigned to your booking${refText}.` },
    Scheduled    : { title: '📅 Visit Scheduled',       body: `Your site visit${refText} is scheduled. Check your booking for details.` },
    'In Progress': { title: '🔨 Visit In Progress',     body: `Our team is currently conducting the site visit${refText}.` },
    Completed    : { title: '🎉 Visit Completed',       body: `Your site visit${refText} is complete. Your report is ready to view!` },
    Cancelled    : { title: '❌ Booking Cancelled',     body: `Your booking${refText} has been cancelled. Contact us for rebooking.` },
  };

  const notifContent = statusMessages[status] || {
    title: '🔔 Booking Update',
    body : `Your booking${refText} status has been updated to: ${status}.`,
  };

  return sendToUser(
    userId,
    {
      title: notifContent.title,
      body : notifContent.body,
      data : {
        type     : 'booking_update',
        bookingId: String(bookingId),
        status,
      },
    },
    bookingId
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// PUBLIC: subscribeToTopic / unsubscribeFromTopic
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Subscribe one or more FCM tokens to a topic.
 * Useful for role-based topics (e.g. "admins", "designers").
 *
 * @param {string[]} tokens
 * @param {string}   topic
 */
async function subscribeToTopic(tokens, topic) {
  if (!firebaseReady) return notConfiguredResult();
  try {
    const response = await admin.messaging().subscribeToTopic(tokens, topic);
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.error('❌ FCM subscribeToTopic failed:', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Unsubscribe one or more FCM tokens from a topic.
 *
 * @param {string[]} tokens
 * @param {string}   topic
 */
async function unsubscribeFromTopic(tokens, topic) {
  if (!firebaseReady) return notConfiguredResult();
  try {
    const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.error('❌ FCM unsubscribeFromTopic failed:', err.message);
    return { success: false, message: err.message };
  }
}

// ─── Module exports ───────────────────────────────────────────────────────────
module.exports = {
  sendToUser,
  sendToTopic,
  sendBookingUpdate,
  subscribeToTopic,
  unsubscribeFromTopic,
  registerFcmToken,
  removeFcmToken,
  // Expose for testing
  _saveInAppNotification: saveInAppNotification,
  _fcmTokenMap          : fcmTokenMap,
  get isReady() { return firebaseReady; },
};
