const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

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

// ── 사운드 타임스탬프 추적 코드를 HTML에 주입 ──────────
// run() 호출 직전에 playClick/playSwipe/playShutter/playVault 래핑
function injectClickTracking(html) {
  const trackingCode = `
window._animStart = Date.now();
window._clickTimes   = [];
window._swipeTimes   = [];
window._shutterTimes = [];
window._vaultTimes   = [];
function __wrap(fn, arr){
  return function(){
    arr.push(Date.now() - window._animStart);
    if(fn) fn.apply(this, arguments);
  };
}
if(typeof playClick   === 'function') playClick   = __wrap(playClick,   window._clickTimes);
if(typeof playSwipe   === 'function') playSwipe   = __wrap(playSwipe,   window._swipeTimes);
if(typeof playShutter === 'function') playShutter = __wrap(playShutter, window._shutterTimes);
if(typeof playVault   === 'function') playVault   = __wrap(playVault,   window._vaultTimes);
`;
  // run() 호출 직전에 삽입 (마지막 run() 찾기)
  const lastRunIdx = html.lastIndexOf('run()');
  if (lastRunIdx === -1) return html;
  return html.slice(0, lastRunIdx) + trackingCode + html.slice(lastRunIdx);
}

// ── PCM 믹스 헬퍼 (클램프 합산) ──────────────────────
function mixSample(pcm, idx, val) {
  if (idx < 0 || idx >= pcm.length) return;
  const sum = pcm[idx] / 32767 + val;
  pcm[idx] = Math.round(Math.max(-1, Math.min(1, sum)) * 32767);
}

// ── 클릭 소리: 58ms 노이즈 버스트, (1-t)^6 * 0.88 ──
function addClick(pcm, startMs, totalSamples, sr = 44100) {
  const start = Math.floor((startMs / 1000) * sr);
  const len = Math.floor(0.058 * sr);
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, 6) * 0.88;
    mixSample(pcm, start + i, (Math.random() * 2 - 1) * env);
  }
}

// ── 휙 소리: 170ms 고주파 강조 노이즈 스윕 ───────────
function addSwipe(pcm, startMs, totalSamples, sr = 44100) {
  const start = Math.floor((startMs / 1000) * sr);
  const len = Math.floor(0.17 * sr);
  const raw = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = Math.pow(Math.min(t * 18, 1), 0.18) * Math.pow(1 - t, 2.0) * 0.7;
    raw[i] = (Math.random() * 2 - 1) * env;
  }
  // 고주파 강조 (차분 필터)
  for (let i = len - 1; i > 0; i--) raw[i] = raw[i] * 0.72 - raw[i-1] * 0.28;
  for (let i = 0; i < len; i++) mixSample(pcm, start + i, raw[i] * 1.2);
}

// ── 찰칵 소리: 두 번 노이즈 버스트 (38ms + 32ms) ─────
function addShutter(pcm, startMs, totalSamples, sr = 44100) {
  const start = Math.floor((startMs / 1000) * sr);
  // 1차 클릭
  const len1 = Math.floor(0.038 * sr);
  for (let i = 0; i < len1; i++) {
    const env = Math.pow(1 - i / len1, 4);
    mixSample(pcm, start + i, (Math.random() * 2 - 1) * env);
  }
  // 2차 클릭 (65ms 후, 0.62배 음량)
  const off2 = Math.floor(0.065 * sr);
  const len2 = Math.floor(0.032 * sr);
  for (let i = 0; i < len2; i++) {
    const env = Math.pow(1 - i / len2, 4) * 0.62;
    mixSample(pcm, start + off2 + i, (Math.random() * 2 - 1) * env);
  }
}

// ── 치킹 소리: 노이즈 임팩트 + 삼각파 금속 링 ────────
function addVault(pcm, startMs, totalSamples, sr = 44100) {
  const start = Math.floor((startMs / 1000) * sr);
  // 임팩트 노이즈 55ms
  const len1 = Math.floor(0.055 * sr);
  for (let i = 0; i < len1; i++) {
    const env = Math.pow(1 - i / len1, 3) * 0.95;
    mixSample(pcm, start + i, (Math.random() * 2 - 1) * env);
  }
  // 금속 링: 주파수 스윕 (4400→750Hz), 삼각파, 320ms
  const len2 = Math.floor(0.32 * sr);
  let phase = 0;
  for (let i = 0; i < len2; i++) {
    const t = i / sr;
    const freq = 4400 * Math.exp(-t * 12.5); // 지수 스윕
    phase += (2 * Math.PI * freq) / sr;
    const tri = (2 / Math.PI) * Math.asin(Math.sin(phase));
    const env = Math.exp(-t * 18) * 0.52;
    mixSample(pcm, start + i, tri * env);
  }
}

// ── WAV 헤더 생성 ────────────────────────────────────
function buildWavBuffer(pcm, sampleRate = 44100) {
  const dataBytes = pcm.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);           // PCM
  header.writeUInt16LE(1, 22);           // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.from(pcm.buffer)]);
}

// ── 전체 오디오 WAV 생성 (클릭·휙·찰칵·치킹 믹스) ────
function generateAudioWav(soundEvents, totalDurationSec, sampleRate = 44100) {
  const totalSamples = Math.ceil(totalDurationSec * sampleRate);
  const pcm = new Int16Array(totalSamples);

  for (const tMs of (soundEvents.clicks   || [])) addClick(pcm, tMs, totalSamples, sampleRate);
  for (const tMs of (soundEvents.swipes   || [])) addSwipe(pcm, tMs, totalSamples, sampleRate);
  for (const tMs of (soundEvents.shutters || [])) addShutter(pcm, tMs, totalSamples, sampleRate);
  for (const tMs of (soundEvents.vaults   || [])) addVault(pcm, tMs, totalSamples, sampleRate);

  return buildWavBuffer(pcm, sampleRate);
}

