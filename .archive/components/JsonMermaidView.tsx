import React, { useEffect, useState, useRef, useMemo } from 'react';
import mermaid from 'mermaid';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Workflow, 
  GitFork, 
  AlertTriangle 
} from 'lucide-react';
import { trackEvent } from '../lib/utils';

interface JsonMermaidViewProps {
  value: string;
  theme: 'light' | 'dark';
}

type DiagramType = 'mindmap' | 'graph';

export const JsonMermaidView: React.FC<JsonMermaidViewProps> = ({ value, theme }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [diagramType, setDiagramType] = useState<DiagramType>('mindmap');
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Ref for dragging
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPanning = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Initialize mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
      fontFamily: '"JetBrains Mono", monospace',
    });
  }, [theme]);

  // Transform JSON to Mermaid Syntax
  const generateMermaidSyntax = useMemo(() => {
    try {
      const data = JSON.parse(value);
      let syntax = '';
      
      // Safety limit for nodes to prevent browser crash
      let nodeCount = 0;
      const MAX_NODES = 150;

      // Helper to sanitize text for mermaid
      const sanitize = (str: string) => {
        return String(str)
          .replace(/[\(\)\[\]\{\}"'#]/g, '') // Remove symbols that break mermaid
          .trim() || 'empty';
      };

      if (diagramType === 'mindmap') {
        syntax = 'mindmap\n  root((JSON))\n';
        
        const traverse = (obj: any, depth: number) => {
          if (nodeCount > MAX_NODES) return;
          const indent = '    '.repeat(depth);
          
          if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
              if (nodeCount > MAX_NODES) return;
              nodeCount++;
              
              const val = obj[key];
              // Add key node
              syntax += `${indent}${sanitize(key)}\n`;
              
              // Recurse or add value
              if (typeof val === 'object' && val !== null) {
                traverse(val, depth + 1);
              } else {
                 if (nodeCount > MAX_NODES) return;
                 nodeCount++;
                 syntax += `${indent}    :: ${sanitize(String(val))}\n`;
              }
            });
          } else if (Array.isArray(obj)) {
             obj.forEach((item, idx) => {
                if (nodeCount > MAX_NODES) return;
                nodeCount++;
                syntax += `${indent}${idx}\n`;
                if (typeof item === 'object') {
                    traverse(item, depth + 1);
                } else {
                    syntax += `${indent}    :: ${sanitize(String(item))}\n`;
                }
             });
          }
        };
        
        traverse(data, 1);
      } else {
        // FLOWCHART / GRAPH
        syntax = 'graph TD\n';
        syntax += '  root[JSON Root]\n';
        
        const traverseGraph = (obj: any, parentId: string) => {
          if (nodeCount > MAX_NODES) return;

          if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach((key, idx) => {
              if (nodeCount > MAX_NODES) return;
              nodeCount++;
              
              const currentId = `${parentId}_${idx}`;
              const val = obj[key];
              const sanitizedKey = sanitize(key);
              
              // Edge from parent to key
              syntax += `  ${parentId} --> ${currentId}[${sanitizedKey}]\n`;
              
              if (typeof val === 'object' && val !== null) {
                traverseGraph(val, currentId);
              } else {
                 // Value node
                 const valId = `${currentId}_val`;
                 syntax += `  ${currentId} --- ${valId}(${sanitize(String(val))})\n`;
              }
            });
          }
        };
        
        traverseGraph(data, 'root');
      }

      if (nodeCount > MAX_NODES) {
         setError(`Data is too large for diagram view (${nodeCount}+ nodes). Showing partial tree.`);
      } else {
         setError(null);
      }

      return syntax;
    } catch (e) {
      console.error(e);
      return '';
    }
  }, [value, diagramType]);

  // Render Diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!generateMermaidSyntax) return;
      
      try {
        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, generateMermaidSyntax);
        setSvgContent(svg);
        
        // Reset view on new render
        setPosition({ x: 0, y: 0 });
        setScale(1);
      } catch (e) {
        console.error('Mermaid render error:', e);
        // Fallback for syntax errors in mermaid generation
        setSvgContent('');
      }
    };

    renderDiagram();
  }, [generateMermaidSyntax]);

  // Pan & Zoom Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleZoom = (delta: number) => {
    setScale(prev => Math.min(Math.max(prev + delta, 0.1), 5));
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Simple wheel zoom
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    setScale(prev => Math.min(Math.max(prev + delta, 0.1), 5));
  };

  if (!value) return null;

  return (
    <div className="relative w-full h-full bg-background overflow-hidden">
        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 bg-accents-1/95 border border-accents-2 p-1.5 rounded-lg shadow-xl backdrop-blur-md">
           <div className="flex flex-col gap-1 border-b border-accents-2 pb-2 mb-1">
             <button 
                onClick={() => { setDiagramType('mindmap'); trackEvent('diagram_switch', { type: 'mindmap' }); }}
                className={`flex items-center gap-2 p-2 rounded text-xs font-medium transition-colors ${diagramType === 'mindmap' ? 'bg-accents-8 text-background' : 'text-accents-5 hover:bg-accents-2'}`}
             >
                <GitFork size={14} /> Mindmap
             </button>
             <button 
                onClick={() => { setDiagramType('graph'); trackEvent('diagram_switch', { type: 'graph' }); }}
                className={`flex items-center gap-2 p-2 rounded text-xs font-medium transition-colors ${diagramType === 'graph' ? 'bg-accents-8 text-background' : 'text-accents-5 hover:bg-accents-2'}`}
             >
                <Workflow size={14} /> Flowchart
             </button>
           </div>
           
           <button onClick={() => handleZoom(0.2)} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Zoom In"><ZoomIn size={16} /></button>
           <button onClick={() => handleZoom(-0.2)} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Zoom Out"><ZoomOut size={16} /></button>
           <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="p-2 hover:bg-accents-3 rounded text-accents-5 hover:text-accents-8" title="Reset"><RotateCcw size={16} /></button>
        </div>

        {/* Warning Banner */}
        {error && (
            <div className="absolute top-4 left-4 z-20 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-3 py-2 rounded-md flex items-center gap-2 text-xs">
                <AlertTriangle size={14} />
                {error}
            </div>
        )}

        {/* Canvas */}
        <div 
            ref={containerRef}
            className={`w-full h-full ${isPanning.current ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
        >
             <div 
                ref={contentRef}
                style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: 'center',
                    transition: isPanning.current ? 'none' : 'transform 0.2s ease-out'
                }}
                className="w-full h-full flex items-center justify-center pointer-events-none"
                dangerouslySetInnerHTML={{ __html: svgContent }} 
            />
        </div>
    </div>
  );
};