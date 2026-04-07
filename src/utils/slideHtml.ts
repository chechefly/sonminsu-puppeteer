export function createIframeContent(
  slideHtml: string,
  slideId: string,
  extractedStyles: string,
  interactive = false
): string {
  const hoverStyle = interactive
    ? `[data-edit-id]:hover { outline: 3px solid rgba(255,107,157,0.9) !important; outline-offset: 2px !important; cursor: pointer !important; }`
    : '';

  const clickScript = interactive
    ? `<script>
(function() {
  var selected = null;
  var handle = null;
  var resizing = false;
  var resizeStartX = 0, resizeStartY = 0;
  var resizeStartW = 0, resizeStartH = 0;
  var resizeMode = '';

  function removeHandle() {
    if (handle && handle.parentNode) handle.parentNode.removeChild(handle);
    handle = null;
    if (selected) {
      selected.style.outline = '';
      selected = null;
    }
  }

  function createHandle(el) {
    removeHandle();
    selected = el;
    el.style.outline = '3px solid rgba(100,180,255,0.95)';

    handle = document.createElement('div');
    handle.style.cssText = 'position:absolute;pointer-events:none;z-index:9999;';
    document.body.appendChild(handle);

    var corners = [
      { id: 'se', cursor: 'se-resize', right: 0, bottom: 0 },
      { id: 'sw', cursor: 'sw-resize', left: 0, bottom: 0 },
      { id: 'ne', cursor: 'ne-resize', right: 0, top: 0 },
      { id: 'nw', cursor: 'nw-resize', left: 0, top: 0 },
      { id: 'e',  cursor: 'e-resize',  right: 0, top: '50%' },
      { id: 'w',  cursor: 'w-resize',  left: 0,  top: '50%' },
      { id: 's',  cursor: 's-resize',  bottom: 0, left: '50%' },
    ];

    corners.forEach(function(c) {
      var dot = document.createElement('div');
      dot.setAttribute('data-resize-handle', c.id);
      var base = 'position:absolute;width:10px;height:10px;background:#3bb5f7;border:2px solid white;border-radius:2px;z-index:10000;pointer-events:auto;cursor:' + c.cursor + ';';
      if (c.right !== undefined) base += 'right:' + (typeof c.right === 'number' ? c.right + 'px' : c.right) + ';';
      if (c.left  !== undefined) base += 'left:'  + (typeof c.left  === 'number' ? c.left  + 'px' : c.left)  + ';';
      if (c.bottom !== undefined) base += 'bottom:' + (typeof c.bottom === 'number' ? c.bottom + 'px' : c.bottom) + ';';
      if (c.top    !== undefined) base += 'top:'    + (typeof c.top    === 'number' ? c.top    + 'px' : c.top)    + ';';
      if (c.top === '50%' || c.left === '50%') base += 'transform:translate(' + (c.left==='50%'?'-50%':'0') + ',' + (c.top==='50%'?'-50%':'0') + ');';
      dot.style.cssText = base;
      handle.appendChild(dot);
    });

    positionHandle(el);
  }

  function positionHandle(el) {
    if (!handle) return;
    var r = el.getBoundingClientRect();
    handle.style.left = r.left + 'px';
    handle.style.top = r.top + 'px';
    handle.style.width = r.width + 'px';
    handle.style.height = r.height + 'px';
  }

  document.addEventListener('mousedown', function(e) {
    var handleEl = e.target.getAttribute && e.target.getAttribute('data-resize-handle');
    if (handleEl) {
      e.preventDefault();
      e.stopPropagation();
      resizing = true;
      resizeMode = handleEl;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      var r = selected.getBoundingClientRect();
      resizeStartW = r.width;
      resizeStartH = r.height;
      return;
    }

    var target = e.target;

    var img = null;
    var el = target;
    while (el && el !== document.body) {
      if (el.tagName === 'IMG') { img = el; break; }
      el = el.parentElement;
    }

    if (img) {
      e.preventDefault();
      e.stopPropagation();
      createHandle(img);
      var editId = img.getAttribute('data-edit-id') || '';
      window.parent.postMessage(JSON.stringify({
        type: 'edit-image',
        slideId: '${slideId}',
        editId: editId,
        src: img.getAttribute('src') || ''
      }), '*');
      return;
    }

    var textEl = null;
    el = target;
    while (el && el !== document.body) {
      if (el.getAttribute && el.getAttribute('data-edit-type') === 'text') {
        textEl = el;
        break;
      }
      el = el.parentElement;
    }

    if (textEl) {
      e.preventDefault();
      e.stopPropagation();
      removeHandle();
      window.parent.postMessage(JSON.stringify({
        type: 'edit-text',
        slideId: '${slideId}',
        editId: textEl.getAttribute('data-edit-id') || '',
        text: textEl.innerText || textEl.textContent || ''
      }), '*');
      return;
    }

    removeHandle();
  });

  document.addEventListener('mousemove', function(e) {
    if (!resizing || !selected) return;
    e.preventDefault();
    var dx = e.clientX - resizeStartX;
    var dy = e.clientY - resizeStartY;
    var newW = resizeStartW;
    var newH = resizeStartH;

    if (resizeMode.includes('e')) newW = Math.max(20, resizeStartW + dx);
    if (resizeMode.includes('w')) newW = Math.max(20, resizeStartW - dx);
    if (resizeMode.includes('s')) newH = Math.max(20, resizeStartH + dy);
    if (resizeMode.includes('n')) newH = Math.max(20, resizeStartH - dy);

    selected.style.width = newW + 'px';
    selected.style.height = newH + 'px';
    positionHandle(selected);
  });

  document.addEventListener('mouseup', function(e) {
    if (!resizing || !selected) return;
    resizing = false;
    var r = selected.getBoundingClientRect();
    var editId = selected.getAttribute('data-edit-id') || '';
    window.parent.postMessage(JSON.stringify({
      type: 'resize-element',
      slideId: '${slideId}',
      editId: editId,
      width: Math.round(r.width),
      height: Math.round(r.height)
    }), '*');
    positionHandle(selected);
  });
})();
<\/script>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&family=Bebas+Neue&family=Black+Han+Sans&display=swap" rel="stylesheet">
${extractedStyles}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: 1080px !important; height: 1350px !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; display: block !important; background: transparent !important; gap: 0 !important; }
.slide { width: 1080px !important; height: 1350px !important; }
${hoverStyle}
</style>
</head>
<body>
${slideHtml}
${clickScript}
</body>
</html>`;
}

