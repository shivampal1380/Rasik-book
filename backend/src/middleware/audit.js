// Centralised audit log writer. Controllers call `writeAudit()` to record mutations.

import { prisma } from '../utils/prisma.js';

/**
 * @param {object} params
 * @param {string|null} params.userId
 * @param {string}      params.action   e.g. BOOK_CREATED, ENTRY_CREATED, ENTRY_UPDATED
 * @param {string}      params.entity   e.g. "Book", "BookEntry"
 * @param {string}      params.entityId
 * @param {object|null} [params.oldValue]
 * @param {object|null} [params.newValue]
 * @param {import('express').Request} [req] — used to grab IP/UA
 */
export function writeAudit({ userId, action, entity, entityId, oldValue = null, newValue = null, req = null }) {
  return prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entity,
      entityId,
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
      ipAddress: req?.ip ?? req?.connection?.remoteAddress ?? undefined,
      userAgent: req?.headers?.['user-agent'] ?? undefined,
    },
  }).catch(() => {
    // audit failures must never break the main operation
  });
}