import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import { Trophy, XCircle, ArrowRight, RotateCcw, Map, Sparkles, Check, BookOpen, Flag } from 'lucide-react';

interface GameResultModalProps {
  gameState: GameState;
  mapModel: MelbourneMapModel;
  isOpen: boolean;
  onClose: () => void;
  onNewRound: () => void;
  onToggleBestPathReview: () => void;
  showBestPath: boolean;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  gameState,
  mapModel,
  isOpen,
  onClose,
  onNewRound,
  onToggleBestPathReview,
}) => {
  const isWon = gameState.status === 'won';
  const isLost = gameState.status === 'lost';
  const gaveUp = Boolean(gameState.gaveUp);

  // Trigger confetti when won
  useEffect(() => {
    if (isWon && isOpen) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const timer = setTimeout(() => {
        confetti({
          particleCount: 60,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 60,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isWon, isOpen]);

  if (!isOpen || (!isWon && !isLost)) return null;

  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const turnsUsed = gameState.turnsUsed;
  const optimalTurns = gameState.bestPathDistance;
  const isOptimal = turnsUsed === optimalTurns;

  const visitedSet = new Set(gameState.path);

  return (
    <div
      id="game-result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-neutral-900 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header Icon & Title */}
        <div className="text-center flex flex-col items-center gap-2">
          {isWon ? (
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Trophy className="w-7 h-7 text-emerald-600 animate-bounce" />
            </div>
          ) : gaveUp ? (
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shadow-xs">
              <Flag className="w-7 h-7 text-orange-600" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
          )}

          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {isWon
              ? 'Target Suburb Reached!'
              : gaveUp
              ? 'Puzzle Forfeited'
              : 'Turn Limit Exceeded'}
          </h3>

          <p className="text-xs sm:text-sm text-neutral-500 max-w-md">
            {isWon
              ? `You navigated successfully from ${startSuburb?.name} to ${targetSuburb?.name} in ${turnsUsed} turns!`
              : gaveUp
              ? `You gave up on this round. The shortest path is marked in orange below (excluding suburbs you identified correctly).`
              : `You reached the ${gameState.maxTurns}-turn limit before arriving at ${targetSuburb?.name}. Compare your moves against the optimal route below.`}
          </p>
        </div>

        {/* Turn statistics card */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200 text-center">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Your Route</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
              {turnsUsed} {turnsUsed === 1 ? 'Turn' : 'Turns'}
            </div>
            {isWon && (
              <div className="text-[11px] text-neutral-500 mt-1">
                {isOptimal ? (
                  <span className="text-amber-700 font-semibold flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Optimal Route!
                  </span>
                ) : (
                  <span>+{turnsUsed - optimalTurns} extra turns taken</span>
                )}
              </div>
            )}
          </div>
          <div className="border-l border-neutral-200">
            <div className="text-xs text-neutral-500 font-medium">Optimal Shortest Path</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 mt-0.5">
              {optimalTurns} {optimalTurns === 1 ? 'Step' : 'Steps'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] uppercase border ${
                  gameState.difficulty === 'Easy'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : gameState.difficulty === 'Medium'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}
              >
                {gameState.difficulty} Difficulty
              </span>
            </div>
          </div>
        </div>

        {/* Path Comparison: Player's Path vs Optimal Best Path */}
        <div className="flex flex-col gap-3">
          {/* Best Path Section */}
          <div className="bg-orange-50/40 p-3.5 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-orange-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" /> Shortest Path ({gameState.bestPath.length - 1} steps):
              </span>
              <span className="text-[10px] text-orange-700 font-mono">Dijkstra Shortest</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {gameState.bestPath.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                const isStart = id === gameState.startSuburbId;
                const isTarget = id === gameState.targetSuburbId;
                const isIdentified = visitedSet.has(id);

                return (
                  <React.Fragment key={`best-${id}`}>
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        isStart
                          ? 'bg-red-100 text-red-800 border border-red-300 font-bold'
                          : isTarget
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 font-bold'
                          : isIdentified
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold'
                          : 'bg-orange-100 text-orange-900 border border-orange-400 font-semibold shadow-2xs'
                      }`}
                    >
                      {s?.name || id}
                    </span>
                    {index < gameState.bestPath.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-orange-400" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-neutral-500 mt-2.5 pt-2 border-t border-orange-200/60">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Identified by you
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Shortest path (Orange)
              </span>
            </div>
          </div>

          {/* User's Traversed Path */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <div className="text-xs font-semibold text-neutral-700 mb-2 flex items-center justify-between">
              <span>Your Green Path ({gameState.path.length - 1} turns):</span>
              {isWon && (
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5">
                  <Check className="w-3 h-3 text-emerald-600" /> Success
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs max-h-32 overflow-y-auto">
              {gameState.path.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                const isStart = id === gameState.startSuburbId;
                const isTarget = id === gameState.targetSuburbId;

                return (
                  <React.Fragment key={`user-${id}-${index}`}>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        isStart
                          ? 'bg-red-100 text-red-800 border border-red-200 font-bold'
                          : isTarget
                          ? 'bg-blue-100 text-blue-800 border border-blue-200 font-bold'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {s?.name || id}
                    </span>
                    {index < gameState.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Historical Facts Discovered Along Your Journey */}
          <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/90 text-xs">
            <div className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-700" />
              <span>Historical Facts from Your Journey:</span>
            </div>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
              {gameState.path.map((id) => {
                const s = mapModel.suburbMap.get(id);
                if (!s || !s.historicalFact) return null;
                return (
                  <div key={`fact-${id}`} className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-[11px] leading-relaxed">
                    <strong className="text-neutral-900 font-semibold mr-1">{s.name}:</strong>
                    <span className="text-neutral-700">{s.historicalFact}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons: Review on Map & Start New Round */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <button
            id="review-map-btn"
            onClick={() => {
              onToggleBestPathReview();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border border-neutral-200 transition-colors"
          >
            <Map className="w-4 h-4 text-neutral-600" />
            <span>Review on Map</span>
          </button>

          <button
            id="new-round-btn"
            onClick={onNewRound}
            className="flex-1 py-2.5 px-4 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Start New Round</span>
          </button>
        </div>
      </div>
    </div>
  );
};
