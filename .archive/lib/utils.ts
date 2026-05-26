import { EditorStats } from '../types';

declare global {
  interface Window {
    gtag: (
      command: 'event',
      action: string,
      params?: { [key: string]: any }
    ) => void;
  }
}

export const trackEvent = (action: string, params?: { [key: string]: any }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, params);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getStats = (text: string): EditorStats => {
  return {
    chars: text.length,
    lines: text.split(/\r\n|\r|\n/).length,
    size: formatFileSize(new Blob([text]).size),
  };
};

export const isValidJson = (text: string): boolean => {
  if (!text.trim()) return true; // Empty is valid-ish for editing
  try {
    JSON.parse(text);
    return true;
  } catch (e) {
    return false;
  }
};

export const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};