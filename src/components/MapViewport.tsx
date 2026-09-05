import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SuburbProjected, SuburbRole, SuburbTooltipInfo, GameState } from '../types';
import { SVG_WIDTH, SVG_HEIGHT, MelbourneMapModel } from '../utils/mapGeometry';
import { Tooltip } from './Tooltip';
import { ZoomIn, ZoomOut, RotateCcw, Locate, Eye, Compass } from 'lucide-react';

interface MapViewportProps {
  mapModel: MelbourneMapModel;
  gameState: GameState;
  distancesToTarget: Map<string, number>;
  distancesToCurrent: Map<string, number>;
  showBestPathOverlay?: boolean;
  isNeighboursVisible?: boolean;
  onToggleNeighbours?: () => void;
  onSelectPathSuburb?: (suburbId: string) => void;
  onMapClickDisabled?: () => void;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

export const MapViewport: React.FC<MapViewportProps> = ({
  mapModel,
  gameState,
  distancesToTarget,
  distancesToCurrent,
  showBestPathOverlay = false,
  isNeighboursVisible = false,
  onToggleNeighbours,
  onSelectPathSuburb,
  onMapClickDisabled,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Transform state: panning (x, y) and zoom (scale)
  const [transform, setTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  const [hoveredSuburbId, setHoveredSuburbId] = useState<string | null>(null);
  const [tooltipInfo, setTooltipInfo] = useState<SuburbTooltipInfo | null>(null);

  // Gesture refs for smooth touch & mouse interaction
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number | null>(null);
  const touchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const touchMovedRef = useRef(false);

  // Derive current position and visited set
  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const visitedSet = useMemo(() => new Set(gameState.path), [gameState.path]);
  const bestPathSet = useMemo(() => new Set(gameState.bestPath), [gameState.bestPath]);
  const guessedSet = useMemo(() => new Set(gameState.guessedSuburbs || []), [gameState.guessedSuburbs]);

  // Current suburb
  const currentSuburb = mapModel.suburbMap.get(currentSuburbId);

  // Set of bordering neighbors of current suburb - available to choose at every turn
  const neighboringSet = useMemo(() => {
    if (!currentSuburb || gameState.status !== 'playing') return new Set<string>();
    return new Set(currentSuburb.neighbors);
  }, [currentSuburb, gameState.status]);

  // Determine role of each suburb
  const getSuburbRole = useCallback(
    (id: string): SuburbRole => {
      if (id === gameState.startSuburbId) return 'start';
      if (id === gameState.targetSuburbId) return 'target';
      if (id === currentSuburbId) return 'current';
      if (visitedSet.has(id)) return 'visited';
      if (guessedSet.has(id)) {
        if (bestPathSet.has(id)) return 'guessed-optimal';
        return 'guessed';
      }
      if (showBestPathOverlay && bestPathSet.has(id)) return 'best-path';
      if (gameState.status === 'playing' && neighboringSet.has(id)) return 'valid-move';
      return 'default';
    },
    [
      gameState.startSuburbId,
      gameState.targetSuburbId,
      gameState.status,
      currentSuburbId,
      visitedSet,
      showBestPathOverlay,
      bestPathSet,
      guessedSet,
      neighboringSet,
    ]
  );

  // Zoom to start/current/target view bounds so area of interest and surrounding context occupies the view comfortably
  const focusOnAreaOfInterest = useCallback(() => {
    if (!containerRef.current) return;
    const startSub = mapModel.suburbMap.get(gameState.startSuburbId);
    const targetSub = mapModel.suburbMap.get(gameState.targetSuburbId);
    if (!startSub || !targetSub) return;

    // Collect all suburbs in the area of interest:
    // start, target, all adjacent neighbors of start, all adjacent neighbors of target,
    // and all suburbs along the optimal corridor with their immediate neighbors
    const corridorIds = new Set<string>([
      gameState.startSuburbId,
      gameState.targetSuburbId,
      ...gameState.bestPath,
      ...gameState.path,
    ]);

    // Ensure all surrounding suburbs around start and target are included in the view bounds
    startSub.neighbors.forEach((nid) => corridorIds.add(nid));
    targetSub.neighbors.forEach((nid) => corridorIds.add(nid));

    // Also include corridor neighbors
    gameState.bestPath.forEach((id) => {
      const s = mapModel.suburbMap.get(id);
      if (s) {
        s.neighbors.forEach((nid) => corridorIds.add(nid));
      }
    });

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    corridorIds.forEach((id) => {
      const s = mapModel.suburbMap.get(id);
      if (!s) return;
      minX = Math.min(minX, s.x);
      maxX = Math.max(maxX, s.x);
      minY = Math.min(minY, s.y);
      maxY = Math.max(maxY, s.y);

      if (s.polygon && s.polygon.length > 0) {
        s.polygon.forEach(([px, py]) => {
          minX = Math.min(minX, px);
          maxX = Math.max(maxX, px);
          minY = Math.min(minY, py);
          maxY = Math.max(maxY, py);
        });
      }
    });

    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    // Generous margin padding so surrounding suburbs and badges fit comfortably within view
    const padding = 110;
    const spanW = Math.max(maxX - minX + padding * 2, 420);
    const spanH = Math.max(maxY - minY + padding * 2, 340);

    const scale = Math.min(clientWidth / spanW, clientHeight / spanH);
    // Balanced zoom scale: minimum 0.60, capped at 1.45 so surrounding context is never cropped
    const clampedScale = Math.max(0.60, Math.min(scale, 1.45));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      x: clientWidth / 2 - centerX * clampedScale,
      y: clientHeight / 2 - centerY * clampedScale,
      scale: clampedScale,
    });
  }, [gameState.startSuburbId, gameState.targetSuburbId, gameState.bestPath, gameState.path, mapModel.suburbMap]);

  // When game starts or new round begins, zoom in so area of interest occupies the entire view
  useEffect(() => {
    const timer = setTimeout(() => {
      focusOnAreaOfInterest();
    }, 50);
    return () => clearTimeout(timer);
  }, [gameState.startSuburbId, gameState.targetSuburbId, focusOnAreaOfInterest]);

  // Observe container resize to ensure proper initial zoom when mounted
  useEffect(() => {
    if (!containerRef.current) return;
    let initialZoomDone = false;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (!initialZoomDone) {
            initialZoomDone = true;
            focusOnAreaOfInterest();
          }
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [focusOnAreaOfInterest]);

  // Reset to entire Melbourne metropolitan area overview
  const resetView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = clientWidth / SVG_WIDTH;
    const scaleY = clientHeight / SVG_HEIGHT;
    const initialScale = Math.min(scaleX, scaleY) * 0.95;
    setTransform({
      x: (clientWidth - SVG_WIDTH * initialScale) / 2,
      y: (clientHeight - SVG_HEIGHT * initialScale) / 2,
      scale: initialScale,
    });
  }, []);

