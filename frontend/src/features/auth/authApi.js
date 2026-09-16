import { api, unwrap } from '../../lib/api.js';

export const login = credentials => unwrap(api.post('/auth/login', credentials));
export const logout = () => unwrap(api.post('/auth/logout'));
export const fetchMe = () => unwrap(api.get('/auth/me'));