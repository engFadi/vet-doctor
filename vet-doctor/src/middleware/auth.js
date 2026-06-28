// ----------------------------------------------------------------------
// Authentication & authorization middleware (Task 2)
// ----------------------------------------------------------------------

// Make the logged-in user available to every view as `currentUser`.
function attachUser(req, res, next) {
  res.locals.currentUser = req.session.user || null;
  next();
}

// Block access to pages that require a logged-in user.
function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }
  return next();
}

// Restrict a route to one or more roles (e.g. requireRole('admin')).
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.session.user;
    if (!user) {
      req.flash('error', 'Please log in to continue.');
      return res.redirect('/login');
    }
    if (!roles.includes(user.role)) {
      return res.status(403).render('pages/error', {
        title: 'Access denied',
        message: 'You do not have permission to view this page.',
      });
    }
    return next();
  };
}

// Keep logged-in users away from the login/register pages.
function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect('/');
  }
  return next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireRole,
  redirectIfAuthenticated,
};
