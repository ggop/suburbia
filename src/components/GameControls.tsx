import React, { useState, useRef, useMemo } from 'react';
import { GameState, SuburbProjected } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  MapPin,
  AlertCircle,
  CornerDownLeft,
  Undo2,
  Check,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Flag,
} from 'lucide-react';

interface GameControlsProps {
  gameState: GameState;
  mapModel: MelbourneMapModel;
  distancesToTarget: Map<string, number>;
  errorMessage: string | null;
  consecutiveErrors: number;
  onMoveToSuburb: (suburbId: string) => void;
  onInvalidGuess?: (query: string) => void;
  onUndoLastMove?: () => void;
  onGiveUp?: () => void;
  onResetGame: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  mapModel,
  distancesToTarget,
  errorMessage,
  consecutiveErrors,
  onMoveToSuburb,
  onInvalidGuess,
  onUndoLastMove,
  onGiveUp,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const currentSuburb = mapModel.suburbMap.get(currentSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);
  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);

  // Neighbors of current suburb for hint when consecutive errors >= 2
  const neighboringSuburbs = useMemo(() => {
    if (!currentSuburb) return [];
    return currentSuburb.neighbors
      .map((id) => mapModel.suburbMap.get(id))
      .filter((s): s is SuburbProjected => Boolean(s));
  }, [currentSuburb, mapModel.suburbMap]);

  // Helper to normalize suburb text for typo-forgiving search and multi-token matching
  const normalizeSuburbText = (text: string) => {
    return text
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/[-_'/]/g, ' ')
      .replace(/\bst\b/g, 'saint')
      .replace(/\bmt\b/g, 'mount')
      .replace(/\bnth\b/g, 'north')
      .replace(/\bsth\b/g, 'south')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Autocomplete suggestions:
  // Show matching options when user types at least 1 character.
  // Uses normalization, multi-token matching, and smart ranking so options always appear reliably.
  const suggestions = useMemo(() => {
    const raw = inputValue.trim();
    if (!raw || raw.length < 1) return [];

    const queryLower = raw.toLowerCase();
    const normQuery = normalizeSuburbText(raw);
    const queryTokens = normQuery.split(' ').filter(Boolean);

    interface ScoredSuburb {
      suburb: SuburbProjected;
      score: number;
    }

    const scored: ScoredSuburb[] = [];

    for (const suburb of mapModel.suburbs) {
      const nameLower = suburb.name.toLowerCase();
      const normName = normalizeSuburbText(suburb.name);
      const postcode = suburb.postcode;

      let score = 0;

      // 1. Exact matches
      if (nameLower === queryLower || normName === normQuery) {
        score = 1000;
      }
      // 2. Starts with query
      else if (nameLower.startsWith(queryLower) || normName.startsWith(normQuery)) {
        score = 500 - suburb.name.length;
      }
      // 3. Word within suburb name starts with query
      else if (
        normName.split(' ').some((word) => word.startsWith(normQuery)) ||
        nameLower.split(' ').some((word) => word.startsWith(queryLower))
      ) {
        score = 300 - suburb.name.length;
      }
      // 4. All tokens in multi-word query match suburb name
      else if (
        queryTokens.length > 1 &&
        queryTokens.every((token) => normName.includes(token))
      ) {
        score = 250;
      }
      // 5. Contains query as substring
      else if (nameLower.includes(queryLower) || normName.includes(normQuery)) {
        score = 100 - suburb.name.length;
      }
      // 6. Postcode match
      else if (postcode.startsWith(raw)) {
        score = 80;
      } else if (postcode.includes(raw)) {
        score = 50;
      }

      if (score > 0) {
        scored.push({ suburb, score });
      }
    }

    scored.sort((a, b) => b.score - a.score || a.suburb.name.localeCompare(b.suburb.name));
    return scored.slice(0, 12).map((item) => item.suburb);
  }, [inputValue, mapModel.suburbs]);

  // Distance from current suburb to target
  const stepsRemaining = distancesToTarget.get(currentSuburbId) ?? 0;
  const turnsLeft = Math.max(0, gameState.maxTurns - gameState.turnsUsed);
  const turnsFormatted = `${String(turnsLeft).padStart(2, '0')}/${String(gameState.maxTurns).padStart(2, '0')}`;
  const progressPercent = Math.min(100, (gameState.turnsUsed / gameState.maxTurns) * 100);

  // Suburbs on path (excluding start if it's rendered separately)
  const pathSuburbs = useMemo(() => {
    return gameState.path.map((id) => mapModel.suburbMap.get(id)!).filter(Boolean);
  }, [gameState.path, mapModel.suburbMap]);

  // Handle move submission
  const handleSubmit = (suburbToSubmit?: SuburbProjected) => {
    let target = suburbToSubmit;

    if (!target) {
      const raw = inputValue.trim();
      if (!raw) return;

      const queryLower = raw.toLowerCase();
      const normQuery = normalizeSuburbText(raw);

      // 1. Exact name match
      target = mapModel.suburbs.find(
        (s) => s.name.toLowerCase() === queryLower || normalizeSuburbText(s.name) === normQuery
      );

      // 2. Exact postcode match
      if (!target) {
        target = mapModel.suburbs.find((s) => s.postcode === raw);
      }

      // 3. Unique prefix match or highlighted suggestion
      if (!target) {
        const prefixMatches = mapModel.suburbs.filter(
          (s) =>
            s.name.toLowerCase().startsWith(queryLower) ||
            normalizeSuburbText(s.name).startsWith(normQuery)
        );
        if (prefixMatches.length === 1) {
          target = prefixMatches[0];
        } else if (suggestions.length > 0 && selectedIndex < suggestions.length) {
          target = suggestions[selectedIndex];
        }
      }
    }

    if (target) {
      onMoveToSuburb(target.id);
      setInputValue('');
      setSelectedIndex(0);
      setIsFocused(false);
    } else {
      const rawQuery = inputValue.trim();
      if (rawQuery) {
        onInvalidGuess?.(rawQuery);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[selectedIndex]) {
        handleSubmit(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, suggestions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % Math.max(1, suggestions.length));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
    }
  };

  return (
    <aside
      id="game-controls-sidebar"
      className="w-full md:w-72 lg:w-80 bg-white border-b md:border-b-0 md:border-r border-neutral-200 p-4 sm:p-5 lg:p-6 flex flex-col justify-between shrink-0 shadow-xs z-20 text-neutral-900 transition-all duration-200 select-none overflow-y-auto max-h-[45vh] md:max-h-full"
    >
      <div className="flex flex-col gap-5">
        {/* Mobile Header Toggle Bar */}
        <div className="flex md:hidden items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <span>Turns: {turnsFormatted}</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">{currentSuburb?.name}</span>
          </div>
          <button
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className="p-1 text-neutral-500 hover:text-neutral-900 text-xs flex items-center gap-1 font-semibold"
          >
            <span>{isMobileExpanded ? 'Hide Path' : 'Show Path'}</span>
            {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 1. Game Status Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Game Status</h2>
            <div className="flex items-center gap-1.5">
              {onUndoLastMove && gameState.path.length > 1 && gameState.status === 'playing' && (
                <button
                  id="undo-move-btn"
                  onClick={onUndoLastMove}
                  title="Undo last step"
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded transition-colors"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}
              {gameState.status === 'playing' && onGiveUp && (
                <button
                  id="give-up-btn"
                  onClick={onGiveUp}
                  title="Give up on this puzzle"
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition-colors"
                >
                  <Flag className="w-3 h-3 text-rose-500" />
                  <span>Give Up</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80">
            <div className="flex justify-between items-end">
              <span className="text-xs sm:text-sm text-neutral-500 font-medium">Turns Remaining</span>
              <span
                className={`text-xl sm:text-2xl font-mono font-bold ${
                  turnsLeft <= 2 ? 'text-red-600 animate-pulse' : 'text-neutral-900'
                }`}
              >
                {turnsFormatted}
              </span>
            </div>

            {/* Linear Progress Bar */}
            <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-neutral-900 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-0.5">
              <span>Target Distance</span>
              <span className="font-bold text-blue-600 font-mono">
                {stepsRemaining === 0 ? 'Arrived!' : `${stepsRemaining} steps away`}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-neutral-500 pt-1.5 border-t border-neutral-200/60">
              <span>Difficulty</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border ${
                  gameState.difficulty === 'Easy'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : gameState.difficulty === 'Medium'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}
              >
                {gameState.difficulty} ({gameState.bestPathDistance} min steps)
              </span>
            </div>
          </div>
        </div>

        {/* Error message alert banner if invalid move attempted */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs animate-shake">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-medium leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* 2. Current Path Timeline */}
        <div className={`${isMobileExpanded ? 'block' : 'hidden md:block'}`}>
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Current Path</h2>
          <div className="space-y-2.5 max-h-48 md:max-h-64 overflow-y-auto pr-1">
            {/* Start Node */}
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full border-2 border-red-500 flex items-center justify-center text-[10px] font-bold text-red-500 shrink-0">
                S
              </div>
              <span className="text-xs sm:text-sm font-semibold text-neutral-900">{startSuburb?.name}</span>
            </div>

            {/* Stepped Traversed Path */}
            {pathSuburbs.length > 1 && (
              <div className="ml-3 border-l-2 border-emerald-500 pl-5 py-1 space-y-2">
                {pathSuburbs.slice(1).map((suburb, idx) => {
                  const isLast = idx === pathSuburbs.length - 2;
                  return (
                    <div
                      key={suburb.id}
                      className={`flex items-center justify-between text-xs sm:text-sm ${
                        isLast ? 'font-bold text-emerald-600' : 'text-neutral-700 font-medium'
                      }`}
                    >
                      <span className="truncate">{suburb.name}</span>
                      {isLast && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Target Destination Node */}
            <div
              className={`flex items-center gap-3 transition-opacity ${
                gameState.status === 'won' ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">
                T
              </div>
              <span className="text-xs sm:text-sm font-semibold text-neutral-900">{targetSuburb?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Input & Submit Move Section (Bottom of Sidebar) */}
      <div className="mt-4 pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
        {/* Neighbor Hint after 2 consecutive incorrect guesses */}
        {consecutiveErrors >= 2 && gameState.status === 'playing' && currentSuburb && (
          <div
            id="neighbor-hint-banner"
            className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-amber-950 text-xs shadow-xs space-y-1.5 animate-fadeIn"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Neighbor Hint (2 failed guesses)</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-snug">
              Bordering suburbs of <strong>{currentSuburb.name}</strong>:
            </p>
            <div className="flex flex-wrap gap-1 pt-0.5 max-h-28 overflow-y-auto">
              {neighboringSuburbs.map((n) => (
                <span
                  key={n.id}
                  className="px-2 py-0.5 bg-white border border-amber-200 text-amber-900 rounded text-[10.5px] font-medium shadow-2xs select-text"
                >
                  {n.name}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-amber-700/90 italic pt-0.5">
              Type any of these neighboring suburbs below to advance. This hint only applies to this step.
            </p>
          </div>
        )}

        {/* Autocomplete Input */}
        <div className="relative">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
            </div>
            <input
              ref={inputRef}
              id="suburb-name-input"
              type="text"
              autoComplete="off"
              spellCheck="false"
              disabled={gameState.status !== 'playing'}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setSelectedIndex(0);
                setIsFocused(true);
              }}
              onFocus={() => {
                setIsFocused(true);
                // Ensure visible within scrollable sidebar
                inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }}
              onClick={() => setIsFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  setIsFocused(false);
                }, 250);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                gameState.status === 'playing'
                  ? 'Type adjacent suburb name...'
                  : 'Game ended'
              }
              className="w-full pl-8 pr-16 py-2.5 bg-neutral-50 border border-neutral-300 focus:border-neutral-900 focus:bg-white rounded-lg text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-all shadow-2xs"
            />
            <button
              id="submit-suburb-btn"
              disabled={gameState.status !== 'playing' || !inputValue.trim()}
              onClick={() => handleSubmit()}
              className="absolute inset-y-1 right-1 px-2.5 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <span>Go</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div
              id="suburb-suggestions-dropdown"
              onMouseDown={(e) => e.preventDefault()}
              className="absolute bottom-full mb-1.5 left-0 right-0 max-h-56 overflow-y-auto bg-white border border-neutral-200 rounded-lg shadow-2xl z-50 divide-y divide-neutral-100"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-50 flex items-center justify-between sticky top-0 z-10 border-b border-neutral-100">
                <span>Matching Suburbs ({suggestions.length})</span>
                <span>Enter to select</span>
              </div>
              {suggestions.map((suburb, idx) => (
                <button
                  key={suburb.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSubmit(suburb);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-2.5 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    idx === selectedIndex
                      ? 'bg-neutral-900 text-white font-semibold'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="truncate">{suburb.name}</span>
                  <span
                    className={`text-[10px] font-mono ml-2 shrink-0 ${
                      idx === selectedIndex ? 'text-neutral-300' : 'text-neutral-400'
                    }`}
                  >
                    {suburb.postcode}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Primary Submit Button */}
        <button
          onClick={() => {
            if (inputValue.trim()) {
              handleSubmit();
            } else if (suggestions[0]) {
              handleSubmit(suggestions[0]);
            }
          }}
          disabled={gameState.status !== 'playing'}
          className="w-full bg-black text-white py-2.5 rounded-lg font-bold text-xs sm:text-sm hover:bg-neutral-800 active:scale-95 transition-transform disabled:opacity-40"
        >
          SUBMIT MOVE
        </button>

        {/* Secondary Give Up Option */}
        {gameState.status === 'playing' && onGiveUp && (
          <button
            id="give-up-bottom-btn"
            type="button"
            onClick={onGiveUp}
            className="w-full text-[11px] font-semibold text-neutral-500 hover:text-rose-600 py-0.5 flex items-center justify-center gap-1 transition-colors"
          >
            <Flag className="w-3 h-3 text-rose-500" />
            <span>Give up on this puzzle</span>
          </button>
        )}

        <p className="text-[10px] text-center text-neutral-400">
          All path suburbs must be entered via typing.
        </p>
      </div>
    </aside>
  );
};
