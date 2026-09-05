import React, { useMemo, useState } from 'react';
import { GameState, SuburbProjected } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  MapPin,
  AlertCircle,
  CornerUpLeft,
  Undo2,
  ChevronDown,
  ChevronUp,
  Flag,
  Compass,
  ArrowRight,
  Trophy,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface GameControlsProps {
  gameState: GameState;
  mapModel: MelbourneMapModel;
  distancesToTarget: Map<string, number>;
  errorMessage: string | null;
  consecutiveErrors?: number;
  isNeighboursVisible?: boolean;
  onToggleNeighbours?: (forceState?: boolean) => void;
  onMoveToSuburb: (suburbId: string) => void;
  onSelectPathSuburb?: (suburbId: string) => void;
  onUndoLastMove?: () => void;
  onGiveUp?: () => void;
  onResetGame: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  gameState,
  mapModel,
  distancesToTarget,
  errorMessage,
  onMoveToSuburb,
  onSelectPathSuburb,
  onUndoLastMove,
  onGiveUp,
  onResetGame,
}) => {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const currentSuburb = mapModel.suburbMap.get(currentSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);
  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);

  // Distance from current suburb to target
  const currentDistanceToTarget = distancesToTarget.get(currentSuburbId) ?? 0;

  // Neighbors of current suburb - shown at every turn for the player to choose from (alphabetical order, excluding suburbs already in path)
  const neighboringSuburbs = useMemo(() => {
    if (!currentSuburb) return [];
    const list = currentSuburb.neighbors
      .filter((id) => !gameState.path.includes(id))
      .map((id) => mapModel.suburbMap.get(id))
      .filter((s): s is SuburbProjected => Boolean(s));

    return list.sort((a, b) => {
      // Put target suburb first if it is adjacent
      if (a.id === gameState.targetSuburbId) return -1;
      if (b.id === gameState.targetSuburbId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [currentSuburb, mapModel.suburbMap, gameState.targetSuburbId, gameState.path]);

  // Check if target suburb is an available neighbour in the current turn
  const isTargetAdjacent = useMemo(() => {
    if (!currentSuburb || gameState.status !== 'playing') return false;
    return (
      currentSuburb.neighbors.includes(gameState.targetSuburbId) &&
      !gameState.path.includes(gameState.targetSuburbId)
    );
  }, [currentSuburb, gameState.status, gameState.targetSuburbId, gameState.path]);

  const stepsRemaining = currentDistanceToTarget;
  const turnsLeft = Math.max(0, gameState.maxTurns - gameState.turnsUsed);
  const turnsFormatted = `${String(turnsLeft).padStart(2, '0')}/${String(gameState.maxTurns).padStart(2, '0')}`;
  const progressPercent = Math.min(100, (gameState.turnsUsed / gameState.maxTurns) * 100);

  // Suburbs on current path
  const pathSuburbs = useMemo(() => {
    return gameState.path.map((id) => mapModel.suburbMap.get(id)!).filter(Boolean);
  }, [gameState.path, mapModel.suburbMap]);

  return (
    <aside
      id="game-controls-sidebar"
      className="w-full md:w-80 lg:w-88 bg-white border-b md:border-b-0 md:border-r border-neutral-200 p-4 sm:p-5 flex flex-col justify-between shrink-0 shadow-xs z-20 text-neutral-900 transition-all duration-200 select-none overflow-y-auto max-h-[50vh] md:max-h-full"
    >
      <div className="flex flex-col gap-4">
        {/* Mobile Header Bar */}
        <div className="flex md:hidden items-center justify-between border-b border-neutral-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
            <span>Turns: {turnsFormatted}</span>
            <span>•</span>
            <span className="text-emerald-600 font-bold">{currentSuburb?.name}</span>
          </div>
          <button
            onClick={() => setIsMobileExpanded((prev) => !prev)}
            className="p-1 text-neutral-500 hover:text-neutral-900 text-xs flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>{isMobileExpanded ? 'Hide Route' : 'Show Route'}</span>
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
                  className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
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
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  <Flag className="w-3 h-3 text-rose-500" />
                  <span>Give Up</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2.5 bg-neutral-50 p-3 rounded-xl border border-neutral-200/80">
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

        {/* Error message alert banner if invalid action attempted */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* 2. Current Path Section */}
        <div className={`flex flex-col gap-2 ${isMobileExpanded ? 'block' : 'hidden md:flex'}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              Current Path ({gameState.path.length})
            </span>
            {gameState.path.length > 1 && (
              <span className="text-[10px] text-neutral-400">Tap step to continue from it</span>
            )}
          </div>

          <div className="bg-neutral-50 rounded-xl border border-neutral-200/80 p-2 space-y-1 max-h-36 overflow-y-auto">
            {/* Start Node */}
            <div
              onClick={() => {
                if (gameState.status === 'playing' && gameState.path.length > 1) {
                  onSelectPathSuburb?.(gameState.startSuburbId);
                }
              }}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors group ${
                gameState.path.length > 1 ? 'hover:bg-neutral-100 cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  S
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-neutral-900 truncate">
                    {startSuburb?.name}
                  </span>
                  <span className="text-[9.5px] text-neutral-400">Starting suburb</span>
                </div>
              </div>

              {gameState.path.length > 1 && gameState.status === 'playing' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPathSuburb?.(gameState.startSuburbId);
                  }}
                  className="opacity-70 group-hover:opacity-100 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer"
                  title="Continue route from start suburb (turns used are preserved)"
                >
                  <CornerUpLeft className="w-3 h-3 text-emerald-600" />
                  <span>Continue</span>
                </button>
              )}
            </div>

            {/* Path Steps (from index 1 onward) */}
            {pathSuburbs.slice(1).map((suburb, idx) => {
              const stepNum = idx + 1;
              const isLast = idx === pathSuburbs.length - 2;
              const distToTarget = distancesToTarget.get(suburb.id) ?? -1;

              return (
                <div
                  key={`${suburb.id}-${stepNum}`}
                  onClick={() => {
                    if (!isLast && gameState.status === 'playing') {
                      onSelectPathSuburb?.(suburb.id);
                    }
                  }}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-colors group ${
                    isLast
                      ? 'bg-emerald-50/90 border border-emerald-200 font-semibold text-emerald-950'
                      : 'text-neutral-700 hover:bg-neutral-100 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isLast ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      #{stepNum}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs truncate">{suburb.name}</span>
                      {!isLast && distToTarget >= 0 && (
                        <span className="text-[9.5px] text-neutral-400 font-mono">
                          {distToTarget} {distToTarget === 1 ? 'step' : 'steps'} from target
                        </span>
                      )}
                    </div>
                  </div>

                  {isLast ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 shrink-0 ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span>Current</span>
                    </div>
                  ) : (
                    gameState.status === 'playing' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPathSuburb?.(suburb.id);
                        }}
                        className="opacity-70 group-hover:opacity-100 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer"
                        title={`Continue route from ${suburb.name}`}
                      >
                        <CornerUpLeft className="w-3 h-3 text-emerald-600" />
                        <span>Continue</span>
                      </button>
                    )
                  )}
                </div>
              );
            })}

            {/* Target Destination Preview */}
            <div
              className={`flex items-center gap-2 p-1.5 transition-opacity ${
                gameState.status === 'won' ? 'opacity-100' : 'opacity-40'
              }`}
            >
              <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center text-[10px] font-bold text-blue-500 shrink-0">
                T
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-neutral-900 truncate">
                  {targetSuburb?.name}
                </span>
                <span className="text-[9.5px] text-neutral-400">Target destination</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Available Neighbours Section (No typing - Choose one to continue) */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col gap-2.5">
        {gameState.status === 'playing' ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Available Neighbours
                </span>
              </div>
              {!isTargetAdjacent && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                  {neighboringSuburbs.length} available
                </span>
              )}
            </div>

            {isTargetAdjacent ? (
              <div className="p-3.5 rounded-xl bg-blue-50/90 border border-blue-300 flex items-center gap-3 animate-pulse shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Flag className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-blue-950 leading-tight">
                    Target Suburb Reached!
                  </span>
                  <span className="text-[11px] text-blue-700 leading-tight">
                    {targetSuburb?.name} borders your position. Completing route...
                  </span>
                </div>
              </div>
            ) : neighboringSuburbs.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <p className="text-xs font-bold">No unvisited neighbours available</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  All bordering suburbs are already in your path. Click an earlier suburb in your path above to branch and explore a different route.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[11px] text-neutral-500 leading-tight">
                  Bordering <strong className="text-neutral-900">{currentSuburb?.name}</strong>. Choose one to advance:
                </p>

                {/* List of Available Neighbour Cards */}
                <div
                  id="available-neighbours-list"
                  className="space-y-1.5 max-h-56 md:max-h-64 overflow-y-auto pr-1"
                >
                  {neighboringSuburbs.map((neighbour) => {
                    const isTarget = neighbour.id === gameState.targetSuburbId;

                    return (
                      <button
                        key={neighbour.id}
                        id={`neighbour-btn-${neighbour.id}`}
                        type="button"
                        onClick={() => onMoveToSuburb(neighbour.id)}
                        className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer group active:scale-[0.98] ${
                          isTarget
                            ? 'bg-blue-50/90 border-blue-400 hover:border-blue-600 hover:bg-blue-100 shadow-xs ring-2 ring-blue-400/30'
                            : 'bg-white border-neutral-200 hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              isTarget
                                ? 'bg-blue-600 text-white'
                                : 'bg-neutral-100 text-neutral-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors'
                            }`}
                          >
                            {isTarget ? (
                              <Flag className="w-3.5 h-3.5" />
                            ) : (
                              <MapPin className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span
                              className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                                isTarget ? 'text-blue-900' : 'text-neutral-900 group-hover:text-emerald-950'
                              }`}
                            >
                              {neighbour.name}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              {neighbour.postcode}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {isTarget ? (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-600 text-white flex items-center gap-1 shadow-xs animate-pulse">
                              <span>TARGET</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-medium text-neutral-400 group-hover:text-emerald-700 transition-colors">
                                Choose
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-neutral-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[10px] text-center text-neutral-400 pt-0.5">
                  Select a neighbour above to continue your route.
                </p>
              </>
            )}
          </>
        ) : (
          /* Game Finished State */
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-3 text-center">
            {gameState.status === 'won' ? (
              <div className="space-y-1.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-emerald-900">Destination Reached!</h3>
                <p className="text-xs text-neutral-600">
                  Completed in <strong className="text-neutral-900">{gameState.turnsUsed} turns</strong> (optimal was {gameState.bestPathDistance} steps).
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Flag className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-rose-900">Puzzle Ended</h3>
                <p className="text-xs text-neutral-600">
                  Optimal shortest route is shown in orange on the map.
                </p>
              </div>
            )}

            <button
              id="new-puzzle-btn"
              type="button"
              onClick={onResetGame}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 active:scale-95 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{gameState.gameMode === 'daily' ? 'View Daily Summary' : 'New Practice Puzzle'}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
