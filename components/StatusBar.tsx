import React from 'react';
import { EditorStats } from '../types';

interface StatusBarProps {
  stats: EditorStats;
}

export const StatusBar: React.FC<StatusBarProps> = ({ stats }) => {
  return (
    <div className="h-8 flex items-center justify-between px-4 bg-accents-1 border-t border-accents-2 text-[11px] font-mono text-accents-5 select-none shrink-0 z-10">
      <div className="flex items-center gap-4">
        {/* Left side content (optional, e.g. cursor position could go here later) */}
        <span className="text-accents-3">JSON</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-accents-4 uppercase tracking-wider">Lines</span>
          <span className="text-accents-6">{stats.lines}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accents-4 uppercase tracking-wider">Chars</span>
          <span className="text-accents-6">{stats.chars}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accents-4 uppercase tracking-wider">Size</span>
          <span className="text-accents-6">{stats.size}</span>
        </div>
      </div>
    </div>
  );
};