// ----------------------------------------------------------------------
// Validation helpers (Task 3)
// Encodes the registration rules from the Final Report (SR1.3, SR1.6).
// ----------------------------------------------------------------------

const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a digit, and a special character.';

// SR1.3: basic email format check (the User model also validates isEmail).
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// SR1.6: >= 8 chars, >= 1 uppercase, >= 1 digit, >= 1 special character.
// Returns an error string, or null when the password is valid.
function validatePassword(password) {
  if (!password || password.length < 8) return PASSWORD_RULE_MESSAGE;
  if (!/[A-Z]/.test(password)) return PASSWORD_RULE_MESSAGE;
  if (!/[0-9]/.test(password)) return PASSWORD_RULE_MESSAGE;
  if (!/[^A-Za-z0-9]/.test(password)) return PASSWORD_RULE_MESSAGE;
  return null;
}

// SR1.5: ensure every required field has a non-empty value.
// fields: { label: value }. Returns an array of error strings.
function requireFields(fields) {
  const errors = [];
  Object.entries(fields).forEach(([label, value]) => {
    if (!value || String(value).trim() === '') {
      errors.push(`${label} is required.`);
    }
  });
  return errors;
}

module.exports = {
  PASSWORD_RULE_MESSAGE,
  isValidEmail,
  validatePassword,
  requireFields,
};
