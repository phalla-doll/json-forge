import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Braces, Github, Code, GitGraph, Table, Sun, Moon, UploadCloud } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { JsonEditor } from './components/Editor';
import { JsonGraphView } from './components/JsonTreeView';
import { JsonTableView } from './components/JsonTableView';
import { Toast } from './components/Toast';
import { Loader } from './components/Loader';
import { StatusBar } from './components/StatusBar';
import { getStats, downloadFile, isValidJson, trackEvent } from './lib/utils';
import { ToastMessage } from './types';

const INITIAL_DATA = {
  "manufacturers": [
    {
      "id": "bmw",
      "name": "BMW Group",
      "country": "Germany",
      "isActive": true,
      "foundedYear": 1916,
      "website": "https://www.bmwgroup.com",
      "rating": 4.6,
      "lastUpdated": "2025-01-15T10:30:00Z",
      "brands": [
        {
          "id": "bmw-brand",
          "name": "BMW",
          "isLuxury": true,
          "supportsEV": true,
          "models": [
            {
              "id": "bmw-3-series",
              "name": "3 Series",
              "segment": "Sedan",
              "isDiscontinued": false,
              "releaseYears": [2021, 2022, 2023, 2024],
              "availableMarkets": ["US", "EU", "JP"],
              "defaultCurrency": "USD",
              "trims": [
                {
                  "id": "330i",
                  "name": "330i",
                  "isPopular": true,
                  "engine": {
                    "type": "Inline-4",
                    "fuel": "Petrol",
                    "turbocharged": true,
                    "displacementL": 2.0,
                    "horsepower": 255,
                    "electricAssist": null
                  },
                  "transmission": {
                    "type": "Automatic",
                    "gears": 8,
                    "hasPaddleShifters": true
                  },
                  "drivetrain": "RWD",
                  "performance": {
                    "zeroToSixtySec": 5.6,
                    "topSpeedKph": 250,
                    "isSpeedLimited": true
                  },
                  "dimensions": {
                    "lengthMm": 4709,
                    "widthMm": 1827,
                    "heightMm": 1442
                  },
                  "features": {
                    "safety": {
                      "abs": true,
                      "tractionControl": true,
                      "laneAssist": true,
                      "blindSpotMonitoring": true
                    },
                    "comfort": {
                      "climateZones": 3,
                      "heatedSeats": true,
                      "ventilatedSeats": false
                    },
                    "infotainment": {
                      "screenSizeInch": 14.9,
                      "supportsAppleCarPlay": true,
                      "supportsAndroidAuto": true,
                      "voiceAssistant": "BMW Intelligent Assistant"
                    }
                  },
                  "pricing": {
                    "msrp": 43500,
                    "taxIncluded": false,
                    "discount": {
                      "isAvailable": true,
                      "percentage": 5
                    }
                  },
                  "availability": {
                    "inStock": true,
                    "estimatedDeliveryDays": 30,
                    "isPreOrder": false
                  },
                  "media": {
                    "images": [
                      "330i-front.jpg",
                      "330i-interior.jpg"
                    ],
                    "videoUrl": null
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

const App: React.FC = () => {
  // Set default indentation to 4 spaces
  const [indentation, setIndentation] = useState<number | string>(4);
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // jsonInput is the immediate value (for the Editor)
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(INITIAL_DATA, null, 4));
  
  // debouncedInput is the delayed value (for Graph, Stats, Validation, Table)
  // This prevents the app from freezing on every keystroke with large files
  const [debouncedInput, setDebouncedInput] = useState<string>(jsonInput);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewMode, setViewMode] = useState<'code' | 'graph' | 'table'>('code');
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Initialize Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    trackEvent('toggle_theme', { theme: newTheme });
  };

  // Debounce input effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedInput(jsonInput);
    }, 800); // Wait 800ms after typing stops

    return () => {
      clearTimeout(handler);
    };
  }, [jsonInput]);

  // Debounce search effect (shorter delay)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Reset match count when search term changes immediately to avoid flash of error state
  useEffect(() => {
    setSearchMatchCount(null);
  }, [searchTerm]);

  // Reset match count when view changes
  useEffect(() => {
    setSearchMatchCount(null);
  }, [viewMode]);

  // Calculate stats based on the debounced input to save performance
  const stats = getStats(debouncedInput);

  const addToast = useCallback((type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleEditorReady = useCallback(() => {
    // Small delay to ensure smooth transition from ASCII loader
    setTimeout(() => {
      setIsEditorReady(true);
    }, 400);
  }, []);

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    // Error checking is now done on debounce or explicit actions to keep typing fast,
    // but we can clear errors immediately if the user clears the input
    if (!value) {
      setError(null);
    }
  };

  // Check validity on the debounced input
  useEffect(() => {
    if (!debouncedInput.trim()) {
      setError(null);
      return;
    }
    if (isValidJson(debouncedInput)) {
      setError(null);
    } else {
      // We generally don't want to show aggressive error messages while typing,
      // but if the user stops typing and it's invalid, the Editor component
      // might show markers. We'll update our error state for the floating banner.
      try {
        JSON.parse(debouncedInput);
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }, [debouncedInput]);

  const handleIndentChange = (newIndent: number | string) => {
    trackEvent('change_indentation', { value: newIndent === '\t' ? 'tab' : newIndent });
    setIndentation(newIndent);
    // Auto-reformat if valid to give instant feedback
    if (jsonInput.trim() && isValidJson(jsonInput)) {
      try {
        const parsed = JSON.parse(jsonInput);
        const formatted = JSON.stringify(parsed, null, newIndent);
        setJsonInput(formatted);
        setDebouncedInput(formatted); // Update immediately for formatting actions
      } catch (e) {
        // Silent fail
      }
    }
  };

  const handleFormat = () => {
    trackEvent('click_prettify');
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, indentation);
      setJsonInput(formatted);
      setDebouncedInput(formatted);
      setError(null);
      addToast('success', 'Formatted successfully');
    } catch (err) {
      setError((err as Error).message);
      addToast('error', 'Invalid JSON format');
    }
  };

  const handleMinify = () => {
    trackEvent('click_minify');
    try {
      if (!jsonInput.trim()) return;
      const parsed = JSON.parse(jsonInput);
      const minified = JSON.stringify(parsed);
      setJsonInput(minified);
      setDebouncedInput(minified);
      setError(null);
      addToast('success', 'Minified successfully');
    } catch (err) {
      setError((err as Error).message);
      addToast('error', 'Invalid JSON format');
    }
  };

  const handleCopy = async () => {
    trackEvent('click_copy');
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
    trackEvent('click_clear_attempt');
    if (!jsonInput) return;
    
    if (jsonInput.length > 50) {
      if (!window.confirm('Are you sure you want to clear the editor?')) {
        trackEvent('click_clear_cancel');
        return;
      }
    }
    
    trackEvent('click_clear_confirm');
    setJsonInput('');
    setDebouncedInput('');
    setError(null);
    addToast('info', 'Editor cleared');
  };

  const handleDownload = () => {
    trackEvent('click_export');
    if (!jsonInput) return;
    try {
      JSON.parse(jsonInput);
      downloadFile(jsonInput, 'data.json');
      addToast('success', 'File downloaded');
    } catch (e) {
      if (window.confirm('The JSON is invalid. Save anyway?')) {
        trackEvent('click_export_invalid');
        downloadFile(jsonInput, 'invalid-data.json');
      }
    }
  };

  const handleUpload = useCallback((file: File) => {
    trackEvent('click_import', { file_type: file.type, size: file.size });
    
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      addToast('error', 'Invalid file type. Only .json files are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB warning
       addToast('info', 'Large file detected. Graph view may be slow.');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const result = event.target.result as string;
        setJsonInput(result);
        setDebouncedInput(result); // Immediate update on upload
        setError(null);
        addToast('success', `Loaded ${file.name}`);
      }
    };
    reader.onerror = () => {
      addToast('error', 'Failed to read file');
    };
    reader.readAsText(file);
  }, [addToast]);

  // Drag and Drop Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <>
      {!isEditorReady && <Loader />}
      
      <div 
        className={`flex flex-col h-[100dvh] bg-background text-accents-8 font-sans selection:bg-accents-2 transition-opacity duration-700 ${isEditorReady ? 'opacity-100' : 'opacity-0'}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-accents-2 bg-background/50 backdrop-blur-md z-20 shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="bg-green-600 text-white p-1.5 rounded-md shadow-sm shrink-0">
              <Braces className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-semibold text-accents-8 tracking-wide truncate">JSON Forge</h1>
              <span className="text-xs text-accents-4 hidden sm:block">Open-source JSON visualizer</span>
            </div>
            <div className="h-6 w-px bg-accents-2 mx-1 md:mx-2 hidden md:block"></div>

            <div className="flex items-center bg-accents-1 p-0.5 rounded-md border border-accents-2 ml-2 md:ml-0 shrink-0">
              <button
                onClick={() => {
                  setViewMode('code');
                  trackEvent('switch_view', { mode: 'code' });
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'code' 
                    ? 'bg-accents-8 text-background shadow-sm' 
                    : 'text-accents-5 hover:text-accents-8'
                }`}
              >
                <Code size={14} />
                <span className="hidden sm:inline">Code</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('graph');
                  trackEvent('switch_view', { mode: 'graph' });
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'graph' 
                    ? 'bg-accents-8 text-background shadow-sm' 
                    : 'text-accents-5 hover:text-accents-8'
                }`}
              >
                <GitGraph size={14} />
                <span className="hidden sm:inline">Graph</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('table');
                  trackEvent('switch_view', { mode: 'table' });
                }}
                className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded text-xs font-medium transition-all ${
                  viewMode === 'table' 
                    ? 'bg-accents-8 text-background shadow-sm' 
                    : 'text-accents-5 hover:text-accents-8'
                }`}
              >
                <Table size={14} />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4 pl-2 shrink-0">
             <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-accents-1 text-accents-5 hover:text-accents-8 transition-colors"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <a 
              href="https://github.com/phalla-doll/json-forge" target="_blank"
              onClick={() => trackEvent('click_github')}
              className="p-2 rounded-full hover:bg-accents-1 text-accents-5 hover:text-accents-8 transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden transition-colors duration-300">
          <Toolbar 
            onFormat={handleFormat}
            onMinify={handleMinify}
            onCopy={handleCopy}
            onClear={handleClear}
            onDownload={handleDownload}
            onUpload={handleUpload}
            hasContent={jsonInput.length > 0}
            indentation={indentation}
            onIndentChange={handleIndentChange}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearchEnter={() => setSearchTrigger(prev => prev + 1)}
            hasMatches={searchMatchCount === null ? null : searchMatchCount > 0}
          />
          
          {/* View Container: Using display styling for persistence instead of conditional rendering */}
          <div className="flex-1 relative min-h-0">
            {/* Drag Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-accents-5 m-4 rounded-xl animate-in fade-in duration-200 pointer-events-none">
                <div className="bg-accents-1 p-6 rounded-full mb-4">
                  <UploadCloud className="w-12 h-12 text-accents-8" />
                </div>
                <h3 className="text-xl font-bold text-accents-8 mb-2">Drop JSON file here</h3>
                <p className="text-accents-5">Release to load content</p>
              </div>
            )}

            <div className={`absolute inset-0 ${viewMode === 'code' ? 'block' : 'hidden'}`}>
              <JsonEditor 
                value={jsonInput} 
                onChange={handleInputChange} 
                error={error} 
                indentation={indentation}
                onReady={handleEditorReady}
                searchTerm={debouncedSearchTerm}
                theme={theme}
                onMatchCountChange={setSearchMatchCount}
              />
            </div>
            <div className={`absolute inset-0 ${viewMode === 'graph' ? 'block' : 'hidden'}`}>
              <JsonGraphView 
                value={debouncedInput} 
                searchTerm={debouncedSearchTerm}
                searchTrigger={searchTrigger}
                onMatchCountChange={setSearchMatchCount}
              />
            </div>
            <div className={`absolute inset-0 ${viewMode === 'table' ? 'block' : 'hidden'}`}>
              <JsonTableView 
                value={debouncedInput} 
                searchTerm={debouncedSearchTerm}
              />
            </div>
          </div>
        </main>
        
        <StatusBar stats={stats} error={error} />

        {/* Toasts */}
        <div className="fixed bottom-12 left-4 right-4 md:left-auto md:right-6 md:bottom-14 flex flex-col gap-2 z-50 pointer-events-none items-center md:items-end">
          <div className="pointer-events-auto flex flex-col gap-3 w-full max-w-sm">
            {toasts.map(toast => (
              <Toast key={toast.id} toast={toast} onClose={removeToast} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
