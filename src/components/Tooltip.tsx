import React, { useRef, useState, useLayoutEffect } from 'react';
import { SuburbTooltipInfo } from '../types';
import { MapPin, Navigation, Compass, CheckCircle2, Flag, BookOpen, Users, Maximize2, Clock } from 'lucide-react';

interface TooltipProps {
  info: SuburbTooltipInfo | null;
  currentSuburbName?: string;
  targetSuburbName?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ info, targetSuburbName }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 310, height: 230 });

  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (Math.abs(rect.width - size.width) > 6 || Math.abs(rect.height - size.height) > 6) {
          setSize({ width: rect.width, height: rect.height });
        }
      }
    }
  }, [info, size.width, size.height]);

  if (!info) return null;

  const { suburb, role, distanceToTarget, distanceToCurrent, suburbBounds, containerBounds } = info;

  // Status badge styling in Clean Minimalism
  let roleBadge = null;
  let borderColor = 'border-neutral-200';

  if (role === 'start') {
    borderColor = 'border-red-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
        <Flag className="w-3 h-3 text-red-500" /> Starting Suburb
      </span>
    );
  } else if (role === 'target') {
    borderColor = 'border-blue-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        <Navigation className="w-3 h-3 text-blue-500" /> Target Destination
      </span>
    );
  } else if (role === 'current') {
    borderColor = 'border-emerald-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
        <MapPin className="w-3 h-3 text-emerald-600" /> Current Position
      </span>
    );
  } else if (role === 'visited') {
    borderColor = 'border-emerald-300';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Chosen on Path
      </span>
    );
  } else if (role === 'valid-move') {
    borderColor = 'border-emerald-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-300">
        <Compass className="w-3 h-3 text-emerald-600" /> Adjacent Move
      </span>
    );
  } else if (role === 'best-path') {
    borderColor = 'border-orange-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-800 border border-orange-300">
        <Navigation className="w-3 h-3 text-orange-600" /> Shortest Path (Orange)
      </span>
    );
  } else if (role === 'guessed-optimal') {
    borderColor = 'border-emerald-500';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Optimal Path (Green)
      </span>
    );
  } else if (role === 'guessed') {
    borderColor = 'border-amber-400';
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
        <MapPin className="w-3 h-3 text-amber-600" /> Guessed Suburb
      </span>
    );
  } else {
    roleBadge = (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
        Melbourne Suburb
      </span>
    );
  }

  // Position tooltip strictly outside the suburb boundaries so it never covers the suburb
  const tooltipW = size.width || 310;
  const tooltipH = size.height || 230;
  const GAP = 14; // Space outside the suburb boundary

  // Viewport bounds: prefer container bounds if available, else window bounds
  const vpLeft = containerBounds ? Math.max(10, containerBounds.left + 10) : 10;
  const vpRight = containerBounds ? Math.min(window.innerWidth - 10, containerBounds.right - 10) : window.innerWidth - 10;
  const vpTop = containerBounds ? Math.max(10, containerBounds.top + 10) : 10;
  const vpBottom = containerBounds ? Math.min(window.innerHeight - 10, containerBounds.bottom - 10) : window.innerHeight - 10;

  let left = 0;
  let top = 0;

  if (suburbBounds) {
    // Available clearance outside each edge of the suburb
    const spaceRight = vpRight - (suburbBounds.right + GAP);
    const spaceLeft = (suburbBounds.left - GAP) - vpLeft;
    const spaceTop = (suburbBounds.top - GAP) - vpTop;
    const spaceBottom = vpBottom - (suburbBounds.bottom + GAP);

    // 1. Prefer placing to the right of the suburb if it fits
    if (spaceRight >= tooltipW) {
      left = suburbBounds.right + GAP;
      const targetTop = suburbBounds.top + (suburbBounds.height - tooltipH) / 2;
      top = Math.max(vpTop, Math.min(targetTop, vpBottom - tooltipH));
    }
    // 2. Else place to the left of the suburb if it fits
    else if (spaceLeft >= tooltipW) {
      left = suburbBounds.left - tooltipW - GAP;
      const targetTop = suburbBounds.top + (suburbBounds.height - tooltipH) / 2;
      top = Math.max(vpTop, Math.min(targetTop, vpBottom - tooltipH));
    }
    // 3. Else place above the suburb if it fits
    else if (spaceTop >= tooltipH) {
      top = suburbBounds.top - tooltipH - GAP;
      const targetLeft = suburbBounds.left + (suburbBounds.width - tooltipW) / 2;
      left = Math.max(vpLeft, Math.min(targetLeft, vpRight - tooltipW));
    }
    // 4. Else place below the suburb if it fits
    else if (spaceBottom >= tooltipH) {
      top = suburbBounds.bottom + GAP;
      const targetLeft = suburbBounds.left + (suburbBounds.width - tooltipW) / 2;
      left = Math.max(vpLeft, Math.min(targetLeft, vpRight - tooltipW));
    }
    // 5. Fallback if suburb takes up nearly the entire viewport (high zoom level)
    else {
      const maxSpace = Math.max(spaceRight, spaceLeft, spaceTop, spaceBottom);
      if (maxSpace === spaceRight) {
        left = Math.min(vpRight - tooltipW, suburbBounds.right + GAP);
        top = Math.max(vpTop, Math.min(suburbBounds.top, vpBottom - tooltipH));
      } else if (maxSpace === spaceLeft) {
        left = Math.max(vpLeft, suburbBounds.left - tooltipW - GAP);
        top = Math.max(vpTop, Math.min(suburbBounds.top, vpBottom - tooltipH));
      } else if (maxSpace === spaceTop) {
        top = Math.max(vpTop, suburbBounds.top - tooltipH - GAP);
        left = Math.max(vpLeft, Math.min(suburbBounds.left, vpRight - tooltipW));
      } else {
        top = Math.min(vpBottom - tooltipH, suburbBounds.bottom + GAP);
        left = Math.max(vpLeft, Math.min(suburbBounds.left, vpRight - tooltipW));
      }
    }
  } else {
    // Fallback if bounds are not passed: offset safely away from the cursor
    left = Math.min(Math.max(vpLeft, info.screenX + 24), vpRight - tooltipW);
    top = Math.min(Math.max(vpTop, info.screenY - tooltipH - 16), vpBottom - tooltipH);
  }

  return (
    <div
      ref={tooltipRef}
      id="suburb-tooltip"
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        pointerEvents: 'none',
        zIndex: 50,
      }}
      className={`bg-white/95 backdrop-blur-md text-neutral-900 p-3.5 rounded-xl shadow-xl border ${borderColor} text-xs w-[310px] select-none`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-bold text-sm tracking-tight text-neutral-900">{suburb.name}</h4>
        <span className="font-mono text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200">
          {suburb.postcode}
        </span>
      </div>

      <div className="text-[11px] text-neutral-500 mb-2 flex items-center justify-between">
        <span>Region: <strong className="text-neutral-700">{suburb.region}</strong></span>
        {roleBadge}
      </div>

      {/* Suburb Core Stats: Population Estimate, Area Covered, Approximate Age */}
      <div className="grid grid-cols-3 gap-1.5 my-2 p-2 rounded-lg bg-neutral-50 border border-neutral-200/80 text-[11px]">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-neutral-400" /> Population
          </span>
          <span className="font-semibold text-neutral-800 font-mono mt-0.5">
            {suburb.population ? suburb.population.toLocaleString() : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
            <Maximize2 className="w-2.5 h-2.5 text-neutral-400" /> Area
          </span>
          <span className="font-semibold text-neutral-800 font-mono mt-0.5">
            {suburb.areaKm2 ? `${suburb.areaKm2} km²` : 'N/A'}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-400 font-medium flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-neutral-400" /> Approx. Age
          </span>
          <span className="font-semibold text-neutral-800 mt-0.5 text-[10.5px] truncate" title={suburb.approximateAge}>
            {suburb.approximateAge || 'N/A'}
          </span>
        </div>
      </div>

      {/* Historical Fact Callout (only rendered if notable fact exists) */}
      {suburb.historicalFact && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-2.5 my-2 text-neutral-800 text-[11px] leading-relaxed shadow-2xs">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Notable History</span>
          </div>
          <p className="text-neutral-700 font-normal leading-relaxed">
            {suburb.historicalFact}
          </p>
        </div>
      )}

      {distanceToTarget >= 0 && (
        <div className="border-t border-neutral-100 pt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
          <span>To Target ({targetSuburbName || 'Destination'}):</span>
          <span className="font-semibold text-blue-600 font-mono">
            {distanceToTarget === 0 ? 'Destination!' : `${distanceToTarget} ${distanceToTarget === 1 ? 'step' : 'steps'}`}
          </span>
        </div>
      )}

      {distanceToCurrent > 0 && (
        <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-500">
          <span>From Current Suburb:</span>
          <span className={distanceToCurrent === 1 ? 'font-semibold text-emerald-600 font-mono' : 'text-neutral-600 font-mono'}>
            {distanceToCurrent === 1 ? 'Adjacent (1 step)' : `${distanceToCurrent} steps`}
          </span>
        </div>
      )}
    </div>
  );
};

