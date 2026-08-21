import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'public', 'portfolio');
const airdropLogo = await readFile(path.join(projectRoot, 'public', 'brands', 'airdrop.svg'), 'utf8');
const airdropLogoDataUrl = `data:image/svg+xml;base64,${Buffer.from(airdropLogo).toString('base64')}`;

const previews = [
  {
    name: 'AIRDROP Jamaica',
    url: 'https://airdropja.com/',
    output: 'airdrop-ja.jpg',
    readySelector: 'h1',
    replaceAirdropLogo: true,
  },
  {
    name: 'AutoPilot CRM dark',
    url: 'https://autopilotcrm.ai/',
    output: 'autopilot-dark.jpg',
    readySelector: 'h1',
  },
  {
    name: 'AutoPilot CRM light',
    url: 'https://autopilotcrm.ai/',
    output: 'autopilot-light.jpg',
    readySelector: 'h1',
    selectLightTheme: true,
  },
];

await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CI ? {} : { channel: 'chrome' }),
});

try {
  for (const preview of previews) {
    const context = await browser.newContext({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    const response = await page.goto(preview.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    if (!response || !response.ok()) {
      throw new Error(`${preview.name} returned ${response?.status() ?? 'no response'}`);
    }

    await page.locator(preview.readySelector).first().waitFor({ state: 'visible', timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    if (preview.replaceAirdropLogo) {
      await page.locator('img[alt="Airdrop"]').first().evaluate((image, source) => {
        image.removeAttribute('srcset');
        image.src = source;
      }, airdropLogoDataUrl);
    }
    if (preview.selectLightTheme) {
      await page.locator('button[aria-label^="Cycle theme"]').click();
      await page.waitForTimeout(500);
    }
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          caret-color: transparent !important;
          scroll-behavior: auto !important;
          transition: none !important;
        }
      `,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1_200);

    await page.screenshot({
      path: path.join(outputDirectory, preview.output),
      type: 'jpeg',
      quality: 88,
      fullPage: false,
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured ${previews.length} portfolio preview${previews.length === 1 ? '' : 's'}.`);
