// ----------------------------------------------------------------------
// Admin controller (Task 5)
// Veterinarian approval workflow: the administrator reviews pending
// veterinarian registrations, verifies credentials, and approves or
// rejects them (SR8.5-SR8.7). Approved vets become ACTIVE and can log in.
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../models/enums');

const User = db.User;
const PENDING_LIST = '/admin/vets/pending';

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
