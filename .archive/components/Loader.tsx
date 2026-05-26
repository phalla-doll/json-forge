import React, { useEffect, useState } from 'react';

export const Loader: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Simulate progress bar movement
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        // Random increment to look like real processing
        const next = prev + Math.floor(Math.random() * 15) + 5;
        return Math.min(next, 100);
      });
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Calculate ASCII bar
  const totalChars = 20;
  // Ensure progress never exceeds 100 for calculation to prevent negative emptyChars
  const safeProgress = Math.min(Math.max(progress, 0), 100);
  
  const filledChars = Math.floor((safeProgress / 100) * totalChars);
  // Ensure emptyChars is at least 0
  const emptyChars = Math.max(0, totalChars - filledChars);
  
  const bar = '#'.repeat(filledChars) + '.'.repeat(emptyChars);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-[#eaeaea] font-mono text-[13px] tracking-tight">
       <div className="flex flex-col gap-2 w-fit max-w-full px-6">
          <div><span className="text-success">➜</span> <span className="text-accents-3">~</span> json_forge --init</div>
          <div><span className="text-green-500">✓</span> <span className="text-accents-3">core_modules_loaded</span></div>
          <div>[{bar}] <span className="text-accents-3">{Math.min(safeProgress, 99)}%</span></div>
          <div className="text-accents-3">{'>'} waiting_for_editor...<span className="animate-pulse">_</span></div>
        </div>
    </div>
  );
};