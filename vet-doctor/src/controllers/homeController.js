// ----------------------------------------------------------------------
// Home controller
// Controllers handle request logic and render the matching view.
// ----------------------------------------------------------------------

// The three core service types from the Final Report (UR3 / SR3.1).
const SERVICES = [
  {
    name: 'Routine Check-Up',
    description: 'Scheduled home visits for vaccinations, wellness checks, and general care.',
  },
  {
    name: 'Emergency Visit',
    description: 'High-priority visits with a 15-minute veterinarian acknowledgement window.',
  },
  {
    name: 'Farm Visit',
    description: 'On-site care for livestock such as sheep, goats, cows, and chickens.',
  },
];

exports.home = (req, res) => {
  res.render('pages/home', {
    title: 'Vet Doctor - Home',
    services: SERVICES,
    notFound: false,
  });
};