export function extractFontFamilies(html: string, styles: string): string[] {
  const families = new Set<string>();
  const combined = html + styles;

  const fontFamilyRe = /font-family\s*:\s*([^;}"]+)/gi;
  let m;
  while ((m = fontFamilyRe.exec(combined)) !== null) {
    m[1].split(',').forEach(f => {
      const name = f.trim().replace(/^['"]|['"]$/g, '');
      if (name && !['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'inherit', 'initial', 'unset'].includes(name.toLowerCase())) {
        families.add(name);
      }
    });
  }

  return Array.from(families);
}

function buildGoogleFontsLink(families: string[], displayMode: 'swap' | 'block' = 'swap'): string {
  const base = ['Noto+Sans+KR:wght@400;700;900', 'Bebas+Neue', 'Black+Han+Sans'];
  const extra = families
    .filter(f => !['Noto Sans KR', 'Bebas Neue', 'Black Han Sans'].includes(f))
    .map(f => f.replace(/\s+/g, '+'));
  const all = [...base, ...extra].join('&family=');
  return `https://fonts.googleapis.com/css2?family=${all}&display=${displayMode}`;
}

export function createExportHtml(slideHtml: string, extractedStyles: string): string {
  const families = extractFontFamilies(slideHtml, extractedStyles);
  const fontsLink = buildGoogleFontsLink(families, 'block');
  const safeStyles = extractedStyles
    .replace(/font-display\s*:\s*swap/gi, 'font-display: block')
    .replace(/display=swap/gi, 'display=block');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, initial-scale=1">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsLink}" rel="stylesheet">
${safeStyles}
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html { width: 1080px !important; height: 1350px !important; }
body { width: 1080px !important; height: 1350px !important; min-height: 1350px !important; overflow: hidden !important; padding: 0 !important; margin: 0 !important; display: block !important; background: white !important; gap: 0 !important; font-family: 'Noto Sans KR', 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif !important; }
.slide { width: 1080px !important; height: 1350px !important; min-height: 1350px !important; position: relative !important; overflow: hidden !important; }
img { max-width: none !important; }
</style>
</head>
<body>
${slideHtml}
<script>
(function() {
  var ready = false;
  function done() {
    if (ready) return;
    ready = true;
    document.body.setAttribute('data-fonts-loaded', 'true');
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(done);
  }
  setTimeout(done, 5000);
})();
<\/script>
</body>
</html>`;
}
