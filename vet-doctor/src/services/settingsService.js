// ----------------------------------------------------------------------
// Settings service (SR8.16, SR8.17)
// Read/write admin-configurable key/value settings, with sensible defaults
// when a key has not been set yet.
// ----------------------------------------------------------------------
const db = require('../models');

async function get(key, def = null) {
  const row = await db.Setting.findOne({ where: { key } });
  return row ? row.value : def;
}

async function set(key, value) {
  await db.Setting.upsert({ key, value: value == null ? null : String(value) });
}

async function getBool(key, def = true) {
  const v = await get(key, def ? 'true' : 'false');
  return v === 'true' || v === true;
}

// Supported payment methods (SR8.16). Both enabled by default.
async function paymentMethods() {
  return {
    cash: await getBool('PAYMENT_CASH_ENABLED', true),
    card: await getBool('PAYMENT_CARD_ENABLED', true),
  };
}

module.exports = { get, set, getBool, paymentMethods };
