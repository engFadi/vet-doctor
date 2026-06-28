// ----------------------------------------------------------------------
// Admin seeder (Task 4)
// Creates the single pre-configured administrator account (SR1.8).
// Idempotent: does nothing if an admin already exists.
// Credentials come from .env (ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME).
// ----------------------------------------------------------------------
const db = require('../src/models');
const { ROLES, ACCOUNT_STATUS } = require('../src/models/enums');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@vetdoctor.com').toLowerCase();

  const existing = await db.User.findOne({ where: { role: ROLES.ADMIN } });
  if (existing) {
    return existing;
  }

  const admin = await db.User.create({
    role: ROLES.ADMIN,
    fullName: process.env.ADMIN_NAME || 'System Administrator',
    email,
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  });

  console.log(`Seeded administrator account: ${email}`);
  return admin;
}

module.exports = { seedAdmin };

// Allow running this seeder on its own:  node seeders/adminSeeder.js
if (require.main === module) {
  require('dotenv').config();
  (async () => {
    try {
      await db.connectDatabase();
      await db.syncDatabase();
      await seedAdmin();
      process.exit(0);
    } catch (err) {
      console.error('Admin seed failed:', err.message);
      process.exit(1);
    }
  })();
}
