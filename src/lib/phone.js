export function cleanPhoneDigits(input) {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/\D/g, '');
}

export function formatPhoneE164(input) {
  const cleaned = cleanPhoneDigits(input);
  const stripped = cleaned.length === 11 && cleaned.startsWith('1') ? cleaned.slice(1) : cleaned;
  if (stripped.length !== 10) return null;
  return `+1${stripped}`;
}

export function isValidPhoneInput(input) {
  return formatPhoneE164(input) !== null;
}
