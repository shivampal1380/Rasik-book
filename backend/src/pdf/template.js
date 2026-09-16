// HTML statement generator — reproduces the Sant Nirankari Statement of
// Receipts on a SINGLE A4 PORTRAIT page, with the full 1..100 grid always
// drawn.
//
// Column layout comes from configuration (see pdfconfig.service):
//   columns 1-5  → primary head columns (amounts print in their own column)
//   column 6     → sub-head column: its title is the parent head; other
//                  visible heads print their NAME here
//   column 7     → Amount: holds the amounts of those sub-heads

import { STATEMENT_COLUMNS } from '../config/constants.js';

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

  const summaryRows = buildSummary(columns);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Statement of Receipts — ${book.code} / ${book.bookNumber}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:100%; }
  body { font-family: Arial, Helvetica, sans-serif; color:#000; }
  @page { size: A4; margin: 6mm; }

  .top { width:100%; border-collapse:collapse; }
  .top td { border:none; height:11px; font-size:8pt; line-height:1.2; }
  .title { font-weight:bold; font-size:11pt; }
  .banner { font-weight:bold; font-size:12pt; }

  .meta-row { display:flex; align-items:flex-end; font-size:8pt; margin:4px 0 2px; line-height:1.2; }
  .meta-row .m-label { font-weight:bold; white-space:nowrap; }
  .meta-row .m-value { flex:3 1 0; border-bottom:1px solid #000; min-width:2.5em; height:13px; }
  .meta-row .m-value-sm { flex:1 1 0; min-width:2em; }
  .meta-row .m-gap { flex:0 0 24px; }

  .meta { width:100%; margin:0 0 3px; border-collapse:collapse; }
  .meta td { border:none; height:15px; font-size:8pt; padding-right:4px; white-space:nowrap; line-height:1.2; }
  .meta .field { border-bottom:1px solid #000; }

  .blocks { width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; }
  .blocks > tbody > tr > td { border:none; vertical-align:top; }
  .blocks td.gap { width:3mm; }

  .grid { width:100%; table-layout:fixed; border-collapse:collapse; }
  .grid td, .grid th { border:1px solid #000; }
  .hl { font-weight:bold; text-align:center; background:#f0f0f0; font-size:6.3pt; padding:1px 0; line-height:1.3; }
  .cl { text-align:center; font-size:6.3pt; padding:0; line-height:1.3; }
  .clnum { text-align:right; font-size:6.2pt; padding:0 2px; line-height:1.3; white-space:nowrap; }
  .subhead { text-align:center; font-size:5.6pt; padding:0; line-height:1.2; }
  .subrow td { font-weight:bold; background:#f4f4f4; }

  .summary { float:right; width:58%; margin-top:4px; border-collapse:collapse; }
  .summary td { border:1px solid #000; font-size:7.5pt; }
  .s-label { font-weight:bold; padding:0 4px; }
  .s-sub { padding:0 4px 0 14px; font-size:7pt; }
  .s-val { text-align:right; padding:0 4px; font-size:7.5pt; }
  .s-lbl { text-align:center; }
  .clear { clear:both; }

  .foot { width:100%; margin-top:12px; border-collapse:collapse; }
  .foot td { border:none; height:24px; font-size:8pt; line-height:1.2; }
</style>
</head>
<body>

${headerCells()}
${metaCells(book)}
<table class="blocks">
  <tbody>
    <tr>
      <td>${blockTable(columns, leftRows, 'T. C/F', leftByHead, 'left')}</td>
      <td class="gap"></td>
      <td>${blockTable(columns, rightRows, 'G.T.', grandByHead, 'right', leftByHead)}</td>
    </tr>
  </tbody>
</table>
${summaryBlock(columns, summaryRows, grandByHead)}
<div class="clear"></div>
${footerCells(book)}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// One side of the receipt grid: header, data rows, optional carry-over row
// (right block's "T. B/F" holds the left block's totals) and the bottom total
// row.
function blockTable(columns, rows, totalLabel, byHead, side, carryByHead) {
  const headCells =
    `<th class="no hl">R.No.</th>` +
    columns.map(c => `<th class="hl">${esc(c.label)}</th>`).join('');

  const body = [];
  if (side === 'right') {
    body.push(`<tr class="subrow"><td class="cl">T. B/F</td>${totalsCells(columns, carryByHead)}</tr>`);
  }
  for (const r of rows) {
    body.push(`<tr><td class="cl">${r ? r.entryNumber : ''}</td>${dataCells(columns, r)}</tr>`);
  }
  body.push(`<tr class="subrow"><td class="cl" style="text-align:left;">${totalLabel}</td>${totalsCells(columns, byHead)}</tr>`);

  return `
<table class="grid">
  <thead><tr>${headCells}</tr></thead>
  <tbody>${body.join('\n')}</tbody>
</table>`;
}

// ---------------------------------------------------------------------------
// One receipt cell per column. Sub-head entries print their NAME in column 6
// and their amount in column 7; the parent head prints its amount in column 6.
function dataCells(columns, entry) {
  if (!entry) return emptyCells(columns);
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
    if (!e) continue;
    map[e.head] = (map[e.head] || 0) + e.amount;
    map._sum += e.amount;
  }
  return map;
}

// Summary rows: primary heads, the column-6 parent head, then each sub-head
// (indented), built from the configured columns.
function buildSummary(columns) {
  const rows = [];
  for (const c of columns) {
    if (c.type === 'head') rows.push({ label: c.label, key: c.key, sub: false });
    else if (c.type === 'sub') {
      if (c.parent) rows.push({ label: c.label, key: c.parent, sub: false });
      for (const s of c.subRows) rows.push({ label: s.label, key: s.head, sub: true });
    }
  }
  return rows;
}

function summaryBlock(columns, rows, byHead) {
  const sum = rows.reduce((acc, r) => acc + (byHead[r.key] || 0), 0);
  const body = rows
    .map(r => {
      const val = byHead[r.key] || 0;
      return `
  <tr>
    <td class="${r.sub ? 's-sub' : 's-label'}">${esc(r.label)}</td>
    <td class="s-lbl">Rs.</td>
    <td class="s-val">${num(val)}</td>
    <td class="s-lbl">P.</td>
    <td class="s-lbl">&nbsp;</td>
  </tr>`;
    })
    .join('');

  return `
<table class="summary">
  <tr>
    <td colspan="5" style="text-align:center; border:none; font-weight:bold; font-size:9pt;">S U M M A R Y</td>
  </tr>
  ${body}
  <tr style="font-weight:bold;">
    <td class="s-label">TOTAL Rs.</td>
    <td class="s-lbl"></td>
    <td class="s-val">${num(sum)}</td>
    <td class="s-lbl"></td>
    <td class="s-lbl"></td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
function headerCells() {
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `
<table class="top">
  <tr>
    <td style="width:22%;"></td>
    <td class="title" style="width:46%; text-align:center;">APPENDIX -A(I)</td>
    <td style="width:32%; text-align:right;">
      <b>FOR OFFICE USE</b><br/>
      No.: <span style="display:inline-block; border-bottom:1px solid #000; width:70px;">&nbsp;</span>&nbsp;&nbsp;Date: ${date}
    </td>
  </tr>
</table>
<table class="top">
  <tr>
    <td style="width:22%;"></td>
    <td class="banner" style="width:46%; text-align:center; font-size:16pt;">Sant Nirankari Mandal (Regd.)</td>
    <td style="width:32%;"></td>
  </tr>
  <tr>
    <td style="width:22%;"></td>
    <td style="width:46%; text-align:center; font-size:12pt;">(Mumbai Branch)</td>
    <td style="width:32%;"></td>
  </tr>
  <tr>
    <td style="width:22%;"></td>
    <td class="banner" style="width:46%; text-align:center; font-size:13pt; text-decoration:underline; padding-bottom:8pt;">STATEMENT OF RECEIPTS</td>
    <td style="width:32%;"></td>
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
    <td style="width:45%; text-align:left;"><b>Checked by</b><br/><span style="display:inline-block; border-top:1px solid #000; width:180px;">&nbsp;</span></td>
    <td style="width:20%; text-align:center;"><span style="display:inline-block; border-top:1px solid #000; width:130px;">&nbsp;</span></td>
    <td style="width:35%; text-align:right;"><b>Signature of Mukhi</b><br/><span style="display:inline-block; border-top:1px solid #000; width:180px;">&nbsp;</span></td>
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