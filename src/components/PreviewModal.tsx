import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Slide } from '../types';
import SlidePreview from './SlidePreview';
import { updateImageSrc } from '../utils/htmlUpdater';

function calcScale(): number {
  const maxW = window.innerWidth - 240;
  const maxH = window.innerHeight - 220;
  return Math.min(1, maxW / 1080, maxH / 1350);
}

interface ImageSlot {
  editId: string;
  src: string;
  label: string;
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

interface PreviewModalProps {
  slide: Slide;
  slides: Slide[];
  extractedStyles: string;
  onClose: () => void;
  onNavigate: (slide: Slide) => void;
  onSlideUpdate: (id: string, newHtml: string) => void;
}

export default function PreviewModal({ slide, slides, extractedStyles, onClose, onNavigate, onSlideUpdate }: PreviewModalProps) {
  const [scale, setScale] = useState(calcScale);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [lastAppliedSrc, setLastAppliedSrc] = useState<string | null>(null);
  const lastEditIdRef = useRef<string>('');
  const currentIndex = slides.findIndex(s => s.id === slide.id);

  const slots = getImageSlots(slide.html);

  useEffect(() => {
    const onResize = () => setScale(calcScale());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(slides[currentIndex - 1]);
      if (e.key === 'ArrowRight' && currentIndex < slides.length - 1) onNavigate(slides[currentIndex + 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentIndex, onClose, onNavigate, slides]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (typeof e.data !== 'string') return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'edit-image' && data.slideId === slide.id) {
          lastEditIdRef.current = data.editId;
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [slide.id]);

  useEffect(() => {
    lastEditIdRef.current = '';
    setSelectedSlotId(null);
    setLastAppliedSrc(null);
  }, [slide.id]);

  const getTargetSlotId = (): string | null => {
    if (selectedSlotId) return selectedSlotId;
    if (lastEditIdRef.current) return lastEditIdRef.current;
    if (slots.length >= 1) return slots[0].editId;
    return null;
  };

  const handleCandidateClick = (imgSrc: string) => {
    if (slots.length === 0) return;
    const targetId = getTargetSlotId();
    if (!targetId) return;
    onSlideUpdate(slide.id, updateImageSrc(slide.html, targetId, imgSrc));
    setLastAppliedSrc(imgSrc);
  };

  const goPrev = () => {
    if (currentIndex > 0) onNavigate(slides[currentIndex - 1]);
  };

  const goNext = () => {
    if (currentIndex < slides.length - 1) onNavigate(slides[currentIndex + 1]);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex items-center gap-4 px-4 max-w-[95vw]">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all border border-white/10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-between w-full">
              <span className="text-white/50 text-sm font-medium">
                {currentIndex + 1} / {slides.length}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
              <SlidePreview slide={slide} scale={scale} extractedStyles={extractedStyles} interactive={true} />
            </div>

            <p className="text-white/30 text-xs">
              이미지나 텍스트를 클릭하여 편집 &nbsp;·&nbsp; ESC로 닫기 &nbsp;·&nbsp; ← → 탐색
            </p>
          </div>

          {slide.candidateImages.length > 0 && (
            <div
              className="flex-shrink-0 bg-[#1e1e1e] border border-white/10 rounded-2xl p-3 flex flex-col gap-3"
              style={{ width: 130, maxHeight: `calc(${1350 * scale}px + 60px)`, overflowY: 'auto' }}
            >
              <p className="text-white/40 text-[10px] font-semibold uppercase tracking-wider text-center">이미지 교체</p>

              {slots.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-white/25 text-[9px] font-semibold uppercase tracking-wider">위치 선택</p>
                  {slots.map((slot) => {
                    const isActive = (selectedSlotId ?? slots[0].editId) === slot.editId;
                    return (
                      <button
                        key={slot.editId}
                        onClick={() => setSelectedSlotId(slot.editId)}
                        className={`relative w-full h-14 rounded-lg overflow-hidden border-2 transition-all ${
                          isActive ? 'border-sky-400 ring-1 ring-sky-400/40' : 'border-white/10 hover:border-white/30'
                        }`}
                      >
                        <img src={slot.src} alt={slot.label} className="w-full h-full object-cover" />
                        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isActive ? 'bg-sky-500/30 opacity-100' : 'opacity-0'}`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                          <p className="text-white text-[8px] text-center font-medium">{slot.label}</p>
                        </div>
                      </button>
                    );
                  })}
                  <div className="border-t border-white/8 my-1" />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <p className="text-white/25 text-[9px] font-semibold uppercase tracking-wider">후보 이미지</p>
                {slide.candidateImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => handleCandidateClick(src)}
                    className={`relative w-full h-[88px] rounded-lg overflow-hidden border-2 transition-all group/img flex-shrink-0 ${
                      lastAppliedSrc === src
                        ? 'border-sky-400 ring-1 ring-sky-400/40'
                        : 'border-white/10 hover:border-sky-400/60'
                    }`}
                    title={`이미지 ${i + 1} 적용`}
                  >
                    <img
                      src={src}
                      alt={`후보 ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold">적용</span>
                    </div>
                    {lastAppliedSrc === src && (
                      <div className="absolute top-1 right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={currentIndex === slides.length - 1}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed text-white transition-all border border-white/10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
