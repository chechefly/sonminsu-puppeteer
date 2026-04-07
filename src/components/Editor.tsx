import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Layers, Loader2, Save, Clock, Check } from 'lucide-react';
import { Slide, EditImageData, EditTextData, ExportResult } from '../types';
import SlideCard from './SlideCard';
import PreviewModal from './PreviewModal';
import ImageModal from './ImageModal';
import TextModal from './TextModal';
import CaptionSection from './CaptionSection';
import Toast, { ToastData } from './Toast';
import { updateImageSrc, updateTextContent, updateElementSize } from '../utils/htmlUpdater';
import { exportSlides, ProgressStatus, debugExportHtml } from '../utils/pngExport';
import { saveSession } from '../utils/historyStore';

interface EditorProps {
  slides: Slide[];
  caption: string;
  extractedStyles: string;
  globalImages: string[];
  currentSessionId?: string;
  onSessionSaved: (id: string) => void;
  onBack: () => void;
  onShowHistory: () => void;
}

export default function Editor({
  slides: initialSlides,
  caption: initialCaption,
  extractedStyles,
  globalImages,
  currentSessionId,
  onSessionSaved,
  onBack,
  onShowHistory,
}: EditorProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [caption, setCaption] = useState(initialCaption);
  const [previewSlide, setPreviewSlide] = useState<Slide | null>(null);
  const [editImage, setEditImage] = useState<EditImageData | null>(null);
  const [editText, setEditText] = useState<EditTextData | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, status: '' });
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (typeof e.data !== 'string') return;
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'edit-image') {
        const targetSlide = slides.find(s => s.id === data.slideId);
        setEditImage({
          slideId: data.slideId,
          editId: data.editId,
          src: data.src,
          candidateImages: targetSlide?.candidateImages ?? [],
          allImages: globalImages,
        });
      } else if (data.type === 'edit-text') {
        setEditText({ slideId: data.slideId, editId: data.editId, text: data.text });
      } else if (data.type === 'resize-element') {
        setSlides(prev => prev.map(s => {
          if (s.id !== data.slideId) return s;
          return { ...s, html: updateElementSize(s.html, data.editId, data.width, data.height) };
        }));
        setPreviewSlide(prev => {
          if (!prev || prev.id !== data.slideId) return prev;
          return { ...prev, html: updateElementSize(prev.html, data.editId, data.width, data.height) };
        });
      }
    } catch {
      // ignore non-JSON messages
    }
  }, [slides, globalImages]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  const updateSlideHtml = (id: string, newHtml: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, html: newHtml } : s));
    setPreviewSlide(prev => prev?.id === id ? { ...prev, html: newHtml } : prev);
  };

  const deleteSlide = (id: string) => {
    setSlides(prev => {
      const filtered = prev.filter(s => s.id !== id);
      return filtered.map((s, i) => ({ ...s, slideNumber: i + 1 }));
    });
    if (previewSlide?.id === id) setPreviewSlide(null);
  };

  const applyImageEdit = (editId: string, newSrc: string) => {
    if (!editImage) return;
    const slideId = editImage.slideId;
    const newHtml = updateImageSrc(
      slides.find(s => s.id === slideId)?.html || '',
      editId,
      newSrc
    );
    updateSlideHtml(slideId, newHtml);
  };

  const applyTextEdit = (editId: string, newText: string) => {
    if (!editText) return;
    const slideId = editText.slideId;
    const newHtml = updateTextContent(
      slides.find(s => s.id === slideId)?.html || '',
      editId,
      newText
    );
    updateSlideHtml(slideId, newHtml);
  };

  const handlePreviewNavigate = (slide: Slide) => {
    const current = slides.find(s => s.id === slide.id);
    if (current) setPreviewSlide(current);
  };

  const statusLabel = (s: ProgressStatus): string => {
    if (s === 'saving') return '압축 중';
    return '캡처 중';
  };

  const handleExport = async () => {
    setExporting(true);
    setToast(null);
    let result: ExportResult;
    try {
      result = await exportSlides(slides, extractedStyles, (current, total, status) => {
        setExportProgress({ current, total, status: statusLabel(status) });
      });
    } catch (err) {
      console.error('Export failed:', err);
      setToast({ type: 'error', title: 'PNG 저장 실패', description: '알 수 없는 오류가 발생했습니다' });
      setExporting(false);
      setExportProgress({ current: 0, total: 0, status: '' });
      return;
    }

    setExporting(false);
    setExportProgress({ current: 0, total: 0, status: '' });

    if (result.cancelled) return;

    if (result.failed === 0 && result.success > 0) {
      setToast({ type: 'success', title: `${result.success}장 모두 저장 완료` });
    } else if (result.success > 0 && result.failed > 0) {
      setToast({
        type: 'warning',
        title: `${result.success}/${result.success + result.failed}장 저장 완료`,
        description: result.errors.map(e => `슬라이드 ${e.slideNumber}: ${e.message}`).join(', '),
      });
    } else {
      setToast({
        type: 'error',
        title: 'PNG 저장 실패',
        description: result.errors.length > 0 ? result.errors[0].message : '모든 슬라이드 캡처에 실패했습니다',
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const id = await saveSession(slides, caption, extractedStyles, currentSessionId);
    setSaving(false);
    if (id) {
      onSessionSaved(id);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 2000);
    }
  };

  const previewSlides = previewSlide
    ? slides.map(s => (s.id === previewSlide.id ? previewSlide : s))
    : slides;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            처음으로
          </button>

          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Layers className="w-4 h-4 text-pink-400" />
            <span className="text-white font-semibold">{slides.length}</span>장
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => debugExportHtml(slides, extractedStyles)}
              className="px-3 py-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
              title="HTML 디버그 다운로드"
            >
              HTML
            </button>

            <button
              onClick={onShowHistory}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-all text-sm"
            >
              <Clock className="w-4 h-4" />
              이력
            </button>

            <button
              onClick={handleSave}
              disabled={saving || slides.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white/70 hover:text-white font-medium rounded-xl transition-all text-sm"
            >
              {savedOk ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">저장됨</span>
                </>
              ) : saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  저장 중
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  저장
                </>
              )}
            </button>

            <button
              onClick={handleExport}
              disabled={exporting || slides.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-pink-500/20 disabled:shadow-none"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {exportProgress.status} ({exportProgress.current}/{exportProgress.total})
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  PNG 다운로드
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {slides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-500">
            <Layers className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">슬라이드가 없습니다</p>
            <p className="text-sm mt-1 opacity-70">모든 슬라이드가 삭제되었습니다</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5 justify-start">
            {slides.map(slide => (
              <SlideCard
                key={slide.id}
                slide={slide}
                extractedStyles={extractedStyles}
                globalImages={globalImages}
                onDelete={deleteSlide}
                onClick={s => setPreviewSlide(s)}
                onSlideUpdate={updateSlideHtml}
              />
            ))}
          </div>
        )}

        {(caption || slides.length > 0) && (
          <div className="mt-10">
            <CaptionSection caption={caption} onChange={setCaption} />
          </div>
        )}
      </main>

      {previewSlide && (
        <PreviewModal
          slide={previewSlide}
          slides={previewSlides}
          extractedStyles={extractedStyles}
          onClose={() => setPreviewSlide(null)}
          onNavigate={handlePreviewNavigate}
          onSlideUpdate={updateSlideHtml}
        />
      )}

      {editImage && (
        <ImageModal
          data={editImage}
          onApply={applyImageEdit}
          onClose={() => setEditImage(null)}
        />
      )}

      {editText && (
        <TextModal
          data={editText}
          onApply={applyTextEdit}
          onClose={() => setEditText(null)}
        />
      )}

      {toast && (
        <Toast toast={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
