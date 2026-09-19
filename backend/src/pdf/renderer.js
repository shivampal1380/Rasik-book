import { chromium as playwrightChromium } from 'playwright';

// On Vercel serverless, Playwright's Chromium download can't run at runtime —
// use the prebuilt @sparticuz/chromium binary bundled in the deployment.
// Locally, fall back to Playwright's own browser.
const useServerlessChromium = process.env.VERCEL === '1' || !!process.env.CHROMIUM_PATH;

// Render an HTML statement to a PDF buffer using headless Chromium.
export async function renderPDF(html) {
  const browser = await playwrightChromium.launch(
    useServerlessChromium
      ? {
          executablePath: await import('@sparticuz/chromium').then(m => m.default.executablePath()),
          args: (await import('@sparticuz/chromium')).default.args,
          headless: true,
        }
      : {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
  );

  try {
    const page = await browser.newPage({ acceptDownloads: true });
    await page.setContent(html, { waitUntil: 'load' });
    // Give webfonts/graphics a moment to settle
    await page.evaluate(() => document.fonts?.ready);
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    return pdf;
  } finally {
    await browser.close();
  }
}