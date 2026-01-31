import React, { useState, useRef, useEffect } from 'react';
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
  Maximize
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

// --- Graph Node Component ---
const GraphNode: React.FC<{ 
  name?: string; 
  value: any; 
  depth?: number;
  isLast?: boolean;
}> = ({ name, value, depth = 0, isLast = true }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
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
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all duration-200
            ${isExpandable ? 'cursor-pointer hover:border-accents-4' : ''}
            bg-accents-1 border-accents-2
          `}
          onClick={isExpandable ? handleToggle : undefined}
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
              return (
                <div key={key} className="flex items-start pt-2 pb-2 pl-4 relative">
                  {/* Horizontal Connector to specific child */}
                  <div className="absolute left-0 top-[1.6rem] w-4 h-px bg-accents-2"></div>
                  
                  {/* Corner cover for first/last items to make the vertical line look like a bracket */}
                  {/* This purely visual trick ensures lines don't overshoot */}
                  
                  <GraphNode 
                    name={type === 'array' ? `[${key}]` : key} 
                    value={value[key]} 
                    depth={depth + 1}
                    isLast={isChildLast}
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

export const JsonGraphView: React.FC<JsonGraphViewProps> = ({ value }) => {
  const [scale, setScale] = useState(1);
  const [panning, setPanning] = useState(false);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050505] select-none">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 bg-accents-1 border border-accents-2 p-1 rounded-lg shadow-xl">
        <button onClick={handleZoomIn} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Zoom In">
          <ZoomIn size={16} />
        </button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Zoom Out">
          <ZoomOut size={16} />
        </button>
        <button onClick={handleReset} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-white" title="Reset View">
          <Maximize size={16} />
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
            transition: panning ? 'none' : 'transform 0.2s ease-out'
          }}
          className="inline-block"
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
    </div>
  );
};