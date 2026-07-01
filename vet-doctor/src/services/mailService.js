// ----------------------------------------------------------------------
// Mail service (real email via SMTP)
// Sends real emails through any SMTP provider (e.g. Gmail with an App
// Password). Configured via env vars; if not configured it falls back to
// logging to the console so local development works without credentials.
//
// Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// ----------------------------------------------------------------------
const nodemailer = require('nodemailer');

const HOST = process.env.SMTP_HOST;
const PORT = Number(process.env.SMTP_PORT) || 587;
const USER = process.env.SMTP_USER;
const PASS = process.env.SMTP_PASS;
const FROM = process.env.MAIL_FROM || USER || 'Vet Doctor <no-reply@vetdoctor.local>';

const configured = Boolean(HOST && USER && PASS);

let transporter = null;
if (configured) {
  transporter = nodemailer.createTransport({
    host: HOST,
    port: PORT,
    secure: PORT === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: USER, pass: PASS },
  });
}

// Send an email. Never throws to the caller — logs failures instead, so a
// mail problem cannot break a login or reset request.
async function sendMail({ to, subject, text, html }) {
  if (!to) return { sent: false };
  if (!configured) {
    console.log(`[MAIL:mock] to ${to} | ${subject}`);
    if (text) console.log(`           ${text}`);
    return { sent: false, mocked: true };
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, text, html });
    console.log(`[MAIL] sent to ${to}: ${subject}`);
    return { sent: true };
  } catch (err) {
    console.error(`[MAIL] failed to ${to}: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendMail, isConfigured: () => configured };
