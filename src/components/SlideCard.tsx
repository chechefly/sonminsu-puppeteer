import { useState } from 'react';
import { X, Maximize2, Images, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Slide } from '../types';
import SlidePreview from './SlidePreview';
import { updateImageSrc, replaceFirstImage } from '../utils/htmlUpdater';

const THUMB_SCALE = 0.24;

interface ImageSlot {
  editId: string;
  src: string;
  label: string;
}

interface SlideCardProps {
  slide: Slide;
  extractedStyles: string;
  globalImages: string[];
  onDelete: (id: string) => void;
  onClick: (slide: Slide) => void;
  onSlideUpdate: (id: string, newHtml: string) => void;
}

function getImageSlots(html: string): ImageSlot[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement;
  const imgs = Array.from(root.querySelectorAll('[data-edit-type="image"]')) as HTMLImageElement[];
  return imgs.map((img, i) => ({
    editId: img.getAttribute('data-edit-id') || '',
    src: img.getAttribute('src') || '',
    label: `이미지 ${i + 1}`,
  })).filter(s => s.editId);
}

function hasAnyImage(html: string, styles: string): boolean {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstChild as HTMLElement;
  if (root.querySelector('img')) return true;
  if (root.querySelector('[style*="background-image"]')) return true;

  const classNames: string[] = [];
  root.querySelectorAll('[class]').forEach(el => {
    el.className.split(/\s+/).forEach(c => { if (c) classNames.push(c); });
  });
  for (const cls of classNames) {
    const regex = new RegExp(`\\.${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*(?:background|background-image)\\s*:[^}]*url\\(`, 'i');
    if (regex.test(styles)) return true;
  }

  return false;
}

