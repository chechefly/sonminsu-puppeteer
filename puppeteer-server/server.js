const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));

// ── Browser singleton ──────────────────────────────
let browserInstance = null;

async function getBrowser() {
  if (browserInstance) {
    try {
      await browserInstance.version();
      return browserInstance;
    } catch {
      browserInstance = null;
    }
  }
  browserInstance = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
    headless: 'new',
  });
  return browserInstance;
}

// ── Font / image wait ──────────────────────────────
async function waitForFontsAndImages(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.querySelectorAll('img')];
    await Promise.race([
      Promise.all(
        images.map(
          img =>
            img.complete
              ? Promise.resolve()
              : new Promise(r => {
                  img.onload = r;
                  img.onerror = r;
                })
        )
      ),
      new Promise(r => setTimeout(r, 8000)),
    ]);
  });
}

// ── Status ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Puppeteer screenshot + record server' });
});

// ── /screenshot  (기존 유지) ───────────────────────
// POST { slides: ["<html>...", ...] }
// → { pngs: ["base64...", ...], errors: [] }
app.post('/screenshot', async (req, res) => {
  const { slides } = req.body;
  if (!Array.isArray(slides)) {
    return res.status(400).json({ error: 'slides array required' });
  }

  const browser = await getBrowser();
  const pngs = [];
  const errors = [];

  await Promise.all(
    slides.map(async (html, i) => {
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7' });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
        await waitForFontsAndImages(page);
        const png = await page.screenshot({ encoding: 'base64', type: 'png' });
        pngs[i] = png;
      } catch (err) {
        console.error(`Slide ${i} error:`, err.message);
        errors[i] = err.message;
        pngs[i] = null;
      } finally {
        await page.close();
      }
    })
  );

  res.json({ pngs, errors });
});

// ── /record  (신규) ───────────────────────────────
// POST {
//   html: string,          // 애니메이션 HTML 전체
//   duration: number,      // 녹화 시간 (초), default 20
//   width: number,         // default 1080
//   height: number,        // default 1920
// }
// → { video: "base64 MP4" }
app.post('/record', async (req, res) => {
  const { html, duration = 20, width = 1080, height = 1920 } = req.body;

  if (!html) return res.status(400).json({ error: 'html is required' });

  const tmpPath = path.join(os.tmpdir(), `reels-${Date.now()}.mp4`);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await waitForFontsAndImages(page);

    const recorder = new PuppeteerScreenRecorder(page, {
      followNewTab: false,
      fps: 25,
      videoFrame: { width, height },
      videoCrf: 23,
      videoCodec: 'libx264',
      videoPreset: 'ultrafast',
      autopad: { color: '#000000' },
    });

    await recorder.start(tmpPath);
    // duration + 1s 여유 (CTA 등 마지막 화면 보장)
    await new Promise(r => setTimeout(r, (duration + 1) * 1000));
    await recorder.stop();

    const buffer = fs.readFileSync(tmpPath);
    res.json({ video: buffer.toString('base64') });
  } catch (err) {
    console.error('/record error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await page.close().catch(() => {});
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
  }
});

// ── Start ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

process.on('SIGTERM', async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });
process.on('SIGINT',  async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });
