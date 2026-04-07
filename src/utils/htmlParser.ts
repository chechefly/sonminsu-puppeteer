import { Slide } from '../types';

let idCounter = 0;

function addEditIds(element: Element): void {
  element.querySelectorAll('img').forEach(img => {
    if (!img.hasAttribute('data-edit-id')) {
      img.setAttribute('data-edit-id', `img-${idCounter++}`);
      img.setAttribute('data-edit-type', 'image');
    }
  });

  const textTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i'];
  textTags.forEach(tag => {
    element.querySelectorAll(tag).forEach(el => {
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent?.trim() || '')
        .join('');
      if (directText && !el.hasAttribute('data-edit-id')) {
        el.setAttribute('data-edit-id', `text-${idCounter++}`);
        el.setAttribute('data-edit-type', 'text');
      }
    });
  });
}

export function extractStyles(rawHtml: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');
  const parts: string[] = [];

  doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    parts.push(link.outerHTML);
  });
  doc.querySelectorAll('style').forEach(style => {
    parts.push(style.outerHTML);
  });

  return parts.join('\n');
}

function extractCandidateImages(slideEl: Element): string[] {
  const parent = slideEl.parentElement;
  if (!parent) return [];

  const srcs: string[] = [];
  Array.from(parent.children)
    .filter(el => el !== slideEl)
    .forEach(sib => {
      if (sib.tagName === 'IMG') {
        const src = sib.getAttribute('src');
        if (src?.trim()) srcs.push(src.trim());
      }
      sib.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src?.trim()) srcs.push(src.trim());
      });
    });

  return [...new Set(srcs)];
}

function collectAllImages(doc: Document): string[] {
  const srcs: string[] = [];
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src?.trim()) srcs.push(src.trim());
  });
  return [...new Set(srcs)];
}

export function parseHTML(rawHtml: string): { slides: Slide[]; caption: string; extractedStyles: string; globalImages: string[] } {
  idCounter = 0;
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const extractedStyles = extractStyles(rawHtml);
  const globalImages = collectAllImages(doc);
  const slideElements = Array.from(doc.querySelectorAll('.slide'));

  const slides: Slide[] = slideElements.map((el, index) => {
    const candidateImages = extractCandidateImages(el);
    addEditIds(el);
    return {
      id: `slide-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      html: el.outerHTML,
      slideNumber: index + 1,
      candidateImages,
    };
  });

  let caption = '';
  const allElements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of allElements) {
    const text = el.textContent || '';
    if (
      (text.includes('인스타그램') && text.includes('캡션')) ||
      el.className?.toString().includes('caption') ||
      el.id?.includes('caption')
    ) {
      const isInsideSlide = slideElements.some(s => s.contains(el));
      if (!isInsideSlide) {
        caption = text.replace(/인스타그램\s*캡션/gi, '').trim();
        break;
      }
    }
  }

  if (!caption) {
    const lastSlide = slideElements[slideElements.length - 1];
    if (lastSlide) {
      let sibling = lastSlide.nextElementSibling;
      while (sibling) {
        const txt = sibling.textContent?.trim() || '';
        if (txt && !sibling.classList.contains('slide')) {
          caption = txt;
          break;
        }
        sibling = sibling.nextElementSibling;
      }
    }
  }

  return { slides, caption, extractedStyles, globalImages };
}