export default function SlideCard({ slide, extractedStyles, globalImages, onDelete, onClick, onSlideUpdate }: SlideCardProps) {
  const [hovered, setHovered] = useState(false);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [showGlobalPool, setShowGlobalPool] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [lastAppliedSrc, setLastAppliedSrc] = useState<string | null>(null);

  const thumbW = 1080 * THUMB_SCALE;
  const thumbH = 1350 * THUMB_SCALE;

  const slots = getImageSlots(slide.html);
  const candidateImages = slide.candidateImages;
  const hasCandidates = candidateImages.length > 0;
  const hasGlobalPool = globalImages.length > 0;
  const slideHasImage = hasAnyImage(slide.html, extractedStyles);
  const hasImages = (hasCandidates || hasGlobalPool) && (slots.length > 0 || slideHasImage);
  const totalCount = hasCandidates ? candidateImages.length : globalImages.length;

  const getTargetSlotId = (): string | null => {
    if (selectedSlotId) return selectedSlotId;
    if (slots.length >= 1) return slots[0].editId;
    return null;
  };

  const handleCandidateClick = (e: React.MouseEvent, imgSrc: string) => {
    e.stopPropagation();
    if (slots.length > 0) {
      const targetId = getTargetSlotId();
      if (!targetId) return;
      onSlideUpdate(slide.id, updateImageSrc(slide.html, targetId, imgSrc));
    } else {
      onSlideUpdate(slide.id, replaceFirstImage(slide.html, imgSrc));
    }
    setLastAppliedSrc(imgSrc);
  };

  const toggleImagePanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowImagePanel(v => !v);
  };

  return (
    <div className="flex flex-col" style={{ width: thumbW }}>
      <div
        className="relative rounded-xl overflow-hidden bg-[#2a2a2a] border border-white/10 cursor-pointer group transition-all hover:border-white/25 hover:shadow-lg"
        style={{ width: thumbW, height: thumbH }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onClick(slide)}
      >
        <SlidePreview slide={slide} scale={THUMB_SCALE} extractedStyles={extractedStyles} interactive={false} />

        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/10">
          {slide.slideNumber}
        </div>

        <button
          onClick={e => {
            e.stopPropagation();
            onDelete(slide.id);
          }}
          className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center bg-red-500/80 hover:bg-red-500 backdrop-blur-sm rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
          title="삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {hovered && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 flex items-center gap-2 text-white text-xs font-medium">
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
              클릭하여 편집
            </div>
          </div>
        )}
      </div>

      {hasImages && (
        <div className="mt-1.5">
          <button
            onClick={toggleImagePanel}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showImagePanel
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                : 'bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/8 border border-white/8'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Images className="w-3 h-3" />
              이미지 교체
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-semibold ${
                showImagePanel ? 'bg-sky-500/20 text-sky-300' : 'bg-white/10 text-white/40'
              }`}>
                {totalCount}
              </span>
            </span>
            {showImagePanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showImagePanel && (
            <div className="mt-1.5 p-2.5 bg-[#252525] rounded-xl border border-white/8">
              {slots.length > 1 && (
                <div className="mb-3">
                  <p className="text-white/30 text-[10px] mb-1.5 font-semibold uppercase tracking-wider">교체할 위치 선택</p>
                  <div className="flex gap-1.5">
                    {slots.map((slot) => (
                      <button
                        key={slot.editId}
                        onClick={e => { e.stopPropagation(); setSelectedSlotId(slot.editId); }}
                        className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                          (selectedSlotId ?? slots[0].editId) === slot.editId
                            ? 'border-sky-400 ring-1 ring-sky-400/50'
                            : 'border-white/15 hover:border-white/40'
                        }`}
                        title={slot.label}
                      >
                        <img src={slot.src} alt={slot.label} className="w-full h-full object-cover" />
                        {(selectedSlotId ?? slots[0].editId) === slot.editId && (
                          <div className="absolute inset-0 bg-sky-500/30 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {hasCandidates && (
                <>
                  <p className="text-white/30 text-[10px] mb-1.5 font-semibold uppercase tracking-wider">후보 이미지</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidateImages.map((src, i) => (
                      <button
                        key={`c-${i}`}
                        onClick={e => handleCandidateClick(e, src)}
                        className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition-all group/img flex-shrink-0 ${
                          lastAppliedSrc === src
                            ? 'border-sky-400 ring-1 ring-sky-400/40'
                            : 'border-white/10 hover:border-sky-400/60'
                        }`}
                        title={`후보 ${i + 1} 적용`}
                      >
                        <img src={src} alt={`후보 ${i + 1}`} className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white text-[8px] font-bold">적용</span>
                        </div>
                        {lastAppliedSrc === src && (
                          <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-sky-500 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {hasGlobalPool && (
                <div className={hasCandidates ? 'mt-2' : ''}>
                  {hasCandidates ? (
                    <button
                      onClick={e => { e.stopPropagation(); setShowGlobalPool(v => !v); }}
                      className="w-full flex items-center justify-between text-white/30 text-[10px] font-semibold uppercase tracking-wider hover:text-white/50 transition-colors py-1"
                    >
                      <span>전체 이미지풀 ({globalImages.length})</span>
                      {showGlobalPool ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  ) : (
                    <p className="text-white/30 text-[10px] mb-1.5 font-semibold uppercase tracking-wider">
                      전체 이미지풀 ({globalImages.length})
                    </p>
                  )}
                  {(!hasCandidates || showGlobalPool) && (
                    <div className="flex flex-wrap gap-1.5 mt-1 max-h-36 overflow-y-auto">
                      {globalImages.map((src, i) => (
                        <button
                          key={`g-${i}`}
                          onClick={e => handleCandidateClick(e, src)}
                          className={`relative w-11 h-11 rounded-lg overflow-hidden border-2 transition-all group/img flex-shrink-0 ${
                            lastAppliedSrc === src
                              ? 'border-sky-400 ring-1 ring-sky-400/40'
                              : 'border-white/10 hover:border-sky-400/60'
                          }`}
                          title={`이미지 ${i + 1} 적용`}
                        >
                          <img src={src} alt={`이미지 ${i + 1}`} className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">적용</span>
                          </div>
                          {lastAppliedSrc === src && (
                            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-sky-500 rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-white" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