  const focusOnCurrent = useCallback(() => {
    if (!containerRef.current || !currentSuburb) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const targetScale = Math.max(transform.scale, 1.4);
    setTransform({
      x: clientWidth / 2 - currentSuburb.x * targetScale,
      y: clientHeight / 2 - currentSuburb.y * targetScale,
      scale: targetScale,
    });
  }, [currentSuburb, transform.scale]);

  const handleZoom = useCallback((direction: 'in' | 'out', factor = 1.3) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const centerPoint = { x: clientWidth / 2, y: clientHeight / 2 };

    setTransform((prev) => {
      const newScale = direction === 'in' ? prev.scale * factor : prev.scale / factor;
      const clampedScale = Math.max(0.4, Math.min(newScale, 5.0));

      const ratio = clampedScale / prev.scale;
      const newX = centerPoint.x - (centerPoint.x - prev.x) * ratio;
      const newY = centerPoint.y - (centerPoint.y - prev.y) * ratio;

      return { x: newX, y: newY, scale: clampedScale };
    });
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setTooltipInfo(null);

    setTransform((prev) => {
      const newScale = Math.max(0.4, Math.min(prev.scale * zoomFactor, 5.0));
      const ratio = newScale / prev.scale;
      const newX = mouseX - (mouseX - prev.x) * ratio;
      const newY = mouseY - (mouseY - prev.y) * ratio;
      return { x: newX, y: newY, scale: newScale };
    });
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    setTooltipInfo(null);
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for mobile & pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchMovedRef.current = false;
    setTooltipInfo(null);

    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - transform.x,
        y: e.touches[0].clientY - transform.y,
      };
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        touchCenterRef.current = {
          x: (t1.clientX + t2.clientX) / 2 - rect.left,
          y: (t1.clientY + t2.clientY) / 2 - rect.top,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchMovedRef.current = true;

    if (e.touches.length === 1 && isDraggingRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.touches[0].clientX - dragStartRef.current.x,
        y: e.touches[0].clientY - dragStartRef.current.y,
      }));
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null && touchCenterRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / touchStartDistRef.current;
      touchStartDistRef.current = dist;

      setTransform((prev) => {
        const newScale = Math.max(0.4, Math.min(prev.scale * factor, 5.0));
        const ratio = newScale / prev.scale;
        const center = touchCenterRef.current!;
        return {
          scale: newScale,
          x: center.x - (center.x - prev.x) * ratio,
          y: center.y - (center.y - prev.y) * ratio,
        };
      });
    }
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
    touchCenterRef.current = null;
  };

  // Suburb interaction
  const handleSuburbHover = (suburb: SuburbProjected, e: React.MouseEvent) => {
    // In-game: only show tooltips for suburbs that are already on the path, or start/target
    // Post-game: allow tooltips for ALL suburbs so the user can freely explore the entire metropolitan map
    const isGameOver = gameState.status !== 'playing';
    const isRelevant =
      isGameOver ||
      visitedSet.has(suburb.id) ||
      guessedSet.has(suburb.id) ||
      suburb.id === gameState.startSuburbId ||
      suburb.id === gameState.targetSuburbId;

    if (!isRelevant) {
      setHoveredSuburbId(null);
      setTooltipInfo(null);
      return;
    }

    setHoveredSuburbId(suburb.id);
    const role = getSuburbRole(suburb.id);
    const distTarget = distancesToTarget.get(suburb.id) ?? -1;
    const distCurrent = distancesToCurrent.get(suburb.id) ?? -1;
    const pathIdx = gameState.path.indexOf(suburb.id);
    const inPath = pathIdx !== -1;

    const targetElem = e.currentTarget as SVGGraphicsElement;
    const rect = targetElem?.getBoundingClientRect ? targetElem.getBoundingClientRect() : null;
    const cRect = containerRef.current?.getBoundingClientRect();

    setTooltipInfo({
      suburb,
      role,
      distanceToTarget: distTarget,
      distanceToCurrent: distCurrent,
      isInPath: inPath,
      pathIndex: pathIdx,
      screenX: e.clientX,
      screenY: e.clientY,
      suburbBounds: rect
        ? {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          }
        : undefined,
      containerBounds: cRect
        ? {
            left: cRect.left,
            top: cRect.top,
            right: cRect.right,
            bottom: cRect.bottom,
            width: cRect.width,
            height: cRect.height,
          }
        : undefined,
    });
  };

  const handleSuburbLeave = () => {
    setHoveredSuburbId(null);
    setTooltipInfo(null);
  };

  const handleSuburbClick = (suburb: SuburbProjected, e: React.MouseEvent) => {
    // If the touch or mouse was a drag, ignore click
    if (touchMovedRef.current) return;

    // 1. If active game: clicking any earlier suburb already in the path selects and continues from it!
    if (
      gameState.status === 'playing' &&
      gameState.path.includes(suburb.id) &&
      suburb.id !== currentSuburbId &&
      onSelectPathSuburb
    ) {
      handleSuburbHover(suburb, e);
      onSelectPathSuburb(suburb.id);
      return;
    }
    
    const isGameOver = gameState.status !== 'playing';
    const isInPath =
      visitedSet.has(suburb.id) ||
      guessedSet.has(suburb.id) ||
      suburb.id === gameState.startSuburbId ||
      suburb.id === gameState.targetSuburbId;
    const canInspect = isGameOver || isInPath;

    // Tapping or clicking an active/shaded suburb displays its name and tooltip
    if (canInspect) {
      handleSuburbHover(suburb, e);
      return;
    }

    // Clicking an unvisited suburb or neighbour triggers clear guidance to use sidebar selection
    if (gameState.status === 'playing') {
      onMapClickDisabled?.();
    }
  };

  // Build the visited path line string
  const visitedLinePoints = useMemo(() => {
    return gameState.path
      .map((id) => {
        const s = mapModel.suburbMap.get(id);
        return s ? `${s.x},${s.y}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }, [gameState.path, mapModel.suburbMap]);

  // Build the best path line string (for end-of-game review)
  const bestPathLinePoints = useMemo(() => {
    if (!showBestPathOverlay) return '';
    return gameState.bestPath
      .map((id) => {
        const s = mapModel.suburbMap.get(id);
        return s ? `${s.x},${s.y}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }, [gameState.bestPath, mapModel.suburbMap, showBestPathOverlay]);

  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  return (
    <div
      ref={containerRef}
      id="melbourne-map-viewport"
      className="relative w-full h-full bg-neutral-100 overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background SVG Grid / Water styling */}
      <svg
        ref={svgRef}
        className="w-full h-full block"
        style={{
          transformOrigin: '0 0',
        }}
      >
        <defs>
          {/* Subtle Grid pattern matching Clean Minimalism */}
          <pattern id="carto-grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#e5e7eb" strokeWidth="0.75" strokeOpacity="0.8" />
          </pattern>

          {/* Clean soft drop shadows */}
          <filter id="clean-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.08" />
          </filter>

          {/* Realistic Bay Water Gradient */}
          <linearGradient id="bay-water-grad" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#bae6fd" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Global Pan/Zoom Layer */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Background Land Surface & Grid */}
          <rect x="-1000" y="-1000" width={SVG_WIDTH + 2000} height={SVG_HEIGHT + 2000} fill="url(#carto-grid)" />

          {/* Port Phillip Bay Background Water Layer (rendered beneath land/suburbs) */}
          <g id="bay-water-base" className="pointer-events-none select-none">
            {/* Port Phillip Bay High-Resolution Water Polygon */}
            {mapModel.waterPolygonPath && (
              <path
                d={mapModel.waterPolygonPath}
                fill="url(#bay-water-grad)"
                className="transition-opacity duration-300"
              />
            )}

            {/* Bathymetric depth contour */}
            {mapModel.waterDepthContourPath && (
              <path
                d={mapModel.waterDepthContourPath}
                fill="none"
                stroke="#93c5fd"
                strokeWidth={1.2 / Math.sqrt(transform.scale)}
                strokeDasharray="4 4"
                opacity="0.7"
              />
            )}
          </g>

          {/* Suburb Cadastral Line Map */}
          <g id="suburb-polygons">
            {mapModel.suburbs.map((suburb) => {
              const role = getSuburbRole(suburb.id);
              const isHovered = hoveredSuburbId === suburb.id;
              const pointsStr = suburb.polygon.map((pt) => pt.join(',')).join(' ');

              // Clean Minimalism tile styling:
              // - Default: crisp white tiles with hairline border
              // - Start: red-500 with white stroke
              // - Target: blue-500 with white stroke
              // - Chosen during turns: emerald-500 with white stroke
              // - Valid adjacent moves: white with emerald stroke
              let fillColor = '#ffffff';
              let strokeColor = '#cbd5e1';
              let strokeWidth = 1.0;
              let filter = '';
              let opacity = 1.0;

              const isGameOver = gameState.status !== 'playing';
              const isNeighbour = neighboringSet.has(suburb.id);
              const isPathEarlierSuburb =
                gameState.status === 'playing' &&
                visitedSet.has(suburb.id) &&
                suburb.id !== currentSuburbId;

              if (role === 'start') {
                fillColor = isPathEarlierSuburb && isHovered ? '#f87171' : '#ef4444'; // Red-500 for start
                strokeColor = '#ffffff';
                strokeWidth = isPathEarlierSuburb && isHovered ? 3.0 : 2.2;
                filter = 'url(#clean-shadow)';
              } else if (role === 'target') {
                fillColor = '#3b82f6'; // Blue-500 for target
                strokeColor = '#ffffff';
                strokeWidth = 2.2;
                filter = 'url(#clean-shadow)';
              } else if (role === 'current') {
                fillColor = '#10b981'; // Emerald-500 for current position
                strokeColor = '#ffffff';
                strokeWidth = 2.5;
                filter = 'url(#clean-shadow)';
              } else if (role === 'visited') {
                fillColor = isHovered ? '#34d399' : '#10b981'; // Chosen during turn shaded emerald
                strokeColor = isHovered ? '#065f46' : '#ffffff';
                strokeWidth = isHovered ? 2.5 : 1.8;
                if (isHovered) filter = 'url(#clean-shadow)';
              } else if (role === 'valid-move') {
                fillColor = '#dcfce7'; // Soft mint green highlight for neighbouring suburbs
                strokeColor = '#059669'; // Crisp emerald-600 border
                strokeWidth = 2.0;
                filter = 'url(#clean-shadow)';
              } else if (role === 'best-path') {
                // Shortest path revealed is marked orange, not counting any suburbs the player identified correctly
                fillColor = '#ea580c'; // Vibrant Orange-600
                strokeColor = '#c2410c'; // Deep Orange-700
                strokeWidth = 2.2;
                filter = 'url(#clean-shadow)';
              } else if (role === 'guessed-optimal') {
                // Optimal path guess - shade green even if not a neighbouring suburb
                fillColor = isHovered ? '#34d399' : '#10b981'; // Emerald-500 green
                strokeColor = '#047857'; // Deep emerald border
                strokeWidth = 2.0;
                filter = 'url(#clean-shadow)';
              } else if (role === 'guessed') {
                fillColor = isHovered ? '#fef3c7' : '#fffbeb'; // Soft amber tint for guessed suburbs
                strokeColor = '#d97706'; // Amber-600
                strokeWidth = 1.8;
              } else if (isHovered) {
                fillColor = '#f1f5f9';
                strokeColor = '#94a3b8';
                strokeWidth = 1.6;
              }

              const isInPath =
                visitedSet.has(suburb.id) ||
                guessedSet.has(suburb.id) ||
                suburb.id === gameState.startSuburbId ||
                suburb.id === gameState.targetSuburbId;
              const canInspect = isGameOver || isInPath;
              const cursorClass = isPathEarlierSuburb
                ? 'cursor-pointer hover:brightness-105'
                : canInspect
                ? 'cursor-pointer'
                : 'cursor-default';

              return (
                <polygon
                  key={suburb.id}
                  id={`suburb-${suburb.id}`}
                  points={pointsStr}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth / Math.sqrt(transform.scale)}
                  strokeLinejoin="round"
                  opacity={opacity}
                  filter={filter}
                  className={`transition-colors duration-150 ${cursorClass}`}
                  onMouseEnter={(e) => handleSuburbHover(suburb, e)}
                  onMouseMove={(e) => handleSuburbHover(suburb, e)}
                  onMouseLeave={handleSuburbLeave}
                  onClick={(e) => handleSuburbClick(suburb, e)}
                />
              );
            })}
          </g>

          {/* High-Resolution GIS Waterways Overlay Layer (Coastline, Rivers & Labels) */}
          <g id="gis-waterways" className="pointer-events-none select-none">
            {/* High-Resolution GPS Coastline stroke */}
            {mapModel.coastlinePath && (
              <path
                d={mapModel.coastlinePath}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2.4 / Math.sqrt(transform.scale)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Water label */}
            <text
              x="260"
              y="930"
              fill="#64748b"
              fontSize="24"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="bold"
              letterSpacing="6"
              className="opacity-60 uppercase"
            >
              Port Phillip Bay
            </text>

            {/* 2. Yarra River (Birrarung) GIS Flowline */}
            {mapModel.yarraRiverPath && (
              <g id="yarra-river">
                {/* River buffer / bank */}
                <path
                  d={mapModel.yarraRiverPath}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth={6 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                {/* River water channel */}
                <path
                  d={mapModel.yarraRiverPath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={2.8 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* 3. Maribyrnong River GIS Flowline */}
            {mapModel.maribyrnongRiverPath && (
              <g id="maribyrnong-river">
                {/* River buffer */}
                <path
                  d={mapModel.maribyrnongRiverPath}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth={4.8 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                {/* River channel */}
                <path
                  d={mapModel.maribyrnongRiverPath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={2.2 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </g>

          {/* Best Path Overlay Line (Review when game ends or give up) */}
          {showBestPathOverlay && bestPathLinePoints && (
            <g id="best-path-route" className="pointer-events-none">
              <polyline
                points={bestPathLinePoints}
                fill="none"
                stroke="#ea580c"
                strokeWidth={3.8 / transform.scale}
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
              {gameState.bestPath.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                if (!s) return null;
                const isIdentified = visitedSet.has(id) || id === gameState.startSuburbId;
                const nodeColor = isIdentified
                  ? id === gameState.startSuburbId
                    ? '#ef4444'
                    : '#10b981'
                  : '#ea580c'; // Marked orange if player didn't identify it

                return (
                  <g key={`best-node-${id}`} transform={`translate(${s.x}, ${s.y})`}>
                    <circle
                      r={9 / transform.scale}
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth={2 / transform.scale}
                    />
                    <text
                      textAnchor="middle"
                      dy={3.5 / transform.scale}
                      fill="#ffffff"
                      fontSize={10 / transform.scale}
                      fontWeight="bold"
                    >
                      {index}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Green Visual Path connecting visited suburbs */}
          {visitedLinePoints && (
            <g id="player-path-route" className="pointer-events-none">
              <polyline
                points={visitedLinePoints}
                fill="none"
                stroke="#10b981"
                strokeWidth={4 / transform.scale}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
              {/* Animated pulses along the path */}
              {gameState.path.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                if (!s) return null;
                const isStart = id === gameState.startSuburbId;
                const isCurrent = id === currentSuburbId;

                return (
                  <g key={`path-node-${id}`} transform={`translate(${s.x}, ${s.y})`}>
                    <circle
                      r={(isCurrent ? 11 : 6.5) / transform.scale}
                      fill={isStart ? '#ef4444' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth={2 / transform.scale}
                    />
                    {isCurrent && (
                      <circle
                        r={16 / transform.scale}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth={2 / transform.scale}
                        className="animate-ping"
                      />
                    )}
                    {index > 0 && (
                      <text
                        textAnchor="middle"
                        dy={3.5 / transform.scale}
                        fill="#ffffff"
                        fontSize={9 / transform.scale}
                        fontWeight="bold"
                      >
                        {index}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Suburb Name Labels */}
          <g id="suburb-labels" className="pointer-events-none select-none">
            {mapModel.suburbs.map((suburb) => {
              // User Instruction:
              // While the game is in progress, do not show suburb name unless tapped on or mouse hover. Keep them shaded with the current scheme.
              // When game finishes, show start, target, player-entered, and shortest path suburbs.
              const isStart = suburb.id === gameState.startSuburbId;
              const isTarget = suburb.id === gameState.targetSuburbId;
              const isVisitedByPlayer = visitedSet.has(suburb.id);
              const isGuessedByPlayer = guessedSet.has(suburb.id);
              const isEnteredByPlayer = isVisitedByPlayer || isGuessedByPlayer;
              const isBestPathRevealed = showBestPathOverlay && bestPathSet.has(suburb.id) && !isEnteredByPlayer;
              const isGameInProgress = gameState.status === 'playing';
              const isHovered = hoveredSuburbId === suburb.id;

              // While game is in progress: strictly hide name unless tapped on or mouse hover!
              if (isGameInProgress) {
                if (!isHovered) {
                  return null;
                }
                if (!isStart && !isTarget && !isEnteredByPlayer) {
                  return null;
                }
              } else {
                // When game is over: show start, target, entered, revealed best path, or currently hovered
                if (!isStart && !isTarget && !isEnteredByPlayer && !isBestPathRevealed && !isHovered) {
                  return null;
                }
              }

              // Scale font inversely to zoom level so it stays crisp
              const fontSize = Math.max(11, 13 / Math.sqrt(transform.scale));

              let labelColor = '#ffffff';
              let haloColor = '#0f172a';
              const fontWeight = '700';

              if (isStart) {
                labelColor = '#ffffff';
                haloColor = '#991b1b'; // Dark red halo for starting suburb
              } else if (isTarget) {
                labelColor = '#ffffff';
                haloColor = '#1e40af'; // Dark blue halo for finishing target suburb
              } else if (isVisitedByPlayer || (isGuessedByPlayer && bestPathSet.has(suburb.id))) {
                labelColor = '#ffffff';
                haloColor = '#065f46'; // Dark emerald halo for player-visited suburbs or optimal guesses
              } else if (isGuessedByPlayer) {
                labelColor = '#ffffff';
                haloColor = '#b45309'; // Warm amber halo for player-guessed suburbs
              } else if (isBestPathRevealed) {
                labelColor = '#ffffff';
                haloColor = '#9a3412'; // Dark orange halo for revealed shortest path suburbs
              } else {
                labelColor = '#ffffff';
                haloColor = '#1e293b'; // Default slate halo
              }

              return (
                <g key={`label-${suburb.id}`} transform={`translate(${suburb.x}, ${suburb.y})`}>
                  {/* Clean text halo for maximum legibility */}
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill={haloColor}
                    stroke={haloColor}
                    strokeWidth={4 / Math.sqrt(transform.scale)}
                    strokeLinejoin="round"
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                  >
                    {suburb.name}
                  </text>
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill={labelColor}
                    fontSize={fontSize}
                    fontWeight={fontWeight}
                  >
                    {suburb.name}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Start and Target Visual Badges */}
          {mapModel.suburbMap.get(gameState.startSuburbId) && (
            <g
              transform={`translate(${mapModel.suburbMap.get(gameState.startSuburbId)!.x}, ${
                mapModel.suburbMap.get(gameState.startSuburbId)!.y - 22 / transform.scale
              })`}
              className="pointer-events-none select-none"
            >
              <rect
                x={-28 / transform.scale}
                y={-12 / transform.scale}
                width={56 / transform.scale}
                height={16 / transform.scale}
                rx={4 / transform.scale}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth={1.5 / transform.scale}
              />
              <text
                textAnchor="middle"
                dy={-1 / transform.scale}
                fill="#ffffff"
                fontSize={9 / transform.scale}
                fontWeight="bold"
                letterSpacing="0.5"
              >
                START
              </text>
            </g>
          )}

          {targetSuburb && (
            <g
              transform={`translate(${targetSuburb.x}, ${targetSuburb.y - 22 / transform.scale})`}
              className="pointer-events-none select-none"
            >
              <rect
                x={-32 / transform.scale}
                y={-12 / transform.scale}
                width={64 / transform.scale}
                height={16 / transform.scale}
                rx={4 / transform.scale}
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth={1.5 / transform.scale}
              />
              <text
                textAnchor="middle"
                dy={-1 / transform.scale}
                fill="#ffffff"
                fontSize={9 / transform.scale}
                fontWeight="bold"
                letterSpacing="0.5"
              >
                TARGET
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Map Interactive HUD Floating Controls (Zoom, Pan, Reset) matching Clean Minimalism */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <button
          id="zoom-in-btn"
          title="Zoom In (or pinch / scroll)"
          onClick={() => handleZoom('in')}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          id="zoom-out-btn"
          title="Zoom Out (or pinch / scroll)"
          onClick={() => handleZoom('out')}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          id="focus-game-btn"
          title="Zoom to Area of Interest (Start & Target Route)"
          onClick={focusOnAreaOfInterest}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95 mt-2"
        >
          <Eye className="w-5 h-5" />
        </button>
        <button
          id="focus-current-btn"
          title="Center on Current Suburb"
          onClick={focusOnCurrent}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-emerald-600 transition-colors active:scale-95"
        >
          <Locate className="w-5 h-5" />
        </button>
        {gameState.status === 'playing' && onToggleNeighbours && (
          <button
            id="map-toggle-neighbours-btn"
            title={isNeighboursVisible ? 'Hide neighbours of current step' : 'Show neighbours of current step'}
            onClick={onToggleNeighbours}
            className={`w-10 h-10 border rounded-lg flex items-center justify-center shadow-xs transition-colors active:scale-95 cursor-pointer ${
              isNeighboursVisible
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-800'
            }`}
          >
            <Compass className="w-5 h-5" />
          </button>
        )}
        <button
          id="reset-view-btn"
          title="Reset Whole Melbourne Metro View"
          onClick={resetView}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Tactical Status Pill */}
      <div className="absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-neutral-200 shadow-sm flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-xs font-medium text-neutral-800">
          Current: <strong className="text-neutral-900">{currentSuburb?.name}</strong> •{' '}
          <span className="text-neutral-600">Choose a neighbour from the sidebar list</span>
        </span>
      </div>

      {/* Floating Tactical Legend Overlay */}
      <div className="absolute bottom-6 right-6 z-20 hidden xl:flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-2 rounded-lg border border-neutral-200 text-xs shadow-xs text-neutral-700">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500 border border-white shadow-xs" />
          <span className="font-medium text-neutral-800">Start</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-500 border border-white shadow-xs" />
          <span className="font-medium text-neutral-800">Target</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500 border border-white shadow-xs" />
          <span className="font-medium text-neutral-800">Your Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-500 shadow-xs" />
          <span className="font-medium text-neutral-800">Available Neighbour</span>
        </div>
        {showBestPathOverlay && (
          <div className="flex items-center gap-1.5 border-l border-neutral-200 pl-3">
            <span className="w-3 h-3 rounded bg-amber-500 border border-white shadow-xs" />
            <span className="text-amber-700 font-medium">Optimal Route</span>
          </div>
        )}
      </div>

      {/* Touch Pan/Zoom Hint on Mobile */}
      <div className="absolute top-4 left-4 z-20 md:hidden flex items-center gap-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 text-[11px] text-neutral-600 shadow-xs">
        <Compass className="w-3.5 h-3.5 text-neutral-500" />
        <span>Pinch to zoom • Drag to pan</span>
      </div>

      {/* Suburb Tooltip on hover/touch */}
      <Tooltip
        info={tooltipInfo}
        currentSuburbName={currentSuburb?.name}
        targetSuburbName={targetSuburb?.name}
        onContinueFromHere={onSelectPathSuburb}
      />
    </div>
  );
};
