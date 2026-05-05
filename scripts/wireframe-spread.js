const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

const appclipDir = path.join(process.cwd(), 'screenshots', 'appclips');
const outputPath = path.join(appclipDir, 'eclipsis-appclip-iphone-wireframe-spread.png');

const cards = [
  { file: 'eclipsis-appclip-ready-home-screen.png', label: 'Ready · Home screen trigger' },
  { file: 'eclipsis-appclip-listening-over-article.png', label: 'Listening · Overlay in context' },
  { file: 'eclipsis-appclip-realtime-response.png', label: 'Realtime · Streaming response' },
  { file: 'eclipsis-appclip-usage-board.png', label: 'Board · Concept + architecture' }
];

function asFileUrl(filePath) {
  return `file://${filePath.replace(/\\/g, '/')}`;
}

async function ensureInputs() {
  for (const card of cards) {
    const fullPath = path.join(appclipDir, card.file);
    try {
      await fs.access(fullPath);
    } catch {
      throw new Error(`Missing screenshot: ${card.file}. Run \"npm run screenshot\" first.`);
    }
  }
}

function renderHtml() {
  const items = cards
    .map((card) => {
      const src = asFileUrl(path.join(appclipDir, card.file));
      return `<article class="tile"><div class="iphone"><div class="notch"></div><img src="${src}" alt="${card.label}" /></div><p>${card.label}</p></article>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: dark; }
      body {
        margin: 0;
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
        background: radial-gradient(circle at top, #1b1d30 0%, #090a12 45%, #05060b 100%);
        color: #eef1ff;
      }
      .wrap { padding: 56px 54px 60px; }
      h1 {
        margin: 0 0 10px;
        font-size: 42px;
        letter-spacing: -0.02em;
      }
      .sub {
        margin: 0 0 34px;
        font-size: 16px;
        opacity: 0.8;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(280px, 1fr));
        gap: 24px;
      }
      .tile {
        margin: 0;
        padding: 20px;
        border-radius: 28px;
        background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
      }
      .iphone {
        border-radius: 44px;
        border: 2px solid rgba(255,255,255,0.28);
        padding: 12px;
        position: relative;
        background: rgba(0,0,0,0.38);
      }
      .notch {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 32%;
        height: 20px;
        border-radius: 999px;
        background: #05060b;
        z-index: 2;
      }
      .iphone img {
        display: block;
        width: 100%;
        border-radius: 32px;
      }
      p { margin: 14px 6px 2px; font-size: 14px; opacity: 0.95; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Eclipsis · App Clip Wireframe Spread</h1>
      <p class="sub">Codified screenshot montage for README media kits.</p>
      <section class="grid">${items}</section>
    </div>
  </body>
</html>`;
}

(async () => {
  await ensureInputs();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });

  await page.setContent(renderHtml(), { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputPath, fullPage: true });

  await browser.close();
  console.log(path.relative(process.cwd(), outputPath));
})().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
