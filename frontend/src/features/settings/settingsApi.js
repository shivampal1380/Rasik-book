import { api, unwrap } from '../../lib/api.js';

export const changePassword = ({ currentPassword, newPassword }) =>
  unwrap(api.put('/auth/password', { currentPassword, newPassword }));