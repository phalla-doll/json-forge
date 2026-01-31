import React, { useRef } from 'react';
import { 
  Braces, 
  Minimize2, 
  Copy, 
  Download, 
  Upload, 
  Trash2,
  ChevronDown
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
  indentation: number | string;
  onIndentChange: (value: number | string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onFormat,
  onMinify,
  onCopy,
  onClear,
  onDownload,
  onUpload,
  hasContent,
  indentation,
  onIndentChange
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
          {/* Indentation Selector */}
          <div className="relative mr-2 group">
             <select
                value={indentation === '\t' ? 'tab' : indentation}
                onChange={(e) => {
                    const val = e.target.value;
                    onIndentChange(val === 'tab' ? '\t' : Number(val));
                }}
                className="appearance-none bg-black border border-accents-2 text-accents-5 text-xs py-1.5 pl-3 pr-8 rounded-md hover:border-accents-5 focus:outline-none focus:ring-2 focus:ring-accents-5 transition-all cursor-pointer font-medium"
            >
                <option value="2">2 Spaces</option>
                <option value="4">4 Spaces</option>
                <option value="tab">Tabs</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-accents-5 pointer-events-none group-hover:text-accents-8 transition-colors" />
          </div>

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
            accept=".json,application/json"
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} icon={<Upload className="w-3.5 h-3.5"/>}>
            Import
          </Button>
          <Button size="sm" onClick={onDownload} disabled={!hasContent} icon={<Download className="w-3.5 h-3.5"/>}>
            Export JSON
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