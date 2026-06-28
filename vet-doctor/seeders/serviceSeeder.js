// ----------------------------------------------------------------------
// Service seeder (Task 6)
// Seeds the three service types with default prices and durations.
// Idempotent: only creates a service type that does not already exist, so
// admin price changes are never overwritten on restart.
// ----------------------------------------------------------------------
const db = require('../src/models');
const { SERVICE_TYPE } = require('../src/models/enums');

const DEFAULT_SERVICES = [
  {
    serviceType: SERVICE_TYPE.ROUTINE_CHECK_UP,
    name: 'Routine Check-Up',
    description:
      'Scheduled home visit for vaccinations, wellness checks, and general care.',
    basePrice: 50.0,
    estimatedDuration: 30,
  },
  {
    serviceType: SERVICE_TYPE.EMERGENCY_VISIT,
    name: 'Emergency Visit',
    description:
      'High-priority visit with a 15-minute veterinarian acknowledgement window.',
    basePrice: 120.0,
    estimatedDuration: 45,
  },
  {
    serviceType: SERVICE_TYPE.FARM_VISIT,
    name: 'Farm Visit',
    description: 'On-site care for livestock such as sheep, goats, cows, and chickens.',
    basePrice: 90.0,
    estimatedDuration: 60,
  },
];

async function seedServices() {
  let created = 0;
  for (const data of DEFAULT_SERVICES) {
    const [, wasCreated] = await db.Service.findOrCreate({
      where: { serviceType: data.serviceType },
      defaults: data,
    });
    if (wasCreated) created += 1;
  }
  if (created > 0) {
    console.log(`Seeded ${created} service(s).`);
  }
}

module.exports = { seedServices };

// Allow running this seeder on its own:  node seeders/serviceSeeder.js
if (require.main === module) {
  require('dotenv').config();
  (async () => {
    try {
      await db.connectDatabase();
      await db.syncDatabase();
      await seedServices();
      process.exit(0);
    } catch (err) {
      console.error('Service seed failed:', err.message);
      process.exit(1);
    }
  })();
}
