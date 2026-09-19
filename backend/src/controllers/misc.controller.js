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
  const { buffer, code, bookNumber } = await generateStatement(req.params.id);
  await writeAudit({
    userId: req.user.sub,
    action: 'PDF_GENERATED',
    entity: 'Book',
    entityId: req.params.id,
    newValue: { size: buffer.length, generatedAt: new Date().toISOString() },
    req,
  });
  res.setHeader('Content-Type', 'application/pdf');
  const inline = req.query.preview === '1';
  const filename = `Statement-${safe(code)}-${safe(bookNumber)}_${stamp()}.pdf`;
  res.setHeader('Content-Disposition', inline ? 'inline' : `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.send(Buffer.from(buffer));
});

const safe = part => String(part).replace(/[^\w.-]/g, '_');

// Timestamp in DDMMYYYYHHMMSS (local time).
function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}