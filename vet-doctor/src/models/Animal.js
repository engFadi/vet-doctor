// ----------------------------------------------------------------------
// Animal model (Task 8)
// Maps to the Animal class in docs/DOMAIN_MODEL.md. Each animal belongs to
// one client (Customer). Animals are attached to bookings and medical
// records in later tasks.
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Animal = sequelize.define(
    'Animal',
    {
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      species: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      breed: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      age: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0 },
      },
      weight: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        validate: { min: 0 },
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'animals',
    }
  );

  // An animal belongs to the client who owns it.
  Animal.associate = (db) => {
    Animal.belongsTo(db.User, { as: 'owner', foreignKey: 'ownerId' });
    db.User.hasMany(Animal, { as: 'animals', foreignKey: 'ownerId' });
  };

  // --- Operations from the class model ---
  Animal.prototype.getProfile = function getProfile() {
    const parts = [this.name, this.species, this.breed].filter(Boolean);
    return parts.join(' - ');
  };

  Animal.prototype.updateDetails = async function updateDetails(details) {
    Object.assign(this, details);
    await this.save();
  };

  return Animal;
};
