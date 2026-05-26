"use client";

import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from "react";
import { HugeiconsIcon } from "@hugeicons/react";
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
  ChevronsUp,
} from "@hugeicons/core-free-icons";
import { trackEvent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface JsonGraphViewProps {
  value: string;
  searchTerm?: string;
  searchTrigger?: number;
  onMatchCountChange?: (count: number | null) => void;
}

type DataType = "string" | "number" | "boolean" | "object" | "array" | "null";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const getDataType = (value: unknown): DataType => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === "object") {
    return t;
  }
  return "string";
};

interface TooltipData {
  rect: DOMRect;
  path: string;
  type: DataType;
  value: JsonValue;
  name?: string;
}

type GlobalActionType = "expand" | "collapse" | "idle";

interface GraphContextType {
  showTooltip: (data: TooltipData) => void;
  hideTooltip: () => void;
  globalAction: { type: GlobalActionType; id: number };
  searchTerm: string;
  focusNode: (rect: DOMRect) => void;
  initiallyExpandedPaths: Set<string>;
}

const GraphContext = createContext<GraphContextType>({
  showTooltip: () => {},
  hideTooltip: () => {},
  globalAction: { type: "idle", id: 0 },
  searchTerm: "",
  focusNode: () => {},
  initiallyExpandedPaths: new Set(),
});

const getChildPath = (
  parentPath: string,
  key: string,
  parentType: DataType,
) => {
  if (parentType === "array") return `${parentPath}[${key}]`;
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return `${parentPath}.${key}`;
  }
  return `${parentPath}["${key.replace(/"/g, '\\"')}"]`;
};

const INITIAL_EXPANSION_BUDGET = 50;

function collectInitiallyExpanded(root: JsonValue): Set<string> {
  const paths = new Set<string>(["$"]);
  if (typeof root !== "object" || root === null) return paths;

  let budget = INITIAL_EXPANSION_BUDGET;
  const queue: Array<{ path: string; value: JsonValue }> = [
    { path: "$", value: root },
  ];
  while (queue.length > 0 && budget > 0) {
    const { path, value } = queue.shift()!;
    const type = getDataType(value);
    if (type !== "object" && type !== "array") continue;
    const obj = value as Record<string, JsonValue> | JsonValue[];
    const keys = Array.isArray(obj)
      ? obj.map((_, i) => String(i))
      : Object.keys(obj);
    for (const key of keys) {
      if (budget <= 0) break;
      const childValue = (obj as Record<string, JsonValue>)[key];
      const childType = getDataType(childValue);
      if (childType === "object" || childType === "array") {
        const childPath = getChildPath(path, key, type);
        paths.add(childPath);
        budget--;
        queue.push({ path: childPath, value: childValue });
      }
    }
  }
  return paths;
}

interface GraphNodeProps {
  name?: string;
  value: JsonValue;
  depth?: number;
  path?: string;
}

function TypeIcon({ type }: { type: DataType }) {
  switch (type) {
    case "object":
      return (
        <HugeiconsIcon
          icon={Box}
          size={14}
          className="text-blue-600 dark:text-blue-400"
        />
      );
    case "array":
      return (
        <HugeiconsIcon
          icon={List}
          size={14}
          className="text-yellow-600 dark:text-yellow-400"
        />
      );
    case "string":
      return (
        <HugeiconsIcon
          icon={Type}
          size={14}
          className="text-green-600 dark:text-green-400"
        />
      );
    case "number":
      return (
        <HugeiconsIcon
          icon={Hash}
          size={14}
          className="text-orange-600 dark:text-orange-400"
        />
      );
    case "boolean":
      return (
        <HugeiconsIcon
          icon={ToggleLeft}
          size={14}
          className="text-purple-600 dark:text-purple-400"
        />
      );
    default:
      return <div className="w-3.5 h-3.5 rounded-full bg-muted-foreground" />;
  }
}

