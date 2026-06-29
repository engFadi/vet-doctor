// ----------------------------------------------------------------------
// Review service (Task 17)
// Automated content moderation (SR9.10) and veterinarian average-rating
// recalculation (SR9.13 / SR9.15 / SR4.5).
// ----------------------------------------------------------------------
const db = require('../models');
const { REVIEW_STATUS } = require('../models/enums');

// A simple banned-word list for the automated moderation check. A real
// system would use a moderation API; this keeps the project dependency-free.
const BANNED_WORDS = [
  'badword',
  'scam',
  'idiot',
  'stupid',
  'hate',
  'awful-slur',
];

// SR9.10: flag a review whose text contains inappropriate language.
function isFlagged(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

// SR9.13 / SR9.15: recompute a veterinarian's average rating from approved
// reviews and store it on the user (SR4.5).
async function recalcAverage(veterinarianId) {
  const reviews = await db.Review.findAll({
    where: { veterinarianId, status: REVIEW_STATUS.APPROVED },
    attributes: ['rating'],
  });

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  await db.User.update(
    { averageRating: Number(average.toFixed(2)) },
    { where: { id: veterinarianId } }
  );

  return { average, count: reviews.length };
}

module.exports = { BANNED_WORDS, isFlagged, recalcAverage };
