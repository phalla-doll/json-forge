import React, { useRef } from 'react';
import { 
  Braces, 
  Minimize2, 
  Copy, 
  Download, 
  Upload, 
  Trash2 
} from 'lucide-react';
import { Button } from './Button';

interface ToolbarProps {
  onFormat: () => void;
  onMinify: () => void;
  onCopy: () => void;
  onClear: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  hasContent: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onFormat,
  onMinify,
  onCopy,
  onClear,
  onDownload,
  onUpload,
  hasContent
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="h-14 flex items-center justify-between px-4 bg-background border-b border-accents-2 shrink-0">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 pr-3 border-r border-accents-2">
          <Button size="sm" onClick={onFormat} disabled={!hasContent} icon={<Braces className="w-3.5 h-3.5"/>}>
            Prettify
          </Button>
          <Button size="sm" onClick={onMinify} disabled={!hasContent} icon={<Minimize2 className="w-3.5 h-3.5"/>}>
            Minify
          </Button>
        </div>

        <div className="flex items-center gap-1 pl-1">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/json,.json,text/plain"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} icon={<Upload className="w-3.5 h-3.5"/>}>
            Import
          </Button>
          <Button size="sm" onClick={onDownload} disabled={!hasContent} icon={<Download className="w-3.5 h-3.5"/>}>
            Export
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onClear} disabled={!hasContent} variant="ghost" className="text-accents-4 hover:text-error" icon={<Trash2 className="w-3.5 h-3.5"/>}>
          Clear
        </Button>
        <Button size="sm" onClick={onCopy} disabled={!hasContent} variant="primary" icon={<Copy className="w-3.5 h-3.5"/>}>
          Copy
        </Button>
      </div>
    </div>
  );
};