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

The administrator is seeded automatically on first run (configurable via `.env`).
Veterinarian and client demo accounts are added in Task 21.

| Role          | Email                  | Password    |
| ------------- | ---------------------- | ----------- |
| Administrator | `admin@vetdoctor.com`  | `Admin123!` |
| Veterinarian  | _added in Task 21_     | _TBD_       |
| Client        | _added in Task 21_     | _TBD_       |

> Change the admin credentials by setting `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`
> **before** the first run (the admin is only seeded when none exists).

---

## Development task checklist

The system is built incrementally. Each task is one logical commit. The requirement
codes in parentheses refer to the System Requirements (SR) and Use Cases in the Final Report.

- [x] **Task 0 — Project setup and MVC structure**
  Initialize the Node.js + Express app with EJS views, the MVC folder layout
  (routes / controllers / models / services / middleware / views), a home page, and base styling.

- [x] **Task 1 — SQLite + Sequelize database configuration**
  Configure a single SQLite-backed Sequelize instance, a central model registry, and connect/sync
  the database on server startup.

- [x] **Task 2 — User model, roles, authentication, sessions, password hashing**
  Implement the `RegisteredUser` model with a `role` discriminator (client/veterinarian/admin),
  bcrypt password hashing, session-based login/logout, and account lockout after failed attempts
  (SR1.7, SR2.1–SR2.4, Use Case: Log In).

- [x] **Task 3 — Client and veterinarian registration**
  Registration forms and validation: required fields, email format, unique email, and password
  strength rules. Clients become active immediately; veterinarians are created as pending approval
  (SR1.1–SR1.6, SR1.8, UR1).

- [x] **Task 4 — Admin seed account and role-based dashboards**
  Seed the single pre-configured administrator and route each user to a role-specific dashboard
  after login, with live admin metrics (SR1.8, SR8.1–SR8.2).

- [x] **Task 5 — Veterinarian approval workflow**
  Let the administrator review pending veterinarian registrations, verify credentials, and approve
  or reject them so approved vets can log in (SR8.5–SR8.7).

- [x] **Task 6 — Services and service pricing**
  Define the three service types (Routine Check-Up, Emergency Visit, Farm Visit) with base prices,
  and let the admin update service pricing (SR3.1, SR6.4, SR8.15).

- [x] **Task 7 — Availability slots management**
  Let veterinarians create and manage available/unavailable time slots; booked slots are marked
  unavailable so they cannot be double-booked (SR4.3–SR4.4, SR5.3–SR5.4).

- [x] **Task 8 — Animal profiles**
  Let clients add and manage profiles for their animals (species, breed, age, weight, gender) to
  attach to bookings and medical records.

- [x] **Task 9 — Appointment booking flow**
  Implement the core booking use case: choose service, animal, location, date/time, and a
  veterinarian (or auto-assign a matching one), creating the appointment and notifying both parties
  (SR3.1–SR3.8, UR3, Use Case: Book Appointment).

- [x] **Task 10 — Emergency booking acknowledgement and reassignment logic**
  Flag emergency visits as high priority, require the assigned vet to acknowledge within the
  deadline, and reassign or escalate if they do not respond (SR3.9–SR3.11, Use Case: Acknowledge
  Emergency Booking).

- [ ] **Task 11 — Appointment status tracking and notifications**
  Track the appointment lifecycle (Confirmed → En Route → In Progress → Completed), let clients
  follow status, and add the mocked Notification Service for confirmations and reminders
  (SR5.5–SR5.6, SR7.1–SR7.6).

- [ ] **Task 12 — Medical records and prescriptions**
  Let veterinarians add post-visit notes, medical records, and prescriptions for completed visits,
  linked to the relevant animal (SR5.7–SR5.12).

- [ ] **Task 13 — Invoice and payment workflow**
  Generate invoices from the base service charge plus post-visit charges, support cash and card
  payment methods, and track invoice/payment status (SR6.1–SR6.11, Use Case: Make Payment).

- [ ] **Task 14 — Mock payment gateway**
  Add a mocked external Payment Gateway (and Bank) that authorizes card payments and returns an
  approve/reject result, storing only a masked card reference (SR6.2, SR6.15–SR6.16).

- [ ] **Task 15 — Payment history and invoice download/view**
  Provide per-user payment history with date-range filtering and let users view/download invoices
  (SR6.11–SR6.14).

- [ ] **Task 16 — Review submission and duplicate prevention**
  Let clients submit one rating (1–5) and an optional review for a completed appointment, preventing
  duplicate or ineligible submissions (SR9.3–SR9.8, Use Case: Submit Review).

- [ ] **Task 17 — Review moderation and veterinarian average rating**
  Run content moderation on reviews, queue flagged ones for admin approval/removal, and recompute
  each veterinarian's average rating (SR9.10–SR9.15, SR4.5).

- [ ] **Task 18 — Consultation requests**
  Let clients request an online consultation for an active appointment and let the assigned vet
  accept or decline it (SR7.12–SR7.13).

- [ ] **Task 19 — Admin user management**
  Let the admin change account status (active, suspended, deactivated, deleted) and record each
  action with reason and timestamp (SR8.8–SR8.9).

- [ ] **Task 20 — Admin reports**
  Generate monthly performance reports: bookings by service type, total revenue, revenue by
  veterinarian, and export options (SR8.10–SR8.14).

- [ ] **Task 21 — Seed demo data**
  Seed realistic demo accounts (clients, approved vets), services, slots, animals, and sample
  appointments so the app is presentable out of the box.

- [ ] **Task 22 — UI cleanup and Bootstrap styling**
  Polish the interface and apply consistent Bootstrap/CSS styling across all pages.

- [ ] **Task 23 — Final testing and README update**
  End-to-end testing of all workflows and a final pass over the README and documentation.

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
