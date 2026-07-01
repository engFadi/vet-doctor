// ----------------------------------------------------------------------
// Veterinarian directory (Task 17)
// Lets logged-in users browse approved veterinarians, see each one's average
// rating (SR4.5) and the most recent approved reviews (SR4.6).
// ----------------------------------------------------------------------
const db = require('../models');
const { ROLES, ACCOUNT_STATUS, REVIEW_STATUS } = require('../models/enums');

const { Op } = db.Sequelize;
const User = db.User;
const Review = db.Review;

// GET /veterinarians - list approved, active veterinarians (with search)
exports.listVets = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    const where = {
      role: ROLES.VETERINARIAN,
      isApproved: true,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
    };
    // SR4.7: search by name or specialization (case-insensitive).
    if (q) {
      where[Op.or] = [
        { fullName: { [Op.like]: `%${q}%` } },
        { specialization: { [Op.like]: `%${q}%` } },
      ];
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

    res.render('pages/vet-directory', {
      title: 'Veterinarians - Vet Doctor',
      vets,
      countMap,
      q,
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
