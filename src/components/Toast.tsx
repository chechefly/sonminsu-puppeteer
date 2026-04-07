import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error';

export interface ToastData {
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: () => void;
  duration?: number;
}

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

const colorMap = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: 'text-emerald-400',
    title: 'text-emerald-300',
  },
  warning: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    title: 'text-amber-300',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    title: 'text-red-300',
  },
};

export default function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setExiting(true), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(onDismiss, 250);
    return () => clearTimeout(timer);
  }, [exiting, onDismiss]);

  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] max-w-sm w-full ${
        exiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className={`${colors.bg} ${colors.border} border rounded-xl px-4 py-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3`}>
        <Icon className={`w-5 h-5 ${colors.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.title}`}>{toast.title}</p>
          {toast.description && (
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{toast.description}</p>
          )}
        </div>
        <button
          onClick={() => setExiting(true)}
          className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
