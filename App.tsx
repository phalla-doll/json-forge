import React, { useState, useCallback } from 'react';
import { Command, Github, Code, GitGraph } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { JsonEditor } from './components/Editor';
import { JsonGraphView } from './components/JsonTreeView';
import { Toast } from './components/Toast';
import { getStats, downloadFile, isValidJson } from './lib/utils';
import { ToastMessage } from './types';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewMode, setViewMode] = useState<'code' | 'graph'>('code');

  const stats = getStats(jsonInput);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    // Clear error if input becomes valid or empty
    if (!value || isValidJson(value)) {
      setError(null);
    }
  };

  const handleFormat = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setError(null);
      addToast('success', 'Formatted successfully');
    } catch (err) {
      setError((err as Error).message);
      addToast('error', 'Invalid JSON format');
    }
  };

  const handleMinify = () => {
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed));
      setError(null);
      addToast('success', 'Minified successfully');
    } catch (err) {
      setError((err as Error).message);
      addToast('error', 'Invalid JSON format');
    }
  };

  const handleCopy = async () => {
    if (!jsonInput) return;
    try {
      await navigator.clipboard.writeText(jsonInput);
      addToast('success', 'Copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
      addToast('error', 'Failed to copy to clipboard');
    }
  };

  const handleClear = () => {
    if (!jsonInput) return;
    
    // Only confirm if there's significant content to prevent accidental data loss
    if (jsonInput.length > 50) {
      if (!window.confirm('Are you sure you want to clear the editor?')) {
        return;
      }
    }
    
    setJsonInput('');
    setError(null);
    addToast('info', 'Editor cleared');
  };

  const handleDownload = () => {
    if (!jsonInput) return;
    try {
      JSON.parse(jsonInput);
      downloadFile(jsonInput, 'data.json');
      addToast('success', 'File downloaded');
    } catch (e) {
      if (window.confirm('The JSON is invalid. Save anyway?')) {
        downloadFile(jsonInput, 'invalid-data.json');
      }
    }
  };

  const handleUpload = (file: File) => {
    // Validate file extension
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      addToast('error', 'Invalid file type. Only .json files are allowed.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setJsonInput(event.target.result as string);
        setError(null);
        addToast('success', `Loaded ${file.name}`);
      }
    };
    reader.onerror = () => {
      addToast('error', 'Failed to read file');
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-accents-8 font-sans selection:bg-accents-2">
      {/* Vercel-style Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-accents-2 bg-background/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="bg-white text-black p-1.5 rounded-full">
            <Command className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-white tracking-wide">JSON Forge</h1>
            <span className="text-xs text-accents-4">Development Environment</span>
          </div>
          <div className="h-6 w-px bg-accents-2 mx-2 hidden md:block"></div>
          
          <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-accents-1 rounded border border-accents-2">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="text-xs font-mono text-accents-5">Ready</span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-accents-1 p-0.5 rounded-md border border-accents-2">
            <button
              onClick={() => setViewMode('code')}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'code' 
                  ? 'bg-accents-4 text-white shadow-sm' 
                  : 'text-accents-5 hover:text-accents-8'
              }`}
            >
              <Code size={14} />
              <span>Code</span>
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                viewMode === 'graph' 
                  ? 'bg-accents-4 text-white shadow-sm' 
                  : 'text-accents-5 hover:text-accents-8'
              }`}
            >
              <GitGraph size={14} />
              <span>Graph</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Stats Display */}
          <div className="hidden md:flex items-center gap-6 text-xs font-mono text-accents-5">
            <div className="flex flex-col items-end">
              <span className="text-accents-3 uppercase tracking-wider text-[10px]">Lines</span>
              <span className="text-accents-6">{stats.lines}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-accents-3 uppercase tracking-wider text-[10px]">Chars</span>
              <span className="text-accents-6">{stats.chars}</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-accents-3 uppercase tracking-wider text-[10px]">Size</span>
               <span className="text-accents-6">{stats.size}</span>
            </div>
          </div>
          
          <div className="h-4 w-px bg-accents-2 hidden md:block"></div>

          <a 
            href="https://github.com/phalla-doll/json-forge" 
            className="p-2 rounded-full hover:bg-accents-1 text-accents-5 hover:text-white transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 bg-background relative">
        <Toolbar 
          onFormat={handleFormat}
          onMinify={handleMinify}
          onCopy={handleCopy}
          onClear={handleClear}
          onDownload={handleDownload}
          onUpload={handleUpload}
          hasContent={jsonInput.length > 0}
        />
        
        <div className="flex-1 relative min-h-0">
           {/* Content Area */}
           <div className="absolute inset-0">
             {viewMode === 'code' ? (
               <JsonEditor 
                 value={jsonInput} 
                 onChange={handleInputChange} 
                 error={error} 
               />
             ) : (
               <JsonGraphView value={jsonInput} />
             )}
           </div>
        </div>
      </main>

      {/* Toast Overlay */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          {toasts.map(toast => (
            <Toast key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;