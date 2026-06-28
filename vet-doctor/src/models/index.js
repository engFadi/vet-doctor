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

// --- Register models ---
db.User = require('./User')(sequelize);
db.Service = require('./Service')(sequelize);
db.AvailabilitySlot = require('./AvailabilitySlot')(sequelize);
db.Animal = require('./Animal')(sequelize);

// --- Define associations (once all models are loaded) ---
Object.values(db).forEach((model) => {
  if (model && typeof model.associate === 'function') {
    model.associate(db);
  }
});

module.exports = db;
