// ----------------------------------------------------------------------
// Payment gateway (Task 14) - MOCKED external Payment Gateway / Bank
// Maps to BankPaymentSystem.authorize(cardNumber, amount) and
// CreditCard.requestAuthorization in the class model. It never persists the
// full card number; the caller stores only a masked reference (SR6.15-6.16).
//
// Mock behaviour (so the approve/decline/error paths can be demonstrated):
//   - card number ending in 0000  -> DECLINED  (E1)
//   - card number starting with 9999 -> gateway ERROR/timeout (E2)
//   - otherwise -> APPROVED
// ----------------------------------------------------------------------

// Basic Luhn-free format validation of card input (digits, expiry, cvv).
function validateCardInput({ cardNumber, expiryDate, cvv }) {
  const digits = (cardNumber || '').replace(/\s+/g, '');
  if (!/^\d{13,19}$/.test(digits)) return 'Card number must be 13-19 digits.';
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate || '')) {
    return 'Expiry date must be in MM/YY format.';
  }
  if (!/^\d{3,4}$/.test(cvv || '')) return 'CVV must be 3 or 4 digits.';

  // Reject obviously expired cards.
  const [mm, yy] = expiryDate.split('/').map(Number);
  const expiry = new Date(2000 + yy, mm); // first day after expiry month
  if (expiry <= new Date()) return 'The card has expired.';

  return null;
}

function maskCardNumber(cardNumber) {
  const digits = cardNumber.replace(/\s+/g, '');
  return `**** **** **** ${digits.slice(-4)}`;
}

function transactionRef() {
  return `TXN-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Authorize a charge. Returns one of:
//   { status: 'approved', transactionReference, maskedCardReference }
//   { status: 'declined', reason }
//   { status: 'error', reason }
function authorize({ cardNumber, amount }) {
  const digits = (cardNumber || '').replace(/\s+/g, '');

  // E2: gateway unavailable / timeout.
  if (digits.startsWith('9999')) {
    console.log('[GATEWAY] error: gateway unavailable');
    return { status: 'error', reason: 'The payment gateway is temporarily unavailable.' };
  }

  // E1: card declined by the bank.
  if (digits.endsWith('0000')) {
    console.log('[GATEWAY] declined');
    return { status: 'declined', reason: 'The card was declined.' };
  }

  const result = {
    status: 'approved',
    transactionReference: transactionRef(),
    maskedCardReference: maskCardNumber(cardNumber),
  };
  console.log(`[GATEWAY] approved ${result.transactionReference} for ${amount}`);
  return result;
}

module.exports = { validateCardInput, authorize, maskCardNumber };
