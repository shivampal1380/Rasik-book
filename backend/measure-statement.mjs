// Measure whether the statement HTML fits one A4 portrait page.
// Usage: node measure-statement.mjs <bookId>
import { chromium } from 'playwright';
import { prisma } from './src/utils/prisma.js';
import { renderStatementHTML } from './src/pdf/template.js';

const bookId = process.argv[2];

const book = await prisma.book.findUnique({
  where: { id: bookId },
  select: { id: true, code: true, bookNumber: true, maxEntries: true, pracharak: true, area: true },
});
const entries = await prisma.bookEntry.findMany({
  where: { bookId },
  orderBy: { entryNumber: 'asc' },
  select: { entryNumber: true, head: true, amount: true, createdAt: true, subHead: { select: { name: true } } },
});

const html = renderStatementHTML({ ...book, entries });

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 940, height: 1200 } });
await page.setContent(html, { waitUntil: 'load' });

const m = await page.evaluate(() => {
  const mm = 96 / 25.4; // px per mm
  const pageW = (210 - 12) * mm; // A4 - margins
  const pageH = (297 - 12) * mm; // A4 - margins
  const doc = document.documentElement;
  return {
    pageW: Math.round(pageW),
    pageH: Math.round(pageH),
    docW: doc.scrollWidth,
    docH: doc.scrollHeight,
    bodyH: document.body.getBoundingClientRect().height,
    gridRowsLeft: document.querySelectorAll('.grid')[0]?.rows.length ?? 0,
    gridRowsRight: document.querySelectorAll('.grid')[1]?.rows.length ?? 0,
  };
});
console.log(JSON.stringify(m, null, 2));
const fits = m.docH <= m.pageH + 2;
console.log('--> FITS ONE PAGE:', fits, `(doc ${Math.round(m.docH)}px vs page ${m.pageH}px)`);

await page.screenshot({ path: 'C:/Users/palsh/AppData/Local/Temp/opencode/stmt-measure.png', fullPage: true });
await browser.close();
await prisma.$disconnect();
process.exit(fits ? 0 : 1);