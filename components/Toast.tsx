import React, { useEffect } from 'react';
import { ToastMessage } from '../types';

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const borderColors = {
    success: 'border-accents-2', // Vercel toasts are usually dark with subtle borders
    error: 'border-error/50',
    info: 'border-accents-2',
  };

  const indicatorColors = {
    success: 'bg-success',
    error: 'bg-error',
    info: 'bg-accents-5',
  };

  return (
    <div className={`
      relative flex items-center gap-4 px-4 py-3 rounded-md shadow-2xl 
      bg-accents-1 border ${borderColors[toast.type]}
      animate-in slide-in-from-bottom-5 fade-in duration-300
      max-w-sm w-full
    `}>
      <div className={`w-1 h-1 rounded-full ${indicatorColors[toast.type]} shrink-0`} />
      <p className="text-sm text-accents-8 font-medium">{toast.message}</p>
    </div>
  );
};