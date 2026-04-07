import { useEffect, useState } from 'react';
import { X, Trash2, Clock, Layers, RefreshCw } from 'lucide-react';
import { EditorSession } from '../types';
import { loadSessions, deleteSession } from '../utils/historyStore';

interface HistoryPanelProps {
  onClose: () => void;
  onLoad: (session: EditorSession) => void;
}

export default function HistoryPanel({ onClose, onLoad }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<EditorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    const data = await loadSessions();
    setSessions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    await deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-sm h-full bg-[#1e1e1e] border-l border-white/10 flex flex-col shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-pink-400" />
            <span className="text-white font-semibold text-sm">작업 이력</span>
            {sessions.length > 0 && (
              <span className="bg-white/10 text-white/60 text-xs px-1.5 py-0.5 rounded-md font-medium">
                {sessions.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchSessions}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
              title="새로고침"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-white/30">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-white/30">
              <Clock className="w-10 h-10 opacity-30" />
              <p className="text-sm">저장된 이력이 없습니다</p>
              <p className="text-xs opacity-60">에디터에서 저장하면 여기에 표시됩니다</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-white/5">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => onLoad(session)}
                  className="group w-full text-left px-5 py-4 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate leading-tight">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-white/40 text-xs">
                          <Layers className="w-3 h-3" />
                          {session.slide_count}장
                        </span>
                        <span className="text-white/30 text-xs">
                          {formatDate(session.updated_at)}
                        </span>
                      </div>
                      {session.caption && (
                        <p className="mt-1.5 text-white/30 text-xs truncate leading-snug">
                          {session.caption.slice(0, 50)}
                          {session.caption.length > 50 ? '...' : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => handleDelete(e, session.id)}
                      disabled={deletingId === session.id}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-30"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/10 text-white/25 text-xs text-center">
          이 기기에서 저장된 세션만 표시됩니다
        </div>
      </div>
    </div>
  );
}
