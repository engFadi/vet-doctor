// ----------------------------------------------------------------------
// Veterinarian directory (Task 17)
// Lets logged-in users browse approved veterinarians, see each one's average
// rating (SR4.5) and the most recent approved reviews (SR4.6).
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS, REVIEW_STATUS, AVAILABILITY_STATUS } = require('../models/enums');

const { Op } = db.Sequelize;
const User = db.User;
const Review = db.Review;
const Slot = db.AvailabilitySlot;

// GET /veterinarians - list approved, active veterinarians (search + filters)
exports.listVets = async (req, res, next) => {
  try {
    const filters = {
      q: (req.query.q || '').trim(),
      specialization: (req.query.specialization || '').trim(),
      location: (req.query.location || '').trim(),
      minRating: (req.query.minRating || '').trim(),
      date: (req.query.date || '').trim(),
    };

    const where = {
      role: ROLES.VETERINARIAN,
      isApproved: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };
    // Search by name or specialization (case-insensitive).
    if (filters.q) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${filters.q}%` } },
        { specialization: { [Op.like]: `%${filters.q}%` } },
      ];
    }
    // Filter: specialization, service location, minimum rating.
    if (filters.specialization) {
      where.specialization = { [Op.like]: `%${filters.specialization}%` };
    }
    if (filters.location) {
      where.serviceArea = { [Op.like]: `%${filters.location}%` };
    }
    if (filters.minRating && !Number.isNaN(Number(filters.minRating))) {
      where.averageRating = { [Op.gte]: Number(filters.minRating) };
    }
    // Filter: available on a specific date -> only vets with an AVAILABLE slot.
    if (filters.date) {
      const slots = await Slot.findAll({
        where: { date: filters.date, status: AVAILABILITY_STATUS.AVAILABLE },
        attributes: ['veterinarianId'],
        raw: true,
      });
      const vetIds = [...new Set(slots.map((s) => s.veterinarianId))];
      where.id = { [Op.in]: vetIds.length ? vetIds : [0] }; // [0] => no matches
    }

    const vets = await User.findAll({
      where,
      attributes: [
        'id', 'fullName', 'specialization', 'serviceArea',
        'yearsOfExperience', 'averageRating',
      ],
      order: [['averageRating', 'DESC']],
    });

    // Count approved reviews per vet for display.
    const counts = await Review.findAll({
      where: { status: REVIEW_STATUS.APPROVED },
      attributes: ['veterinarianId', [db.Sequelize.fn('COUNT', '*'), 'count']],
      group: ['veterinarianId'],
      raw: true,
    });
    const countMap = {};
    counts.forEach((c) => { countMap[c.veterinarianId] = Number(c.count); });

    // Availability: today's status (SR4.2) + next available slot (SR4.3).
    const todayStr = new Date().toISOString().slice(0, 10);
    const in30Str = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const vetIds = vets.map((v) => v.id);
    const availabilityMap = {};
    if (vetIds.length) {
      const availSlots = await Slot.findAll({
        where: {
          veterinarianId: { [Op.in]: vetIds },
          status: AVAILABILITY_STATUS.AVAILABLE,
          date: { [Op.gte]: todayStr, [Op.lte]: in30Str },
        },
        order: [['date', 'ASC'], ['startTime', 'ASC']],
        raw: true,
      });
      availSlots.forEach((s) => {
        const a = availabilityMap[s.veterinarianId] || { today: false, days: {} };
        if (s.date === todayStr) a.today = true;
        // Group all available slots by date (SR4.3: next 30 days).
        if (!a.days[s.date]) a.days[s.date] = [];
        a.days[s.date].push(`${s.startTime}–${s.endTime}`);
        availabilityMap[s.veterinarianId] = a;
      });
    }

    res.render('pages/vet-directory', {
      title: 'Veterinarians - Vet Doctor',
      vets,
      countMap,
      availabilityMap,
      filters,
      today: todayStr,
    });
  } catch (err) {
    next(err);
  }
};

// GET /veterinarians/:id - a vet's public profile + recent approved reviews
exports.showVet = async (req, res, next) => {
  try {
    const vet = await User.findOne({
      where: {
        id: req.params.id,
        role: ROLES.VETERINARIAN,
        isApproved: true,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      },
      attributes: [
        'id', 'fullName', 'specialization', 'serviceArea',
        'yearsOfExperience', 'averageRating',
      ],
    });
    if (!vet) {
      req.flash('error', 'Veterinarian not found.');
      return res.redirect('/veterinarians');
    }

    // SR4.6: most recent 5 verified (approved) reviews.
    const reviews = await Review.findAll({
      where: { veterinarianId: vet.id, status: REVIEW_STATUS.APPROVED },
      include: [{ model: User, as: 'client', attributes: ['id', 'fullName'] }],
      order: [['submissionDate', 'DESC']],
      limit: 5,
    });

    res.render('pages/vet-profile', {
      title: `Dr. ${vet.fullName} - Vet Doctor`,
      vet,
      reviews,
    });
  } catch (err) {
    next(err);
  }
};
