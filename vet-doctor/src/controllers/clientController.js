// ----------------------------------------------------------------------
// Client controller (Task 8)
// Animal profile management: a client adds and maintains profiles for their
// animals (Customer 1 --< Animal). This controller grows with later tasks
// (booking, payments, reviews).
// ----------------------------------------------------------------------
const db = require('../models');

const Animal = db.Animal;
const ANIMALS_LIST = '/client/animals';
const GENDERS = ['Male', 'Female', 'Unknown'];

// Load an animal owned by the logged-in client.
function findOwnAnimal(req, id) {
  return Animal.findOne({ where: { id, ownerId: req.session.user.id } });
}

// Validate + normalise submitted animal fields. Returns { data, errors }.
function parseAnimal(body) {
  const data = {
    name: (body.name || '').trim(),
    species: (body.species || '').trim(),
    breed: (body.breed || '').trim(),
    gender: (body.gender || '').trim(),
    age: null,
    weight: null,
  };
  const errors = [];

  if (!data.name) errors.push('Name is required.');
  if (!data.species) errors.push('Species is required.');

  const rawAge = (body.age || '').trim();
  if (rawAge !== '') {
    const age = Number(rawAge);
    if (!Number.isInteger(age) || age < 0) {
      errors.push('Age must be a whole number of years (0 or more).');
    } else {
      data.age = age;
    }
  }

  const rawWeight = (body.weight || '').trim();
  if (rawWeight !== '') {
    const weight = Number(rawWeight);
    if (Number.isNaN(weight) || weight < 0) {
      errors.push('Weight must be a non-negative number.');
    } else {
      data.weight = weight;
    }
  }

  if (data.gender && !GENDERS.includes(data.gender)) {
    errors.push('Please choose a valid gender.');
  }

  return { data, errors };
}

// GET /client/animals - list the client's animals
exports.listAnimals = async (req, res, next) => {
  try {
    const animals = await Animal.findAll({
      where: { ownerId: req.session.user.id },
      order: [['name', 'ASC']],
    });
    res.render('pages/client-animals', {
      title: 'My Animals - Vet Doctor',
      animals,
      genders: GENDERS,
      errors: [],
      form: {},
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/animals - create a new animal
exports.createAnimal = async (req, res, next) => {
  try {
    const { data, errors } = parseAnimal(req.body);

    if (errors.length > 0) {
      const animals = await Animal.findAll({
        where: { ownerId: req.session.user.id },
        order: [['name', 'ASC']],
      });
      return res.status(400).render('pages/client-animals', {
        title: 'My Animals - Vet Doctor',
        animals,
        genders: GENDERS,
        errors,
        form: req.body,
      });
    }

    await Animal.create({ ...data, ownerId: req.session.user.id });
    req.flash('success', `${data.name} has been added.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};

// GET /client/animals/:id/edit - edit form
exports.showEditForm = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }
    res.render('pages/client-animal-edit', {
      title: `Edit ${animal.name} - Vet Doctor`,
      animal,
      genders: GENDERS,
      errors: [],
      form: animal,
    });
  } catch (err) {
    next(err);
  }
};

// POST /client/animals/:id - update an animal
exports.updateAnimal = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }

    const { data, errors } = parseAnimal(req.body);
    if (errors.length > 0) {
      return res.status(400).render('pages/client-animal-edit', {
        title: `Edit ${animal.name} - Vet Doctor`,
        animal,
        genders: GENDERS,
        errors,
        form: { ...req.body, id: animal.id },
      });
    }

    await animal.updateDetails(data);
    req.flash('success', `${animal.name} has been updated.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};

// POST /client/animals/:id/delete - remove an animal
exports.deleteAnimal = async (req, res, next) => {
  try {
    const animal = await findOwnAnimal(req, req.params.id);
    if (!animal) {
      req.flash('error', 'Animal not found.');
      return res.redirect(ANIMALS_LIST);
    }
    const name = animal.name;
    await animal.destroy();
    req.flash('success', `${name} has been removed.`);
    return res.redirect(ANIMALS_LIST);
  } catch (err) {
    return next(err);
  }
};
