import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  Trophy,
  XCircle,
  ArrowRight,
  RotateCcw,
  Map,
  Sparkles,
  Check,
  BookOpen,
  Flag,
  Share2,
  Calendar,
  X,
  Mail,
  Coffee,
} from 'lucide-react';
import {
  formatDisplayDate,
  generateDailyShareText,
  getTodayDateString,
  DailyResultData,
} from '../utils/dailyChallenge';

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
  const [copied, setCopied] = useState(false);

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

  // Allow the Escape key to close the results popup on desktop
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Compute historical facts discovered along the journey
  const historicalFacts = useMemo(() => {
    const suburbsToCheck = (gameState.routeHistory && gameState.routeHistory.length > 0)
      ? gameState.routeHistory.map((step) => step.suburbId)
      : gameState.path;
    const seenIds = new Set<string>();
    const facts: { id: string; name: string; fact: string }[] = [];
    suburbsToCheck.forEach((id) => {
      if (seenIds.has(id)) return;
      seenIds.add(id);
      const s = mapModel.suburbMap.get(id);
      if (s && s.historicalFact) {
        facts.push({ id, name: s.name, fact: s.historicalFact });
      }
    });
    return facts;
  }, [gameState.routeHistory, gameState.path, mapModel.suburbMap]);

  // Route steps including backtracked choices
  const routeSteps = useMemo(() => {
    if (gameState.routeHistory && gameState.routeHistory.length > 0) {
      return gameState.routeHistory;
    }
    return gameState.path.map((id) => ({ suburbId: id, backtracked: false }));
  }, [gameState.routeHistory, gameState.path]);

  const backtrackedCount = useMemo(() => {
    return routeSteps.filter((s) => s.backtracked).length;
  }, [routeSteps]);

  if (!isOpen || (!isWon && !isLost)) return null;

  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const turnsUsed = gameState.turnsUsed;
  const optimalTurns = Math.max(1, gameState.bestPath.length - 2);
  const isOptimal = turnsUsed === optimalTurns;
  const isDaily = gameState.gameMode === 'daily';
  // Exclude start suburb from navigated suburb count
  const optimalSuburbsCount = Math.max(0, gameState.bestPath.length - 1);
  const navigatedSuburbsCount = Math.max(0, gameState.path.length - 1);

  const visitedSet = new Set(gameState.path);

  const handleShare = () => {
    const dailyResult: DailyResultData = {
      dateStr: gameState.dailyDate || getTodayDateString(),
      challengeNumber: gameState.challengeNumber || 1,
      status: isWon ? 'won' : 'lost',
      turnsUsed,
      maxTurns: gameState.maxTurns,
      path: gameState.path,
      bestPath: gameState.bestPath,
      bestPathDistance: optimalTurns,
      startSuburbId: gameState.startSuburbId,
      targetSuburbId: gameState.targetSuburbId,
    };

    const text = generateDailyShareText(dailyResult, mapModel, isDaily);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      id="game-result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in text-neutral-900 select-none cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white border border-neutral-200 rounded-2xl shadow-xl max-w-md w-full p-5 text-neutral-900 flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto cursor-default relative"
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          id="close-result-modal-btn"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Daily Challenge Banner */}
        {isDaily && (
          <div className="flex items-center justify-between text-[11px] font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 mr-6">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Daily Challenge • {formatDisplayDate(gameState.dailyDate || getTodayDateString())}</span>
            </span>
          </div>
        )}

        {/* Header Icon & Title */}
        <div className="text-center flex flex-col items-center gap-1.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-xs ${
              isWon
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                : gaveUp
                ? 'bg-amber-50 border border-amber-200 text-amber-600'
                : 'bg-rose-50 border border-rose-200 text-rose-600'
            }`}
          >
            {isWon ? (
              <Trophy className="w-5 h-5 text-emerald-600" />
            ) : gaveUp ? (
              <Flag className="w-5 h-5 text-amber-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
          </div>

          <h3 className="text-lg font-bold tracking-tight text-neutral-900">
            {isWon ? 'Target Reached!' : gaveUp ? 'Puzzle Forfeited' : 'Turn Limit Reached'}
          </h3>

          <p className="text-xs text-neutral-500 max-w-sm">
            {isWon
              ? `Navigated from ${startSuburb?.name} to ${targetSuburb?.name} in ${turnsUsed} turns.`
              : gaveUp
              ? `You forfeited this round. Compare your moves against the optimal route below.`
              : `You ran out of turns before reaching ${targetSuburb?.name}. Compare your moves against the optimal route below.`}
          </p>
        </div>

        {/* Action Buttons: Review on Map, New Puzzle & Share (Moved higher up) */}
        <div className="flex flex-col gap-2 pt-0.5">
          <div className="flex items-center gap-2">
            <button
              id="review-map-btn"
              onClick={() => {
                onToggleBestPathReview();
                onClose();
              }}
              className="flex-1 py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer active:scale-98"
            >
              <Map className="w-3.5 h-3.5 text-neutral-600" />
              <span>Review on Map</span>
            </button>

            {!isDaily && (
              <button
                id="new-round-btn"
                onClick={onNewRound}
                className="flex-1 py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Puzzle</span>
              </button>
            )}
          </div>

          {/* Share Result Button */}
          <button
            id="share-result-btn"
            onClick={handleShare}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors active:scale-98 cursor-pointer shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Share Result'}</span>
          </button>
        </div>

        {/* Route Comparison */}
        <div className="space-y-2.5 text-xs">
          {/* Optimal Route */}
          <div className="bg-violet-50/70 p-2.5 rounded-xl border border-violet-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-violet-900">
              <span className="flex items-center gap-1 text-violet-700">
                <Sparkles className="w-3 h-3 text-violet-600" />
                <span>Optimal Route</span>
              </span>
              <span className="text-[10px] font-mono text-violet-600">
                {optimalSuburbsCount} {optimalSuburbsCount === 1 ? 'suburb' : 'suburbs'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {gameState.bestPath.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                return (
                  <React.Fragment key={`opt-${id}`}>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-violet-200 font-medium text-violet-950 shadow-2xs">
                      {s?.name || id}
                    </span>
                    {index < gameState.bestPath.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-violet-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Your Route with Turns Used included */}
          <div className="bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
              <span className="flex items-center gap-1.5">
                <span>Your Route</span>
                <span className="text-[10.5px] font-normal text-neutral-500 font-mono">
                  ({navigatedSuburbsCount} {navigatedSuburbsCount === 1 ? 'suburb' : 'suburbs'}, {turnsUsed} {turnsUsed === 1 ? 'turn' : 'turns'})
                </span>
              </span>
              {backtrackedCount > 0 && (
                <span className="text-[10px] text-amber-700 font-normal bg-amber-100/70 px-1.5 py-0.5 rounded">
                  {backtrackedCount} backtracked
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1 text-[11px]">
              {routeSteps.map((step, index) => {
                const s = mapModel.suburbMap.get(step.suburbId);
                const isStart = index === 0;
                const isTargetReached = index === routeSteps.length - 1 && isWon && !step.backtracked;
                const isBacktracked = !!step.backtracked;

                return (
                  <React.Fragment key={`route-${step.suburbId}-${index}`}>
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 ${
                        isBacktracked
                          ? 'bg-amber-50 text-amber-900 border-amber-200 line-through decoration-amber-500 text-[10.5px]'
                          : isStart
                          ? 'bg-red-50 text-red-800 border-red-200 font-semibold'
                          : isTargetReached
                          ? 'bg-blue-50 text-blue-800 border-blue-200 font-semibold'
                          : 'bg-white text-neutral-800 border-neutral-200'
                      }`}
                    >
                      <span>{s?.name || step.suburbId}</span>
                    </span>
                    {index < routeSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-neutral-300 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Support & Author Feedback Note */}
          <div className="pt-2 border-t border-neutral-100 flex flex-col items-center gap-2">
            {/* Buy Me a Coffee Badge */}
            <a
              id="game-result-buy-me-coffee-btn"
              href="https://buymeacoffee.com/suburbia"
              target="_blank"
              rel="noopener noreferrer"
              title="Support Suburbia on Buy Me a Coffee"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFDD00] hover:bg-[#F2D200] text-neutral-900 text-xs font-bold shadow-xs border border-amber-400/60 transition-all hover:scale-102 active:scale-95 cursor-pointer"
            >
              <Coffee className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
              <span>Buy me a coffee</span>
            </a>

            <div
              id="game-result-contact-note"
              className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-400 text-center flex-wrap"
            >
              <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Have questions or feedback? Contact the author at</span>
              <a
                id="game-result-email-link"
                href="mailto:feedback@suburbia.dev"
                className="text-neutral-600 hover:text-neutral-900 font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                feedback@suburbia.dev
              </a>
            </div>
          </div>

          {/* Historical Facts Discovered Along Your Journey (Only shown if any exist) */}
          {historicalFacts.length > 0 && (
            <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/70 text-[11px] space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1 text-[11px]">
                <BookOpen className="w-3 h-3 text-amber-700" />
                <span>Historical Notes:</span>
              </div>
              <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {historicalFacts.map((item) => (
                  <div key={`fact-${item.id}`} className="bg-white/90 p-1.5 rounded border border-amber-200/50 text-[10.5px] leading-relaxed">
                    <strong className="text-neutral-900 font-semibold mr-1">{item.name}:</strong>
                    <span className="text-neutral-700">{item.fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
