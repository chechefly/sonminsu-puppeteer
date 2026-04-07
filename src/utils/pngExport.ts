import JSZip from 'jszip';
import { Slide, ExportResult } from '../types';
import { createExportHtml } from './slideHtml';

const SCREENSHOT_URL = 'https://sonminsu-puppeteer-production.up.railway.app/screenshot';

export type ProgressStatus = 'capturing' | 'saving';

function base64ToBlob(base64: string): Blob {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

export async function exportSlides(
  slides: Slide[],
  extractedStyles: string,
  onProgress: (current: number, total: number, status: ProgressStatus) => void
): Promise<ExportResult> {
  const result: ExportResult = { success: 0, failed: 0, cancelled: false, errors: [] };

  onProgress(0, slides.length, 'capturing');

  const slideHtmls = slides.map(slide => {
    const cleanHtml = slide.html
      .replace(/data-edit-id="[^"]*"/g, '')
      .replace(/data-edit-type="[^"]*"/g, '');
    return createExportHtml(cleanHtml, extractedStyles);
  });

  let pngs: (string | null)[];
  let slideErrors: (string | null)[];
  try {
    const res = await fetch(SCREENSHOT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slides: slideHtmls }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const data = await res.json();
    pngs = data.pngs;
    slideErrors = data.errors || [];
  } catch (err) {
    for (let i = 0; i < slides.length; i++) {
      result.failed++;
      result.errors.push({
        slideNumber: i + 1,
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return result;
  }

  const zip = new JSZip();

  for (let i = 0; i < pngs.length; i++) {
    onProgress(i + 1, slides.length, 'capturing');
    try {
      if (!pngs[i] || slideErrors[i]) {
        throw new Error(slideErrors[i] || 'Screenshot failed');
      }
      const blob = base64ToBlob(pngs[i]!);
      zip.file(`${String(i + 1).padStart(2, '0')}_slide.png`, blob);
      result.success++;
    } catch (err) {
      result.failed++;
      result.errors.push({
        slideNumber: i + 1,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (result.success > 0) {
    onProgress(slides.length, slides.length, 'saving');
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'sonminsu_cardnews.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return result;
}

export function debugExportHtml(
  slides: Slide[],
  extractedStyles: string
): void {
  const zip = new JSZip();
  slides.forEach((slide, i) => {
    const cleanHtml = slide.html
      .replace(/data-edit-id="[^"]*"/g, '')
      .replace(/data-edit-type="[^"]*"/g, '');
    const html = createExportHtml(cleanHtml, extractedStyles);
    zip.file(`${String(i + 1).padStart(2, '0')}_slide.html`, html);
  });
  zip.generateAsync({ type: 'blob' }).then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debug_slides_html.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
}
