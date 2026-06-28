# Vet Doctor

A veterinary **home-visit platform** that connects clients, pet owners, and farmers with
licensed veterinarians who travel to homes or farms. Vet Doctor replaces manual phone-based
booking with an online system for booking visits, managing appointments, processing payments,
collecting reviews, and generating reports.

This repository implements the system described in the Software Engineering (COMP433) Final
Report for **Vet Doctor (Group 10)**, built gradually as a series of small, GitHub-friendly tasks.

---

## Technology stack

- **JavaScript** (no TypeScript)
- **Node.js** + **Express.js** — web server and routing
- **EJS** — server-rendered templates
- **SQLite** + **Sequelize ORM** — relational data storage (added in Task 1)
- **bcrypt** — password hashing (Task 2)
- **express-session** + flash messages — sessions and user feedback (Task 2)
- **dotenv** — environment configuration
- **Bootstrap / simple CSS** — styling
- **MVC architecture** — routes / controllers / models / services / views

### MVC conventions

| Layer         | Responsibility                                                        |
| ------------- | --------------------------------------------------------------------- |
| `routes/`     | Define endpoints only; delegate to controllers                        |
| `controllers/`| Handle request logic, validation, and choose the view/redirect        |
| `models/`     | Sequelize entities and database relationships                         |
| `services/`   | Mocked external services (Payment Gateway, Notification Service)       |
| `middleware/` | Auth guards, role checks, request helpers                             |
| `views/`      | EJS templates (`pages/`, `partials/`, `layouts/`)                     |

---

## Project structure

```
vet-doctor/
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── server.js
├── src/
│   ├── config/          # database.js (Sequelize) - Task 1
│   ├── models/          # Sequelize models - Task 2+
│   ├── controllers/     # request logic
│   │   └── homeController.js
│   ├── routes/
│   │   └── indexRoutes.js
│   ├── middleware/      # auth / role guards - Task 2+
│   ├── services/        # mocked Payment Gateway & Notification Service - later
│   └── views/
│       ├── layouts/
│       ├── partials/    # header.ejs, footer.ejs
│       └── pages/       # home.ejs
├── public/
│   ├── css/style.css
│   ├── js/
│   └── images/
└── seeders/             # demo data - Task 21
```

---

## Installation

Requires **Node.js 18+** (developed on Node 22).

```bash
# from the vet-doctor/ folder
npm install
```

Then create your local environment file:

```bash
cp .env.example .env      # Windows PowerShell: copy .env.example .env
```

Edit `.env` if needed (default port is `3000`).

---

## Running the app

```bash
npm start        # start the server
npm run dev      # start with auto-reload (node --watch)
```

Then open **http://localhost:3000** in your browser.

---

## Database setup

> SQLite + Sequelize are introduced in **Task 1**. Until then no database is required.

From Task 1 onward, the SQLite database file (`database.sqlite`) is created automatically on
first run from the Sequelize models. The database file is git-ignored. Demo data is seeded in
**Task 21** via:

```bash
node seeders/index.js     # (added in Task 21)
```

---

## Demo credentials

> _Placeholder — populated in Task 4 (admin seed) and Task 21 (demo data)._

| Role          | Email                | Password   |
| ------------- | -------------------- | ---------- |
| Administrator | _added in Task 4_    | _TBD_      |
| Veterinarian  | _added in Task 21_   | _TBD_      |
| Client        | _added in Task 21_   | _TBD_      |

---

## Development task checklist

The system is built incrementally. Each task is one logical commit.

- [x] **Task 0** — Project setup and MVC structure
- [ ] **Task 1** — SQLite + Sequelize database configuration
- [ ] **Task 2** — User model, roles, authentication, sessions, password hashing
- [ ] **Task 3** — Client and veterinarian registration
- [ ] **Task 4** — Admin seed account and role-based dashboards
- [ ] **Task 5** — Veterinarian approval workflow
- [ ] **Task 6** — Services and service pricing
- [ ] **Task 7** — Availability slots management
- [ ] **Task 8** — Animal profiles
- [ ] **Task 9** — Appointment booking flow
- [ ] **Task 10** — Emergency booking acknowledgement and reassignment logic
- [ ] **Task 11** — Appointment status tracking and notifications
- [ ] **Task 12** — Medical records and prescriptions
- [ ] **Task 13** — Invoice and payment workflow
- [ ] **Task 14** — Mock payment gateway
- [ ] **Task 15** — Payment history and invoice download/view
- [ ] **Task 16** — Review submission and duplicate prevention
- [ ] **Task 17** — Review moderation and veterinarian average rating
- [ ] **Task 18** — Consultation requests
- [ ] **Task 19** — Admin user management
- [ ] **Task 20** — Admin reports
- [ ] **Task 21** — Seed demo data
- [ ] **Task 22** — UI cleanup and Bootstrap styling
- [ ] **Task 23** — Final testing and README update

---

## GitHub commit plan

Suggested one-commit-per-task history:

| Task | Suggested commit message                          |
| ---- | ------------------------------------------------- |
| 0    | Set up Express project structure                  |
| 1    | Add SQLite and Sequelize configuration            |
| 2    | Add user model and authentication                 |
| 3    | Add client and veterinarian registration          |
| 4    | Add role-based dashboards                          |
| 5    | Add admin veterinarian approval workflow          |
| 6    | Add service and pricing management                |
| 7    | Add availability slot management                  |
| 8    | Add animal profiles                               |
| 9    | Add appointment booking workflow                  |
| 10   | Add emergency booking acknowledgement flow        |
| 11   | Add appointment status tracking and notifications |
| 12   | Add medical records and prescriptions             |
| 13   | Add payment and invoice workflow                  |
| 14   | Add mock payment gateway                          |
| 15   | Add payment history and invoice download          |
| 16   | Add review submission and duplicate prevention    |
| 17   | Add review moderation and average rating          |
| 18   | Add consultation request workflow                 |
| 19   | Add admin user management                         |
| 20   | Add admin reports                                 |
| 21   | Add seed data and demo accounts                   |
| 22   | Polish UI and update README                       |
| 23   | Final testing and README update                   |

---

## Actors (from the Final Report)

- **Client** — pet owners and farmers who book visits, pay, and review.
- **Veterinarian** — activated only after Administrator approval; manages availability and assigned visits.
- **Administrator** — pre-configured owner; approves vets, manages users, sets pricing, moderates reviews, runs reports.
- **Payment Gateway** _(external, mocked)_ — authorises/processes card payments.
- **Notification Service** _(external, mocked)_ — sends confirmations, reminders, and invoices.

## Service types

Routine Check-Up · Emergency Visit · Farm Visit
