import { useState } from 'react';
import { FileText, ArrowRight, AlertCircle, Clock } from 'lucide-react';

interface HtmlInputProps {
  onLoad: (html: string) => void;
  error: string;
  onShowHistory: () => void;
}

export default function HtmlInput({ onLoad, error, onShowHistory }: HtmlInputProps) {
  const [value, setValue] = useState('');

  const handleLoad = () => {
    if (value.trim()) {
      onLoad(value.trim());
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 shadow-lg shadow-pink-500/30 mb-5">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
            손민수 카드뉴스 에디터
          </h1>
          <p className="text-gray-400 text-sm">
            Claude가 생성한 HTML을 붙여넣고 슬라이드를 편집하세요
          </p>
        </div>

        <div className="bg-[#2a2a2a] rounded-2xl p-6 shadow-2xl border border-white/5">
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            HTML 코드
          </label>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Claude가 생성한 HTML을 여기에 붙여넣으세요"
            className="w-full h-72 bg-[#1a1a1a] text-gray-200 text-sm font-mono rounded-xl p-4 resize-none border border-white/10 focus:border-pink-500/60 focus:outline-none focus:ring-2 focus:ring-pink-500/20 placeholder-gray-600 transition-all"
          />

          {error && (
            <div className="flex items-center gap-2 mt-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleLoad}
              disabled={!value.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-pink-500/20 disabled:shadow-none"
            >
              슬라이드 불러오기
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onShowHistory}
              className="flex items-center gap-2 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white font-medium rounded-xl transition-all text-sm"
            >
              <Clock className="w-4 h-4" />
              이력
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          모든 처리는 브라우저에서만 이루어집니다 — 서버로 데이터가 전송되지 않습니다
        </p>
      </div>
    </div>
  );
}
