// ----------------------------------------------------------------------
// Dashboard controller (Task 4)
// Renders a role-specific dashboard for the logged-in user. Each role's
// dashboard grows as later tasks add features (bookings, payments, etc.).
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS, APPOINTMENT_STATUS, PAYMENT_STATUS } = require('../models/enums');
const emergencyService = require('../services/emergencyService');

const { Op } = db.Sequelize;
const User = db.User;
const Appointment = db.Appointment;
const Invoice = db.Invoice;

// GET /dashboard - dispatch by role
exports.index = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.session.user.id);

    // Session refers to a user that no longer exists -> log out cleanly.
    if (!user) {
      return req.session.destroy(() => res.redirect('/login'));
    }

    if (user.role === ROLES.ADMIN) {
      // Today's date range for "bookings scheduled today" (SR8.3).
      const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
      const startTomorrow = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

      // Live operational metrics (SR8.1-8.4).
      const [clientCount, vetCount, pendingVetCount, escalatedCount, todaysBookings, pendingPayments] =
        await Promise.all([
          User.count({ where: { role: ROLES.CLIENT, accountStatus: ACCOUNT_STATUS.ACTIVE } }),
          User.count({ where: { role: ROLES.VETERINARIAN } }),
          User.count({
            where: {
              role: ROLES.VETERINARIAN,
              accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL,
            },
          }),
          Appointment.count({ where: { status: APPOINTMENT_STATUS.ESCALATED } }),
          // SR8.3: bookings scheduled for the current day (excluding cancelled).
          Appointment.count({
            where: {
              appointmentDateTime: { [Op.gte]: startToday, [Op.lt]: startTomorrow },
              status: { [Op.ne]: APPOINTMENT_STATUS.CANCELLED },
            },
          }),
          // SR8.4: pending payments = unpaid invoices.
          Invoice.count({ where: { status: PAYMENT_STATUS.PENDING } }),
        ]);

      return res.render('pages/dashboard-admin', {
        title: 'Admin Dashboard - Vet Doctor',
        user,
        stats: {
          clientCount, vetCount, pendingVetCount, escalatedCount,
          todaysBookings, pendingPayments,
        },
      });
    }

    if (user.role === ROLES.VETERINARIAN) {
      const emergencyCount = await Appointment.count({
        where: {
          veterinarianId: user.id,
          priorityFlag: true,
          acknowledgedAt: null,
          status: emergencyService.AWAITING_ACK,
        },
      });
      return res.render('pages/dashboard-vet', {
        title: 'Veterinarian Dashboard - Vet Doctor',
        user,
        emergencyCount,
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