const GraphNode: React.FC<GraphNodeProps> = React.memo(function GraphNode({
  name,
  value,
  depth = 0,
  path = "$",
}) {
  const type = getDataType(value);
  const isExpandable = type === "object" || type === "array";

  const {
    showTooltip,
    hideTooltip,
    globalAction,
    searchTerm,
    focusNode,
    initiallyExpandedPaths,
  } = useContext(GraphContext);

  const isMatch = useMemo(() => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    if (name && name.toLowerCase().includes(term)) return true;
    if (!isExpandable && value !== null) {
      if (String(value).toLowerCase().includes(term)) return true;
    }
    return false;
  }, [searchTerm, name, value, isExpandable]);

  const initialExpanded = initiallyExpandedPaths.has(path);
  const [userExpanded, setUserExpanded] = useState<boolean>(initialExpanded);
  const [appliedActionId, setAppliedActionId] = useState(globalAction.id);

  let isExpanded = userExpanded;
  if (globalAction.id !== appliedActionId) {
    if (globalAction.type === "expand" && isExpandable) {
      isExpanded = true;
    } else if (globalAction.type === "collapse" && depth !== 0) {
      isExpanded = false;
    }
    setUserExpanded(isExpanded);
    setAppliedActionId(globalAction.id);
  }

  const setIsExpanded = setUserExpanded;

  const [visibleItems, setVisibleItems] = useState(50);
  const nodeRef = useRef<HTMLDivElement>(null);

  const keys = isExpandable
    ? Object.keys(value as Record<string, JsonValue>)
    : [];
  const isEmpty = isExpandable && keys.length === 0;
  const hasMore = isExpandable && keys.length > visibleItems;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded((p) => !p);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current) {
      focusNode(nodeRef.current.getBoundingClientRect());
    }
  };

  const handleLoadMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisibleItems((prev) => prev + 50);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeRef.current) {
      showTooltip({
        rect: nodeRef.current.getBoundingClientRect(),
        path,
        type,
        value,
        name,
      });
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  const renderValue = () => {
    if (isExpandable) {
      const len = keys.length;
      return (
        <span className="text-muted-foreground text-[10px] ml-2">
          {len} {type === "array" ? "items" : "keys"}
        </span>
      );
    }

    const valString = String(value);
    const truncated =
      valString.length > 30 ? valString.substring(0, 30) + "..." : valString;

    let colorClass = "text-foreground";
    if (type === "string") colorClass = "text-green-600 dark:text-green-300";
    if (type === "number") colorClass = "text-orange-600 dark:text-orange-300";
    if (type === "boolean") colorClass = "text-purple-600 dark:text-purple-300";
    if (type === "null") colorClass = "text-red-600 dark:text-red-300";

    return (
      <span className={`ml-2 font-mono text-xs ${colorClass}`}>
        {String(truncated)}
      </span>
    );
  };

  return (
    <div className="flex items-start">
      <div className="flex flex-col items-start z-10">
        <div
          ref={nodeRef}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg border shadow-sm transition-all duration-200
            ${isExpandable ? "cursor-pointer hover:border-muted-foreground" : ""}
            ${
              isMatch
                ? "bg-yellow-900/30 border-yellow-500/50 graph-search-match"
                : "bg-muted border-border hover:bg-border"
            }
          `}
          onClick={isExpandable ? handleToggle : undefined}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {isExpandable && (
            <div
              className={`transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
              }`}
            >
              <HugeiconsIcon
                icon={ChevronRight}
                size={14}
                className="text-muted-foreground"
              />
            </div>
          )}

          <TypeIcon type={type} />

          <div className="flex flex-col">
            <div className="flex items-center">
              {name && (
                <span className="font-semibold text-xs text-foreground mr-1">
                  {name}
                </span>
              )}
              {!name && (
                <span className="font-semibold text-xs text-muted-foreground italic">
                  root
                </span>
              )}
            </div>
          </div>

          {renderValue()}
        </div>
      </div>

      {isExpandable && isExpanded && !isEmpty && (
        <div className="flex items-start">
          <div className="w-8 h-px bg-border mt-[1.1rem]"></div>

          <div className="flex flex-col relative">
            <div className="absolute left-0 top-[1.1rem] bottom-[1.1rem] w-px bg-border"></div>

            {keys.slice(0, visibleItems).map((key) => {
              const childPath = getChildPath(path, key, type);
              const childValue = (value as Record<string, JsonValue>)[key];

              return (
                <div
                  key={key}
                  className="flex items-start pt-2 pb-2 pl-4 relative"
                >
                  <div className="absolute left-0 top-[1.6rem] w-4 h-px bg-border"></div>

                  <GraphNode
                    name={type === "array" ? `[${key}]` : key}
                    value={childValue}
                    depth={depth + 1}
                    path={childPath}
                  />
                </div>
              );
            })}

            {hasMore && (
              <div className="flex items-start pt-2 pb-2 pl-4 relative">
                <div className="absolute left-0 top-[1.6rem] w-4 h-px bg-border"></div>
                <button
                  onClick={handleLoadMore}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-muted-foreground bg-transparent hover:bg-border hover:border-muted-foreground text-xs text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <HugeiconsIcon icon={MoreHorizontal} size={14} />
                  <span>
                    Show next 50 items ({keys.length - visibleItems} remaining)
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

interface NodeTooltipProps {
  data: TooltipData;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({
  data,
  onMouseEnter,
  onMouseLeave,
}) => {
  const position = useMemo(() => {
    if (!data?.rect || typeof window === "undefined") return null;
    let left = data.rect.right + 12;
    let top = data.rect.top;
    if (left + 320 > window.innerWidth) {
      left = Math.max(10, data.rect.left - 330);
    }
    if (top + 200 > window.innerHeight) {
      top = Math.max(10, window.innerHeight - 210);
    }
    return { top, left };
  }, [data]);

  const renderTooltipValue = () => {
    if (data.value === null) return "null";
    if (typeof data.value === "object") {
      if (Array.isArray(data.value))
        return `Array (${data.value.length} items)`;
      return `Object (${Object.keys(data.value).length} keys)`;
    }
    const str = String(data.value);
    if (str.length > 500) {
      return str.substring(0, 500) + "... (truncated)";
    }
    return str;
  };

  if (!position) return null;

  return (
    <div
      className="fixed z-50 w-[80vw] md:w-80 bg-muted/95 border border-border rounded-lg shadow-2xl backdrop-blur-md p-3 text-xs font-mono pointer-events-auto flex flex-col gap-2 animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="font-semibold text-foreground break-all">
          {data.name || "root"}
        </span>
        <span className="text-muted-foreground px-1.5 py-0.5 rounded-full bg-border text-[10px] uppercase">
          {data.type}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
          Path
        </span>
        <div className="text-green-600 dark:text-green-400 break-all bg-background p-1.5 rounded border border-border select-text cursor-text">
          {data.path}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
          Value
        </span>
        <div className="text-foreground max-h-48 overflow-y-auto break-words bg-background p-1.5 rounded border border-border whitespace-pre-wrap scrollbar-thin select-text cursor-text">
          {renderTooltipValue()}
        </div>
      </div>
    </div>
  );
};

export const JsonTreeView: React.FC<JsonGraphViewProps> = ({
  value,
  searchTerm = "",
  searchTrigger = 0,
  onMatchCountChange,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [globalAction, setGlobalAction] = useState<{
    type: GlobalActionType;
    id: number;
  }>({ type: "idle", id: 0 });

  const scaleRef = useRef(1);
  const positionRef = useRef({ x: 40, y: 40 });
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
  const matchIndexRef = useRef(0);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const isPanningRef = useRef(false);
  const isWheelingRef = useRef(false);
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrameRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { parsedData, expandableNodeCount, initiallyExpandedPaths } =
    useMemo(() => {
      try {
        const data = JSON.parse(value) as JsonValue;

        let count = 0;
        const traverse = (obj: JsonValue) => {
          if (typeof obj === "object" && obj !== null) {
            count++;
            Object.values(obj).forEach((v) => traverse(v as JsonValue));
          }
        };
        traverse(data);

        return {
          parsedData: data,
          expandableNodeCount: count,
          initiallyExpandedPaths: collectInitiallyExpanded(data),
        };
      } catch {
        return {
          parsedData: null,
          expandableNodeCount: 0,
          initiallyExpandedPaths: new Set<string>(),
        };
      }
    }, [value]);

  const focusNode = useCallback((nodeRect: DOMRect) => {
    if (!containerRef.current) return;

    const currentScale = scaleRef.current;
    const currentPos = positionRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();

    const contentScreenLeft = containerRect.left + currentPos.x;
    const contentScreenTop = containerRect.top + currentPos.y;

    const nodeCenterX = nodeRect.left + nodeRect.width / 2;
    const nodeCenterY = nodeRect.top + nodeRect.height / 2;

    const nodeUnscaledX = (nodeCenterX - contentScreenLeft) / currentScale;
    const nodeUnscaledY = (nodeCenterY - contentScreenTop) / currentScale;

    const targetScale = currentScale;

    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    const newX = containerWidth / 2 - nodeUnscaledX * targetScale;
    const newY = containerHeight / 2 - nodeUnscaledY * targetScale;

    setScale(targetScale);
    setPosition({ x: newX, y: newY });
  }, []);

  const findAndFocusMatch = useCallback(
    (index: number) => {
      if (!containerRef.current) return;
      const matches = containerRef.current.querySelectorAll(
        ".graph-search-match",
      );

      onMatchCountChange?.(matches.length);

      if (matches.length === 0) return;

      const safeIndex = index % matches.length;
      matchIndexRef.current = safeIndex;

      const target = matches[safeIndex];
      focusNode(target.getBoundingClientRect());
    },
    [focusNode, onMatchCountChange],
  );

  useEffect(() => {
    if (!searchTerm) {
      onMatchCountChange?.(null);
      return;
    }
    matchIndexRef.current = 0;
    if (focusFrameRef.current !== null) {
      cancelAnimationFrame(focusFrameRef.current);
    }
    const raf1 = requestAnimationFrame(() => {
      focusFrameRef.current = requestAnimationFrame(() => findAndFocusMatch(0));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (focusFrameRef.current !== null) {
        cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
    };
  }, [searchTerm, findAndFocusMatch, onMatchCountChange]);

  useEffect(() => {
    if (searchTerm && searchTrigger > 0) {
      const next = matchIndexRef.current + 1;
      findAndFocusMatch(next);
    }
  }, [searchTrigger, searchTerm, findAndFocusMatch]);

  const contextValue = useMemo<GraphContextType>(
    () => ({
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
      focusNode,
      initiallyExpandedPaths,
    }),
    [globalAction, searchTerm, focusNode, initiallyExpandedPaths],
  );

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
      <div className="h-full flex flex-col items-center justify-center text-destructive gap-4 p-8 text-center">
        <div className="bg-destructive/10 p-4 rounded-full">
          <HugeiconsIcon icon={AlertTriangle} size={32} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">Invalid JSON</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Please fix the syntax errors in the Code view before switching to
            Graph view.
          </p>
        </div>
      </div>
    );
  }

  const handleMouseDown = () => {
    isPanningRef.current = true;
    setIsPanning(true);
    setTooltipData(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      setPosition((prev) => ({
        x: prev.x + e.movementX,
        y: prev.y + e.movementY,
      }));
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const panStep = 40;

    switch (e.key) {
      case "ArrowUp":
        setPosition((prev) => ({ ...prev, y: prev.y + panStep }));
        break;
      case "ArrowDown":
        setPosition((prev) => ({ ...prev, y: prev.y - panStep }));
        break;
      case "ArrowLeft":
        setPosition((prev) => ({ ...prev, x: prev.x + panStep }));
        break;
      case "ArrowRight":
        setPosition((prev) => ({ ...prev, x: prev.x - panStep }));
        break;
      case "+":
      case "=":
        handleZoomIn();
        break;
      case "-":
        handleZoomOut();
        break;
      case "0":
        handleReset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isPanningRef.current = true;
      setIsPanning(true);
      const touch = e.touches[0];
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      setTooltipData(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (
      isPanningRef.current &&
      e.touches.length === 1 &&
      lastTouchRef.current
    ) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaY = touch.clientY - lastTouchRef.current.y;

      setPosition((prev) => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    isPanningRef.current = false;
    setIsPanning(false);
    lastTouchRef.current = null;
  };

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

  const handleZoomIn = () => {
    trackEvent("graph_zoom_in");
    setScale((prev) => Math.min(prev + 0.1, 3));
  };
  const handleZoomOut = () => {
    trackEvent("graph_zoom_out");
    setScale((prev) => Math.max(prev - 0.1, 0.3));
  };
  const handleReset = () => {
    trackEvent("graph_reset_scale");
    setScale(1);
    setPosition({ x: 40, y: 40 });
  };

  const handleFitScreen = () => {
    trackEvent("graph_fit_screen");
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
    trackEvent("graph_expand_all");
    if (expandableNodeCount > 1000) {
      const confirmed = window.confirm(
        `This JSON contains ${expandableNodeCount} expandable nodes. Expanding all may significantly slow down or freeze your browser. Are you sure you want to continue?`,
      );
      if (!confirmed) return;
    }
    setGlobalAction((prev) => ({ type: "expand", id: prev.id + 1 }));
  };

  const handleCollapseAll = () => {
    trackEvent("graph_collapse_all");
    setGlobalAction((prev) => ({ type: "collapse", id: prev.id + 1 }));
  };

  const iconButtonClasses =
    "size-8 text-muted-foreground hover:text-foreground";

  return (
    <GraphContext.Provider value={contextValue}>
      <div
        className="relative w-full h-full overflow-hidden bg-background select-none transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="absolute top-4 right-4 flex flex-col gap-1 z-50 bg-muted/95 border border-border p-1 rounded-lg shadow-2xl backdrop-blur-md">
          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                className={iconButtonClasses}
                aria-label="Zoom in"
              >
                <HugeiconsIcon icon={ZoomIn} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom in (+)</TooltipContent>
          </ShadTooltip>
          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                className={iconButtonClasses}
                aria-label="Zoom out"
              >
                <HugeiconsIcon icon={ZoomOut} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Zoom out (-)</TooltipContent>
          </ShadTooltip>
          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className={iconButtonClasses}
                aria-label="Reset zoom"
              >
                <HugeiconsIcon icon={RotateCcw} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Reset scale (0)</TooltipContent>
          </ShadTooltip>
          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFitScreen}
                className={iconButtonClasses}
                aria-label="Fit to screen"
              >
                <HugeiconsIcon icon={Shrink} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Fit to screen</TooltipContent>
          </ShadTooltip>

          <Separator className="my-0.5" />

          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExpandAll}
                className={iconButtonClasses}
                aria-label="Expand all nodes"
              >
                <HugeiconsIcon icon={ChevronsDown} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Expand all</TooltipContent>
          </ShadTooltip>
          <ShadTooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCollapseAll}
                className={iconButtonClasses}
                aria-label="Collapse all nodes"
              >
                <HugeiconsIcon icon={ChevronsUp} size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse all</TooltipContent>
          </ShadTooltip>
        </div>

        <div
          ref={containerRef}
          className={`w-full h-full ${
            isPanning ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ touchAction: "none" }}
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
              transformOrigin: "0 0",
            }}
            className="inline-block"
            ref={contentRef}
          >
            <GraphNode key={value} value={parsedData} />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 md:right-auto bg-muted/80 backdrop-blur border border-border px-3 py-2 rounded-md flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-muted-foreground pointer-events-none justify-center md:justify-start">
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={Box}
              size={10}
              className="text-blue-600 dark:text-blue-400"
            />{" "}
            Object
          </div>
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={List}
              size={10}
              className="text-yellow-600 dark:text-yellow-400"
            />{" "}
            Array
          </div>
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={Type}
              size={10}
              className="text-green-600 dark:text-green-400"
            />{" "}
            String
          </div>
          <div className="flex items-center gap-1">
            <HugeiconsIcon
              icon={Hash}
              size={10}
              className="text-orange-600 dark:text-orange-400"
            />{" "}
            Number
          </div>
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              icon={ToggleLeft}
              size={12}
              className="text-purple-600 dark:text-purple-400"
            />{" "}
            Boolean
          </div>
        </div>

        {tooltipData && (
          <NodeTooltip
            data={tooltipData}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          />
        )}
      </div>
    </GraphContext.Provider>
  );
};
