// ----------------------------------------------------------------------
// Unread notification count (Task 11)
// Exposes res.locals.unreadCount for the header badge on every page.
// ----------------------------------------------------------------------
const db = require('../models');

module.exports = async function unreadNotifications(req, res, next) {
  res.locals.unreadCount = 0;
  if (req.session.user) {
    try {
      res.locals.unreadCount = await db.Notification.count({
        where: { userId: req.session.user.id, isRead: false },
      });
    } catch (err) {
      // Non-fatal: never block a page render over the badge count.
    }
  }
  next();
};
