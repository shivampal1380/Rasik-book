import { api, unwrap, getErrorMessage } from '../../lib/api.js';

export const fetchUsers = () => unwrap(api.get('/users'));
export const createUser = payload => unwrap(api.post('/users', payload)).then(r => r.user);
export const updateUser = (id, payload) => unwrap(api.patch(`/users/${id}`, payload)).then(r => r.user);