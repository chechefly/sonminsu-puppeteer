import { useState } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';

interface CaptionSectionProps {
  caption: string;
  onChange: (text: string) => void;
}

export default function CaptionSection({ caption, onChange }: CaptionSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = caption;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#2a2a2a] rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-white font-semibold">인스타그램 캡션</h2>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            copied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              복사됨
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              복사
            </>
          )}
        </button>
      </div>

      <textarea
        value={caption}
        onChange={e => onChange(e.target.value)}
        rows={8}
        placeholder="캡션 내용이 없습니다. 직접 입력하세요."
        className="w-full bg-[#1a1a1a] text-gray-200 text-sm rounded-xl px-4 py-3 border border-white/10 focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder-gray-600 transition-all resize-none"
      />
    </div>
  );
}
