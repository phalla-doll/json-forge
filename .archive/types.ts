export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface EditorStats {
  chars: number;
  lines: number;
  size: string;
}
