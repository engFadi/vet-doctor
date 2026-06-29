// ----------------------------------------------------------------------
// Database configuration (Task 1)
// Single Sequelize instance connected to a local SQLite file.
// Models are registered against this instance from Task 2 onward.
// ----------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// Storage path comes from .env (DB_STORAGE).
//   Local:  ./data/vet_doctor.sqlite
//   Render: /var/data/vet_doctor.sqlite  (mounted persistent disk)
// Relative paths are resolved from the project root; absolute paths (e.g. a
// mounted disk) are used as-is.
const configuredStorage = process.env.DB_STORAGE || './data/vet_doctor.sqlite';
const storage = path.isAbsolute(configuredStorage)
  ? configuredStorage
  : path.join(__dirname, '..', '..', configuredStorage);

// Ensure the directory exists (SQLite will not create missing folders).
fs.mkdirSync(path.dirname(storage), { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  // Keep query logging off by default; flip via SQL_LOGGING=true in .env.
  logging: process.env.SQL_LOGGING === 'true' ? console.log : false,
});

// Verify the database is reachable (called on server startup).
async function connectDatabase() {
  await sequelize.authenticate();
}

// Create/update tables from the registered models.
// options.alter / options.force can be passed in later tasks.
async function syncDatabase(options = {}) {
  await sequelize.sync(options);
}

module.exports = {
  sequelize,
  Sequelize,
  connectDatabase,
  syncDatabase,
};
