// HTML statement generator — reproduces the Sant Nirankari Statement of
// Receipts on a SINGLE A4 PORTRAIT page, with the full 1..100 grid always
// drawn.
//
// Column layout comes from configuration (see pdfconfig.service):
//   columns 1-5  → primary head columns (amounts print in their own column)
//   column 6     → sub-head column: its title is the parent head; other
//                  visible heads print their NAME here
//   column 7     → Amount: holds the amounts of those sub-heads

import { HEAD_LABEL_MAP, STATEMENT_COLUMNS } from '../config/constants.js';

const LEFT_FIRST = 1;
const LEFT_LAST = 55;
const RIGHT_FIRST = 56;
const RIGHT_LAST = 100;

export function renderStatementHTML(book) {
  const columns = prepareColumns(
    (book.columns?.length ? book.columns : STATEMENT_COLUMNS).map(c =>
      c.type ? c : { key: c.key, label: c.label, type: 'head' },
    ),
  );
  const entriesByNo = new Map(book.entries.map(e => [e.entryNumber, e]));

  const leftRows = [];
  for (let n = LEFT_FIRST; n <= LEFT_LAST; n++) leftRows.push(entriesByNo.get(n) || null);

  const rightRows = [];
  for (let n = RIGHT_FIRST; n <= RIGHT_LAST; n++) rightRows.push(entriesByNo.get(n) || null);

  const leftByHead = buildByHead(leftRows);
  const rightByHead = buildByHead(rightRows);
  const grandByHead = buildByHead(book.entries);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Statement of Receipts — ${book.code} / ${book.bookNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --no-col: 29px; }
  html, body { width:100%; }
  body { font-family: Arial, Helvetica, sans-serif; color:#000; }
  @page { size: A4; margin: 2.5mm 10mm; }

  .top { width:100%; border-collapse:collapse; }
  .top td { border:none; height:11px; font-size:8pt; line-height:1.2; }
  .title { font-weight:bold; font-size:11pt; }
  .banner { font-weight:bold; font-size:12pt; }
  .titles { margin-top:-75px; }

  .office { width:80%; border-collapse:collapse; border:1.5pt solid #000; margin-left:auto; margin-top:30px; }
  .office td { border:1px solid #000; height:auto; padding:3px 8px; }
  .office-title { font-weight:bold; font-size:10pt; text-align:center; white-space:nowrap; font-family:'Arial Black', Arial, sans-serif; }
  .office td.office-line { text-align:left; font-size:9pt; white-space:nowrap; font-weight:bold; padding:8px 8px; }

  .meta-row { display:flex; align-items:flex-end; font-size:8pt; margin:4px 0 8px; line-height:1.2; }
  .meta-row .m-label { font-weight:bold; white-space:nowrap; }
  .meta-row .m-value { flex:3 1 0; border-bottom:1px solid #000; min-width:2.5em; height:13px; }
  .meta-row .m-value-sm { flex:1 1 0; min-width:2em; }
  .meta-row .m-gap { flex:0 0 24px; }

  .meta { width:100%; margin:0 0 3px; border-collapse:collapse; }
  .meta td { border:none; height:15px; font-size:8pt; padding-right:4px; white-space:nowrap; line-height:1.2; }
  .meta .field { border-bottom:1px solid #000; }

  .blocks { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; }
  .blocks > tbody > tr > td { border:none; vertical-align:top; }
  .blocks td.gap { width:0; }

  .grid { width:100%; table-layout:fixed; border-collapse:collapse; }
  .grid-right td:first-child, .grid-right th:first-child { border-left:none; }
  .grid td, .grid th { border:1px solid #000; }
  .hl { font-weight:bold; text-align:center; background:#f0f0f0; font-size:6.3pt; padding:2px 0; line-height:1.3; }
  .hl.no { width:var(--no-col); }
  .cl { text-align:center; vertical-align:middle; font-size:7.3pt; padding:2px 0; line-height:7.5pt; }
  .clnum { text-align:right; vertical-align:middle; font-size:7.2pt; padding:2px 2px; line-height:7.5pt; white-space:nowrap; }
  .cancel { text-align:center; vertical-align:middle; font-size:4.8pt; font-style:italic; padding:2px 0; line-height:1.2; white-space:nowrap; }
  .subhead { text-align:center; vertical-align:middle; font-size:7.2pt; padding:2px 0; line-height:7.5pt; }
  .subrow td { font-weight:bold; background:#f4f4f4; }
  .subrow td { font-weight:bold; background:#f4f4f4; }

  .summary { width:calc(100% - 38px); margin-left:19px; margin-top:2px; table-layout:fixed; border-collapse:separate; border-spacing:0; }
  .summary td { border:1px solid #000; border-top:none; border-left:none; font-size:7.5pt; height:11.25pt; padding:0; }
  .summary td > div { height:10.5pt; line-height:10.5pt; overflow:hidden; }
  .summary tr:first-child td { border-top:1px solid #000; }
  .summary td:first-child { border-left:1px solid #000; }
  .summary .s-title { font-weight:bold; text-align:center; font-size:9pt; letter-spacing:1.5px; padding:0 4px; }
  .s-head td { background:#000; color:#fff; border-color:#fff; border-bottom-color:#000; }
  .s-head td:first-child { border-top-left-radius:10px; }
  .s-head td:last-child { border-top-right-radius:10px; }
  .s-label { font-weight:bold; padding:0 4px 0 10px; }
  .s-sub { padding:0 4px 0 14px; font-size:7pt; }
  .s-val { text-align:right; padding:0 4px; font-size:7.5pt; }
  .s-lbl { text-align:center; font-weight:bold; }
  .s-paise { text-align:left; padding:0 4px; }
  .clear { clear:both; }

  .foot { width:100%; margin-top:12px; border-collapse:collapse; }
  .foot td { border:none; height:20px; font-size:8pt; line-height:1.2; }
</style>
</head>
<body>

${headerCells()}
${metaCells(book)}
<table class="blocks">
  <tbody>
    <tr>
      <td>${blockTable(columns, entriesByNo, LEFT_FIRST, LEFT_LAST, 'T. C/F', leftByHead, 'left')}</td>
      <td class="gap"></td>
      <td>${blockTable(columns, entriesByNo, RIGHT_FIRST, RIGHT_LAST, 'G.T.', grandByHead, 'right', leftByHead)}
${summaryBlock(grandByHead, book.summaryRow7, book.summaryRow8, columns.length + 1)}
</td>
    </tr>
  </tbody>
</table>
<div class="clear"></div>
${footerCells(book)}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// One side of the receipt grid: header, data rows, optional carry-over row
// (right block's "T. B/F" holds the left block's totals) and the bottom total
// row. Every receipt number in the range is printed; amounts fill in only
// where a receipt exists.
function blockTable(columns, entriesByNo, first, last, totalLabel, byHead, side, carryByHead) {
  const headCells =
    `<th class="no hl">R.No.</th>` +
    columns.map(c => `<th class="hl">${/Amount/i.test(c.label) ? '&nbsp;' : esc(c.label)}</th>`).join('');

  const body = [];
  if (side === 'right') {
    body.push(`<tr class="subrow"><td class="cl">T. B/F</td>${totalsCells(columns, carryByHead)}</tr>`);
  }
  for (let n = first; n <= last; n++) {
    const r = entriesByNo.get(n) || null;
    body.push(`<tr><td class="cl">${n}</td>${dataCells(columns, r)}</tr>`);
  }
  body.push(`<tr class="subrow"><td class="cl" style="text-align:${side === 'right' ? 'center' : 'left'};">${totalLabel}</td>${totalsCells(columns, byHead)}</tr>`);

  return `
<table class="grid grid-${side}">
  <thead><tr>${headCells}</tr></thead>
  <tbody>${body.join('\n')}</tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// One receipt cell per column. Sub-head entries print their NAME in column 6
// and their amount in column 7; the parent head prints its amount in column 6.
function dataCells(columns, entry) {
  if (!entry) return emptyCells(columns);
  if (entry.cancelledAt) return cancelledCells(columns);
  return columns.map(c => {
    if (c.type === 'head') {
      return `<td class="clnum">${entry.head === c.key ? num(entry.amount) : ''}</td>`;
    }
    if (c.type === 'sub') {
      if (c.parent && entry.head === c.parent) {
        return `<td class="clnum">${num(entry.amount)}</td>`;
      }
      const label = c.subMap.get(entry.head);
      return label ? `<td class="subhead">${esc(label)}</td>` : `<td class="clnum"></td>`;
    }
    // amount column — sub-head amounts land here
    return `<td class="clnum">${c.subMap.has(entry.head) ? num(entry.amount) : ''}</td>`;
  }).join('');
}

// A cancelled receipt: every cell of its row is stamped "Cancel".
function cancelledCells(columns) {
  return columns.map((_, i) => (i === 0 ? `<td class="clnum cancel">Cancel</td>` : `<td class="cancel">Cancel</td>`)).join('');
}

function emptyCells(columns) {
  return columns.map(() => `<td class="clnum"></td>`).join('');
}

function totalsCells(columns, byHead) {
  return columns.map(c => {
    let t = 0;
    if (c.type === 'head') t = byHead[c.key] || 0;
    else if (c.type === 'sub') t = c.parent ? byHead[c.parent] || 0 : 0;
    else {
      for (const sh of c.subRows) t += byHead[sh.head] || 0;
    }
    return `<td class="clnum">${t ? num(t) : ''}</td>`;
  }).join('');
}

// ---------------------------------------------------------------------------
function buildByHead(entries) {
  const map = { _sum: 0 };
  for (const e of entries) {
    if (!e || e.cancelledAt) continue;
    map[e.head] = (map[e.head] || 0) + e.amount;
    map._sum += e.amount;
  }
  return map;
}

// Fixed 9-row summary block (rows 7 and 8 are configurable heads; null prints
// a blank row):
//   row 1 → "S U M M A R Y | Rs. | P."
//   rows 2-4 → BHETA, B.F., S.B.F.
//   row 5   → S.S + PCS (combined)
//   row 6   → Langar + FF (combined)
//   rows 7-8 → configured heads (or blank)
//   row 9   → TOTAL Rs.
function summaryBlock(byHead, row7, row8, gridCols) {
  const rows = [
    { label: 'BHETA', key: 'BHETA' },
    { label: 'B.F.', key: 'B_FUND' },
    { label: 'S.B.F.', key: 'SBF' },
    { label: 'S.S + PCS', keys: ['SS', 'PCS'] },
    { label: 'Langar + FF', keys: ['LANGAR', 'FF'] },
  ];
  if (row7) rows.push({ label: HEAD_LABEL_MAP[row7] || row7, key: row7 });
  if (row8) rows.push({ label: HEAD_LABEL_MAP[row8] || row8, key: row8 });

  const labelSpan = Math.max(1, gridCols - 3);
  const rsSpan = Math.max(1, Math.min(2, gridCols - labelSpan - 1));
  const colgroup = `<col style="width:var(--no-col)">${'<col>'.repeat(Math.max(0, gridCols - 1))}`;

  const body = rows
    .map(r => {
      const vals = (r.keys || [r.key]).map(k => (byHead[k] || 0));
      const label = r.keys
        ? `${r.label} (${vals.map(v => Number(v).toLocaleString('en-IN')).join(' + ')})`
        : r.label;
      const val = vals.reduce((a, b) => a + b, 0);
      return `
  <tr>
    <td class="s-label" colspan="${labelSpan}"><div>${esc(label)}</div></td>
    <td class="s-val" colspan="${rsSpan}"><div>${num(val)}</div></td>
    <td class="s-paise"><div>=00</div></td>
  </tr>`;
    })
    .join('');

  const sum = rows.reduce((acc, r) => acc + (r.keys || [r.key]).reduce((a, k) => a + (byHead[k] || 0), 0), 0);

  return `
<table class="summary">
  <colgroup>${colgroup}</colgroup>
  <tr class="s-head">
    <td class="s-title" colspan="${labelSpan}"><div>S U M M A R Y</div></td>
    <td class="s-lbl" colspan="${rsSpan}"><div>Rs.</div></td>
    <td class="s-lbl"><div>P.</div></td>
  </tr>
  ${body}
  <tr style="font-weight:bold;">
    <td class="s-label" colspan="${labelSpan}"><div>TOTAL Rs.</div></td>
    <td class="s-val" colspan="${rsSpan}"><div>${num(sum)}</div></td>
    <td class="s-paise"><div>=00</div></td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
function headerCells() {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
<table class="top">
  <tr>
    <td style="width:27%;"></td>
    <td class="title" style="width:46%; text-align:center; vertical-align:top; padding-top:22px; font-size:9.5pt;">APPENDIX -A(I)</td>
    <td style="width:27%; text-align:right; vertical-align:top;">
      <table class="office">
        <tr><td class="office-title">FOR OFFICE USE</td></tr>
        <tr><td class="office-line">No.:</td></tr>
        <tr><td class="office-line">Date: ${date}</td></tr>
      </table>
    </td>
  </tr>
</table>
<table class="top titles">
  <tr>
    <td style="width:22%;"></td>
    <td class="banner" style="width:56%; text-align:center; font-size:18pt; white-space:nowrap;">Sant Nirankari Mandal (Regd.)</td>
    <td style="width:22%;"></td>
  </tr>
  <tr>
    <td style="width:22%;"></td>
    <td style="width:56%; text-align:center; font-size:13pt; font-weight:bold; white-space:nowrap;">(Mumbai Branch)</td>
    <td style="width:22%;"></td>
  </tr>
  <tr>
    <td style="width:22%;"></td>
    <td class="banner" style="width:56%; text-align:center; font-size:12pt; white-space:nowrap; padding-bottom:10px; text-decoration:underline; font-family:'Arial Black', Arial, sans-serif;">STATEMENT OF RECEIPTS</td>
    <td style="width:22%;"></td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
function metaCells(book) {
  const firstDate = book.entries[0]?.createdAt;
  const lastDate = book.entries[book.entries.length - 1]?.createdAt;
  const dFrom = fmtShort(firstDate);
  const dTo = fmtShort(lastDate) || fmtShort(new Date());

  return `
<div class="meta-row">
  <span class="m-label">Pracharak :</span>
  <span class="m-value">${esc(book.pracharak || '')}</span>
  <span class="m-gap"></span>
  <span class="m-label">Area :</span>
  <span class="m-value m-value-sm">${esc(book.area || '')}</span>
</div>
<table class="meta">
  <tr>
    <td style="white-space:nowrap;"><b>Receipt Book No. From</b></td>
    <td class="field">${esc(book.code)} / ${esc(book.bookNumber)}</td>
    <td style="width:5%;"></td>
    <td style="white-space:nowrap;"><b>to</b></td>
    <td class="field" style="width:20%;">1 – ${book.maxEntries}</td>
    <td style="width:5%;"></td>
    <td style="white-space:nowrap;"><b>Date From</b></td>
    <td class="field" style="width:12%;">${dFrom}</td>
    <td style="width:3%;"></td>
    <td style="white-space:nowrap;"><b>to</b></td>
    <td class="field" style="width:12%;">${dTo}</td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
function footerCells() {
  return `
<table class="foot">
  <tr>
    <td style="width:65%; text-align:left; padding-left:282pt;"><b>Checked by</b></td>
    <td style="width:5%; text-align:center;"></td>
    <td style="width:30%; text-align:right;"><b>Signature of Mukhi</b></td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
function num(n) {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN');
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtShort(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Tighten the column metadata before use: give each sub/amount column a
// head → label lookup and expose the sub-head set. (Called once per render.)
export function prepareColumns(columns) {
  for (const c of columns) {
    if (c.type === 'sub' || c.type === 'amount') {
      c.subMap = new Map((c.subRows || []).map(s => [s.head, s.label]));
    }
  }
  return columns;
}