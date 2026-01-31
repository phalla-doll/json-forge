import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Box, 
  List, 
  Type, 
  Hash, 
  ToggleLeft, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize,
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

// --- Graph Node Component ---
const GraphNode: React.FC<{ 
  name?: string; 
  value: any; 
  depth?: number;
  isLast?: boolean;
  path?: string;
}> = ({ name, value, depth = 0, isLast = true, path = '$' }) => {
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
              const childPath = type === 'array' 
                ? `${path}[${key}]` 
                : `${path}.${key}`;

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
};

// --- Tooltip Component ---
const Tooltip: React.FC<{ data: TooltipData }> = ({ data }) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    // Basic positioning to the right of the node
    let left = data.rect.right + 12;
    let top = data.rect.top;

    // Viewport check (simplistic)
    if (left + 300 > window.innerWidth) {
      left = data.rect.left - 310; // Flip to left
    }
    if (top + 200 > window.innerHeight) {
      top = window.innerHeight - 210; // Cap bottom
    }

    setPosition({ top, left });
  }, [data.rect]);

  return (
    <div 
      className="fixed z-50 w-72 bg-accents-1/95 border border-accents-2 rounded-lg shadow-2xl backdrop-blur-md p-3 text-xs font-mono pointer-events-none flex flex-col gap-2 animate-in fade-in duration-150"
      style={{ top: position.top, left: position.left }}
    >
      <div className="flex items-center gap-2 border-b border-accents-2 pb-2">
        <span className="font-semibold text-accents-8 break-all">{data.name || 'root'}</span>
        <span className="text-accents-4 px-1.5 py-0.5 rounded-full bg-accents-2 text-[10px] uppercase">
          {data.type}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px]">Path</span>
        <div className="text-accents-6 break-all bg-black/20 p-1 rounded">{data.path}</div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px]">Value</span>
        <div className="text-accents-7 max-h-32 overflow-hidden break-words">
          {typeof data.value === 'object' && data.value !== null ? (
            <span className="italic text-accents-5">
              {Array.isArray(data.value) 
                ? `Array (${data.value.length} items)` 
                : `Object (${Object.keys(data.value).length} keys)`}
            </span>
          ) : (
            String(data.value)
          )}
        </div>
      </div>
    </div>
  );
};

export const JsonGraphView: React.FC<JsonGraphViewProps> = ({ value }) => {
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse Data
  let data;
  try {
    data = JSON.parse(value);
  } catch (e) {
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
    setPanning(true);
    setTooltipData(null); // Hide tooltip when panning starts
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panning) {
      setPosition(prev => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY
      }));
    }
  };

  const handleMouseUp = () => {
    setPanning(false);
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
      // We need untransformed content dimensions. 
      // Since contentRef contains the transform, offsetWidth/Height gives untransformed size usually
      // if display is inline-block and content determines size.
      const contentWidth = contentRef.current.offsetWidth;
      const contentHeight = contentRef.current.offsetHeight;
      
      // Calculate scale to fit
      const scaleX = (container.width - 80) / contentWidth; // 80px padding
      const scaleY = (container.height - 80) / contentHeight;
      const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in if it fits, just zoom out
      
      // Center it
      const newX = (container.width - contentWidth * newScale) / 2;
      const newY = (container.height - contentHeight * newScale) / 2;
      
      setScale(newScale);
      setPosition({ x: newX, y: newY });
    }
  };

  return (
    <GraphContext.Provider value={{ 
      showTooltip: (d) => !panning && setTooltipData(d), 
      hideTooltip: () => setTooltipData(null) 
    }}>
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
            <Maximize size={16} />
          </button>
          <button onClick={handleFitScreen} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Fit to Screen">
            <Scan size={16} />
          </button>
        </div>

        <div 
          ref={containerRef}
          className={`w-full h-full ${panning ? 'cursor-grabbing' : 'cursor-grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: panning ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="inline-block"
            ref={contentRef}
          >
            <GraphNode value={data} />
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