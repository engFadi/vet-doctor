// ----------------------------------------------------------------------
// Prescription model (Task 12)
// Maps to the Prescription class in docs/DOMAIN_MODEL.md. Belongs to a
// medical record (SR5.9).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Prescription = sequelize.define(
    'Prescription',
    {
      medicalRecordId: { type: DataTypes.INTEGER, allowNull: false },
      medicationName: { type: DataTypes.STRING, allowNull: false },
      dosage: { type: DataTypes.STRING, allowNull: true },
      frequency: { type: DataTypes.STRING, allowNull: true },
      duration: { type: DataTypes.STRING, allowNull: true },
      instructions: { type: DataTypes.TEXT, allowNull: true },
      issuedDate: { type: DataTypes.DATEONLY, allowNull: false },
    },
    {
      tableName: 'prescriptions',
    }
  );

  Prescription.associate = (db) => {
    Prescription.belongsTo(db.MedicalRecord, {
      as: 'medicalRecord',
      foreignKey: 'medicalRecordId',
    });
  };

  Prescription.prototype.getDetails = function getDetails() {
    return [this.medicationName, this.dosage, this.frequency, this.duration]
      .filter(Boolean)
      .join(' - ');
  };

  return Prescription;
};
