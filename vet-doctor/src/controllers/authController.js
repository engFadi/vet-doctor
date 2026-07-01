// ----------------------------------------------------------------------
// Auth controller (Task 2)
// Implements the Log In use case: validate credentials, reject invalid or
// inactive accounts, lock after repeated failures, create a session.
// ----------------------------------------------------------------------
const crypto = require('crypto');
const db = require('../models');
const { ACCOUNT_STATUS } = require('../models/enums');
const mailService = require('../services/mailService');
const { validatePassword } = require('../utils/validators');

const { Op } = db.Sequelize;
const User = db.User;
const RESET_MINUTES = 30; // SR2.7

// GET /login
exports.showLogin = (req, res) => {
  res.render('pages/login', {
    title: 'Log In - Vet Doctor',
    email: '',
    error: null,
  });
};

// Re-render the login form with an error and the entered email.
function renderLoginError(res, email, error, status = 401) {
  return res.status(status).render('pages/login', {
    title: 'Log In - Vet Doctor',
    email: email || '',
    error,
  });
}

// POST /login
exports.login = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    // SR2.1: both fields required.
    if (!email || !password) {
      return renderLoginError(res, email, 'Please enter your email and password.', 400);
    }

    // Load the user including the password hash (excluded by default scope).
    const user = await User.scope('withPassword').findOne({ where: { email } });

    // SR2.3: do not reveal whether the email exists.
    if (!user) {
      return renderLoginError(res, email, 'Invalid email or password.');
    }

    // E2: account locked. Auto-unlock once the 15-minute window passes.
    if (user.accountStatus === ACCOUNT_STATUS.LOCKED) {
      if (user.isLocked()) {
        const mins = user.lockedUntil
          ? Math.max(1, Math.ceil((new Date(user.lockedUntil) - Date.now()) / 60000))
          : User.LOCK_MINUTES;
        return renderLoginError(
          res,
          email,
          `Your account is locked due to too many failed login attempts. ` +
            `Please try again in about ${mins} minute(s), or use "Forgot password?" to reset it.`,
          423
        );
      }
      await user.clearLoginAttempts(); // window passed -> reactivate
    }

    // E2: other inactive states cannot log in.
    if (user.accountStatus === ACCOUNT_STATUS.PENDING_APPROVAL) {
      return renderLoginError(
        res,
        email,
        'Your veterinarian account is awaiting administrator approval.',
        403
      );
    }
    if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
      return renderLoginError(res, email, 'This account has been suspended.', 403);
    }
    if (user.accountStatus === ACCOUNT_STATUS.DEACTIVATED) {
      return renderLoginError(res, email, 'This account has been deactivated.', 403);
    }
    if (user.accountStatus === ACCOUNT_STATUS.DELETED) {
      return renderLoginError(res, email, 'Invalid email or password.', 401);
    }

    // SR2.2 / SR2.3: verify the password.
    const ok = await user.validatePassword(password);
    if (!ok) {
      await user.registerFailedLogin(); // SR2.4: lock after 5 failures
      // SR2.5: email the user when the account becomes locked.
      if (user.accountStatus === ACCOUNT_STATUS.LOCKED) {
        mailService.sendMail({
          to: user.email,
          subject: 'Your Vet Doctor account has been locked',
          text:
            `Hello ${user.fullName},\n\n` +
            `Your Vet Doctor account was locked for ${User.LOCK_MINUTES} minutes after ` +
            `${User.MAX_FAILED_ATTEMPTS} consecutive failed login attempts.\n` +
            `If this wasn't you, please reset your password.\n\n- Vet Doctor`,
        });
      }
      const remaining = User.MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      let hint;
      if (user.accountStatus === ACCOUNT_STATUS.LOCKED) {
        // SR2.5: the account just locked — tell the user on screen too.
        const emailNote = mailService.isConfigured()
          ? ' A notification has been sent to your email.'
          : '';
        hint =
          `Too many failed attempts — your account has been locked for ${User.LOCK_MINUTES} minutes.` +
          `${emailNote} You can reset it using "Forgot password?".`;
      } else {
        hint = `Invalid email or password. ${remaining} attempt(s) left before your account is locked.`;
      }
      return renderLoginError(res, email, hint);
    }

    // Success: clear any failed-attempt state and create the session.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await user.clearLoginAttempts();
    }

    // Regenerate the session id to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = user.toSession();
      req.flash('success', `Welcome back, ${user.fullName}.`);
      return res.redirect('/dashboard');
    });
  } catch (err) {
    return next(err);
  }
};

