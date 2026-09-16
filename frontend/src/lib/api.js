import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message || 'Something went wrong');
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

api.interceptors.response.use(
  res => res,
  err => {
    const data = err?.response?.data?.error;
    const status = err?.response?.status;
    if (data) {
      return Promise.reject(new ApiError(status, data.code, data.message, data.details));
    }
    if (err?.request && !err?.response) {
      return Promise.reject(new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Is it running?'));
    }
    return Promise.reject(err);
  },
);

// Accepts an axios promise (or resolved response) and returns `data.data`.
export const unwrap = promise => promise.then(res => res.data.data);

// All database head values (mirrors backend HEADS)
export const HEADS = [
  { key: 'BHETA', label: 'BHETA' },
  { key: 'B_FUND', label: 'B.F.' },
  { key: 'SBF', label: 'S.B.F.' },
  { key: 'LANGAR', label: 'Langar' },
  { key: 'PCS', label: 'PCS' },
  { key: 'SS', label: 'S.S' },
  { key: 'FF', label: 'FF' },
  { key: 'SD', label: 'SD' },
  { key: 'MPD', label: 'MPD' },
  { key: 'MED', label: 'MED' },
  { key: 'ASS', label: 'ASS' },
  { key: 'MSS', label: 'MSS' },
  { key: 'LSS', label: 'LSS' },
];

// Statement heads a user picks when recording an entry — all 13 are visible.
export const ENTRY_HEADS = HEADS;

export const headLabel = key => HEADS.find(h => h.key === key)?.label || key;

export const entryHeadLabel = e => headLabel(e.head);

export const formatINR = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function getErrorMessage(err) {
  if (err instanceof ApiError) return err.message;
  return err?.message || 'Something went wrong';
}