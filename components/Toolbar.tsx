import React, { useRef, useEffect, useState } from 'react';
import { 
  Sparkles, 
  Minimize2, 
  Copy, 
  Download, 
  Upload, 
  Trash2,
  ChevronDown,
  Search
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
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchEnter: () => void;
  hasMatches: boolean | null;
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
  onIndentChange,
  searchTerm,
  onSearchChange,
  onSearchEnter,
  hasMatches
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shortcutLabel, setShortcutLabel] = useState('Ctrl+K');

  useEffect(() => {
    // Detect OS for label
    if (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)) {
      setShortcutLabel('⌘K');
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  return (
    <div className="h-14 flex items-center justify-between px-4 bg-background border-b border-accents-2 shrink-0 overflow-x-auto scrollbar-hide transition-colors duration-300">
      <div className="flex items-center gap-2 min-w-max">
        <div className="flex items-center gap-1 pr-3 border-r border-accents-2">
          {/* Indentation Selector */}
          <div className="relative mr-2 group">
             <select
                value={indentation === '\t' ? 'tab' : indentation}
                onChange={(e) => {
                    const val = e.target.value;
                    onIndentChange(val === 'tab' ? '\t' : Number(val));
                }}
                className="appearance-none bg-background border border-accents-2 text-accents-5 text-xs py-1.5 pl-3 pr-6 md:pr-8 rounded-md hover:border-accents-5 focus:outline-none focus:ring-2 focus:ring-accents-5 transition-all cursor-pointer font-medium"
            >
                <option value="2">2 Sp</option>
                <option value="4">4 Sp</option>
                <option value="tab">Tabs</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 md:right-2.5 top-1/2 -translate-y-1/2 text-accents-5 pointer-events-none group-hover:text-accents-8 transition-colors" />
          </div>

          <Button size="sm" onClick={onFormat} disabled={!hasContent} icon={<Sparkles className="w-3.5 h-3.5"/>}>
            <span className="hidden sm:inline">Prettify</span>
          </Button>
          <Button size="sm" onClick={onMinify} disabled={!hasContent} icon={<Minimize2 className="w-3.5 h-3.5"/>}>
            <span className="hidden sm:inline">Minify</span>
          </Button>
        </div>

        <div className="flex items-center gap-2 pl-1 pr-3 border-r border-accents-2">
            {/* Search Bar */}
            <div className="relative group">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-accents-5 transition-colors" />
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={`Search... (${shortcutLabel})`}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearchEnter();
                  }
                }}
                className={`
                  bg-background border rounded-md pl-8 pr-3 py-1.5 text-xs text-accents-8 placeholder:text-accents-4 focus:outline-none w-32 focus:w-48 lg:focus:w-64 transition-all
                  ${hasMatches === false 
                    ? 'border-error focus:border-error' 
                    : 'border-accents-2 focus:border-accents-5'}
                `}
              />
            </div>
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
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" onClick={onDownload} disabled={!hasContent} icon={<Download className="w-3.5 h-3.5"/>}>
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 min-w-max">
        <Button size="sm" onClick={onClear} disabled={!hasContent} variant="ghost" className="text-accents-4 hover:text-error" icon={<Trash2 className="w-3.5 h-3.5"/>}>
          <span className="hidden sm:inline">Clear</span>
        </Button>
        <Button size="sm" onClick={onCopy} disabled={!hasContent} variant="primary" icon={<Copy className="w-3.5 h-3.5"/>}>
          <span className="hidden sm:inline">Copy</span>
        </Button>
      </div>
    </div>
  );
};