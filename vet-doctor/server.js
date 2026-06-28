// ----------------------------------------------------------------------
// Vet Doctor - Application entry point
// Task 0: Express server + EJS views + MVC wiring.
// ----------------------------------------------------------------------
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const db = require('./src/models');
const flash = require('./src/middleware/flash');
const { attachUser } = require('./src/middleware/auth');
const indexRoutes = require('./src/routes/indexRoutes');
const authRoutes = require('./src/routes/authRoutes');
const registerRoutes = require('./src/routes/registerRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const vetRoutes = require('./src/routes/vetRoutes');
const clientRoutes = require('./src/routes/clientRoutes');
const { seedAdmin } = require('./seeders/adminSeeder');
const { seedServices } = require('./seeders/serviceSeeder');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine: EJS, with views stored under src/views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Display currency, available to every view as `currency`.
app.locals.currency = process.env.CURRENCY || 'ILS';

// Appointment status label helper, available to every view as `statusLabel`.
app.locals.statusLabel = require('./src/utils/appointmentStatus').statusLabel;

// Body parsers (ready for forms in later tasks)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets (CSS, JS, images) served from /public
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (express-session) + flash messages + current user in views
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'vet-doctor-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
    },
  })
);
app.use(flash);
app.use(attachUser);

// Routes (MVC: routes -> controllers -> views)
app.use('/', authRoutes);
app.use('/register', registerRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/vet', vetRoutes);
app.use('/client', clientRoutes);
app.use('/', indexRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/home', {
    title: 'Page not found',
    notFound: true,
  });
});

// Start the server only after the database connection is verified.
async function start() {
  try {
    await db.connectDatabase();
    console.log('Database connection established (SQLite).');

    await db.syncDatabase();
    console.log('Database synced.');

    await seedAdmin();
    await seedServices();

    app.listen(PORT, () => {
      console.log(`Vet Doctor server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server - database error:', error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
