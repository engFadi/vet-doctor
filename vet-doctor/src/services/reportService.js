// ----------------------------------------------------------------------
// Report service (Task 20)
// Builds a monthly performance report (SR8.10-8.13): bookings by service
// type, total revenue, revenue by veterinarian, client acquisition &
// retention. Stores a PerformanceReport snapshot per period.
// ----------------------------------------------------------------------
const db = require('../models');
const { PAYMENT_STATUS, ROLES } = require('../models/enums');

const { Op } = db.Sequelize;

// Platform's retained margin (configurable), used for profit margin.
const PLATFORM_MARGIN = Number(process.env.PLATFORM_MARGIN) || 0.2;

// Current month as YYYY-MM.
function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

// Month boundaries for a YYYY-MM period.
function periodRange(period) {
  const [y, m] = period.split('-').map(Number);
  const start = `${period}-01`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const nextStart = `${next}-01`;
  return { start, nextStart };
}

async function generateReport(period) {
  const { start, nextStart } = periodRange(period);
  const startDate = new Date(`${start}T00:00:00`);
  const nextDate = new Date(`${nextStart}T00:00:00`);

  // --- Bookings by service type (SR8.10) ---
  const appointments = await db.Appointment.findAll({
    where: { appointmentDateTime: { [Op.gte]: startDate, [Op.lt]: nextDate } },
    include: [{ model: db.Service, as: 'service' }],
  });
  const bookingsByService = {};
  appointments.forEach((appt) => {
    const name = appt.service ? appt.service.name : 'Unknown';
    bookingsByService[name] = (bookingsByService[name] || 0) + 1;
  });
  const totalBookings = appointments.length;

  // --- Revenue: paid invoices issued in the period (SR8.11-8.12) ---
  const invoices = await db.Invoice.findAll({
    where: {
      status: PAYMENT_STATUS.PAID,
      issueDate: { [Op.gte]: start, [Op.lt]: nextStart },
    },
    include: [
      {
        model: db.Appointment,
        as: 'appointment',
        include: [{ model: db.User, as: 'veterinarian', attributes: ['id', 'fullName'] }],
      },
    ],
  });
  let totalRevenue = 0;
  const revenueByVet = {};
  invoices.forEach((inv) => {
    const amount = Number(inv.totalAmount);
    totalRevenue += amount;
    const vet = inv.appointment && inv.appointment.veterinarian;
    const name = vet ? `Dr. ${vet.fullName}` : 'Unassigned';
    revenueByVet[name] = (revenueByVet[name] || 0) + amount;
  });
  const profitMargin = totalRevenue * PLATFORM_MARGIN;

  // --- Client acquisition & retention (SR8.13) ---
  const newClients = await db.User.count({
    where: {
      role: ROLES.CLIENT,
      registrationDate: { [Op.gte]: startDate, [Op.lt]: nextDate },
    },
  });

  const monthClientIds = [...new Set(appointments.map((a) => a.clientId))];
  let returningClients = 0;
  for (const clientId of monthClientIds) {
    const earlier = await db.Appointment.count({
      where: { clientId, appointmentDateTime: { [Op.lt]: startDate } },
    });
    if (earlier > 0) returningClients += 1;
  }
  const retentionRate = monthClientIds.length
    ? Math.round((returningClients / monthClientIds.length) * 100)
    : 0;

  // Persist a snapshot of the summary figures.
  await db.PerformanceReport.upsert({
    reportPeriod: period,
    generatedDate: new Date().toISOString().slice(0, 10),
    totalBookings,
    totalRevenue,
    profitMargin,
  });

  return {
    period,
    bookingsByService,
    totalBookings,
    totalRevenue,
    revenueByVet,
    profitMargin,
    newClients,
    activeClients: monthClientIds.length,
    returningClients,
    retentionRate,
  };
}

module.exports = { generateReport, currentPeriod, PLATFORM_MARGIN };
