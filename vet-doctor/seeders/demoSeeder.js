// ----------------------------------------------------------------------
// Demo data seeder (Task 21)
// Seeds realistic demo accounts, animals, slots, and sample appointments so
// the app is presentable out of the box. Idempotent: does nothing if the
// demo data already exists. Run with:  node seeders/demoSeeder.js
// ----------------------------------------------------------------------
const db = require('../src/models');
const {
  ROLES,
  ACCOUNT_STATUS,
  SERVICE_TYPE,
  AVAILABILITY_STATUS,
  APPOINTMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  REVIEW_STATUS,
} = require('../src/models/enums');
const { seedServices } = require('./serviceSeeder');
const invoiceService = require('../src/services/invoiceService');
const reviewService = require('../src/services/reviewService');

const PASSWORD = 'Demo123!';

function dateOnly(d) {
  return d.toISOString().slice(0, 10);
}
function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

async function seedDemo() {
  // Idempotency guard.
  const existing = await db.User.findOne({ where: { email: 'john@demo.com' } });
  if (existing) {
    console.log('Demo data already present - skipping.');
    return;
  }

  await seedServices();
  const services = {};
  for (const s of await db.Service.findAll()) services[s.serviceType] = s;

  // --- Veterinarians (approved) ---
  const lina = await db.User.create({
    role: ROLES.VETERINARIAN, fullName: 'Lina Haddad', email: 'drlina@demo.com',
    password: PASSWORD, phoneNumber: '0599-100-100', accountStatus: ACCOUNT_STATUS.ACTIVE,
    isApproved: true, licenseNumber: 'VET-1001', specialization: 'Small Animal Surgery',
    serviceArea: 'Ramallah', yearsOfExperience: 8,
  });
  const omar = await db.User.create({
    role: ROLES.VETERINARIAN, fullName: 'Omar Khalil', email: 'dromar@demo.com',
    password: PASSWORD, phoneNumber: '0599-200-200', accountStatus: ACCOUNT_STATUS.ACTIVE,
    isApproved: true, licenseNumber: 'VET-1002', specialization: 'Livestock',
    serviceArea: 'Nablus', yearsOfExperience: 12,
  });

  // --- Clients ---
  const john = await db.User.create({
    role: ROLES.CLIENT, fullName: 'John Saleh', email: 'john@demo.com', password: PASSWORD,
    phoneNumber: '0598-111-111', address: 'Ramallah', customerType: 'Pet Owner',
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  });
  const sara = await db.User.create({
    role: ROLES.CLIENT, fullName: 'Sara Yousef', email: 'sara@demo.com', password: PASSWORD,
    phoneNumber: '0598-222-222', address: 'Nablus', customerType: 'Farmer',
    accountStatus: ACCOUNT_STATUS.ACTIVE,
  });

  // --- Animals ---
  const buddy = await db.Animal.create({
    ownerId: john.id, name: 'Buddy', species: 'Dog', breed: 'Labrador', age: 4,
    weight: 28.5, gender: 'Male',
  });
  await db.Animal.create({
    ownerId: sara.id, name: 'Bella', species: 'Cat', breed: 'Persian', age: 2,
    weight: 4.2, gender: 'Female',
  });
  const daisy = await db.Animal.create({
    ownerId: sara.id, name: 'Daisy', species: 'Cow', breed: 'Holstein', age: 3,
    weight: 550, gender: 'Female',
  });

  // --- Availability slots (future, AVAILABLE for browsing/booking) ---
  for (let d = 1; d <= 5; d += 1) {
    const date = dateOnly(daysFromNow(d));
    await db.AvailabilitySlot.create({ veterinarianId: lina.id, date, startTime: '09:00', endTime: '10:00', status: AVAILABILITY_STATUS.AVAILABLE });
    await db.AvailabilitySlot.create({ veterinarianId: lina.id, date, startTime: '10:00', endTime: '11:00', status: AVAILABILITY_STATUS.AVAILABLE });
    await db.AvailabilitySlot.create({ veterinarianId: omar.id, date, startTime: '13:00', endTime: '14:00', status: AVAILABILITY_STATUS.AVAILABLE });
  }

  // --- Completed appointment (this month) with invoice, record, review ---
  const pastDate = daysFromNow(-5);
  const pastSlot = await db.AvailabilitySlot.create({
    veterinarianId: lina.id, date: dateOnly(pastDate), startTime: '09:00', endTime: '10:00',
    status: AVAILABILITY_STATUS.BOOKED,
  });
  const completed = await db.Appointment.create({
    clientId: john.id, veterinarianId: lina.id, serviceId: services[SERVICE_TYPE.ROUTINE_CHECK_UP].id,
    animalId: buddy.id, slotId: pastSlot.id,
    appointmentDateTime: new Date(`${dateOnly(pastDate)}T09:00:00`),
    visitLocation: 'Ramallah', reasonForVisit: 'Annual check-up and vaccination',
    status: APPOINTMENT_STATUS.COMPLETED,
  });

  const record = await db.MedicalRecord.create({
    appointmentId: completed.id, animalId: buddy.id, veterinarianId: lina.id,
    visitDate: dateOnly(pastDate), diagnosis: 'Healthy', notes: 'Vaccinations up to date.',
  });
  await db.Prescription.create({
    medicalRecordId: record.id, medicationName: 'Rabies vaccine', dosage: '1 dose',
    frequency: 'Annual', duration: '-', issuedDate: dateOnly(pastDate),
  });

  const invoice = await invoiceService.ensureInvoiceForAppointment(completed);
  invoice.status = PAYMENT_STATUS.PAID;
  invoice.issueDate = dateOnly(pastDate);
  await invoice.save();
  await db.Payment.create({
    invoiceId: invoice.id, amount: invoice.totalAmount, paymentMethod: PAYMENT_METHOD.CASH_ON_DELIVERY,
    paymentStatus: PAYMENT_STATUS.PAID, paymentDate: pastDate,
  });

  await db.Review.create({
    appointmentId: completed.id, clientId: john.id, veterinarianId: lina.id,
    rating: 5, reviewText: 'Dr. Lina was excellent and gentle with Buddy.',
    status: REVIEW_STATUS.APPROVED,
  });
  await reviewService.recalcAverage(lina.id);

  // --- Upcoming confirmed appointment ---
  const upSlot = await db.AvailabilitySlot.create({
    veterinarianId: omar.id, date: dateOnly(daysFromNow(2)), startTime: '13:00', endTime: '14:00',
    status: AVAILABILITY_STATUS.BOOKED,
  });
  await db.Appointment.create({
    clientId: sara.id, veterinarianId: omar.id, serviceId: services[SERVICE_TYPE.FARM_VISIT].id,
    animalId: daisy.id, slotId: upSlot.id,
    appointmentDateTime: new Date(`${dateOnly(daysFromNow(2))}T13:00:00`),
    visitLocation: 'Nablus farm', reasonForVisit: 'Livestock wellness check',
    status: APPOINTMENT_STATUS.CONFIRMED,
  });

  console.log('Seeded demo data: 2 vets, 2 clients, 3 animals, slots, and 2 appointments.');
}

module.exports = { seedDemo };

if (require.main === module) {
  require('dotenv').config();
  (async () => {
    try {
      await db.connectDatabase();
      await db.syncDatabase();
      await seedDemo();
      process.exit(0);
    } catch (err) {
      console.error('Demo seed failed:', err.message);
      process.exit(1);
    }
  })();
}
