import React, { useState, useCallback, useEffect } from 'react';
import { Braces, Github, Code, GitGraph } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { JsonEditor } from './components/Editor';
import { JsonGraphView } from './components/JsonTreeView';
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
  
  // jsonInput is the immediate value (for the Editor)
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(INITIAL_DATA, null, 4));
  
  // debouncedInput is the delayed value (for Graph, Stats, Validation)
  // This prevents the app from freezing on every keystroke with large files
  const [debouncedInput, setDebouncedInput] = useState<string>(jsonInput);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewMode, setViewMode] = useState<'code' | 'graph'>('code');
  const [isEditorReady, setIsEditorReady] = useState(false);

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

  const handleUpload = (file: File) => {
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
  };

  return (
    <>
      {!isEditorReady && <Loader />}
      
      <div className={`flex flex-col h-[100dvh] bg-background text-accents-8 font-sans selection:bg-accents-2 transition-opacity duration-700 ${isEditorReady ? 'opacity-100' : 'opacity-0'}`}>
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-accents-2 bg-background/50 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="bg-green-600 text-white p-1.5 rounded-md shadow-sm shrink-0">
              <Braces className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-semibold text-white tracking-wide truncate">JSON Forge</h1>
              <span className="text-xs text-accents-4 hidden sm:block">Development Environment</span>
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
                    ? 'bg-accents-4 text-white shadow-sm' 
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
                    ? 'bg-accents-4 text-white shadow-sm' 
                    : 'text-accents-5 hover:text-accents-8'
                }`}
              >
                <GitGraph size={14} />
                <span className="hidden sm:inline">Graph</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6 pl-2 shrink-0">
            <a 
              href="https://github.com/phalla-doll/json-forge" target="_blank"
              onClick={() => trackEvent('click_github')}
              className="p-2 rounded-full hover:bg-accents-1 text-accents-5 hover:text-white transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 bg-background relative overflow-hidden">
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
          />
          
          <div className="flex-1 relative min-h-0">
             <div className="absolute inset-0">
               {viewMode === 'code' ? (
                 <JsonEditor 
                   value={jsonInput} 
                   onChange={handleInputChange} 
                   error={error} 
                   indentation={indentation}
                   onReady={handleEditorReady}
                   searchTerm={debouncedSearchTerm}
                 />
               ) : (
                 // Graph View uses debounced input to prevent lag
                 <JsonGraphView 
                   value={debouncedInput} 
                   searchTerm={debouncedSearchTerm}
                 />
               )}
             </div>
          </div>
        </main>
        
        <StatusBar stats={stats} error={error} />

        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 flex flex-col gap-2 z-50 pointer-events-none items-center md:items-end">
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