import { prisma } from '../utils/prisma.js';
import { HEADS, HEAD_LABEL_MAP } from '../config/constants.js';
import { ValidationError } from '../utils/errors.js';
import { getVisibleHeadSet } from './headconfig.service.js';

const CONFIG_ID = '00000000-0000-0000-0000-000000000042';

export async function getStoredConfig() {
  const row = await prisma.pdfConfig.findUnique({ where: { id: CONFIG_ID } });
  return (
    row ?? {
      mainHeads: ['BHETA', 'B_FUND', 'SBF', 'LANGAR', 'PCS', 'MED', 'SS'],
      subHeadMode: true,
      summaryRow7: null,
      summaryRow8: null,
    }
  );
}

// Full configuration response for the admin UI:
// mainHeads   = the stored 7-slot order (filtered to currently-visible heads),
// subHeadMode = ON → columns 6/7 use sub-head logic, OFF → normal heads,
// subHeads    = every OTHER visible head (printed under column 6 in sub mode),
// heads       = all 13 canonical heads with labels + visibility.
export async function getPdfConfig() {
  const visRows = await prisma.headVisibility.findMany();
  const visMap = Object.fromEntries(visRows.map(r => [r.head, r.visible]));
  const visibleSet = new Set(visRows.filter(r => r.visible).map(r => r.head));

  const stored = await getStoredConfig();
  const visibleMains = stored.mainHeads.filter(h => visibleSet.has(h));

  // In sub-head mode only the first 6 slots are configured heads — column 6 is
  // the sub-head title, column 7 is the Amount column. Everything else visible
  // (including any stale 7th slot) is a sub-head, so we expose only 6 mains.
  const mainHeads = stored.subHeadMode ? visibleMains.slice(0, 6) : visibleMains;

  const placedMains = mainHeads;
  const subHeads = HEADS.map(h => h.value).filter(h => visibleSet.has(h) && !placedMains.includes(h));

  return {
    mainHeads,
    subHeadMode: stored.subHeadMode,
    summaryRow7: stored.summaryRow7 ?? null,
    summaryRow8: stored.summaryRow8 ?? null,
    subHeads,
    heads: HEADS.map(h => ({ head: h.value, label: h.label, visible: visMap[h.value] ?? true })),
  };
}

export async function updatePdfConfig({ mainHeads, subHeadMode, summaryRow7, summaryRow8 }) {
  if (!Array.isArray(mainHeads) || mainHeads.length < 6 || mainHeads.length > 7) {
    throw new ValidationError('6 or 7 main heads are required (columns 1–5, columns 6–7)');
  }
  if (new Set(mainHeads).size !== mainHeads.length) {
    throw new ValidationError('Main heads must not repeat');
  }

  const visible = await getVisibleHeadSet();
  for (const h of mainHeads) {
    if (!visible.has(h)) {
      throw new ValidationError(`Cannot use a hidden head (${HEAD_LABEL_MAP[h] || h}) as a main column`);
    }
  }
  for (const r of ['summaryRow7', 'summaryRow8']) {
    const h = r === 'summaryRow7' ? summaryRow7 : summaryRow8;
    if (h != null && !visible.has(h)) {
      throw new ValidationError(`Cannot use a hidden head (${HEAD_LABEL_MAP[h] || h}) as a summary row`);
    }
  }

  const current = await getStoredConfig();
  const effectiveMode = typeof subHeadMode === 'boolean' ? subHeadMode : current.subHeadMode;
  const next = {
    // Sub-head mode configures exactly 6 heads (columns 1-5 + the column-6
    // title). Any 7th head that was left over from main mode is dropped so it
    // can't linger as a hidden phantom blocking edits.
    mainHeads: effectiveMode ? mainHeads.slice(0, 6) : mainHeads,
    subHeadMode: effectiveMode,
    summaryRow7:
      summaryRow7 === undefined ? (current.summaryRow7 ?? null) : (summaryRow7 || null),
    summaryRow8:
      summaryRow8 === undefined ? (current.summaryRow8 ?? null) : (summaryRow8 || null),
  };

  await prisma.pdfConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...next },
    update: next,
  });

  return getPdfConfig();
}

// Build the statement column structure for the PDF:
//   • sub-head mode (subHeadMode ON):
//       columns 1-5 → first five mains; column 6 → sub-head column (title =
//       the sixth main, every other visible head prints its NAME here);
//       column 7 → Amount column holding the sub-heads' amounts.
//   • main mode (subHeadMode OFF):
//       columns 1-5 → first five mains; column 6 → sixth main as a normal
//       head column; column 7 → seventh main as a normal head column.
export async function derivePdfColumns() {
  const stored = await getStoredConfig();
  const visibleSet = await getVisibleHeadSet();
  const label = h => HEAD_LABEL_MAP[h] || h;

  const mains = stored.mainHeads.filter(h => visibleSet.has(h)).slice(0, 7);
  const primaries = mains.slice(0, 5);
  const used = new Set(mains);

  const parent = mains[5] ?? null;
  const col7head = mains[6] ?? null;

  const columns = primaries.map(h => ({ key: h, label: label(h), type: 'head' }));

  if (stored.subHeadMode) {
    // In sub-head mode only the six placed heads (columns 1-5 + the column-6
    // title) count as mains; every other visible head — including anything in
    // the 7th config slot — is a sub-head (name in column 6, amount in col 7).
    const placed = new Set(mains.slice(0, 6));
    const autoSubs = HEADS.map(h => h.value).filter(v => visibleSet.has(v) && !placed.has(v));
    columns.push({
      key: '__SUB__',
      label: parent ? label(parent) : 'Sub-heads',
      type: 'sub',
      parent,
      subRows: autoSubs.map(h => ({ head: h, label: label(h) })),
    });
    columns.push({
      key: '__AMOUNT__',
      label: 'Amount',
      type: 'amount',
      subRows: autoSubs.map(h => ({ head: h, label: label(h) })),
    });
  } else {
    if (parent) columns.push({ key: parent, label: label(parent), type: 'head' });
    if (col7head) columns.push({ key: col7head, label: label(col7head), type: 'head' });
    else columns.push({ key: '__AMOUNT__', label: 'Amount', type: 'amount', subRows: [] });
  }

  if (!columns.length) {
    for (const h of HEADS) if (visibleSet.has(h.value)) columns.push({ key: h.value, label: h.label, type: 'head' });
  }

  return {
    columns,
    primaries: primaries.map(h => ({ head: h, label: label(h) })),
    parent: parent ? { head: parent, label: label(parent) } : null,
    col7head: col7head ? { head: col7head, label: label(col7head) } : null,
    subHeads: stored.subHeadMode
      ? HEADS.map(h => h.value).filter(v => visibleSet.has(v) && !new Set(mains.slice(0, 6)).has(v))
      : [],
    mode: stored.subHeadMode ? 'sub' : 'main',
    summaryRow7: stored.summaryRow7 ?? null,
    summaryRow8: stored.summaryRow8 ?? null,
  };
}