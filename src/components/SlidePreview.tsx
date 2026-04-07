import { useMemo } from 'react';
import { Slide } from '../types';
import { createIframeContent } from '../utils/slideHtml';

const SLIDE_W = 1080;
const SLIDE_H = 1350;

interface SlidePreviewProps {
  slide: Slide;
  scale: number;
  extractedStyles: string;
  interactive?: boolean;
}

export default function SlidePreview({ slide, scale, extractedStyles, interactive = false }: SlidePreviewProps) {
  const srcDoc = useMemo(
    () => createIframeContent(slide.html, slide.id, extractedStyles, interactive),
    [slide.html, slide.id, extractedStyles, interactive]
  );

  const displayW = SLIDE_W * scale;
  const displayH = SLIDE_H * scale;

  return (
    <div
      style={{ width: displayW, height: displayH, overflow: 'hidden', position: 'relative', flexShrink: 0 }}
    >
      <iframe
        srcDoc={srcDoc}
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          pointerEvents: interactive ? 'auto' : 'none',
          display: 'block',
        }}
        sandbox="allow-scripts"
        title={`slide-${slide.id}`}
      />
    </div>
  );
}
