import React, { useState, useRef, useEffect, createContext, useContext, useMemo, useLayoutEffect, useCallback } from 'react';
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
  Shrink,
  MoreHorizontal,
  ChevronsDown,
  ChevronsUp
} from 'lucide-react';
import { trackEvent } from '../lib/utils';

interface JsonGraphViewProps {
  value: string;
  searchTerm?: string;
  searchTrigger?: number;
  onMatchCountChange?: (count: number | null) => void;
}

type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';

const getDataType = (value: any): DataType => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as DataType;
};

// --- Context ---
interface TooltipData {
  rect: DOMRect;
  path: string;
  type: DataType;
  value: any;
  name?: string;
}

// Global action type to signal all nodes
type GlobalActionType = 'expand' | 'collapse' | 'idle';

interface GraphContextType {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
  // State to broadcast expand/collapse to all nodes
  globalAction: { type: GlobalActionType; id: number };
  searchTerm: string;
  focusNode: (rect: DOMRect) => void;
}

const GraphContext = createContext<GraphContextType>({ 
  showTooltip: () => {}, 
  hideTooltip: () => {},
  globalAction: { type: 'idle', id: 0 },
  searchTerm: '',
  focusNode: () => {}
});

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

// Configuration object for expansion logic (passed by reference)
interface ExpansionConfig {
  budget: number;
}

