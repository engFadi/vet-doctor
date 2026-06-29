// ----------------------------------------------------------------------
// Admin controller (Task 5)
// Veterinarian approval workflow: the administrator reviews pending
// veterinarian registrations, verifies credentials, and approves or
// rejects them (SR8.5-SR8.7). Approved vets become ACTIVE and can log in.
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS, APPOINTMENT_STATUS, REVIEW_STATUS } = require('../models/enums');
const emergencyService = require('../services/emergencyService');
const reviewService = require('../services/reviewService');

const User = db.User;
const Service = db.Service;
const Appointment = db.Appointment;
const Review = db.Review;
const AdminAction = db.AdminAction;
const PENDING_LIST = '/admin/vets/pending';
const SERVICES_LIST = '/admin/services';
const EMERGENCIES_LIST = '/admin/emergencies';
const REVIEWS_LIST = '/admin/reviews';
const USERS_LIST = '/admin/users';

// Statuses an admin may set via user management (SR8.8).
const MANAGEABLE_STATUSES = [
  ACCOUNT_STATUS.ACTIVE,
  ACCOUNT_STATUS.SUSPENDED,
  ACCOUNT_STATUS.DEACTIVATED,
  ACCOUNT_STATUS.DELETED,
];

// Load a veterinarian by id (with the password hash so .save() validates).
async function findVet(id) {
  return User.scope('withPassword').findOne({
    where: { id, role: ROLES.VETERINARIAN },
  });
}

