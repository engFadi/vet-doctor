// ----------------------------------------------------------------------
// Database configuration (Task 1)
// Single Sequelize instance connected to a local SQLite file.
// Models are registered against this instance from Task 2 onward.
// ----------------------------------------------------------------------
const path = require('path');
const { Sequelize } = require('sequelize');

// Storage path comes from .env (DB_STORAGE); default to ./database.sqlite
// at the project root. Relative paths are resolved from the project root.
const configuredStorage = process.env.DB_STORAGE || './database.sqlite';
const storage = path.isAbsolute(configuredStorage)
  ? configuredStorage
  : path.join(__dirname, '..', '..', configuredStorage);

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
