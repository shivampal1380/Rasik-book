import { asyncHandler, ok } from '../utils/http.js';
import * as dashboardService from '../services/dashboard.service.js';

export const dashboard = asyncHandler(async (_req, res) => {
  const stats = await dashboardService.getDashboardStats();
  return ok(res, stats);
});