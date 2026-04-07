export function updateImageSrc(slideHtml: string, editId: string, newSrc: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root__">${slideHtml}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return slideHtml;

  const img = root.querySelector(`[data-edit-id="${CSS.escape(editId)}"]`) as HTMLImageElement | null;
  if (img) {
    img.setAttribute('src', newSrc);
  }

  return root.innerHTML;
}

export function updateElementSize(slideHtml: string, editId: string, width: number, height: number): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root__">${slideHtml}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return slideHtml;

  const el = root.querySelector(`[data-edit-id="${CSS.escape(editId)}"]`) as HTMLElement | null;
  if (el) {
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
  }

  return root.innerHTML;
}

export function replaceFirstImage(slideHtml: string, newSrc: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root__">${slideHtml}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return slideHtml;

  const img = root.querySelector('img') as HTMLImageElement | null;
  if (img) {
    img.setAttribute('src', newSrc);
    return root.innerHTML;
  }

  const bgEl = root.querySelector('[style*="background-image"]') as HTMLElement | null;
  if (bgEl) {
    bgEl.style.backgroundImage = `url('${newSrc}')`;
    return root.innerHTML;
  }

  const slideDiv = root.querySelector('.slide') as HTMLElement | null;
  if (slideDiv) {
    slideDiv.style.backgroundImage = `url('${newSrc}')`;
    slideDiv.style.backgroundSize = 'cover';
    slideDiv.style.backgroundPosition = 'center';
    return root.innerHTML;
  }

  return slideHtml;
}

export function updateTextContent(slideHtml: string, editId: string, newText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__root__">${slideHtml}</div>`, 'text/html');
  const root = doc.getElementById('__root__');
  if (!root) return slideHtml;

  const el = root.querySelector(`[data-edit-id="${CSS.escape(editId)}"]`) as HTMLElement | null;
  if (el) {
    const childNodes = Array.from(el.childNodes);
    const textNodes = childNodes.filter(n => n.nodeType === Node.TEXT_NODE);
    if (textNodes.length > 0) {
      textNodes.forEach((n, i) => {
        if (i === 0) n.textContent = newText;
        else n.textContent = '';
      });
    } else {
      el.textContent = newText;
    }
  }

  return root.innerHTML;
}
