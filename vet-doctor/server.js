// ----------------------------------------------------------------------
// Vet Doctor - Application entry point
// Task 0: Express server + EJS views + MVC wiring.
// ----------------------------------------------------------------------
require('dotenv').config();

const path = require('path');
const express = require('express');

const indexRoutes = require('./src/routes/indexRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine: EJS, with views stored under src/views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Body parsers (ready for forms in later tasks)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static assets (CSS, JS, images) served from /public
app.use(express.static(path.join(__dirname, 'public')));

// Routes (MVC: routes -> controllers -> views)
app.use('/', indexRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/home', {
    title: 'Page not found',
    notFound: true,
  });
});

app.listen(PORT, () => {
  console.log(`Vet Doctor server running at http://localhost:${PORT}`);
});

module.exports = app;