// ── ffmpeg: 고화질 재인코딩 (medium preset) ──────────
// PuppeteerScreenRecorder는 실시간 캡처라 ultrafast로 1차 저장됨.
// 녹화 후 medium preset으로 재인코딩하면 블록 아티팩트가 대폭 제거됨.
function reencodeVideo(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-crf', '16',            // 재인코딩이라 CRF 약간 더 낮게 (고화질)
      '-preset', 'medium',     // medium = 블록 아티팩트 없음, 인코딩 시간 여유있음
      '-pix_fmt', 'yuv420p',   // Instagram 호환 픽셀 포맷
      '-movflags', '+faststart',
      '-an',                   // 오디오 없음 (나중에 믹싱)
      outputPath,
    ], (err, stdout, stderr) => {
      if (err) {
        console.error('[ffmpeg reenc]', stderr);
        reject(new Error(`재인코딩 실패: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

// ── ffmpeg: 영상 + 오디오 믹싱 ───────────────────────
function mergeAudioToVideo(videoPath, audioPath, outputPath) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c:v', 'copy',          // 이미 재인코딩된 영상 그대로 복사
      '-c:a', 'aac',
      '-b:a', '128k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      outputPath,
    ], (err, stdout, stderr) => {
      if (err) {
        console.error('[ffmpeg]', stderr);
        reject(new Error(`ffmpeg 실패: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}

// ── Status ────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Puppeteer screenshot + record server' });
});

// ── /screenshot ───────────────────────────────────
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

// ── /record ───────────────────────────────────────
// POST { html, duration, width, height }
// → { video: "base64 MP4" }
app.post('/record', async (req, res) => {
  const { html, duration = 20, width = 1080, height = 1920 } = req.body;
  if (!html) return res.status(400).json({ error: 'html is required' });

  const tag      = `reels-${Date.now()}`;
  const videoRaw = path.join(os.tmpdir(), `${tag}-raw.mp4`);  // 1차: ultrafast 실시간 캡처
  const videoHq  = path.join(os.tmpdir(), `${tag}-hq.mp4`);   // 2차: medium 재인코딩
  const audioWav = path.join(os.tmpdir(), `${tag}-click.wav`);
  const videoOut = path.join(os.tmpdir(), `${tag}-out.mp4`);   // 3차: 오디오 믹싱

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });

    // 클릭 타임스탬프 추적 코드 주입
    const instrumentedHtml = injectClickTracking(html);

    await page.setContent(instrumentedHtml, { waitUntil: 'networkidle0', timeout: 30000 });
    await waitForFontsAndImages(page);

    // ── 1단계: 실시간 녹화 (ultrafast — CPU 부담 최소화) ──
    const recorder = new PuppeteerScreenRecorder(page, {
      followNewTab: false,
      fps: 25,
      videoFrame: { width, height },
      videoCrf: 23,            // 1차 품질은 의미없음 (어차피 재인코딩)
      videoCodec: 'libx264',
      videoPreset: 'ultrafast', // 실시간 캡처는 ultrafast 필수
      autopad: { color: '#000000' },
    });

    await recorder.start(videoRaw);
    await new Promise(r => setTimeout(r, (duration + 1) * 1000));
    await recorder.stop();

    // 사운드 타임스탬프 회수 (클릭·휙·찰칵·치킹)
    const soundEvents = await page.evaluate(() => ({
      clicks:   window._clickTimes   || [],
      swipes:   window._swipeTimes   || [],
      shutters: window._shutterTimes || [],
      vaults:   window._vaultTimes   || [],
    }));
    const totalSounds = Object.values(soundEvents).reduce((s,a) => s+a.length, 0);
    console.log(`[record] 사운드 이벤트 총 ${totalSounds}개:`, soundEvents);

    // ── 2단계: 고화질 재인코딩 (medium preset) ───────────
    // 녹화가 끝난 후라 시간 제약 없음 → medium preset으로 블록 아티팩트 제거
    console.log('[record] 고화질 재인코딩 시작...');
    let hqVideoPath = videoRaw;
    try {
      await reencodeVideo(videoRaw, videoHq);
      hqVideoPath = videoHq;
      console.log('[record] 재인코딩 완료');
    } catch (reErr) {
      console.error('[record] 재인코딩 실패, 원본 사용:', reErr.message);
    }

    // ── 3단계: 사운드 믹싱 (클릭·휙·찰칵·치킹) ─────────
    let finalVideoPath = hqVideoPath;
    if (totalSounds > 0) {
      const wavBuf = generateAudioWav(soundEvents, duration + 2);
      fs.writeFileSync(audioWav, wavBuf);
      try {
        await mergeAudioToVideo(hqVideoPath, audioWav, videoOut);
        finalVideoPath = videoOut;
        console.log('[record] 오디오 믹싱 완료');
      } catch (ffErr) {
        console.error('[record] 오디오 믹싱 실패, 무음 영상으로 반환:', ffErr.message);
      }
    }

    const buffer = fs.readFileSync(finalVideoPath);
    res.json({ video: buffer.toString('base64') });

  } catch (err) {
    console.error('/record error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    await page.close().catch(() => {});
    for (const f of [videoRaw, videoHq, audioWav, videoOut]) {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
  }
});

// ── Start ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

process.on('SIGTERM', async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });
process.on('SIGINT',  async () => { if (browserInstance) await browserInstance.close(); process.exit(0); });
