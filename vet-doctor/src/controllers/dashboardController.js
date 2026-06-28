// ----------------------------------------------------------------------
// Dashboard controller (Task 4)
// Renders a role-specific dashboard for the logged-in user. Each role's
// dashboard grows as later tasks add features (bookings, payments, etc.).
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../models/enums');

const User = db.User;

// GET /dashboard - dispatch by role
exports.index = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.session.user.id);

    // Session refers to a user that no longer exists -> log out cleanly.
    if (!user) {
      return req.session.destroy(() => res.redirect('/login'));
    }

    if (user.role === ROLES.ADMIN) {
      // Live operational metrics we can compute today (SR8.1, SR8.2).
      // Booking/payment metrics are added with their features (Tasks 9, 13).
      const [clientCount, vetCount, pendingVetCount] = await Promise.all([
        User.count({ where: { role: ROLES.CLIENT } }),
        User.count({ where: { role: ROLES.VETERINARIAN } }),
        User.count({
          where: {
            role: ROLES.VETERINARIAN,
            accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL,
          },
        }),
      ]);

      return res.render('pages/dashboard-admin', {
        title: 'Admin Dashboard - Vet Doctor',
        user,
        stats: { clientCount, vetCount, pendingVetCount },
      });
    }

    if (user.role === ROLES.VETERINARIAN) {
      return res.render('pages/dashboard-vet', {
        title: 'Veterinarian Dashboard - Vet Doctor',
        user,
      });
    }

    // Default: client dashboard
    return res.render('pages/dashboard-client', {
      title: 'Client Dashboard - Vet Doctor',
      user,
    });
  } catch (err) {
    return next(err);
  }
};
