export type PhoneNormalizationResult = {
  valid: boolean;
  normalized: string | null;
  reason: string | null;
};

export function normalizeSriLankanPhone(
  input: string,
): PhoneNormalizationResult {
  const original = String(input ?? '').trim();

  if (!original) {
    return {
      valid: false,
      normalized: null,
      reason: 'Phone number is empty.',
    };
  }

  // Remove spaces, +, -, brackets, etc.
  let digits = original.replace(/\D/g, '');

  // Example: 0094771234567
  if (digits.startsWith('0094')) {
    digits = digits.slice(2);
  }

  let nationalNumber: string | null = null;

  // Example: 0771234567
  if (/^0\d{9}$/.test(digits)) {
    nationalNumber = digits.slice(1);
  }

  // Example: 94771234567
  if (/^94\d{9}$/.test(digits)) {
    nationalNumber = digits.slice(2);
  }

  if (
    !nationalNumber ||
    !/^\d{9}$/.test(nationalNumber)
  ) {
    return {
      valid: false,
      normalized: null,
      reason:
        'Expected a Sri Lankan number such as 0771234567, 94771234567, or +94771234567.',
    };
  }

  return {
    valid: true,
    normalized: `+94${nationalNumber}`,
    reason: null,
  };
}