import { api, unwrap } from '../../lib/api.js';

export const fetchHeadConfig = () => unwrap(api.get('/head-config'));
export const setHeadVisible = (head, visible) => unwrap(api.put(`/head-config/${head}`, { visible }));

export const fetchPdfConfig = () => unwrap(api.get('/pdf-config'));
export const updatePdfConfig = (mainHeads, subHeadMode, summaryRow7, summaryRow8) =>
  unwrap(api.put('/pdf-config', { mainHeads, subHeadMode, summaryRow7, summaryRow8 }));