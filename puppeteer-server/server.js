const express = require('express');
const puppeteer = require('puppeteer-core');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let browserInstance = null;

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  browserInstance = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--font-render-hinting=medium',
      '--enable-font-antialiasing',
    ],
  });
  browserInstance.on('disconnected', () => {
    browserInstance = null;
  });
  return browserInstance;
}

async function waitForFontsAndImages(page) {
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  try {
    await page.waitForSelector('body[data-fonts-loaded]', { timeout: 8000 });
  } catch {
    // client script timed out or not present — proceed anyway
  }

  await page.evaluate(() => {
    return new Promise((resolve) => {
      const imgs = Array.from(document.querySelectorAll('img'));
      if (imgs.length === 0) return resolve();

      let pending = 0;
      const check = () => { if (pending <= 0) resolve(); };

      imgs.forEach((img) => {
        if (img.complete && img.naturalWidth > 0) return;
        pending++;
        img.addEventListener('load', () => { pending--; check(); });
        img.addEventListener('error', () => { pending--; check(); });
      });

      if (pending === 0) resolve();
      setTimeout(resolve, 5000);
    });
  });
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Puppeteer screenshot server' });
});

app.post('/screenshot', async (req, res) => {
  const { slides } = req.body;

  if (!slides || !Array.isArray(slides)) {
    return res.status(400).json({ error: 'slides array required' });
  }

  let browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    console.error('Browser launch failed:', err);
    return res.status(500).json({ error: 'Browser launch failed' });
  }

  const pngs = [];
  const errors = [];

  for (let i = 0; i < slides.length; i++) {
    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({
        width: 1080,
        height: 1350,
        deviceScaleFactor: 2,
        isMobile: false,
      });
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

      await page.setContent(slides[i], {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      await waitForFontsAndImages(page);

      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1350 },
        encoding: 'base64',
        fullPage: false,
      });

      pngs.push(screenshot);
      errors.push(null);
    } catch (err) {
      console.error(`Slide ${i + 1} error:`, err.message);
      pngs.push(null);
      errors.push(err.message);
    } finally {
      if (page) {
        try { await page.close(); } catch {}
      }
    }
  }

  res.json({ pngs, errors });
});

async function shutdown() {
  if (browserInstance) {
    try { await browserInstance.close(); } catch {}
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(PORT, () => {
  console.log(`Puppeteer server running on port ${PORT}`);
});