// --- Graph Node Component (Memoized) ---
const GraphNode: React.FC<{ 
  name?: string; 
  value: any; 
  depth?: number;
  isLast?: boolean;
  path?: string;
  expansionConfig?: ExpansionConfig;
}> = React.memo(({ name, value, depth = 0, isLast = true, path = '$', expansionConfig }) => {
  // Determine type for initialization logic
  const type = getDataType(value);
  const isExpandable = type === 'object' || type === 'array';
  
  const { showTooltip, hideTooltip, globalAction, searchTerm, focusNode } = useContext(GraphContext);

  // Search Logic
  const isMatch = useMemo(() => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    
    // Check key/name
    if (name && name.toLowerCase().includes(term)) return true;
    
    // Check primitive value
    if (!isExpandable && value !== null) {
      if (String(value).toLowerCase().includes(term)) return true;
    }
    
    return false;
  }, [searchTerm, name, value, isExpandable]);

  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    // Always expand root
    if (depth === 0) return true;
    
    // Auto-expand if we have budget
    if (isExpandable && expansionConfig && expansionConfig.budget > 0) {
      expansionConfig.budget--;
      return true;
    }
    return false;
  });

  // Listen for global expand/collapse signals
  useEffect(() => {
    if (globalAction.type === 'expand') {
      if (isExpandable) setIsExpanded(true);
    } else if (globalAction.type === 'collapse') {
      // Don't collapse root
      if (depth !== 0) setIsExpanded(false);
    }
  }, [globalAction, isExpandable, depth]);

  const [visibleItems, setVisibleItems] = useState(50); // PAGINATION: Start with 50 items
  const nodeRef = useRef<HTMLDivElement>(null);

  const keys = isExpandable ? Object.keys(value) : [];
  const isEmpty = isExpandable && keys.length === 0;
  const hasMore = isExpandable && keys.length > visibleItems;

  // Icons based on type - Updated for better light/dark contrast
  const TypeIcon = () => {
    switch (type) {
      case 'object': return <Box size={14} className="text-blue-600 dark:text-blue-400" />;
      case 'array': return <List size={14} className="text-yellow-600 dark:text-yellow-400" />;
      case 'string': return <Type size={14} className="text-green-600 dark:text-green-400" />;
      case 'number': return <Hash size={14} className="text-orange-600 dark:text-orange-400" />;
      case 'boolean': return <ToggleLeft size={14} className="text-purple-600 dark:text-purple-400" />;
      default: return <div className="w-3.5 h-3.5 rounded-full bg-accents-4" />;
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current) {
      focusNode(nodeRef.current.getBoundingClientRect());
    }
  };
  
  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleItems(prev => prev + 50);
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
      const len = keys.length;
      return <span className="text-accents-4 text-[10px] ml-2">{len} {type === 'array' ? 'items' : 'keys'}</span>;
    }
    
    const valString = String(value);
    const truncated = valString.length > 30 ? valString.substring(0, 30) + '...' : valString;

    // Updated colors for light mode readability while keeping dark mode pastel
    let colorClass = 'text-accents-6';
    if (type === 'string') colorClass = 'text-green-600 dark:text-green-300';
    if (type === 'number') colorClass = 'text-orange-600 dark:text-orange-300';
    if (type === 'boolean') colorClass = 'text-purple-600 dark:text-purple-300';
    if (type === 'null') colorClass = 'text-red-600 dark:text-red-300';

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
            ${isMatch ? 'bg-yellow-900/30 border-yellow-500/50 graph-search-match' : 'bg-accents-1 border-accents-2 hover:bg-accents-2'}
          `}
          onClick={isExpandable ? handleToggle : undefined}
          onDoubleClick={handleDoubleClick}
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
            
            {/* Only map up to visibleItems to prevent browser freeze on 10k lines */}
            {keys.slice(0, visibleItems).map((key, index, arr) => {
              const childType = getDataType(value[key]);
              const childPath = getChildPath(path, key, type);
              // It's last if it's the last in array AND we are showing all items
              const isChildLast = index === arr.length - 1 && !hasMore;

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
                    expansionConfig={expansionConfig}
                  />
                </div>
              );
            })}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex items-start pt-2 pb-2 pl-4 relative">
                 <div className="absolute left-0 top-[1.6rem] w-4 h-px bg-accents-2"></div>
                 <button 
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-accents-3 bg-transparent hover:bg-accents-2 hover:border-accents-4 text-xs text-accents-5 transition-colors"
                 >
                   <MoreHorizontal size={14} />
                   <span>Show next 50 items ({keys.length - visibleItems} remaining)</span>
                 </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// --- Tooltip Component ---
interface TooltipProps {
  data: TooltipData;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const Tooltip: React.FC<TooltipProps> = ({ data, onMouseEnter, onMouseLeave }) => {
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
      className="fixed z-50 w-[80vw] md:w-80 bg-accents-1/95 border border-accents-2 rounded-lg shadow-2xl backdrop-blur-md p-3 text-xs font-mono pointer-events-auto flex flex-col gap-2 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-2 border-b border-accents-2 pb-2">
        <span className="font-semibold text-accents-8 break-all">{data.name || 'root'}</span>
        <span className="text-accents-4 px-1.5 py-0.5 rounded-full bg-accents-2 text-[10px] uppercase">
          {data.type}
        </span>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Path</span>
        <div className="text-success break-all bg-background p-1.5 rounded border border-accents-2 select-text cursor-text">
            {data.path}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-accents-4 text-[10px] uppercase tracking-wider">Value</span>
        <div className="text-accents-7 max-h-48 overflow-y-auto break-words bg-background p-1.5 rounded border border-accents-2 whitespace-pre-wrap scrollbar-thin select-text cursor-text">
          {renderTooltipValue()}
        </div>
      </div>
    </div>
  );
};

export const JsonGraphView: React.FC<JsonGraphViewProps> = ({ value, searchTerm = '', searchTrigger = 0, onMatchCountChange }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [globalAction, setGlobalAction] = useState<{ type: GlobalActionType; id: number }>({ type: 'idle', id: 0 });
  
  // Refs for tracking state without re-triggering memoized callbacks
  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 40, y: 40 });
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const matchIndexRef = useRef(0);
  
  // Sync refs
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { positionRef.current = position; }, [position]);

  const isPanningRef = useRef(false);
  const isWheelingRef = useRef(false);
  const wheelTimeoutRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 1. Calculate Data & Generate Key
  // We generate a unique graphKey when data successfully parses.
  // This key is used on the Root Node to force a full re-mount (and thus re-run initial expansion logic)
  const { parsedData, graphKey, expandableNodeCount } = useMemo(() => {
    try {
      const data = JSON.parse(value);
      
      // Calculate total expandable nodes (objects/arrays) for warning logic
      let count = 0;
      const traverse = (obj: any) => {
        if (typeof obj === 'object' && obj !== null) {
          count++;
          Object.values(obj).forEach(val => traverse(val));
        }
      };
      // Simple traversal - in a production app with circular refs (unlikely in JSON.parse), guard this.
      traverse(data);

      return { 
        parsedData: data, 
        graphKey: Math.random().toString(36),
        expandableNodeCount: count
      };
    } catch (e) {
      return { parsedData: null, graphKey: 'error', expandableNodeCount: 0 };
    }
  }, [value]);

  // 2. Create Expansion Budget
  // This object is mutable and passed down the tree. 
  // Created fresh whenever graphKey changes.
  const expansionConfig = useMemo(() => ({ budget: 50 }), [graphKey]);

  const focusNode = useCallback((nodeRect: DOMRect) => {
    if (!containerRef.current) return;
    
    const currentScale = scaleRef.current;
    const currentPos = positionRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Determine content offset relative to viewport
    const contentScreenLeft = containerRect.left + currentPos.x;
    const contentScreenTop = containerRect.top + currentPos.y;

    // Node center in Viewport
    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;

    // Node center relative to Content Origin (Unscaled)
    const nodeUnscaledX = (nodeCenterX - contentScreenLeft) / currentScale;
    const nodeUnscaledY = (nodeCenterY - contentScreenTop) / currentScale;

    // Maintain current scale instead of zooming in
    const targetScale = currentScale;
    
    // Calculate new Position to center the node
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    const newX = (containerWidth / 2) - (nodeUnscaledX * targetScale);
    const newY = (containerHeight / 2) - (nodeUnscaledY * targetScale);
    
    // Don't track event here if it's programmatic, but we use same function
    setScale(targetScale);
    setPosition({ x: newX, y: newY });
  }, []);

  const findAndFocusMatch = useCallback((index: number) => {
     if (!containerRef.current) return;
     const matches = containerRef.current.querySelectorAll('.graph-search-match');
     
     onMatchCountChange?.(matches.length);

     if (matches.length === 0) return;
     
     const safeIndex = index % matches.length;
     matchIndexRef.current = safeIndex;
     
     const target = matches[safeIndex];
     // Use focusNode
     focusNode(target.getBoundingClientRect());
  }, [focusNode, onMatchCountChange]);

  // Search Logic: Reset when term changes
  useEffect(() => {
    if (searchTerm) {
      matchIndexRef.current = 0;
      // Allow render to settle
      setTimeout(() => findAndFocusMatch(0), 100); 
    } else {
        onMatchCountChange?.(null);
    }
  }, [searchTerm, findAndFocusMatch, onMatchCountChange]);

  // Search Logic: Next on trigger
  useEffect(() => {
    if (searchTerm && searchTrigger > 0) {
      const next = matchIndexRef.current + 1;
      findAndFocusMatch(next);
    }
  }, [searchTrigger, searchTerm, findAndFocusMatch]);

  // Context value should be stable
  const contextValue = useMemo(() => ({
    showTooltip: (d: TooltipData) => {
      if (!isPanningRef.current && !isWheelingRef.current) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setTooltipData(d);
      }
    },
    hideTooltip: () => {
      timeoutRef.current = setTimeout(() => {
        setTooltipData(null);
      }, 300);
    },
    globalAction,
    searchTerm,
    focusNode
  }), [globalAction, searchTerm, focusNode]);

  const handleTooltipMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleTooltipMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setTooltipData(null);
    }, 300);
  };

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

  // Touch Handlers for Mobile Panning
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isPanningRef.current = true;
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      setTooltipData(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPanningRef.current && e.touches.length === 1 && lastTouchRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaY = touch.clientY - lastTouchRef.current.y;

      setPosition(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    lastTouchRef.current = null;
  };
  
  // Wheel Handler for Zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (!containerRef.current) return;

    isWheelingRef.current = true;
    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = setTimeout(() => {
      isWheelingRef.current = false;
    }, 150);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    const newScale = Math.min(Math.max(scale + delta, 0.3), 3);
    const scaleRatio = newScale / scale;
    
    const newX = mouseX - (mouseX - position.x) * scaleRatio;
    const newY = mouseY - (mouseY - position.y) * scaleRatio;

    setScale(newScale);
    setPosition({ x: newX, y: newY });
    setTooltipData(null);
  };

  // Zoom Handlers
  const handleZoomIn = () => {
    trackEvent('graph_zoom_in');
    setScale(prev => Math.min(prev + 0.1, 3));
  };
  const handleZoomOut = () => {
    trackEvent('graph_zoom_out');
    setScale(prev => Math.max(prev - 0.1, 0.3));
  };
  const handleReset = () => {
    trackEvent('graph_reset_scale');
    setScale(1);
    setPosition({ x: 40, y: 40 });
  };
  
  const handleFitScreen = () => {
    trackEvent('graph_fit_screen');
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

  const handleExpandAll = () => {
    trackEvent('graph_expand_all');
    if (expandableNodeCount > 5000) {
      const confirmed = window.confirm(
        `This JSON contains ${expandableNodeCount} expandable nodes. Expanding all may significantly slow down or freeze your browser. Are you sure you want to continue?`
      );
      if (!confirmed) return;
    }
    setGlobalAction(prev => ({ type: 'expand', id: prev.id + 1 }));
  };

  const handleCollapseAll = () => {
    trackEvent('graph_collapse_all');
    setGlobalAction(prev => ({ type: 'collapse', id: prev.id + 1 }));
  };

  return (
    <GraphContext.Provider value={contextValue}>
      <div className="relative w-full h-full overflow-hidden bg-background select-none transition-colors duration-300">
        {/* Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-50 bg-accents-1 border border-accents-2 p-1 rounded-lg shadow-xl">
          <button onClick={handleZoomIn} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <button onClick={handleReset} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Reset Scale (100%)">
            <RotateCcw size={16} />
          </button>
          <button onClick={handleFitScreen} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Fit to Screen">
            <Shrink size={16} />
          </button>
          
          <div className="h-px bg-accents-2 mx-1 my-0.5" />
          
          <button onClick={handleExpandAll} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Expand All Nodes">
            <ChevronsDown size={16} />
          </button>
           <button onClick={handleCollapseAll} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Collapse All Nodes">
            <ChevronsUp size={16} />
          </button>
        </div>

        <div 
          ref={containerRef}
          className={`w-full h-full ${isPanningRef.current ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ touchAction: 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div 
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              transition: (isPanningRef.current || isWheelingRef.current) ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="inline-block"
            ref={contentRef}
          >
            <GraphNode 
              key={graphKey} // Force remount when data changes so budget logic runs again
              value={parsedData} 
              expansionConfig={expansionConfig}
            />
          </div>
        </div>
        
        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-accents-1/80 backdrop-blur border border-accents-2 px-3 py-2 rounded-md flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-accents-5 pointer-events-none justify-center md:justify-start">
          <div className="flex items-center gap-1"><Box size={10} className="text-blue-600 dark:text-blue-400" /> Object</div>
          <div className="flex items-center gap-1"><List size={10} className="text-yellow-600 dark:text-yellow-400" /> Array</div>
          <div className="flex items-center gap-1"><Type size={10} className="text-green-600 dark:text-green-400" /> String</div>
          <div className="flex items-center gap-1"><Hash size={10} className="text-orange-600 dark:text-orange-400" /> Number</div>
          <div className="flex items-center gap-1.5"><ToggleLeft size={12} className="text-purple-600 dark:text-purple-400" /> Boolean</div>
        </div>

        {/* Tooltip Overlay */}
        {tooltipData && (
          <Tooltip 
            data={tooltipData} 
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          />
        )}
      </div>
    </GraphContext.Provider>
  );
};