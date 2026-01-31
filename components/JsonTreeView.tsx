import React, { useState, useRef, useEffect, createContext, useContext, useMemo, useLayoutEffect } from 'react';
import { 
  ChevronRight, 
  Box, 
  List, 
  Type, 
  Hash, 
  ToggleLeft, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Scan
} from 'lucide-react';

interface JsonGraphViewProps {
  value: string;
}

type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

const getDataType = (value: any): DataType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as DataType;
};

// --- Context for Tooltips ---
interface TooltipData {
  rect: DOMRect;
  path: string;
  type: DataType;
  value: any;
  name?: string;
}

const GraphContext = createContext<{
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
}>({ showTooltip: () => {}, hideTooltip: () => {} });

// Helper to generate safe property paths
const getChildPath = (parentPath: string, key: string, parentType: DataType) => {
  if (parentType === 'array') return `${parentPath}[${key}]`;
  // Check if key is a valid identifier
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `${parentPath}.${key}`;
  }
  // Safe bracket notation with escaping
  return `${parentPath}["${key.replace(/"/g, '\\"')}"]`;
};

// --- Graph Node Component (Memoized) ---
const GraphNode: React.FC<{ 
  name?: string; 
  value: any; 
  depth?: number;
  isLast?: boolean;
  path?: string;
}> = React.memo(({ name, value, depth = 0, isLast = true, path = '$' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const { showTooltip, hideTooltip } = useContext(GraphContext);
  const nodeRef = useRef<HTMLDivElement>(null);

  const type = getDataType(value);
  const isExpandable = type === 'object' || type === 'array';
  const isEmpty = isExpandable && Object.keys(value).length === 0;

  // Icons based on type
  const TypeIcon = () => {
    switch (type) {
      case 'object': return <Box size={14} className="text-blue-400" />;
      case 'array': return <List size={14} className="text-yellow-400" />;
      case 'string': return <Type size={14} className="text-green-400" />;
      case 'number': return <Hash size={14} className="text-orange-400" />;
      case 'boolean': return <ToggleLeft size={14} className="text-purple-400" />;
      default: return <div className="w-3.5 h-3.5 rounded-full bg-accents-4" />;
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      showTooltip({
        rect,
        path,
        type,
        value,
        name
      });
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const renderValue = () => {
    if (isExpandable) {
      const len = Object.keys(value).length;
      return <span className="text-accents-4 text-[10px] ml-2">{len} {type === 'array' ? 'items' : 'keys'}</span>;
    }
    
    const valString = String(value);
    const truncated = valString.length > 30 ? valString.substring(0, 30) + '...' : valString;

    let colorClass = 'text-accents-6';
    if (type === 'string') colorClass = 'text-green-300';
    if (type === 'number') colorClass = 'text-orange-300';
    if (type === 'boolean') colorClass = 'text-purple-300';
    if (type === 'null') colorClass = 'text-red-300';

    return <span className={`ml-2 font-mono text-xs ${colorClass}`}>{String(truncated)}</span>;
  };

  return (
    <div className="flex items-start">
      {/* Node Card */}
      <div className="flex flex-col items-start z-10">
        <div 
          ref={nodeRef}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all duration-200
            ${isExpandable ? 'cursor-pointer hover:border-accents-4' : ''}
            bg-accents-1 border-accents-2 hover:bg-accents-2
          `}
          onClick={isExpandable ? handleToggle : undefined}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {isExpandable && (
            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
              <ChevronRight size={14} className="text-accents-5" />
            </div>
          )}
          
          <TypeIcon />
          
          <div className="flex flex-col">
            <div className="flex items-center">
              {name && <span className="font-semibold text-xs text-accents-8 mr-1">{name}</span>}
              {!name && <span className="font-semibold text-xs text-accents-5 italic">root</span>}
            </div>
          </div>
          
          {renderValue()}
        </div>
      </div>

      {/* Children & Connectors */}
      {isExpandable && isExpanded && !isEmpty && (
        <div className="flex items-start">
          {/* Horizontal Connector Line from Parent to Children Container */}
          <div className="w-8 h-px bg-accents-2 mt-[1.1rem]"></div>
          
          {/* Children Container */}
          <div className="flex flex-col relative">
            {/* Vertical Line running down the side of children */}
            <div className="absolute left-0 top-[1.1rem] bottom-[1.1rem] w-px bg-accents-2"></div>
            
            {Object.keys(value).map((key, index, arr) => {
              const isChildLast = index === arr.length - 1;
              const childType = getDataType(value[key]);
              const childPath = getChildPath(path, key, type);

              return (
                <div key={key} className="flex items-start pt-2 pb-2 pl-4 relative">
                  {/* Horizontal Connector to specific child */}
                  <div className="absolute left-0 top-[1.6rem] w-4 h-px bg-accents-2"></div>
                  
                  <GraphNode 
                    name={type === 'array' ? `[${key}]` : key} 
                    value={value[key]} 
                    depth={depth + 1}
                    isLast={isChildLast}
                    path={childPath}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// --- Tooltip Component ---
const Tooltip: React.FC<{ data: TooltipData }> = ({ data }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Use layout effect to calculate position before paint to avoid flickering
  useLayoutEffect(() => {
    if (!data?.rect) return;

    let left = data.rect.right + 12;
    let top = data.rect.top;

    // Viewport check (Tooltip width approx 320px)
    if (left + 320 > window.innerWidth) {
      left = Math.max(10, data.rect.left - 330);
    }
    
    // Viewport bottom check (Tooltip height approx 200px)
    if (top + 200 > window.innerHeight) {
      top = Math.max(10, window.innerHeight - 210);
    }

    setPosition({ top, left });
  }, [data]);

  const renderTooltipValue = () => {
    if (data.value === null) return 'null';
    if (typeof data.value === 'object') {
       if (Array.isArray(data.value)) return `Array (${data.value.length} items)`;
       return `Object (${Object.keys(data.value).length} keys)`;
    }
    const str = String(data.value);
    if (str.length > 500) {
        return str.substring(0, 500) + '... (truncated)';
    }
    return str;
  };

  if (!position) return null;

  return (
    <div 
      className="fixed z-50 w-80 bg-accents-1/95 border border-accents-2 rounded-lg shadow-2xl backdrop-blur-md p-3 text-xs font-mono pointer-events-none flex flex-col gap-2 transition-opacity duration-200 opacity-100"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-2 border-b border-accents-2 pb-2">
        <span className="font-semibold text-accents-8 break-all">{data.name || 'root'}</span>
        <span className="text-accents-4 px-1.5 py-0.5 rounded-full bg-accents-2 text-[10px] uppercase">
          {data.type}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Path</span>
        <div className="text-success break-all bg-black/40 p-1.5 rounded border border-accents-2/50 select-text">
            {data.path}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Value</span>
        <div className="text-accents-7 max-h-48 overflow-y-auto break-words bg-black/20 p-1.5 rounded border border-accents-2/50 whitespace-pre-wrap scrollbar-thin">
          {renderTooltipValue()}
        </div>
      </div>
    </div>
  );
};

export const JsonGraphView: React.FC<JsonGraphViewProps> = ({ value }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const isPanningRef = useRef(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Memoize data parsing to prevent expensive re-runs on every render
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }, [value]);

  // Context value should be stable to prevent deep re-renders of GraphNode
  const contextValue = useMemo(() => ({
    showTooltip: (d: TooltipData) => {
      // Don't show tooltip if we are dragging
      if (!isPanningRef.current) {
        setTooltipData(d);
      }
    },
    hideTooltip: () => setTooltipData(null)
  }), []);

  // Early return for invalid JSON
  if (parsedData === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-error gap-4 p-8 text-center">
        <div className="bg-error/10 p-4 rounded-full">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Invalid JSON</h3>
          <p className="text-accents-5 text-sm max-w-md">
            Please fix the syntax errors in the Code view before switching to Graph view.
          </p>
        </div>
      </div>
    );
  }

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isPanningRef.current = true;
    setTooltipData(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  // Zoom Handlers
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.3));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 40, y: 40 });
  };
  
  const handleFitScreen = () => {
    if (containerRef.current && contentRef.current) {
      const container = containerRef.current.getBoundingClientRect();
      const contentWidth = contentRef.current.offsetWidth;
      const contentHeight = contentRef.current.offsetHeight;
      
      const scaleX = (container.width - 80) / contentWidth;
      const scaleY = (container.height - 80) / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1);
      
      const newX = (container.width - contentWidth * newScale) / 2;
      const newY = (container.height - contentHeight * newScale) / 2;
      
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    }
  };

  return (
    <GraphContext.Provider value={contextValue}>
      <div className="relative w-full h-full overflow-hidden bg-[#050505] select-none">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 bg-accents-1 border border-accents-2 p-1 rounded-lg shadow-xl">
          <button onClick={handleZoomIn} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button onClick={handleReset} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Reset Scale (100%)">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleFitScreen} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Fit to Screen">
            <Scan size={16} />
          </button>
        </div>

        <div 
          ref={containerRef}
          className={`w-full h-full ${isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              // Disable transition during drag for performance
              transition: isPanningRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="inline-block"
            ref={contentRef}
          >
            <GraphNode value={parsedData} />
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-accents-1/80 backdrop-blur border border-accents-2 px-3 py-2 rounded-md flex gap-4 text-[10px] text-accents-5 pointer-events-none">
          <div className="flex items-center gap-1"><Box size={10} className="text-blue-400" /> Object</div>
          <div className="flex items-center gap-1"><List size={10} className="text-yellow-400" /> Array</div>
          <div className="flex items-center gap-1"><Type size={10} className="text-green-400" /> String</div>
          <div className="flex items-center gap-1"><Hash size={10} className="text-orange-400" /> Number</div>
          <div className="flex items-center gap-1.5"><ToggleLeft size={12} className="text-purple-400" /> Boolean</div>
        </div>

        {/* Tooltip Overlay */}
        {tooltipData && <Tooltip data={tooltipData} />}
      </div>
    </GraphContext.Provider>
  );
};