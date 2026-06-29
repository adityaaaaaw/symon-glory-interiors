'use strict';

/**
 * Firebase Admin SDK Configuration
 *
 * Supports two initialisation strategies:
 *
 * Strategy A — Inline credentials (recommended for cloud deployments):
 *   FIREBASE_PROJECT_ID      - Firebase project ID
 *   FIREBASE_CLIENT_EMAIL    - Service account client email
 *   FIREBASE_PRIVATE_KEY     - Service account private key (with escaped \n)
 *
 * Strategy B — Service account JSON file path:
 *   FIREBASE_SERVICE_ACCOUNT_PATH - Absolute or relative path to serviceAccount.json
 *
 * If none of the above are configured, Firebase is disabled and `admin` and
 * `messaging` are exported as null. The app will still start normally.
 */

let admin = null;
let messaging = null;

/**
 * Attempt to initialise Firebase Admin SDK.
 * All errors are caught and logged — Firebase is non-critical.
 */
const initFirebase = () => {
  try {
    // Lazy-require so the module doesn't crash if firebase-admin is not installed
    const firebaseAdmin = require('firebase-admin');

    // Check if already initialised (prevents re-initialisation errors in hot-reload envs)
    if (firebaseAdmin.apps && firebaseAdmin.apps.length > 0) {
      console.log('[Firebase] Already initialised. Reusing existing app.');
      admin = firebaseAdmin;
      messaging = firebaseAdmin.messaging();
      return;
    }

    let credential = null;
    let projectId = null;

    // --- Strategy A: Inline environment variable credentials ---
    const envProjectId = process.env.FIREBASE_PROJECT_ID;
    const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const envPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (envProjectId && envClientEmail && envPrivateKey) {
      // Replace escaped newlines (common when storing private key in .env)
      const privateKey = envPrivateKey.replace(/\\n/g, '\n');

      credential = firebaseAdmin.credential.cert({
        projectId: envProjectId,
        clientEmail: envClientEmail,
        privateKey,
      });
      projectId = envProjectId;

      console.log('[Firebase] Initialising with inline environment credentials.');

    // --- Strategy B: Service account JSON file path ---
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const path = require('path');
      const fs = require('fs');
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);

      if (!fs.existsSync(serviceAccountPath)) {
        console.warn(
          `[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH is set but file not found at: "${serviceAccountPath}". ` +
            'Firebase will be disabled.'
        );
        return;
      }

      const serviceAccount = require(serviceAccountPath);
      credential = firebaseAdmin.credential.cert(serviceAccount);
      projectId = serviceAccount.project_id;

      console.log(
        `[Firebase] Initialising with service account file: "${serviceAccountPath}".`
      );

    } else {
      // --- No configuration found ---
      console.warn(
        '[Firebase] ⚠️  Firebase configuration is missing. ' +
          'Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, ' +
          'or FIREBASE_SERVICE_ACCOUNT_PATH in your .env file. ' +
          'Firebase push notifications will be disabled.'
      );
      return;
    }

    // Initialise the app
    firebaseAdmin.initializeApp({
      credential,
      projectId,
    });

    admin = firebaseAdmin;
    messaging = firebaseAdmin.messaging();

    console.log(
      `[Firebase] ✅ Firebase Admin SDK initialised successfully. Project: "${projectId}".`
    );
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.warn(
        '[Firebase] ⚠️  firebase-admin package is not installed. ' +
          'Run: npm install firebase-admin. Firebase will be disabled.'
      );
    } else {
      console.error('[Firebase] ❌ Failed to initialise Firebase Admin SDK:', error.message);
    }

    // Ensure exports remain null on failure
    admin = null;
    messaging = null;
  }
};

// Run initialisation on module load
initFirebase();

/**
 * Send a push notification via Firebase Cloud Messaging.
 * Returns false (non-throwing) if Firebase is not initialised.
 *
 * @param {string} fcmToken - The target device FCM registration token
 * @param {string} title    - Notification title
 * @param {string} body     - Notification body text
 * @param {Object} [data]   - Optional key-value data payload
 * @returns {Promise<string|false>} FCM message ID string, or false if Firebase is unavailable
 *
 * @example
 * const msgId = await sendPushNotification(user.fcm_token, 'Booking Confirmed', 'Your booking #GSI-001 is confirmed!', { booking_id: '42' });
 */
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!messaging) {
    console.warn('[Firebase] sendPushNotification() called but Firebase is not initialised. Skipping.');
    return false;
  }

  if (!fcmToken || typeof fcmToken !== 'string') {
    console.warn('[Firebase] sendPushNotification() called with invalid FCM token. Skipping.');
    return false;
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: String(title),
        body: String(body),
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[Firebase] Push notification sent successfully. Message ID: ${response}`);
    return response;
  } catch (error) {
    console.error('[Firebase] Failed to send push notification:', error.message);
    return false;
  }
};

/**
 * Send a push notification to multiple devices (multicast).
 * Returns null if Firebase is not initialised.
 *
 * @param {string[]} fcmTokens - Array of FCM registration tokens
 * @param {string} title       - Notification title
 * @param {string} body        - Notification body text
 * @param {Object} [data]      - Optional key-value data payload
 * @returns {Promise<Object|null>} Firebase BatchResponse or null if unavailable
 */
const sendMulticastPushNotification = async (fcmTokens, title, body, data = {}) => {
  if (!messaging) {
    console.warn('[Firebase] sendMulticastPushNotification() called but Firebase is not initialised. Skipping.');
    return null;
  }

  if (!Array.isArray(fcmTokens) || fcmTokens.length === 0) {
    console.warn('[Firebase] sendMulticastPushNotification() called with empty token array. Skipping.');
    return null;
  }

  try {
    const message = {
      tokens: fcmTokens.filter((t) => typeof t === 'string' && t.trim() !== ''),
      notification: {
        title: String(title),
        body: String(body),
      },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `[Firebase] Multicast sent. Success: ${response.successCount}, Failed: ${response.failureCount}`
    );
    return response;
  } catch (error) {
    console.error('[Firebase] Failed to send multicast push notification:', error.message);
    return null;
  }
};

/**
 * Check if Firebase is currently initialised and available.
 *
 * @returns {boolean}
 */
const isFirebaseInitialised = () => admin !== null && messaging !== null;

module.exports = {
  admin,
  messaging,
  sendPushNotification,
  sendMulticastPushNotification,
  isFirebaseInitialised,
};