// ----------------------------------------------------------------------
// Password reset (SR2.6-2.8)
// ----------------------------------------------------------------------

// GET /forgot - request-a-reset form
exports.showForgot = (req, res) => {
  res.render('pages/forgot-password', {
    title: 'Forgot Password - Vet Doctor',
    sent: false,
    mailConfigured: mailService.isConfigured(),
  });
};

// POST /forgot - generate a token and email the reset link (SR2.6-2.7)
exports.sendReset = async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const user = email
      ? await User.scope('withPassword').findOne({ where: { email } })
      : null;

    // Only act for a real, usable account; but always show the same message.
    if (user && ![ACCOUNT_STATUS.DELETED, ACCOUNT_STATUS.DEACTIVATED].includes(user.accountStatus)) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetToken = token;
      user.resetTokenExpiry = new Date(Date.now() + RESET_MINUTES * 60 * 1000); // SR2.7
      await user.save();

      const base = `${req.protocol}://${req.get('host')}`;
      const link = `${base}/reset/${token}`;
      await mailService.sendMail({
        to: user.email,
        subject: 'Reset your Vet Doctor password',
        text:
          `Hello ${user.fullName},\n\n` +
          `Use the link below to reset your password. It is valid for ${RESET_MINUTES} minutes.\n\n` +
          `${link}\n\n` +
          `If you didn't request this, you can ignore this email.\n\n- Vet Doctor`,
      });
    }

    // SR2.3-style privacy: never reveal whether the email is registered.
    return res.render('pages/forgot-password', {
      title: 'Forgot Password - Vet Doctor',
      sent: true,
      mailConfigured: mailService.isConfigured(),
    });
  } catch (err) {
    return next(err);
  }
};

// Find a user by a valid (non-expired) reset token.
function findByValidToken(token) {
  return User.scope('withPassword').findOne({
    where: { resetToken: token, resetTokenExpiry: { [Op.gt]: new Date() } },
  });
}

// GET /reset/:token - show the reset form if the token is valid
exports.showReset = async (req, res, next) => {
  try {
    const user = await findByValidToken(req.params.token);
    if (!user) {
      // SR2.8: expired/invalid link requires a new request.
      req.flash('error', 'This reset link is invalid or has expired. Please request a new one.');
      return res.redirect('/forgot');
    }
    return res.render('pages/reset-password', {
      title: 'Reset Password - Vet Doctor',
      token: req.params.token,
      errors: [],
    });
  } catch (err) {
    return next(err);
  }
};

// POST /reset/:token - set a new password
exports.resetPassword = async (req, res, next) => {
  try {
    const user = await findByValidToken(req.params.token);
    if (!user) {
      req.flash('error', 'This reset link is invalid or has expired. Please request a new one.');
      return res.redirect('/forgot');
    }

    const password = req.body.password || '';
    const confirmPassword = req.body.confirmPassword || '';
    const errors = [];
    const pwError = validatePassword(password); // SR2.10 -> SR1.6
    if (pwError) errors.push(pwError);
    if (password !== confirmPassword) errors.push('Password confirmation does not match.');

    if (errors.length > 0) {
      return res.status(400).render('pages/reset-password', {
        title: 'Reset Password - Vet Doctor',
        token: req.params.token,
        errors,
      });
    }

    await user.setPassword(password); // hashes into passwordHash directly
    user.resetToken = null;
    user.resetTokenExpiry = null;
    // Recovering the account also clears any lockout.
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.accountStatus === ACCOUNT_STATUS.LOCKED) {
      user.accountStatus = ACCOUNT_STATUS.ACTIVE;
    }
    await user.save();

    req.flash('success', 'Your password has been reset. Please log in.');
    return res.redirect('/login');
  } catch (err) {
    return next(err);
  }
};

// POST /logout
exports.logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    return res.redirect('/login');
  });
};
