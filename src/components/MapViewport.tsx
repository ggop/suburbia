import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { SuburbProjected, SuburbRole, SuburbTooltipInfo, GameState } from '../types';
import { SVG_WIDTH, SVG_HEIGHT, CityMapModel } from '../utils/mapGeometry';
import { Tooltip } from './Tooltip';
import { ZoomIn, ZoomOut, RotateCcw, Locate, Eye, Compass } from 'lucide-react';

interface MapViewportProps {
  mapModel: CityMapModel;
  gameState: GameState;
  distancesToTarget: Map<string, number>;
  distancesToCurrent: Map<string, number>;
  showBestPathOverlay?: boolean;
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
  const touchPinchRef = useRef<{
    lastDist: number;
    lastCenter: { x: number; y: number };
  } | null>(null);
  const touchMovedRef = useRef(false);

  // Track active puzzle so selecting next suburb does NOT reset the user's zoom/pan
  const puzzleIdRef = useRef<string>('');
  const initialFittedRef = useRef(false);

  // Derive current position and visited set
  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const visitedSet = useMemo(() => new Set(gameState.path), [gameState.path]);
  const bestPathSet = useMemo(() => new Set(gameState.bestPath), [gameState.bestPath]);
  const guessedSet = useMemo(() => new Set(gameState.guessedSuburbs || []), [gameState.guessedSuburbs]);

  // Current suburb
  const currentSuburb = mapModel.suburbMap.get(currentSuburbId);

  // Set of bordering neighbors of current suburb - available to choose at every turn (excluding already in path)
  const neighboringSet = useMemo(() => {
    if (!currentSuburb || gameState.status !== 'playing') return new Set<string>();
    return new Set(currentSuburb.neighbors.filter((id) => !gameState.path.includes(id)));
  }, [currentSuburb, gameState.status, gameState.path]);

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

  // Zoom to start/target view bounds so area of interest and surrounding context occupies the view comfortably
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

    const newX = clientWidth / 2 - centerX * clampedScale;
    const newY = clientHeight / 2 - centerY * clampedScale;

