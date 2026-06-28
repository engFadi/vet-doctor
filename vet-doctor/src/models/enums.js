// ----------------------------------------------------------------------
// Shared enumerations (from the Final Report Detailed Class Model)
// Grows as later tasks add more entities. See docs/DOMAIN_MODEL.md.
// ----------------------------------------------------------------------

// Role discriminator for the single User table (RegisteredUser subclasses).
const ROLES = {
  CLIENT: 'client',
  VETERINARIAN: 'veterinarian',
  ADMIN: 'admin',
};

// AccountStatus enumeration.
const ACCOUNT_STATUS = {
  ACTIVE: 'ACTIVE',
  LOCKED: 'LOCKED',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  SUSPENDED: 'SUSPENDED',
};

// ServiceType enumeration (the three service types from the report).
const SERVICE_TYPE = {
  ROUTINE_CHECK_UP: 'ROUTINE_CHECK_UP',
  EMERGENCY_VISIT: 'EMERGENCY_VISIT',
  FARM_VISIT: 'FARM_VISIT',
};

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  SERVICE_TYPE,
};
