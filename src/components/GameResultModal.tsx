import React, { useEffect, useState } from 'react';
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
  BarChart2,
} from 'lucide-react';
import {
  formatDisplayDate,
  generateDailyShareText,
  getTodayDateString,
  StoredDailyResult,
} from '../utils/dailyChallenge';

interface GameResultModalProps {
  gameState: GameState;
  mapModel: MelbourneMapModel;
  isOpen: boolean;
  onClose: () => void;
  onNewRound: () => void;
  onToggleBestPathReview: () => void;
  showBestPath: boolean;
  onOpenDailyStats?: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  gameState,
  mapModel,
  isOpen,
  onClose,
  onNewRound,
  onToggleBestPathReview,
  onOpenDailyStats,
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

  if (!isOpen || (!isWon && !isLost)) return null;

  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const turnsUsed = gameState.turnsUsed;
  const optimalTurns = gameState.bestPathDistance;
  const isOptimal = turnsUsed === optimalTurns;
  const isDaily = gameState.gameMode === 'daily';

  const visitedSet = new Set(gameState.path);

  const handleShare = () => {
    const dailyResult: StoredDailyResult = {
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
      completedAt: new Date().toISOString(),
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
                Daily Challenge #{gameState.challengeNumber || 1} •{' '}
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
              ? `You gave up on this round. The shortest path is marked in orange below (excluding suburbs you identified correctly).`
              : `You reached the ${gameState.maxTurns}-turn limit before arriving at ${targetSuburb?.name}. Compare your moves against the optimal route below.`}
          </p>
        </div>

        {/* Path & Turn Comparison Cards */}
        <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-center">
          {/* Turn Count Comparison */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-neutral-500 font-medium">Turn Count</div>
            <div className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
              {turnsUsed} {turnsUsed === 1 ? 'Turn' : 'Turns'}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Optimal: <strong className="font-mono text-neutral-800">{optimalTurns} steps</strong>
            </div>
            {isWon && (
              <div className="text-[11px] mt-0.5">
                {isOptimal ? (
                  <span className="text-amber-700 font-semibold flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> 100% Optimal!
                  </span>
                ) : (
                  <span className="text-neutral-500">+{turnsUsed - optimalTurns} extra turns</span>
                )}
              </div>
            )}
          </div>

          {/* Path Length Comparison */}
          <div className="border-l border-neutral-200 flex flex-col items-center justify-center">
            <div className="text-xs text-neutral-500 font-medium">Path Length</div>
            <div className="text-2xl font-bold font-mono text-neutral-900 mt-0.5">
              {gameState.path.length} Suburbs
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Shortest Route: <strong className="font-mono text-neutral-800">{optimalTurns + 1} suburbs</strong>
            </div>
            <div className="text-[11px] text-neutral-500 mt-0.5">
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

        {/* Share & Compare Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-95"
            title="Copy formatted result with emoji trail to compare with friends"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Result Copied to Clipboard!' : 'Share & Compare Route'}</span>
          </button>

          {isDaily && onOpenDailyStats && (
            <button
              onClick={() => {
                onClose();
                onOpenDailyStats();
              }}
              className="py-2.5 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-1.5 border border-neutral-200 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-4 h-4 text-neutral-600" />
              <span>Daily Stats</span>
            </button>
          )}
        </div>

        {/* Path Comparison: Player's Path vs Optimal Best Path */}
        <div className="flex flex-col gap-3">
          {/* Best Path Section */}
          <div className="bg-orange-50/40 p-3.5 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                <span>Shortest Route ({optimalTurns} steps / {gameState.bestPath.length} suburbs):</span>
              </div>
              <span className="text-[10px] text-orange-700 font-medium">BFS Optimal</span>
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

          {/* Player's Actual Route */}
          <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 text-xs">
            <div className="text-xs font-bold text-neutral-700 mb-2">
              Your Route Taken ({turnsUsed} turns / {gameState.path.length} suburbs):
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs leading-relaxed">
              {gameState.path.map((id, index) => {
                const s = mapModel.suburbMap.get(id);
                const isOptimalSuburb = gameState.bestPath.includes(id);
                return (
                  <React.Fragment key={`user-${id}`}>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        index === 0
                          ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                          : index === gameState.path.length - 1 && isWon
                          ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                          : isOptimalSuburb
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-white text-neutral-700 border-neutral-200'
                      }`}
                    >
                      {s?.name || id}
                    </span>
                    {index < gameState.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-neutral-400 shrink-0" />
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
            <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
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
