import { prisma } from '../utils/prisma.js';
import { HEADS, HEAD_LABEL_MAP } from '../config/constants.js';

// All 13 statement heads with their current visibility, in canonical order.
export async function getHeadConfig() {
  const rows = await prisma.headVisibility.findMany();
  const map = Object.fromEntries(rows.map(r => [r.head, r.visible]));

  return HEADS.map(h => ({
    head: h.value,
    label: h.label,
    visible: map[h.value] ?? true,
  }));
}

// Set one head's visibility (sessional heads can be switched off).
export async function setHeadVisible({ head, visible }) {
  await prisma.headVisibility.upsert({
    where: { head },
    create: { head, visible },
    update: { visible },
  });
  return getHeadConfig();
}

// Set of currently-visible heads, used to filter report columns, summaries
// and per-head totals everywhere.
export async function getVisibleHeadSet() {
  const rows = await prisma.headVisibility.findMany({
    where: { visible: true },
    select: { head: true },
  });
  return new Set(rows.map(r => r.head));
}

export function labelForHead(head) {
  return HEAD_LABEL_MAP[head] || head;
}