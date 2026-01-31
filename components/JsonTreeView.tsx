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
  Scan,
  Copy
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
  cancelHide: () => void;
}>({ showTooltip: () => {}, hideTooltip: () => {}, cancelHide: () => {} });

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
const Tooltip: React.FC<{ 
  data: TooltipData; 
  onMouseEnter: () => void; 
  onMouseLeave: () => void;
}> = ({ data, onMouseEnter, onMouseLeave }) => {
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Basic positioning to the right of the node
    let left = data.rect.right + 12;
    let top = data.rect.top;

    // Viewport check
    if (left + 300 > window.innerWidth) {
      left = data.rect.left - 310; // Flip to left
    }
    if (top + 200 > window.innerHeight) {
      top = window.innerHeight - 210; // Cap bottom
    }
    // Ensure top isn't negative
    top = Math.max(10, top);

    setPosition({ top, left });
  }, [data.rect]);

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed z-50 w-72 bg-accents-1 border border-accents-2 rounded-lg shadow-2xl backdrop-blur-md p-3 text-xs font-mono flex flex-col gap-3 animate-in fade-in duration-150 pointer-events-auto"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center justify-between border-b border-accents-2 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-accents-8 break-all max-w-[160px] truncate">{data.name || 'root'}</span>
          <span className="text-accents-8 px-1.5 py-0.5 rounded-full bg-accents-2 text-[10px] uppercase font-bold">
            {data.type}
          </span>
        </div>
        <button 
          onClick={handleCopyPath}
          className="flex items-center gap-1 text-[10px] text-accents-5 hover:text-white transition-colors"
          title="Copy Path"
        >
          {copied ? <span className="text-success">Copied</span> : <Copy size={12} />}
        </button>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Full Path</span>
        <div className="text-accents-6 break-all bg-accents-2/50 p-1.5 rounded select-text selection:bg-accents-5 selection:text-black">
          {data.path}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Value</span>
        <div className="text-accents-7 max-h-48 overflow-y-auto break-words bg-accents-2/50 p-1.5 rounded scrollbar-thin scrollbar-thumb-accents-4 select-text selection:bg-accents-5 selection:text-black">
          {typeof data.value === 'object' && data.value !== null ? (
            <span className="italic text-accents-5">
              {Array.isArray(data.value) 
                ? `Array (${data.value.length} items)` 
                : `Object (${Object.keys(data.value).length} keys)`}
            </span>
          ) : (
            <span className={data.type === 'string' ? 'text-green-400' : data.type === 'number' ? 'text-orange-400' : 'text-purple-400'}>
              {String(data.value)}
            </span>
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
  const hoverTimeoutRef = useRef<any>(null); // Use any for timeout to handle both Node and Browser types easily
  
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

  // Tooltip Logic
  const showTooltip = (d: TooltipData) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!panning) {
      setTooltipData(d);
    }
  };

  const hideTooltip = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setTooltipData(null);
    }, 300); // Delay to allow moving to tooltip
  };

  const cancelHide = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setPanning(true);
    setTooltipData(null); 
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
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.1));
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

  // Wheel Zoom Handler
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();

    // Determine delta and normalize
    let delta = -e.deltaY;
    if (e.deltaMode === 1) delta *= 40; // Line
    if (e.deltaMode === 2) delta *= 800; // Page

    // Sensitivity
    const zoomSpeed = 0.002;
    const scaleChange = delta * zoomSpeed;
    
    // Calculate new scale with clamps
    const newScale = Math.min(Math.max(0.1, scale + scaleChange), 5);
    
    // Calculate focal point relative to container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust position to keep mouse point stable
      const scaleRatio = newScale / scale;
      const newX = mouseX - (mouseX - position.x) * scaleRatio;
      const newY = mouseY - (mouseY - position.y) * scaleRatio;

      setScale(newScale);
      setPosition({ x: newX, y: newY });
      setTooltipData(null); 
    }
  };

  return (
    <GraphContext.Provider value={{ showTooltip, hideTooltip, cancelHide }}>
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
          onWheel={handleWheel}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: panning ? 'none' : 'transform 0.1s linear' // Faster transition for wheel zoom
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
        </div>

        {/* Tooltip Overlay */}
        {tooltipData && (
          <Tooltip 
            data={tooltipData} 
            onMouseEnter={cancelHide} 
            onMouseLeave={hideTooltip} 
          />
        )}
      </div>
    </GraphContext.Provider>
  );
};