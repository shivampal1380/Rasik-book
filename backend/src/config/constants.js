// Application-wide display constants.

// Canonical DB enum values and their presentation labels.
export const HEADS = [
  { value: 'BHETA', label: 'BHETA' },
  { value: 'B_FUND', label: 'B.F.' },
  { value: 'SBF', label: 'S.B.F.' },
  { value: 'LANGAR', label: 'Langar' },
  { value: 'PCS', label: 'PCS' },
  { value: 'SS', label: 'S.S' },
  { value: 'FF', label: 'FF' },
  { value: 'SD', label: 'SD' },
  { value: 'MPD', label: 'MPD' },
  { value: 'MED', label: 'MED' },
  { value: 'ASS', label: 'ASS' },
  { value: 'MSS', label: 'MSS' },
  { value: 'LSS', label: 'LSS' },
];

export const HEAD_VALUES = HEADS.map(h => h.value);
export const HEAD_LABEL_MAP = Object.fromEntries(HEADS.map(h => [h.value, h.label]));

// Display ordering in statement tables
export const HEAD_DISPLAY_ORDER = HEADS.map(h => h.value);

// PDF summary block uses the same labels as the header
export const SUMMARY_HEADS_IN_ORDER = HEADS.map(h => h.value);

// Statement columns — all 13 heads in display order.
export const STATEMENT_COLUMNS = HEADS.map(h => ({ key: h.value, label: h.label }));

// INR format helpers
export function formatINR(amount) {
  if (amount == null) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function rupees(amount) {
  return Math.floor(Number(amount) || 0);
}

export function paise(amount) {
  // Whole rupees only — always 0
  return 0;
}

export const BOOK_STATUS_LABEL = {
  OPEN: 'Open',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};