import { useState } from 'react';
import { X, Type, Check } from 'lucide-react';
import { EditTextData } from '../types';

interface TextModalProps {
  data: EditTextData;
  onApply: (editId: string, newText: string) => void;
  onClose: () => void;
}

export default function TextModal({ data, onApply, onClose }: TextModalProps) {
  const [text, setText] = useState(data.text);

  const handleApply = () => {
    onApply(data.editId, text);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#2a2a2a] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Type className="w-4 h-4 text-yellow-400" />
            </div>
            <h2 className="text-white font-semibold">텍스트 편집</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
          텍스트 내용
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-xl px-4 py-3 border border-white/10 focus:border-yellow-500/60 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 placeholder-gray-600 transition-all resize-none mb-4"
          autoFocus
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
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-semibold text-sm transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            수정
          </button>
        </div>
      </div>
    </div>
  );
}
