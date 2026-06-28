// ----------------------------------------------------------------------
// Admin controller (Task 5)
// Veterinarian approval workflow: the administrator reviews pending
// veterinarian registrations, verifies credentials, and approves or
// rejects them (SR8.5-SR8.7). Approved vets become ACTIVE and can log in.
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../models/enums');

const User = db.User;
const Service = db.Service;
const PENDING_LIST = '/admin/vets/pending';
const SERVICES_LIST = '/admin/services';

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
