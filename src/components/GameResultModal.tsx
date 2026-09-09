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
  const optimalTurns = gameState.bestPathDistance;
  const isOptimal = turnsUsed === optimalTurns;
  const isDaily = gameState.gameMode === 'daily';

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

    const text = generateDailyShareText(dailyResult, mapModel);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      id="game-result-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in text-neutral-900 select-none"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-neutral-900 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Daily Challenge Banner */}
        {isDaily && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center justify-between text-xs font-semibold text-amber-900">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              <span>
                Daily Challenge •{' '}
                {formatDisplayDate(gameState.dailyDate || getTodayDateString())}
              </span>
            </div>
            <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold uppercase">
              Global Seed
            </span>
          </div>
        )}

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
              ? `You gave up on this round. The optimal route is displayed below.`
              : `You reached the ${gameState.maxTurns}-turn limit before arriving at ${targetSuburb?.name}. Compare your moves against the optimal route below.`}
          </p>
        </div>

        {/* Turn & Route Summary Cards */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-center">
          {/* Turn Count */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-neutral-500 font-medium">Turns Used</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
              {turnsUsed} / {gameState.maxTurns}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Allowance: <strong className="font-mono text-neutral-800">{gameState.maxTurns} turns max</strong>
            </div>
          </div>

          {/* Suburbs in Final Path */}
          <div className="border-l border-neutral-200 flex flex-col items-center justify-center">
            <div className="text-xs text-neutral-500 font-medium">Final Path</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 mt-0.5">
              {gameState.path.length} Suburbs
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {backtrackedCount > 0 ? (
                <span className="text-amber-700 font-medium">{backtrackedCount} backtracked move{backtrackedCount === 1 ? '' : 's'}</span>
              ) : (
                <span className="text-neutral-600">Direct route</span>
              )}
            </div>
          </div>
        </div>

        {/* Share Button */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Copy formatted result with emoji trail to share"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Result Copied to Clipboard!' : 'Share Result'}</span>
          </button>
        </div>

        {/* Path Comparison: Player's Path vs Optimal Best Path */}
        <div className="flex flex-col gap-3">
          {/* Best Path Section */}
          <div className="bg-orange-50/40 p-3.5 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Optimal Route ({gameState.bestPath.length} suburbs):</span>
              </div>
              <span className="text-[10px] text-orange-700 font-medium">Shortest Path</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs leading-relaxed">
              {gameState.bestPath.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                const isUserFound = visitedSet.has(id);
                return (
                  <React.Fragment key={`opt-${id}`}>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1 ${
                        isUserFound
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                          : 'bg-white text-orange-800 border-orange-200'
                      }`}
                    >
                      {isUserFound && <Check className="w-3 h-3 text-emerald-600 shrink-0" />}
                      <span>{s?.name || id}</span>
                    </span>
                    {index < gameState.bestPath.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-orange-400 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Player's Actual Route (Including backtracked choices) */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-neutral-700">
                Your Route Taken ({turnsUsed} {turnsUsed === 1 ? 'turn' : 'turns'}):
              </div>
              {backtrackedCount > 0 && (
                <span className="text-[10px] text-amber-700 font-medium bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                  Includes backtracked suburbs
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs leading-relaxed">
              {routeSteps.map((step, index) => {
                const s = mapModel.suburbMap.get(step.suburbId);
                const isStart = index === 0;
                const isTargetReached = index === routeSteps.length - 1 && isWon && !step.backtracked;
                const isBacktracked = !!step.backtracked;

                return (
                  <React.Fragment key={`route-${step.suburbId}-${index}`}>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1.5 ${
                        isBacktracked
                          ? 'bg-amber-50/90 text-amber-900 border-amber-300 line-through decoration-amber-600'
                          : isStart
                          ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                          : isTargetReached
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                          : 'bg-white text-neutral-800 border-neutral-200'
                      }`}
                      title={isBacktracked ? `${s?.name || step.suburbId} (Backtracked)` : s?.name || step.suburbId}
                    >
                      <span>{s?.name || step.suburbId}</span>
                      {isBacktracked && (
                        <span className="no-underline text-[9px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.2 rounded">
                          backtracked
                        </span>
                      )}
                    </span>
                    {index < routeSteps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Historical Facts Discovered Along Your Journey (Only shown if any exist) */}
          {historicalFacts.length > 0 && (
            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/90 text-xs">
              <div className="font-bold text-amber-900 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span>Historical Facts from Your Journey:</span>
              </div>
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                {historicalFacts.map((item) => (
                  <div key={`fact-${item.id}`} className="bg-white/80 p-2 rounded-lg border border-amber-200/60 text-[11px] leading-relaxed">
                    <strong className="text-neutral-900 font-semibold mr-1">{item.name}:</strong>
                    <span className="text-neutral-700">{item.fact}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Review on Map & Start New Round */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100">
          <button
            id="review-map-btn"
            onClick={() => {
              onToggleBestPathReview();
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 border border-neutral-200 transition-colors cursor-pointer"
          >
            <Map className="w-4 h-4 text-neutral-600" />
            <span>Review on Map</span>
          </button>

          <button
            id="new-round-btn"
            onClick={onNewRound}
            className="flex-1 py-2.5 px-4 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isDaily ? 'Restart Daily' : 'Start New Round'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
