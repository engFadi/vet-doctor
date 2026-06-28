// ----------------------------------------------------------------------
// MedicalRecord model (Task 12)
// Maps to the MedicalRecord class in docs/DOMAIN_MODEL.md. Created by a
// veterinarian after a completed visit and linked to the appointment,
// the animal, and the veterinarian (SR5.7-SR5.12).
// ----------------------------------------------------------------------
const { DataTypes } = require('sequelize');

const MAX_NOTES = 2000; // SR5.8

module.exports = (sequelize) => {
  const MedicalRecord = sequelize.define(
    'MedicalRecord',
    {
      appointmentId: { type: DataTypes.INTEGER, allowNull: false },
      animalId: { type: DataTypes.INTEGER, allowNull: false },
      veterinarianId: { type: DataTypes.INTEGER, allowNull: false },

      visitDate: { type: DataTypes.DATEONLY, allowNull: false },
      diagnosis: { type: DataTypes.TEXT, allowNull: true },
      // Post-visit notes, limited to 2,000 characters (SR5.7-SR5.8).
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: { len: [0, MAX_NOTES] },
      },
      // Stored filename of an attached file, if any (SR5.10).
      attachedFile: { type: DataTypes.STRING, allowNull: true },
    },
    {
      tableName: 'medical_records',
    }
  );

  MedicalRecord.associate = (db) => {
    MedicalRecord.belongsTo(db.Appointment, { as: 'appointment', foreignKey: 'appointmentId' });
    MedicalRecord.belongsTo(db.Animal, { as: 'animal', foreignKey: 'animalId' });
    MedicalRecord.belongsTo(db.User, { as: 'veterinarian', foreignKey: 'veterinarianId' });
    MedicalRecord.hasMany(db.Prescription, { as: 'prescriptions', foreignKey: 'medicalRecordId' });

    db.Appointment.hasOne(MedicalRecord, { as: 'medicalRecord', foreignKey: 'appointmentId' });
    db.Animal.hasMany(MedicalRecord, { as: 'medicalRecords', foreignKey: 'animalId' });
  };

  MedicalRecord.MAX_NOTES = MAX_NOTES;
  return MedicalRecord;
};
