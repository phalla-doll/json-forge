import React from 'react';
import { EditorStats } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

interface StatusBarProps {
  stats: EditorStats;
  error: string | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({ stats, error }) => {
  return (
    <div className="h-8 flex items-center justify-between px-4 bg-accents-1 border-t border-accents-2 text-[11px] font-mono text-accents-5 select-none shrink-0 z-10 transition-colors duration-300">
      <div className="flex items-center gap-4">
        {/* Validation Status */}
        <div 
          className={`flex items-center gap-1.5 transition-colors duration-300 ${error ? 'text-error' : 'text-green-500'}`}
          title={error || "JSON syntax is valid"}
        >
          {error ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
          <span className="font-medium">
            {error ? 'Invalid JSON' : 'Valid JSON'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <div 
          className="flex items-center gap-2 hover:text-accents-7 transition-colors cursor-help" 
          title="Total number of lines in the document"
        >
          <span className="text-accents-4 uppercase tracking-wider text-[10px]">Lines</span>
          <span className="text-accents-6">{stats.lines}</span>
        </div>
        
        <div 
          className="flex items-center gap-2 hover:text-accents-7 transition-colors cursor-help"
          title="Total character count (including whitespace)"
        >
          <span className="text-accents-4 uppercase tracking-wider text-[10px]">Chars</span>
          <span className="text-accents-6">{stats.chars}</span>
        </div>
        
        <div 
          className="flex items-center gap-2 hover:text-accents-7 transition-colors cursor-help"
          title="Estimated file size in memory"
        >
          <span className="text-accents-4 uppercase tracking-wider text-[10px]">Size</span>
          <span className="text-accents-6">{stats.size}</span>
        </div>
      </div>
    </div>
  );
};