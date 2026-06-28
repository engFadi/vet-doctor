// ----------------------------------------------------------------------
// Notification controller (Task 11)
// In-app inbox for any logged-in user. Opening the inbox marks unread
// notifications as read.
// ----------------------------------------------------------------------
const db = require('../models');

const Notification = db.Notification;

// GET /notifications
exports.list = async (req, res, next) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.session.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    // Mark everything as read now that the user is viewing the inbox.
    await Notification.update(
      { isRead: true },
      { where: { userId: req.session.user.id, isRead: false } }
    );

    res.render('pages/notifications', {
      title: 'Notifications - Vet Doctor',
      notifications,
    });
  } catch (err) {
    next(err);
  }
};
