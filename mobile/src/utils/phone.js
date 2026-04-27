// Moroccan phone number utilities.
// Normalises inputs like 0612345678, 212612345678, or +212612345678 to E.164 format (+212XXXXXXXXX).
// Accepts mobile prefixes 6xx/7xx and fixed/VoIP 5xx.

// Normalises a raw phone string to +212XXXXXXXXX. Returns null if it cannot be normalised.
export function normalizePhone(raw) {
  if (!raw) return null;
  // Strip whitespace, dashes, dots, parentheses
  const stripped = raw.replace(/[\s\-().]/g, '');

  let digits;
  if (stripped.startsWith('+212')) {
    digits = stripped.slice(4);          // remove +212
  } else if (stripped.startsWith('212')) {
    digits = stripped.slice(3);          // remove 212
  } else if (stripped.startsWith('0')) {
    digits = stripped.slice(1);          // remove leading 0
  } else {
    digits = stripped;
  }

  // Must be exactly 9 digits and start with 5, 6, or 7
  if (!/^[567]\d{8}$/.test(digits)) return null;

  return `+212${digits}`;
}

// Returns a validation error string, or null if valid.
export function validatePhone(raw) {
  if (!raw || !raw.trim()) return 'Phone number is required';
  if (!normalizePhone(raw)) return 'Enter a valid Moroccan number (e.g. 0612345678 or +212612345678)';
  return null;
}