// GET /admin/vets/pending - list veterinarians awaiting approval (SR8.5)
exports.vetApprovals = async (req, res, next) => {
  try {
    const pendingVets = await User.findAll({
      where: {
        role: ROLES.VETERINARIAN,
        accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL,
      },
      order: [['registrationDate', 'ASC']],
    });

    res.render('pages/admin-vet-approvals', {
      title: 'Veterinarian Approvals - Vet Doctor',
      pendingVets,
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/vets/:id/approve (SR8.6)
exports.approveVet = async (req, res, next) => {
  try {
    const vet = await findVet(req.params.id);
    if (!vet) {
      req.flash('error', 'Veterinarian not found.');
      return res.redirect(PENDING_LIST);
    }
    if (vet.accountStatus !== ACCOUNT_STATUS.PENDING_APPROVAL) {
      req.flash('error', `${vet.fullName} is not pending approval.`);
      return res.redirect(PENDING_LIST);
    }

    vet.isApproved = true;
    vet.accountStatus = ACCOUNT_STATUS.ACTIVE;
    await vet.save();

    req.flash('success', `Dr. ${vet.fullName} has been approved and can now log in.`);
    return res.redirect(PENDING_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /admin/vets/:id/reject
exports.rejectVet = async (req, res, next) => {
  try {
    const vet = await findVet(req.params.id);
    if (!vet) {
      req.flash('error', 'Veterinarian not found.');
      return res.redirect(PENDING_LIST);
    }
    if (vet.accountStatus !== ACCOUNT_STATUS.PENDING_APPROVAL) {
      req.flash('error', `${vet.fullName} is not pending approval.`);
      return res.redirect(PENDING_LIST);
    }

    // Rejected registrations are suspended so they cannot log in.
    vet.isApproved = false;
    vet.accountStatus = ACCOUNT_STATUS.SUSPENDED;
    await vet.save();

    req.flash('success', `${vet.fullName}'s registration has been rejected.`);
    return res.redirect(PENDING_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Service pricing management (SR8.15)
// ----------------------------------------------------------------------

// GET /admin/services - list services with editable pricing
exports.listServices = async (req, res, next) => {
  try {
    const services = await Service.findAll({ order: [['id', 'ASC']] });
    res.render('pages/admin-services', {
      title: 'Service Pricing - Vet Doctor',
      services,
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/services/:id - update price, duration, and description
exports.updateService = async (req, res, next) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) {
      req.flash('error', 'Service not found.');
      return res.redirect(SERVICES_LIST);
    }

    const basePrice = Number(req.body.basePrice);
    const description = (req.body.description || '').trim();
    const rawDuration = (req.body.estimatedDuration || '').trim();

    if (Number.isNaN(basePrice) || basePrice < 0) {
      req.flash('error', 'Base price must be a non-negative number.');
      return res.redirect(SERVICES_LIST);
    }

    let estimatedDuration = null;
    if (rawDuration !== '') {
      estimatedDuration = Number(rawDuration);
      if (!Number.isInteger(estimatedDuration) || estimatedDuration < 0) {
        req.flash('error', 'Estimated duration must be a whole number of minutes.');
        return res.redirect(SERVICES_LIST);
      }
    }

    service.basePrice = basePrice;
    service.estimatedDuration = estimatedDuration;
    service.description = description;
    await service.save();

    req.flash('success', `Updated pricing for ${service.name}.`);
    return res.redirect(SERVICES_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Escalated emergencies (Acknowledge Emergency Booking, E2)
// ----------------------------------------------------------------------

// GET /admin/emergencies - emergencies that could not be auto-assigned
exports.listEscalatedEmergencies = async (req, res, next) => {
  try {
    const emergencies = await Appointment.findAll({
      where: { status: APPOINTMENT_STATUS.ESCALATED },
      include: [
        { model: Service, as: 'service' },
        { model: db.Animal, as: 'animal' },
        { model: User, as: 'client', attributes: ['id', 'fullName', 'phoneNumber'] },
      ],
      order: [['appointmentDateTime', 'ASC']],
    });

    res.render('pages/admin-emergencies', {
      title: 'Escalated Emergencies - Vet Doctor',
      emergencies,
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------
// Review moderation (SR9.11, SR9.14-9.15)
// ----------------------------------------------------------------------

const REVIEW_INCLUDES = [
  { model: db.User, as: 'client', attributes: ['id', 'fullName'] },
  { model: db.User, as: 'veterinarian', attributes: ['id', 'fullName'] },
  { model: db.Appointment, as: 'appointment', include: [{ model: Service, as: 'service' }] },
];

// GET /admin/reviews - pending (flagged) reviews + recently approved ones
exports.listReviews = async (req, res, next) => {
  try {
    const [pending, approved] = await Promise.all([
      Review.findAll({
        where: { status: REVIEW_STATUS.PENDING },
        include: REVIEW_INCLUDES,
        order: [['submissionDate', 'ASC']],
      }),
      Review.findAll({
        where: { status: REVIEW_STATUS.APPROVED },
        include: REVIEW_INCLUDES,
        order: [['submissionDate', 'DESC']],
        limit: 20,
      }),
    ]);
    res.render('pages/admin-reviews', {
      title: 'Review Moderation - Vet Doctor',
      pending,
      approved,
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/reviews/:id/approve - publish a held review (SR9.11)
exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review || review.status !== REVIEW_STATUS.PENDING) {
      req.flash('error', 'Pending review not found.');
      return res.redirect(REVIEWS_LIST);
    }
    review.status = REVIEW_STATUS.APPROVED;
    review.moderatedById = req.session.user.id;
    await review.save();

    await reviewService.recalcAverage(review.veterinarianId); // SR9.13
    req.flash('success', 'Review approved and published.');
    return res.redirect(REVIEWS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /admin/reviews/:id/remove - remove a review with a reason (SR9.14-9.15)
exports.removeReview = async (req, res, next) => {
  try {
    const review = await Review.findByPk(req.params.id);
    if (!review || review.status === REVIEW_STATUS.REMOVED) {
      req.flash('error', 'Review not found.');
      return res.redirect(REVIEWS_LIST);
    }
    const reason = (req.body.reason || '').trim();
    if (!reason) {
      req.flash('error', 'A removal reason is required.');
      return res.redirect(REVIEWS_LIST);
    }

    review.status = REVIEW_STATUS.REMOVED;
    review.removalReason = reason;
    review.moderatedById = req.session.user.id;
    await review.save();

    await reviewService.recalcAverage(review.veterinarianId); // SR9.15
    req.flash('success', 'Review removed.');
    return res.redirect(REVIEWS_LIST);
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// User account management (SR8.8-8.9)
// ----------------------------------------------------------------------

// GET /admin/users - manage client & veterinarian accounts
exports.listUsers = async (req, res, next) => {
  try {
    const { Op } = db.Sequelize;
    const users = await User.findAll({
      where: { role: { [Op.in]: [ROLES.CLIENT, ROLES.VETERINARIAN] } },
      order: [['role', 'ASC'], ['fullName', 'ASC']],
    });
    const actions = await AdminAction.findAll({
      order: [['createdAt', 'DESC']],
      limit: 15,
      include: [{ model: User, as: 'targetUser', attributes: ['id', 'fullName'] }],
    });
    res.render('pages/admin-users', {
      title: 'User Management - Vet Doctor',
      users,
      actions,
      statuses: MANAGEABLE_STATUSES,
      accountStatus: ACCOUNT_STATUS,
    });
  } catch (err) {
    next(err);
  }
};

// POST /admin/users/:id/status - change account status with a reason (SR8.8-8.9)
exports.changeUserStatus = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id },
    });
    if (!user || user.role === ROLES.ADMIN) {
      req.flash('error', 'User not found.');
      return res.redirect(USERS_LIST);
    }

    const status = (req.body.status || '').trim();
    const reason = (req.body.reason || '').trim();
    if (!MANAGEABLE_STATUSES.includes(status)) {
      req.flash('error', 'Invalid account status.');
      return res.redirect(USERS_LIST);
    }
    if (!reason) {
      req.flash('error', 'A reason is required for account status changes.');
      return res.redirect(USERS_LIST);
    }

    user.accountStatus = status;
    await user.save({ fields: ['accountStatus'] });

    // SR8.9: record the action with admin name, action type, reason, timestamp.
    await AdminAction.create({
      adminId: req.session.user.id,
      adminName: req.session.user.fullName,
      targetUserId: user.id,
      action: `Set status to ${status}`,
      reason,
    });

    req.flash('success', `${user.fullName}'s account status set to ${status}.`);
    return res.redirect(USERS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /admin/emergencies/:id/reassign - retry assigning a qualified vet
exports.retryReassign = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      where: { id: req.params.id, status: APPOINTMENT_STATUS.ESCALATED },
    });
    if (!appointment) {
      req.flash('error', 'Escalated emergency not found.');
      return res.redirect(EMERGENCIES_LIST);
    }
    const result = await emergencyService.reassign(appointment);
    req.flash(
      'success',
      result.reassigned
        ? 'A veterinarian was found and the emergency has been reassigned.'
        : 'Still no veterinarian is available for that time. The emergency remains escalated.'
    );
    return res.redirect(EMERGENCIES_LIST);
  } catch (err) {
    return next(err);
  }
};
