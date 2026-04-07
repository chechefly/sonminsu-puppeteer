import { useState } from 'react';
import { AppStep, Slide, EditorSession } from './types';
import { parseHTML } from './utils/htmlParser';
import HtmlInput from './components/HtmlInput';
import Editor from './components/Editor';
import HistoryPanel from './components/HistoryPanel';

export default function App() {
  const [step, setStep] = useState<AppStep>('input');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [caption, setCaption] = useState('');
  const [extractedStyles, setExtractedStyles] = useState('');
  const [globalImages, setGlobalImages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);

  const handleLoad = (html: string) => {
    setError('');
    const result = parseHTML(html);
    if (result.slides.length === 0) {
      setError('슬라이드를 찾을 수 없습니다. HTML을 확인해주세요.');
      return;
    }
    setSlides(result.slides);
    setCaption(result.caption);
    setExtractedStyles(result.extractedStyles);
    setGlobalImages(result.globalImages);
    setCurrentSessionId(undefined);
    setStep('editor');
  };

  const handleBack = () => {
    setStep('input');
    setSlides([]);
    setCaption('');
    setExtractedStyles('');
    setGlobalImages([]);
    setError('');
    setCurrentSessionId(undefined);
  };

  const handleLoadSession = (session: EditorSession) => {
    setSlides(session.slides_json);
    setCaption(session.caption);
    setExtractedStyles(session.extracted_styles);
    const imgs = Array.from(new Set(session.slides_json.flatMap(s => s.candidateImages)));
    setGlobalImages(imgs);
    setCurrentSessionId(session.id);
    setShowHistory(false);
    setStep('editor');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {step === 'input' ? (
        <HtmlInput
          onLoad={handleLoad}
          error={error}
          onShowHistory={() => setShowHistory(true)}
        />
      ) : (
        <Editor
          slides={slides}
          caption={caption}
          extractedStyles={extractedStyles}
          globalImages={globalImages}
          currentSessionId={currentSessionId}
          onSessionSaved={setCurrentSessionId}
          onBack={handleBack}
          onShowHistory={() => setShowHistory(true)}
        />
      )}

      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
          onLoad={handleLoadSession}
        />
      )}
    </div>
  );
}
