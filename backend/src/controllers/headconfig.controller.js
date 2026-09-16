import { asyncHandler, ok } from '../utils/http.js';
import * as headConfigService from '../services/headconfig.service.js';

export const getHeadConfig = asyncHandler(async (_req, res) => {
  const heads = await headConfigService.getHeadConfig();
  return ok(res, { heads });
});

export const updateHeadVisibility = asyncHandler(async (req, res) => {
  const heads = await headConfigService.setHeadVisible({
    head: req.params.head,
    visible: req.body.visible,
  });
  return ok(res, { heads });
});