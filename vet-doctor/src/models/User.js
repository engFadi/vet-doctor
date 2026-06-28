// ----------------------------------------------------------------------
// User model (Task 2)
// Implements RegisteredUser + its subclasses (Customer, Veterinarian,
// Administrator) as a single table with a `role` discriminator, per
// docs/DOMAIN_MODEL.md. Role-specific columns are nullable.
// ----------------------------------------------------------------------
const bcrypt = require('bcrypt');
const { DataTypes } = require('sequelize');
const { ROLES, ACCOUNT_STATUS } = require('./enums');

const SALT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 5; // SR2.4
const LOCK_MINUTES = 15; // SR2.4

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      // --- RegisteredUser (shared) ---
      role: {
        type: DataTypes.ENUM(...Object.values(ROLES)),
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }, // SR1.3
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      // Transient field: set `password` and the hooks hash it into passwordHash.
      password: {
        type: DataTypes.VIRTUAL,
        set(value) {
          this.setDataValue('password', value);
        },
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      accountStatus: {
        type: DataTypes.ENUM(...Object.values(ACCOUNT_STATUS)),
        allowNull: false,
        defaultValue: ACCOUNT_STATUS.ACTIVE,
      },
      registrationDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      failedLoginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      // Implementation support for the 15-minute lock window (SR2.4).
      lockedUntil: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // --- Customer-specific ---
      customerType: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // --- Veterinarian-specific ---
      licenseNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      specialization: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      serviceArea: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      yearsOfExperience: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      profilePhoto: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      averageRating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0,
      },
      isApproved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'users',
      hooks: {
        // Hash the password whenever it is set (create or update).
        // Runs before validation so the notNull check on passwordHash passes.
        beforeValidate: async (user) => {
          if (user.password) {
            user.passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS); // SR1.7
          }
        },
      },
      defaultScope: {
        // Never expose the hash by default.
        attributes: { exclude: ['passwordHash'] },
      },
      scopes: {
        // Use User.scope('withPassword') when you need to verify a login.
        withPassword: { attributes: { include: ['passwordHash'] } },
      },
    }
  );

  // --- Instance methods (map to RegisteredUser operations) ---

  // SR2.2: verify a submitted password against the stored hash.
  User.prototype.validatePassword = function validatePassword(plainPassword) {
    if (!this.passwordHash) return Promise.resolve(false);
    return bcrypt.compare(plainPassword, this.passwordHash);
  };

  // True while the account is locked and the lock window has not passed.
  User.prototype.isLocked = function isLocked() {
    if (this.accountStatus !== ACCOUNT_STATUS.LOCKED) return false;
    if (!this.lockedUntil) return true;
    return new Date(this.lockedUntil) > new Date();
  };

  // Record a failed login; lock the account after MAX_FAILED_ATTEMPTS (SR2.4).
  User.prototype.registerFailedLogin = async function registerFailedLogin() {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      this.accountStatus = ACCOUNT_STATUS.LOCKED;
      this.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    }
    await this.save();
  };

  // Clear the lock/counter after a successful login or once the window passes.
  User.prototype.clearLoginAttempts = async function clearLoginAttempts() {
    const wasLocked = this.accountStatus === ACCOUNT_STATUS.LOCKED;
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    if (wasLocked) this.accountStatus = ACCOUNT_STATUS.ACTIVE;
    await this.save();
  };

  // Minimal, safe object to keep in the session.
  User.prototype.toSession = function toSession() {
    return {
      id: this.id,
      role: this.role,
      fullName: this.fullName,
      email: this.email,
    };
  };

  // Expose constants for controllers.
  User.MAX_FAILED_ATTEMPTS = MAX_FAILED_ATTEMPTS;
  User.LOCK_MINUTES = LOCK_MINUTES;

  return User;
};