    if (Number.isFinite(newX) && Number.isFinite(newY) && Number.isFinite(clampedScale)) {
      setTransform({
        x: newX,
        y: newY,
        scale: clampedScale,
      });
    }
  }, [gameState.startSuburbId, gameState.targetSuburbId, gameState.bestPath, mapModel.suburbMap]);

  // Unique identifier for current puzzle round (tied to city and start/target)
  const currentPuzzleKey = `${gameState.cityId}_${gameState.startSuburbId}->${gameState.targetSuburbId}`;

  // When game starts or a new round begins, zoom in so area of interest occupies the view.
  // CRITICAL: Only triggers on new puzzle, NEVER on selecting the next suburb in an active game!
  useEffect(() => {
    if (puzzleIdRef.current !== currentPuzzleKey) {
      puzzleIdRef.current = currentPuzzleKey;
      const timer = setTimeout(() => {
        focusOnAreaOfInterest();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [currentPuzzleKey, focusOnAreaOfInterest]);

  // Observe container resize to ensure proper initial zoom when mounted (runs once)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (!initialFittedRef.current) {
            initialFittedRef.current = true;
            focusOnAreaOfInterest();
          }
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [focusOnAreaOfInterest]);

  // Native touchmove listener to prevent mobile browser pinch-zoom blanking or shifting the web page
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onNativeTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, []);

  // Reset to entire Melbourne metropolitan area overview
  const resetView = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const scaleX = clientWidth / SVG_WIDTH;
    const scaleY = clientHeight / SVG_HEIGHT;
    const initialScale = Math.min(scaleX, scaleY) * 0.95;
    const newX = (clientWidth - SVG_WIDTH * initialScale) / 2;
    const newY = (clientHeight - SVG_HEIGHT * initialScale) / 2;

    if (Number.isFinite(newX) && Number.isFinite(newY) && Number.isFinite(initialScale)) {
      setTransform({
        x: newX,
        y: newY,
        scale: initialScale,
      });
    }
  }, []);

  const focusOnCurrent = useCallback(() => {
    if (!containerRef.current || !currentSuburb) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const currentScale = Number.isFinite(transform.scale) && transform.scale > 0 ? transform.scale : 1.0;
    const targetScale = Math.max(currentScale, 1.4);
    const newX = clientWidth / 2 - currentSuburb.x * targetScale;
    const newY = clientHeight / 2 - currentSuburb.y * targetScale;

    if (Number.isFinite(newX) && Number.isFinite(newY) && Number.isFinite(targetScale)) {
      setTransform({
        x: newX,
        y: newY,
        scale: targetScale,
      });
    }
  }, [currentSuburb, transform.scale]);

  const handleZoom = useCallback((direction: 'in' | 'out', factor = 1.3) => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) return;

    const centerPoint = { x: clientWidth / 2, y: clientHeight / 2 };

    setTransform((prev) => {
      const validScale = Number.isFinite(prev.scale) && prev.scale > 0 ? prev.scale : 1.0;
      const validX = Number.isFinite(prev.x) ? prev.x : 0;
      const validY = Number.isFinite(prev.y) ? prev.y : 0;

      const newScale = direction === 'in' ? validScale * factor : validScale / factor;
      const clampedScale = Math.max(0.4, Math.min(newScale, 5.0));

      const ratio = clampedScale / validScale;
      const newX = centerPoint.x - (centerPoint.x - validX) * ratio;
      const newY = centerPoint.y - (centerPoint.y - validY) * ratio;

      if (!Number.isFinite(newX) || !Number.isFinite(newY) || !Number.isFinite(clampedScale)) {
        return prev;
      }

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
      const validScale = Number.isFinite(prev.scale) && prev.scale > 0 ? prev.scale : 1.0;
      const validX = Number.isFinite(prev.x) ? prev.x : 0;
      const validY = Number.isFinite(prev.y) ? prev.y : 0;

      const newScale = Math.max(0.4, Math.min(validScale * zoomFactor, 5.0));
      const ratio = newScale / validScale;
      const newX = mouseX - (mouseX - validX) * ratio;
      const newY = mouseY - (mouseY - validY) * ratio;

      if (!Number.isFinite(newX) || !Number.isFinite(newY) || !Number.isFinite(newScale)) {
        return prev;
      }

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
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      if (Number.isFinite(newX) && Number.isFinite(newY)) {
        setTransform((prev) => ({
          ...prev,
          x: newX,
          y: newY,
        }));
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch handlers for mobile & pinch-to-zoom (Rock-solid NaN-safe implementation)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchMovedRef.current = false;
    setTooltipInfo(null);

    if (e.touches.length === 1) {
      touchPinchRef.current = null;
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - transform.x,
        y: e.touches[0].clientY - transform.y,
      };
    } else if (e.touches.length === 2) {
      isDraggingRef.current = false;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && dist > 10) {
        touchPinchRef.current = {
          lastDist: dist,
          lastCenter: {
            x: (t1.clientX + t2.clientX) / 2 - rect.left,
            y: (t1.clientY + t2.clientY) / 2 - rect.top,
          },
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchMovedRef.current = true;

    if (e.touches.length === 1 && isDraggingRef.current) {
      const newX = e.touches[0].clientX - dragStartRef.current.x;
      const newY = e.touches[0].clientY - dragStartRef.current.y;
      if (Number.isFinite(newX) && Number.isFinite(newY)) {
        setTransform((prev) => ({
          ...prev,
          x: newX,
          y: newY,
        }));
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || dist < 10) return;

      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2 - rect.left,
        y: (t1.clientY + t2.clientY) / 2 - rect.top,
      };

      if (!touchPinchRef.current) {
        touchPinchRef.current = { lastDist: dist, lastCenter: currentCenter };
        return;
      }

      const { lastDist, lastCenter } = touchPinchRef.current;
      if (lastDist > 10) {
        const factor = dist / lastDist;
        // Clamp factor per frame to prevent erratic scale jumps
        const clampedFactor = Math.max(0.75, Math.min(factor, 1.35));
        const dx = currentCenter.x - lastCenter.x;
        const dy = currentCenter.y - lastCenter.y;

        setTransform((prev) => {
          const currentScale = Number.isFinite(prev.scale) && prev.scale > 0 ? prev.scale : 1.0;
          const currentX = Number.isFinite(prev.x) ? prev.x : 0;
          const currentY = Number.isFinite(prev.y) ? prev.y : 0;

          const newScale = Math.max(0.4, Math.min(currentScale * clampedFactor, 5.0));
          const ratio = newScale / currentScale;

          const newX = currentCenter.x - (currentCenter.x - (currentX + dx)) * ratio;
          const newY = currentCenter.y - (currentCenter.y - (currentY + dy)) * ratio;

          if (!Number.isFinite(newX) || !Number.isFinite(newY) || !Number.isFinite(newScale)) {
            return prev;
          }

          return { scale: newScale, x: newX, y: newY };
        });

        touchPinchRef.current = { lastDist: dist, lastCenter: currentCenter };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 1) {
      // Transition back smoothly to 1-finger panning without jumping
      touchPinchRef.current = null;
      isDraggingRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX - transform.x,
        y: e.touches[0].clientY - transform.y,
      };
    } else if (e.touches.length === 0) {
      isDraggingRef.current = false;
      touchPinchRef.current = null;
    }
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

    // Tapping or clicking any suburb inspects its name and details in tooltip
    handleSuburbHover(suburb, e);

    // CRITICAL INVARIANT: Direct selection of the next suburb from the map is not allowed.
    // All player selections must be made exclusively from the "Available Neighbours" list.
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

  // Build the friend path line string (for side-by-side route comparison)
  const friendPathLinePoints = useMemo(() => {
    if (!gameState.friendPath || gameState.friendPath.length < 2) return '';
    return gameState.friendPath
      .map((id) => {
        const s = mapModel.suburbMap.get(id);
        return s ? `${s.x},${s.y}` : '';
      })
      .filter(Boolean)
      .join(' ');
  }, [gameState.friendPath, mapModel.suburbMap]);

  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);
  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);

  // Compute non-overlapping callout labels with leader lines pointing to suburbs
  const calloutLabels = useMemo(() => {
    const isGameOver = gameState.status !== 'playing';

    interface LabelCandidate {
      id: string;
      suburb: SuburbProjected;
      role: 'start' | 'target' | 'current' | 'visited' | 'best-path' | 'friend-path' | 'hovered';
      stepIndex?: number;
      badgeText: string;
      lineColor: string;
      bgColor: string;
      borderColor: string;
      textColor: string;
    }

    const candidates: LabelCandidate[] = [];
    const addedIds = new Set<string>();

    // 1. Start Suburb Anchor
    if (startSuburb) {
      candidates.push({
        id: startSuburb.id,
        suburb: startSuburb,
        role: 'start',
        stepIndex: 0,
        badgeText: `START • ${startSuburb.name}`,
        lineColor: '#ef4444',
        bgColor: '#ef4444',
        borderColor: '#dc2626',
        textColor: '#ffffff',
      });
      addedIds.add(startSuburb.id);
    }

    // 2. Target Suburb Anchor
    if (targetSuburb && !addedIds.has(targetSuburb.id)) {
      candidates.push({
        id: targetSuburb.id,
        suburb: targetSuburb,
        role: 'target',
        badgeText: `TARGET • ${targetSuburb.name}`,
        lineColor: '#3b82f6',
        bgColor: '#2563eb',
        borderColor: '#1d4ed8',
        textColor: '#ffffff',
      });
      addedIds.add(targetSuburb.id);
    }

    // 3. Chosen Suburbs along player's path (active during gameplay & final path)
    gameState.path.forEach((id, idx) => {
      if (addedIds.has(id)) return;
      const s = mapModel.suburbMap.get(id);
      if (!s) return;

      const isCurrent = id === currentSuburbId && !isGameOver;
      if (isCurrent) {
        candidates.push({
          id,
          suburb: s,
          role: 'current',
          stepIndex: idx,
          badgeText: `#${idx} • ${s.name}`,
          lineColor: '#10b981',
          bgColor: '#047857',
          borderColor: '#10b981',
          textColor: '#ffffff',
        });
      } else {
        candidates.push({
          id,
          suburb: s,
          role: 'visited',
          stepIndex: idx,
          badgeText: `#${idx} • ${s.name}`,
          lineColor: '#059669',
          bgColor: '#ffffff',
          borderColor: '#10b981',
          textColor: '#064e3b',
        });
      }
      addedIds.add(id);
    });

    // 4. In game-over mode: optimal route and friend route labels
    if (isGameOver) {
      if (showBestPathOverlay && gameState.bestPath) {
        gameState.bestPath.forEach((id) => {
          if (addedIds.has(id)) return;
          const s = mapModel.suburbMap.get(id);
          if (!s) return;
          candidates.push({
            id,
            suburb: s,
            role: 'best-path',
            badgeText: `★ ${s.name}`,
            lineColor: '#8b5cf6',
            bgColor: '#f5f3ff',
            borderColor: '#c4b5fd',
            textColor: '#6d28d9',
          });
          addedIds.add(id);
        });
      }

      if (gameState.friendPath && gameState.friendPath.length > 0) {
        gameState.friendPath.forEach((id) => {
          if (addedIds.has(id)) return;
          const s = mapModel.suburbMap.get(id);
          if (!s) return;
          candidates.push({
            id,
            suburb: s,
            role: 'friend-path',
            badgeText: `👥 ${s.name}`,
            lineColor: '#8b5cf6',
            bgColor: '#faf5ff',
            borderColor: '#8b5cf6',
            textColor: '#6b21a8',
          });
          addedIds.add(id);
        });
      }
    }

    // 5. Hovered suburb label (if user is hovering a suburb not yet labeled)
    if (hoveredSuburbId && !addedIds.has(hoveredSuburbId)) {
      const s = mapModel.suburbMap.get(hoveredSuburbId);
      if (s) {
        candidates.push({
          id: s.id,
          suburb: s,
          role: 'hovered',
          badgeText: s.name,
          lineColor: '#64748b',
          bgColor: '#0f172a',
          borderColor: '#334155',
          textColor: '#ffffff',
        });
        addedIds.add(s.id);
      }
    }

    // Reduced text size to ensure compact, crisp display and avoid obscuring the map
    const fontSize = Math.max(6.8, 8.2 / Math.sqrt(transform.scale));
    const padX = 6 / Math.sqrt(transform.scale);
    const padY = 3.2 / Math.sqrt(transform.scale);
    const pillHeight = fontSize + padY * 2;
    const margin = 3.5 / Math.sqrt(transform.scale);
    const baseRadius = Math.max(22, 28 / Math.sqrt(transform.scale));
    const radii = [
      baseRadius,
      baseRadius * 1.5,
      baseRadius * 2.2,
      baseRadius * 3.0,
      baseRadius * 4.0,
    ];

    const baseAnglesDeg = [
      -45, 45, -135, 135,
      -90, 90, 0, 180,
      -22.5, 22.5, -67.5, 67.5,
      -112.5, 112.5, -157.5, 157.5,
    ];

    interface PlacedBox {
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }

    const placedBoxes: PlacedBox[] = [];

    interface CalloutLabelResult {
      id: string;
      suburbX: number;
      suburbY: number;
      labelX: number;
      labelY: number;
      lineStartX: number;
      lineStartY: number;
      pillWidth: number;
      pillHeight: number;
      fontSize: number;
      badgeText: string;
      lineColor: string;
      bgColor: string;
      borderColor: string;
      textColor: string;
    }

    const results: CalloutLabelResult[] = [];

    const normAngle = (a: number) => {
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      return a;
    };

    const boxesOverlap = (b1: PlacedBox, b2: PlacedBox) => {
      return !(b1.x2 < b2.x1 || b1.x1 > b2.x2 || b1.y2 < b2.y1 || b1.y1 > b2.y2);
    };

    candidates.forEach((cand) => {
      const s = cand.suburb;
      const textWidth = cand.badgeText.length * (fontSize * 0.54);
      const pillWidth = textWidth + padX * 2;

      // Determine preferred angle away from path or center
      let preferredAngle = -Math.PI / 4;
      const pathIdx = gameState.path.indexOf(cand.id);

      if (pathIdx >= 0) {
        if (pathIdx > 0 && pathIdx < gameState.path.length - 1) {
          const prev = mapModel.suburbMap.get(gameState.path[pathIdx - 1]);
          const next = mapModel.suburbMap.get(gameState.path[pathIdx + 1]);
          if (prev && next) {
            const tx = next.x - prev.x;
            const ty = next.y - prev.y;
            const side = pathIdx % 2 === 0 ? 1 : -1;
            preferredAngle = Math.atan2(side * tx, -side * ty);
          }
        } else if (pathIdx === 0 && gameState.path.length > 1) {
          const next = mapModel.suburbMap.get(gameState.path[1]);
          if (next) {
            preferredAngle = Math.atan2(s.y - next.y, s.x - next.x);
          }
        } else if (pathIdx === gameState.path.length - 1 && gameState.path.length > 1) {
          const prev = mapModel.suburbMap.get(gameState.path[pathIdx - 1]);
          if (prev) {
            preferredAngle = Math.atan2(s.y - prev.y, s.x - prev.x);
          }
        }
      } else if (cand.id === gameState.targetSuburbId) {
        preferredAngle = Math.atan2(s.y - 550, s.x - 650);
      }

      const sortedAngles = [...baseAnglesDeg].sort((a, b) => {
        const radA = (a * Math.PI) / 180;
        const radB = (b * Math.PI) / 180;
        const diffA = Math.abs(normAngle(radA - preferredAngle));
        const diffB = Math.abs(normAngle(radB - preferredAngle));
        return diffA - diffB;
      });

      let bestCand: { x: number; y: number; cost: number } | null = null;

      for (const r of radii) {
        for (const deg of sortedAngles) {
          const rad = (deg * Math.PI) / 180;
          const cx = s.x + r * Math.cos(rad);
          const cy = s.y + r * Math.sin(rad);

          const box: PlacedBox = {
            x1: cx - pillWidth / 2 - margin,
            x2: cx + pillWidth / 2 + margin,
            y1: cy - pillHeight / 2 - margin,
            y2: cy + pillHeight / 2 + margin,
          };

          let cost = 0;

          if (box.x1 < 10 || box.x2 > SVG_WIDTH - 10 || box.y1 < 10 || box.y2 > SVG_HEIGHT - 10) {
            cost += 5000;
          }

          for (const pb of placedBoxes) {
            if (boxesOverlap(box, pb)) {
              cost += 10000;
              break;
            }
          }

          for (const other of candidates) {
            if (other.id === cand.id) continue;
            const dx = cx - other.suburb.x;
            const dy = cy - other.suburb.y;
            const dist = Math.hypot(dx, dy);
            if (dist < Math.max(pillWidth, pillHeight) / 2 + 6) {
              cost += 4000;
            }
          }

          cost += (r / baseRadius) * 20;

          if (cost === 0) {
            bestCand = { x: cx, y: cy, cost: 0 };
            break;
          }

          if (!bestCand || cost < bestCand.cost) {
            bestCand = { x: cx, y: cy, cost };
          }
        }
        if (bestCand && bestCand.cost === 0) {
          break;
        }
      }

      const finalPos = bestCand ? { x: bestCand.x, y: bestCand.y } : { x: s.x, y: s.y - baseRadius };

      placedBoxes.push({
        x1: finalPos.x - pillWidth / 2 - margin,
        x2: finalPos.x + pillWidth / 2 + margin,
        y1: finalPos.y - pillHeight / 2 - margin,
        y2: finalPos.y + pillHeight / 2 + margin,
      });

      const lineDist = Math.hypot(finalPos.x - s.x, finalPos.y - s.y);
      const rStart = Math.min(lineDist * 0.4, 7 / Math.sqrt(transform.scale));
      const lineStartX = lineDist > 0.1 ? s.x + ((finalPos.x - s.x) / lineDist) * rStart : s.x;
      const lineStartY = lineDist > 0.1 ? s.y + ((finalPos.y - s.y) / lineDist) * rStart : s.y;

      results.push({
        id: cand.id,
        suburbX: s.x,
        suburbY: s.y,
        labelX: finalPos.x,
        labelY: finalPos.y,
        lineStartX,
        lineStartY,
        pillWidth,
        pillHeight,
        fontSize,
        badgeText: cand.badgeText,
        lineColor: cand.lineColor,
        bgColor: cand.bgColor,
        borderColor: cand.borderColor,
        textColor: cand.textColor,
      });
    });

    return results;
  }, [
    gameState.status,
    gameState.path,
    gameState.bestPath,
    gameState.friendPath,
    currentSuburbId,
    startSuburb,
    targetSuburb,
    mapModel,
    showBestPathOverlay,
    hoveredSuburbId,
    transform.scale,
  ]);

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
          </g>

          {/* Suburb Cadastral Line Map - Fills & Interactive Hit Areas */}
          <g id="suburb-polygons">
            {mapModel.suburbs.map((suburb) => {
              const role = getSuburbRole(suburb.id);
              const isHovered = hoveredSuburbId === suburb.id;
              const pointsStr = suburb.polygon.map((pt) => pt.join(',')).join(' ');

              // Clean Minimalism tile styling:
              // - Default: crisp white tiles
              // - Start: red-500
              // - Target: blue-500
              // - Chosen during turns: emerald-500
              // - Valid adjacent moves: soft mint green
              let fillColor = '#ffffff';
              let opacity = 1.0;

              const isGameOver = gameState.status !== 'playing';
              const isPathEarlierSuburb =
                gameState.status === 'playing' &&
                visitedSet.has(suburb.id) &&
                suburb.id !== currentSuburbId;

              if (role === 'start') {
                fillColor = isPathEarlierSuburb && isHovered ? '#f87171' : '#ef4444'; // Red-500 for start
              } else if (role === 'target') {
                fillColor = '#3b82f6'; // Blue-500 for target
              } else if (role === 'current') {
                fillColor = '#10b981'; // Emerald-500 for current position
              } else if (role === 'visited') {
                fillColor = isHovered ? '#34d399' : '#10b981'; // Chosen during turn shaded emerald
              } else if (role === 'valid-move') {
                fillColor = isHovered ? '#bbf7d0' : '#dcfce7'; // Soft mint green highlight for neighbouring suburbs
              } else if (role === 'best-path') {
                fillColor = isHovered ? '#c4b5fd' : '#ddd6fe'; // Soft pastel lavender/violet
              } else if (role === 'guessed-optimal') {
                fillColor = isHovered ? '#34d399' : '#10b981'; // Emerald-500 green
              } else if (role === 'guessed') {
                fillColor = isHovered ? '#fef3c7' : '#fffbeb'; // Soft amber tint for guessed suburbs
              } else if (isHovered) {
                fillColor = '#f1f5f9';
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
                  stroke="none"
                  opacity={opacity}
                  className={`transition-colors duration-150 ${cursorClass}`}
                  onMouseEnter={(e) => handleSuburbHover(suburb, e)}
                  onMouseMove={(e) => handleSuburbHover(suburb, e)}
                  onMouseLeave={handleSuburbLeave}
                  onClick={(e) => handleSuburbClick(suburb, e)}
                />
              );
            })}
          </g>

          {/* Suburb Cadastral Line Map - Distinct Borders Layer
              Rendered on top of all fills so adjacent green suburbs never meld together */}
          <g id="suburb-borders" className="pointer-events-none select-none">
            {mapModel.suburbs.map((suburb) => {
              const role = getSuburbRole(suburb.id);
              const isHovered = hoveredSuburbId === suburb.id;
              const pointsStr = suburb.polygon.map((pt) => pt.join(',')).join(' ');

              const safeScale = Number.isFinite(transform.scale) && transform.scale > 0 ? transform.scale : 1.0;
              const sqrtScale = Math.sqrt(safeScale);

              let strokeColor = '#cbd5e1';
              let strokeWidth = Math.max(0.75, 1.0 / sqrtScale);

              if (role === 'start') {
                strokeColor = '#991b1b'; // Deep dark red border
                strokeWidth = Math.max(1.8, 2.6 / sqrtScale);
              } else if (role === 'target') {
                strokeColor = '#1e40af'; // Deep blue border
                strokeWidth = Math.max(1.8, 2.6 / sqrtScale);
              } else if (role === 'current') {
                // High contrast dark forest emerald border keeps current suburb crystal clear
                strokeColor = '#064e3b';
                strokeWidth = Math.max(2.0, 2.8 / sqrtScale);
              } else if (role === 'visited') {
                // Retain distinct border so green suburbs in player's path never meld
                strokeColor = isHovered ? '#022c22' : '#064e3b';
                strokeWidth = Math.max(1.6, 2.4 / sqrtScale);
              } else if (role === 'valid-move') {
                // Crisp forest green border for available neighbour suburbs
                strokeColor = isHovered ? '#064e3b' : '#047857';
                strokeWidth = Math.max(1.4, 2.0 / sqrtScale);
              } else if (role === 'best-path') {
                strokeColor = '#8b5cf6'; // Violet-500
                strokeWidth = Math.max(1.6, 2.4 / sqrtScale);
              } else if (role === 'guessed-optimal') {
                strokeColor = '#064e3b'; // Deep emerald
                strokeWidth = Math.max(1.6, 2.4 / sqrtScale);
              } else if (role === 'guessed') {
                strokeColor = '#d97706'; // Amber-600
                strokeWidth = Math.max(1.2, 1.8 / sqrtScale);
              } else if (isHovered) {
                strokeColor = '#64748b';
                strokeWidth = Math.max(1.2, 1.6 / sqrtScale);
              }

              return (
                <polygon
                  key={`border-${suburb.id}`}
                  id={`suburb-border-${suburb.id}`}
                  points={pointsStr}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* High-Resolution GIS Waterways Overlay Layer (Rivers & Labels, Coastline blue line removed) */}
          <g id="gis-waterways" className="pointer-events-none select-none">
            {/* Water body label */}
            <text
              x={mapModel.waterLabelX ?? 260}
              y={mapModel.waterLabelY ?? 930}
              fill="#64748b"
              fontSize="24"
              fontFamily="'Space Grotesk', sans-serif"
              fontWeight="bold"
              letterSpacing="6"
              className="opacity-60 uppercase"
            >
              {mapModel.waterBodyName || 'Waterway'}
            </text>

            {/* Primary River GIS Flowline (e.g. River Torrens or Yarra River) */}
            {mapModel.primaryRiverPath && (
              <g id="primary-river">
                {/* River buffer / bank */}
                <path
                  d={mapModel.primaryRiverPath}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth={6 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                {/* River water channel */}
                <path
                  d={mapModel.primaryRiverPath}
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={2.8 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}

            {/* Secondary River GIS Flowline (e.g. Port River or Maribyrnong River) */}
            {mapModel.secondaryRiverPath && (
              <g id="secondary-river">
                {/* River buffer */}
                <path
                  d={mapModel.secondaryRiverPath}
                  fill="none"
                  stroke="#e0f2fe"
                  strokeWidth={4.8 / Math.sqrt(transform.scale)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                {/* River channel */}
                <path
                  d={mapModel.secondaryRiverPath}
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
                stroke="#8b5cf6"
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
                  : '#8b5cf6'; // Marked violet if player didn't identify it

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

          {/* Friend Path Overlay Line (For comparing routes with a friend) */}
          {friendPathLinePoints && gameState.friendPath && (
            <g id="friend-path-route" className="pointer-events-none">
              <polyline
                points={friendPathLinePoints}
                fill="none"
                stroke="#8b5cf6"
                strokeWidth={3.6 / transform.scale}
                strokeDasharray="5 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
              {gameState.friendPath.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                if (!s) return null;
                const isStart = id === gameState.startSuburbId;
                const isTarget = id === gameState.targetSuburbId;
                if (isStart || isTarget) return null;

                return (
                  <g key={`friend-node-${id}`} transform={`translate(${s.x}, ${s.y})`}>
                    <circle
                      r={7.5 / transform.scale}
                      fill="#8b5cf6"
                      stroke="#ffffff"
                      strokeWidth={1.8 / transform.scale}
                    />
                    <text
                      textAnchor="middle"
                      dy={3 / transform.scale}
                      fill="#ffffff"
                      fontSize={8.5 / transform.scale}
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
                      r={(isCurrent ? 9.5 : 6.0) / transform.scale}
                      fill={isStart ? '#ef4444' : '#10b981'}
                      stroke="#ffffff"
                      strokeWidth={2 / transform.scale}
                    />
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

          {/* Target Suburb Pin / Bullseye Node */}
          {targetSuburb && (
            <g
              transform={`translate(${targetSuburb.x}, ${targetSuburb.y})`}
              className="pointer-events-none select-none"
            >
              <circle
                r={8 / transform.scale}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={2 / transform.scale}
              />
              <circle
                r={3.8 / transform.scale}
                fill="#ffffff"
              />
              <circle
                r={1.8 / transform.scale}
                fill="#2563eb"
              />
            </g>
          )}

          {/* Non-Overlapping Callout Labels with Leader Lines */}
          <g id="callout-labels" className="pointer-events-none select-none">
            {calloutLabels.map((lbl) => (
              <g key={`callout-${lbl.id}`} className="transition-opacity duration-200">
                {/* Anchor pinpoint at suburb centroid */}
                <circle
                  cx={lbl.suburbX}
                  cy={lbl.suburbY}
                  r={2.2 / Math.sqrt(transform.scale)}
                  fill={lbl.lineColor}
                />
                {/* Pointer leader line from suburb to label */}
                <line
                  x1={lbl.lineStartX}
                  y1={lbl.lineStartY}
                  x2={lbl.labelX}
                  y2={lbl.labelY}
                  stroke={lbl.lineColor}
                  strokeWidth={1.2 / Math.sqrt(transform.scale)}
                  strokeDasharray={transform.scale > 1.2 ? '3 1.8' : undefined}
                  strokeOpacity={0.9}
                  strokeLinecap="round"
                />
                {/* Callout pill containing text */}
                <g transform={`translate(${lbl.labelX}, ${lbl.labelY})`}>
                  <rect
                    x={-lbl.pillWidth / 2}
                    y={-lbl.pillHeight / 2}
                    width={lbl.pillWidth}
                    height={lbl.pillHeight}
                    rx={lbl.pillHeight / 2}
                    fill={lbl.bgColor}
                    stroke={lbl.borderColor}
                    strokeWidth={1.2 / Math.sqrt(transform.scale)}
                    filter="url(#clean-shadow)"
                  />
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    fill={lbl.textColor}
                    fontSize={lbl.fontSize}
                    fontWeight="700"
                    letterSpacing="0.2"
                  >
                    {lbl.badgeText}
                  </text>
                </g>
              </g>
            ))}
          </g>
        </g>
      </svg>

      {/* Map Interactive HUD Floating Controls (Zoom, Pan, Reset) */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 flex flex-col gap-1.5 sm:gap-2">
        <button
          id="zoom-in-btn"
          title="Zoom In (or pinch / scroll)"
          onClick={() => handleZoom('in')}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          id="zoom-out-btn"
          title="Zoom Out (or pinch / scroll)"
          onClick={() => handleZoom('out')}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95 cursor-pointer"
        >
          <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          id="focus-game-btn"
          title="Zoom to Area of Interest (Start & Target Route)"
          onClick={focusOnAreaOfInterest}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95 mt-1 sm:mt-2 cursor-pointer"
        >
          <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          id="focus-current-btn"
          title="Center on Current Suburb"
          onClick={focusOnCurrent}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-emerald-600 transition-colors active:scale-95 cursor-pointer"
        >
          <Locate className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          id="reset-view-btn"
          title="Reset Whole Melbourne Metro View"
          onClick={resetView}
          className="w-9 h-9 sm:w-10 sm:h-10 bg-white border border-neutral-200 rounded-lg flex items-center justify-center shadow-xs hover:bg-neutral-50 text-neutral-800 transition-colors active:scale-95 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Floating Tactical Status Pill (desktop) */}
      <div className="hidden md:flex absolute bottom-6 left-6 z-20 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-lg border border-neutral-200 shadow-sm items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-neutral-800">
          Current: <strong className="text-neutral-900">{currentSuburb?.name}</strong> •{' '}
          <span className="text-neutral-600">Choose a neighbour to advance your route</span>
        </span>
        {mapModel.cityId === 'chennai' && (
          <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
            Chennai Beta Map
          </span>
        )}
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
            <span className="w-3 h-3 rounded bg-violet-300 border border-violet-500 shadow-xs" />
            <span className="text-violet-700 font-medium">Optimal Route</span>
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
        cityName={mapModel.cityName}
      />
    </div>
  );
};
