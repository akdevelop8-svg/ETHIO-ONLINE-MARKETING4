import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  type?: 'error' | 'success' | 'info' | 'warning';
  title?: string;
  message?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant,
  type,
  title,
  message,
  children,
  onClose,
  className = ''
}) => {
  const activeVariant = variant === 'danger' ? 'error' : (variant || type || 'info');

  const styles: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    info: {
      bg: 'bg-sky-950/40',
      border: 'border-sky-800/60',
      text: 'text-sky-300',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
    },
    success: {
      bg: 'bg-emerald-950/40',
      border: 'border-emerald-800/60',
      text: 'text-emerald-300',
      icon: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
    },
    warning: {
      bg: 'bg-amber-950/40',
      border: 'border-amber-800/60',
      text: 'text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
    },
    error: {
      bg: 'bg-rose-950/40',
      border: 'border-rose-800/60',
      text: 'text-rose-300',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
    }
  };

  const current = styles[activeVariant] || styles.info;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${current.bg} ${current.border} ${className}`}>
      {current.icon}
      <div className="flex-1 text-sm">
        {title && <h5 className={`font-semibold mb-0.5 ${current.text}`}>{title}</h5>}
        <div className="text-slate-300 leading-relaxed text-xs sm:text-sm">
          {message || children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
