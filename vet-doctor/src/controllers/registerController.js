// ----------------------------------------------------------------------
// Registration controller (Task 3)
// Account Registration use case (UR1 / SR1.1-1.6, SR1.8).
// Clients register as ACTIVE and are logged in automatically.
// Veterinarians register as PENDING_APPROVAL (admin approval in Task 5).
// Administrator accounts cannot be registered here (SR1.8).
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../models/enums');
const {
  isValidEmail,
  validatePassword,
  requireFields,
} = require('../utils/validators');

const User = db.User;
const CLIENT_TYPES = ['Pet Owner', 'Farmer'];

// GET /register - choose account type
exports.showChoice = (req, res) => {
  res.render('pages/register-choice', { title: 'Register - Vet Doctor' });
};

// GET /register/client
exports.showClientForm = (req, res) => {
  res.render('pages/register-client', {
    title: 'Register as a Client - Vet Doctor',
    clientTypes: CLIENT_TYPES,
    errors: [],
    form: {},
  });
};

// POST /register/client
exports.registerClient = async (req, res, next) => {
  try {
    const form = {
      fullName: (req.body.fullName || '').trim(),
      email: (req.body.email || '').trim().toLowerCase(),
      phoneNumber: (req.body.phoneNumber || '').trim(),
      address: (req.body.address || '').trim(),
      customerType: (req.body.customerType || '').trim(),
    };
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    // SR1.5: required fields
    const errors = requireFields({
      'Full name': form.fullName,
      Email: form.email,
      'Phone number': form.phoneNumber,
      Address: form.address,
      'Client type': form.customerType,
      Password: password,
    });

    // SR1.3: email format
    if (form.email && !isValidEmail(form.email)) {
      errors.push('Please enter a valid email address.');
    }
    // Client type must be one of the allowed values
    if (form.customerType && !CLIENT_TYPES.includes(form.customerType)) {
      errors.push('Please choose a valid client type.');
    }
    // SR1.6: password strength
    const pwError = validatePassword(password);
    if (password && pwError) errors.push(pwError);
    // Confirmation match
    if (password && confirmPassword !== password) {
      errors.push('Password confirmation does not match.');
    }
    // SR1.4: unique email
    if (form.email && isValidEmail(form.email)) {
      const existing = await User.findOne({ where: { email: form.email } });
      if (existing) errors.push('An account with this email already exists.');
    }

    if (errors.length > 0) {
      return res.status(400).render('pages/register-client', {
        title: 'Register as a Client - Vet Doctor',
        clientTypes: CLIENT_TYPES,
        errors,
        form,
      });
    }

    const user = await User.create({
      role: ROLES.CLIENT,
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      address: form.address,
      customerType: form.customerType,
      password,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    });

    // Auto-login the new client.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user.toSession();
      req.flash('success', `Welcome to Vet Doctor, ${user.fullName}!`);
      return res.redirect('/');
    });
  } catch (err) {
    return next(err);
  }
};

// GET /register/veterinarian
exports.showVetForm = (req, res) => {
  res.render('pages/register-vet', {
    title: 'Register as a Veterinarian - Vet Doctor',
    errors: [],
    form: {},
  });
};

// POST /register/veterinarian
exports.registerVet = async (req, res, next) => {
  try {
    const form = {
      fullName: (req.body.fullName || '').trim(),
      email: (req.body.email || '').trim().toLowerCase(),
      phoneNumber: (req.body.phoneNumber || '').trim(),
      licenseNumber: (req.body.licenseNumber || '').trim(),
      specialization: (req.body.specialization || '').trim(),
      serviceArea: (req.body.serviceArea || '').trim(),
      yearsOfExperience: (req.body.yearsOfExperience || '').trim(),
    };
    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';

    // SR1.5: required fields (SR1.2 set)
    const errors = requireFields({
      'Full name': form.fullName,
      Email: form.email,
      'Phone number': form.phoneNumber,
      'License number': form.licenseNumber,
      Specialization: form.specialization,
      'Service area': form.serviceArea,
      Password: password,
    });

    if (form.email && !isValidEmail(form.email)) {
      errors.push('Please enter a valid email address.');
    }
    const pwError = validatePassword(password);
    if (password && pwError) errors.push(pwError);
    if (password && confirmPassword !== password) {
      errors.push('Password confirmation does not match.');
    }
    // yearsOfExperience is optional but must be a non-negative number if given
    let years = null;
    if (form.yearsOfExperience) {
      years = Number(form.yearsOfExperience);
      if (!Number.isInteger(years) || years < 0) {
        errors.push('Years of experience must be a whole number.');
      }
    }
    if (form.email && isValidEmail(form.email)) {
      const existing = await User.findOne({ where: { email: form.email } });
      if (existing) errors.push('An account with this email already exists.');
    }

    if (errors.length > 0) {
      return res.status(400).render('pages/register-vet', {
        title: 'Register as a Veterinarian - Vet Doctor',
        errors,
        form,
      });
    }

    await User.create({
      role: ROLES.VETERINARIAN,
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      licenseNumber: form.licenseNumber,
      specialization: form.specialization,
      serviceArea: form.serviceArea,
      yearsOfExperience: years,
      password,
      // SR8.6: vet accounts require admin approval before activation.
      accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL,
      isApproved: false,
    });

    // Vets cannot log in until approved, so send them to the login page.
    req.flash(
      'success',
      'Your veterinarian registration has been submitted and is awaiting administrator approval.'
    );
    return res.redirect('/login');
  } catch (err) {
    return next(err);
  }
};
