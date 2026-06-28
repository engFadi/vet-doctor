// ----------------------------------------------------------------------
// Model registry (Task 1)
// Central place where all Sequelize models are loaded and their
// associations are defined. Models themselves are added from Task 2 onward.
// ----------------------------------------------------------------------
const { sequelize, Sequelize, connectDatabase, syncDatabase } = require('../config/database');

const db = {
  sequelize,
  Sequelize,
  connectDatabase,
  syncDatabase,
};

// Models are registered here in later tasks, e.g.:
//   db.User = require('./User')(sequelize);
// After all models are loaded, their associations are defined:
//   Object.values(db).forEach((m) => m.associate && m.associate(db));

module.exports = db;
