import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Filter, ChevronRight, Home, FolderOpen, ArrowLeft } from 'lucide-react';

interface JsonTableViewProps {
  value: string;
  searchTerm?: string;
}

export const JsonTableView: React.FC<JsonTableViewProps> = ({ value, searchTerm = '' }) => {
  const [path, setPath] = useState<(string | number)[]>([]);

  // 1. Parse Root Data
  const { rootData, error } = useMemo(() => {
    try {
      if (!value.trim()) return { rootData: null, error: null };
      const parsed = JSON.parse(value);
      return { rootData: parsed, error: null };
    } catch (e) {
      return { rootData: null, error: (e as Error).message };
    }
  }, [value]);

  // 2. Resolve Current Data based on Path
  const currentData = useMemo(() => {
    if (!rootData) return null;
    let curr = rootData;
    
    // Safely traverse
    for (const key of path) {
      if (curr && typeof curr === 'object' && key in curr) {
        curr = curr[key];
      } else {
        return undefined; // Path is invalid
      }
    }
    return curr;
  }, [rootData, path]);

  const currentType = useMemo(() => {
    if (currentData === null) return 'null';
    if (Array.isArray(currentData)) return 'array';
    if (typeof currentData === 'object') return 'object';
    return 'primitive';
  }, [currentData]);

  useEffect(() => {
    if (rootData && currentData === undefined) {
      setPath([]); 
    }
  }, [rootData, currentData]);

  // 3. Compute Headers
  const headers = useMemo(() => {
    if (currentType !== 'array') return [];
    const arr = currentData as any[];
    if (arr.length === 0) return [];

    const allKeys = new Set<string>();
    let hasPrimitives = false;

    // Budget scan
    arr.slice(0, 50).forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => allKeys.add(k));
      } else {
        hasPrimitives = true;
      }
    });

    const headerArray = Array.from(allKeys).sort();
    if (hasPrimitives || headerArray.length === 0) {
      headerArray.unshift('Value');
    }
    return headerArray;
  }, [currentData, currentType]);

  // 4. Handlers
  const handleNavigate = (segments: (string | number)[]) => {
    setPath(prev => [...prev, ...segments]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setPath(prev => prev.slice(0, index + 1));
  };

  const handleReset = () => setPath([]);

  // 5. Render Cell
  // onClickPath: optional array of path segments to append if clicked
  const renderCell = (cellValue: any, onClickPath?: (string | number)[]) => {
    if (cellValue === null) return <span className="text-red-500 text-[10px] font-bold opacity-70">null</span>;
    if (cellValue === undefined) return <span className="text-accents-3 text-[10px] italic"></span>;
    
    const isObj = typeof cellValue === 'object';
    
    if (isObj) {
       const isArray = Array.isArray(cellValue);
       const len = isArray ? cellValue.length : Object.keys(cellValue).length;
       const label = isArray ? `Array(${len})` : `Object(${len})`;
       
       return (
        <button 
            onClick={() => onClickPath && handleNavigate(onClickPath)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-accents-2 hover:bg-accents-3 text-accents-8 text-[11px] font-medium transition-colors group border border-transparent hover:border-accents-4"
        >
           <FolderOpen size={10} className="text-accents-5 group-hover:text-accents-8" />
           {label}
        </button>
       );
    }
    
    if (typeof cellValue === 'boolean') {
        return (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cellValue ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                {String(cellValue)}
            </span>
        );
    }
    
    if (typeof cellValue === 'number') {
        return <span className="text-orange-600 dark:text-orange-400 font-mono">{cellValue}</span>;
    }

    const str = String(cellValue);
    if (str.length > 80) {
        return <span className="text-accents-6" title={str}>{str.substring(0, 80)}...</span>;
    }
    if (str.startsWith('http')) {
        return <a href={str} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{str}</a>;
    }
    return <span className="text-accents-7">{str}</span>;
  };

  const Breadcrumbs = () => (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-accents-2 bg-accents-1 overflow-x-auto whitespace-nowrap scrollbar-hide shrink-0 h-10">
        <button 
            onClick={handleReset}
            className={`p-1 rounded hover:bg-accents-3 transition-colors ${path.length === 0 ? 'text-accents-8 font-semibold' : 'text-accents-5'}`}
            title="Root"
        >
            <Home size={14} />
        </button>
        {path.map((segment, idx) => (
            <React.Fragment key={idx}>
                <ChevronRight size={12} className="text-accents-4 shrink-0" />
                <button
                    onClick={() => handleBreadcrumbClick(idx)}
                    className={`px-1.5 py-0.5 rounded text-xs hover:bg-accents-3 transition-colors ${idx === path.length - 1 ? 'text-accents-8 font-semibold bg-accents-2' : 'text-accents-5'}`}
                >
                    {segment}
                </button>
            </React.Fragment>
        ))}
    </div>
  );

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-error gap-4 p-8 text-center bg-background">
        <div className="bg-error/10 p-4 rounded-full">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Invalid JSON</h3>
          <p className="text-accents-5 text-sm max-w-md">Please fix errors in Code view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-background">
        <Breadcrumbs />
        
        <div className="flex-1 overflow-auto bg-background relative">
            {currentType === 'array' && (() => {
                const arr = currentData as any[];
                if (arr.length === 0) return <div className="h-full flex items-center justify-center text-accents-4 text-sm">Empty Array</div>;

                const filteredArr = searchTerm 
                    ? arr.filter(item => JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase()))
                    : arr;

                if (filteredArr.length === 0) return <div className="h-full flex flex-col items-center justify-center text-accents-5 gap-2"><Filter size={24}/><span>No matches</span></div>;

                return (
                    <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-accents-1 shadow-sm">
                        <th className="p-2 border-b border-accents-2 font-medium text-accents-5 text-[11px] uppercase tracking-wider w-12 text-center sticky left-0 bg-accents-1 border-r">#</th>
                        {headers.map(h => (
                            <th key={h} className="p-2 border-b border-accents-2 font-medium text-accents-5 text-[11px] uppercase tracking-wider min-w-[120px] whitespace-nowrap">{h}</th>
                        ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-accents-2">
                        {filteredArr.map((row, idx) => {
                            // Find real index for navigation if filtered
                            const realIndex = arr.indexOf(row);
                            return (
                                <tr key={idx} className="hover:bg-accents-1/50 transition-colors group">
                                    <td className="p-2 text-accents-4 text-[11px] font-mono text-center border-r border-accents-2 bg-background sticky left-0 group-hover:bg-accents-1/50">
                                        {realIndex !== -1 ? realIndex + 1 : idx + 1}
                                    </td>
                                    {headers.map((col) => {
                                        const val = (typeof row === 'object' && row !== null) ? row[col] : (col === 'Value' ? row : undefined);
                                        // If clicked, we go to: [...path, realIndex, col]
                                        return (
                                            <td key={`${idx}-${col}`} className="p-2 font-mono text-xs align-top max-w-xs break-words">
                                                {renderCell(val, [realIndex, col])}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                    </table>
                );
            })()}

            {currentType === 'object' && (() => {
                const keys = Object.keys(currentData as object);
                if (keys.length === 0) return <div className="h-full flex items-center justify-center text-accents-4 text-sm">Empty Object</div>;
                
                const filteredKeys = searchTerm 
                    ? keys.filter(k => k.toLowerCase().includes(searchTerm.toLowerCase()) || String((currentData as any)[k]).toLowerCase().includes(searchTerm.toLowerCase()))
                    : keys;

                if (filteredKeys.length === 0) return <div className="h-full flex flex-col items-center justify-center text-accents-5 gap-2"><Filter size={24}/><span>No matches</span></div>;

                return (
                    <div className="flex justify-center p-4">
                        <div className="w-full max-w-3xl border border-accents-2 rounded-lg overflow-hidden shadow-sm bg-background">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-accents-1">
                                    <tr>
                                        <th className="p-2 border-b border-accents-2 font-medium text-accents-5 text-[11px] uppercase tracking-wider w-1/3 border-r">Key</th>
                                        <th className="p-2 border-b border-accents-2 font-medium text-accents-5 text-[11px] uppercase tracking-wider">Value</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-accents-2">
                                    {filteredKeys.map(key => (
                                        <tr key={key} className="hover:bg-accents-1/50 transition-colors">
                                            <td className="p-2 font-semibold text-accents-7 font-mono text-xs align-top border-r border-accents-2 select-text">{key}</td>
                                            <td className="p-2 font-mono text-xs align-top select-text">
                                                {renderCell((currentData as any)[key], [key])}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {currentType === 'primitive' && (
                <div className="h-full flex flex-col items-center justify-center p-8 bg-background">
                    <div className="bg-accents-1 p-8 rounded-xl border border-accents-2 shadow-sm text-center max-w-md w-full relative">
                        <button onClick={() => setPath(prev => prev.slice(0, -1))} className="absolute top-4 left-4 p-1 hover:bg-accents-2 rounded text-accents-5">
                             <ArrowLeft size={16} />
                        </button>
                        <div className="mb-4 text-accents-5 text-xs uppercase tracking-wider font-semibold border-b border-accents-2 pb-2">Value</div>
                        <div className="text-xl font-mono text-accents-8 break-all select-all max-h-60 overflow-y-auto">{String(currentData)}</div>
                         <div className="mt-4 pt-2 text-[10px] text-accents-4 border-t border-accents-2 flex justify-between">
                            <span>Type: <span className="font-semibold text-accents-6">{typeof currentData}</span></span>
                         </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
}