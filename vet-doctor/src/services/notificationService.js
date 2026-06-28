// ----------------------------------------------------------------------
// Notification service (Task 11) - MOCKED external Notification Service
// Maps to NotificationSystem.sendNotification(to, subject, body) in the
// class model. Here it stores an in-app notification and logs to the
// console (simulating the email/SMS gateway). Replaced by a real gateway
// in production; kept as a mock per the project requirements.
// ----------------------------------------------------------------------
const db = require('../models');

// Send a notification to a single user.
async function notify({ userId, subject, body = '', appointmentId = null }) {
  if (!userId) return null;
  const notification = await db.Notification.create({
    userId,
    subject,
    body,
    appointmentId,
  });
  console.log(`[NOTIFY] user ${userId}: ${subject}`);
  return notification;
}

// Send the same notification to several users (e.g. client + veterinarian).
async function notifyMany(userIds, message) {
  const unique = [...new Set(userIds.filter(Boolean))];
  return Promise.all(unique.map((userId) => notify({ ...message, userId })));
}

module.exports = { notify, notifyMany };
