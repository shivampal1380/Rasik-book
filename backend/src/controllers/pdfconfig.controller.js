import { asyncHandler, ok } from '../utils/http.js';
import * as pdfConfigService from '../services/pdfconfig.service.js';

export const getPdfConfig = asyncHandler(async (_req, res) => {
  const config = await pdfConfigService.getPdfConfig();
  return ok(res, config);
});

export const updatePdfConfig = asyncHandler(async (req, res) => {
  const config = await pdfConfigService.updatePdfConfig({
    mainHeads: req.body.mainHeads,
    subHeadMode: req.body.subHeadMode,
    summaryRow7: req.body.summaryRow7,
    summaryRow8: req.body.summaryRow8,
  });
  return ok(res, config);
});