// ----------------------------------------------------------------------
// Auth controller (Task 2)
// Implements the Log In use case: validate credentials, reject invalid or
// inactive accounts, lock after repeated failures, create a session.
// ----------------------------------------------------------------------
const db = require('../models');
const { ACCOUNT_STATUS } = require('../models/enums');

const User = db.User;

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
        return renderLoginError(
          res,
          email,
          `Your account is locked due to repeated failed logins. Try again in about ${User.LOCK_MINUTES} minutes.`,
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

    // SR2.2 / SR2.3: verify the password.
    const ok = await user.validatePassword(password);
    if (!ok) {
      await user.registerFailedLogin(); // SR2.4: lock after 5 failures
      const remaining = User.MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;
      const hint =
        user.accountStatus === ACCOUNT_STATUS.LOCKED
          ? `Account locked for ${User.LOCK_MINUTES} minutes after too many attempts.`
          : `Invalid email or password. ${remaining} attempt(s) left before lock.`;
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
      return res.redirect('/');
    });
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
