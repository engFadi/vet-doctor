// ----------------------------------------------------------------------
// Meeting helper (SR7.14)
// Builds a free Jitsi Meet room URL for an accepted consultation. The room
// name is derived from the consultation id + secret so both participants
// compute the same, hard-to-guess room without storing anything.
// (Jitsi Meet is free and needs no API key.)
// ----------------------------------------------------------------------
const crypto = require('crypto');

const BASE = process.env.JITSI_BASE || 'https://meet.jit.si';

function roomFor(consultationId) {
  const secret = process.env.SESSION_SECRET || 'vet-doctor-dev-secret';
  const hash = crypto
    .createHash('sha256')
    .update(`consult:${consultationId}:${secret}`)
    .digest('hex')
    .slice(0, 16);
  return `${BASE}/VetDoctor-${hash}`;
}

module.exports = { roomFor };
