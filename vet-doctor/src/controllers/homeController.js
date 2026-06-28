// ----------------------------------------------------------------------
// Home controller
// Controllers handle request logic and render the matching view.
// Services are read from the database (seeded in Task 6).
// ----------------------------------------------------------------------
const db = require('../models');

exports.home = async (req, res, next) => {
  try {
    const services = await db.Service.findAll({ order: [['id', 'ASC']] });
    res.render('pages/home', {
      title: 'Vet Doctor - Home',
      services,
      notFound: false,
    });
  } catch (err) {
    next(err);
  }
};
