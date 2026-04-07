import { useState } from 'react';
import { X, Image, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { EditImageData } from '../types';

interface ImageModalProps {
  data: EditImageData;
  onApply: (editId: string, newSrc: string) => void;
  onClose: () => void;
}

export default function ImageModal({ data, onApply, onClose }: ImageModalProps) {
  const [src, setSrc] = useState(data.src);
  const hasCandidates = data.candidateImages.length > 0;
  const hasAllImages = data.allImages.length > 0;
  const [showAllPool, setShowAllPool] = useState(!hasCandidates && hasAllImages);

  const handleApply = () => {
    if (src.trim()) {
      onApply(data.editId, src.trim());
      onClose();
    }
  };

  const selectImage = (imgSrc: string) => {
    setSrc(imgSrc);
  };

  const candidatesToShow = hasCandidates ? data.candidateImages : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Image className="w-4 h-4 text-pink-400" />
            </div>
            <h2 className="text-white font-semibold">이미지 교체</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {src && (
          <div className="mb-4 flex items-center justify-center bg-[#1a1a1a] rounded-xl p-3 border border-white/5">
            <img
              src={src}
              alt="선택된 이미지"
              className="max-h-24 max-w-full object-contain rounded-lg"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        {candidatesToShow.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
              후보 이미지
            </p>
            <div className="grid grid-cols-4 gap-2">
              {candidatesToShow.map((imgSrc, i) => (
                <button
                  key={i}
                  onClick={() => selectImage(imgSrc)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    src === imgSrc
                      ? 'border-pink-500 ring-2 ring-pink-500/30'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img
                    src={imgSrc}
                    alt={`후보 ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.parentElement!.style.display = 'none';
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {hasAllImages && (
          <div className="mb-4">
            {hasCandidates ? (
              <button
                onClick={() => setShowAllPool(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs font-semibold uppercase tracking-widest transition-all"
              >
                <span>전체 이미지풀에서 선택 ({data.allImages.length}개)</span>
                {showAllPool ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            ) : (
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                전체 이미지풀 ({data.allImages.length}개)
              </p>
            )}

            {showAllPool && (
              <div className={`${hasCandidates ? 'mt-2' : ''} grid grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1`}>
                {data.allImages.map((imgSrc, i) => (
                  <button
                    key={i}
                    onClick={() => selectImage(imgSrc)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      src === imgSrc
                        ? 'border-pink-500 ring-2 ring-pink-500/30'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={imgSrc}
                      alt={`이미지 ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={e => {
                        const target = e.target as HTMLImageElement;
                        target.parentElement!.style.display = 'none';
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          이미지 URL 직접 입력
        </label>
        <input
          type="url"
          value={src}
          onChange={e => setSrc(e.target.value)}
          placeholder="https://..."
          className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-xl px-4 py-3 border border-white/10 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20 placeholder-gray-600 transition-all mb-4"
          onKeyDown={e => e.key === 'Enter' && handleApply()}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-medium text-sm transition-all"
          >
            취소
          </button>
          <button
            onClick={handleApply}
            disabled={!src.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            교체
          </button>
        </div>
      </div>
    </div>
  );
}
