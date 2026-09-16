import { asyncHandler, ok } from '../utils/http.js';
import * as auditService from '../services/audit.service.js';
import { generateStatement } from '../pdf/pdf.service.js';
import { writeAudit } from '../middleware/audit.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  const data = await auditService.listAuditLogs({ query: req.query });
  return ok(res, data);
});

export const getBookAudit = asyncHandler(async (req, res) => {
  const data = await auditService.getAuditForBook(req.params.id);
  return ok(res, data);
});

export const generatePdf = asyncHandler(async (req, res) => {
  const pdf = await generateStatement(req.params.id);
  await writeAudit({
    userId: req.user.sub,
    action: 'PDF_GENERATED',
    entity: 'Book',
    entityId: req.params.id,
    newValue: { size: pdf.length, generatedAt: new Date().toISOString() },
    req,
  });
  res.setHeader('Content-Type', 'application/pdf');
  const inline = req.query.preview === '1';
  res.setHeader('Content-Disposition', inline ? 'inline' : `attachment; filename="statement-${req.params.id.slice(0, 8)}.pdf"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.send(Buffer.from(pdf));
});