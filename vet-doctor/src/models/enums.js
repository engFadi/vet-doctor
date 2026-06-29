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

// AvailabilityStatus enumeration (veterinarian time slots).
const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  BOOKED: 'BOOKED',
};

// AppointmentStatus enumeration (appointment lifecycle).
const APPOINTMENT_STATUS = {
  REQUESTED: 'REQUESTED', // newly booked
  VETERINARIAN_ASSIGNED: 'VETERINARIAN_ASSIGNED',
  CONFIRMED: 'CONFIRMED',
  EN_ROUTE: 'EN_ROUTE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  UNACKNOWLEDGED: 'UNACKNOWLEDGED',
  REASSIGNED: 'REASSIGNED',
  ESCALATED: 'ESCALATED',
};

// PaymentMethod enumeration.
const PAYMENT_METHOD = {
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  CREDIT_DEBIT_CARD: 'CREDIT_DEBIT_CARD',
};

// PaymentStatus enumeration (shared by Invoice and Payment).
const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

module.exports = {
  ROLES,
  ACCOUNT_STATUS,
  SERVICE_TYPE,
  AVAILABILITY_STATUS,
  APPOINTMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
};
