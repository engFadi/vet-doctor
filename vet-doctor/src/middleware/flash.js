// ----------------------------------------------------------------------
// Simple flash messages (Task 2)
// Stores one-time messages in the session and exposes them to views as
// res.locals.flash. Avoids an extra dependency (connect-flash).
// Usage in a controller:  req.flash('success', 'Logged in');
// Usage in a view:        flash.success / flash.error  (arrays)
// ----------------------------------------------------------------------
module.exports = function flash(req, res, next) {
  // Expose any messages set on the previous request, then clear them.
  res.locals.flash = req.session.flash || {};
  delete req.session.flash;

  req.flash = (type, message) => {
    if (!req.session.flash) req.session.flash = {};
    if (!req.session.flash[type]) req.session.flash[type] = [];
    req.session.flash[type].push(message);
  };

  next();
};
