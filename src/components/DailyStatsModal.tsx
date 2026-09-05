import React, { useState } from 'react';
import {
  X,
  Calendar,
  Flame,
  Trophy,
  Share2,
  Check,
  CheckCircle2,
  XCircle,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  DailyStats,
  StoredDailyResult,
  formatDisplayDate,
  generateDailyShareText,
  encodeRouteShareCode,
  decodeRouteShareCode,
  DecodedFriendRoute,
  getTodayDateString,
  getDailyChallengeNumber,
} from '../utils/dailyChallenge';

interface DailyStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DailyStats;
  mapModel: MelbourneMapModel;
  onPlayDaily: () => void;
  onLoadFriendPath?: (path: string[]) => void;
}

export const DailyStatsModal: React.FC<DailyStatsModalProps> = ({
  isOpen,
  onClose,
  stats,
  mapModel,
  onPlayDaily,
  onLoadFriendPath,
}) => {
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [friendRoute, setFriendRoute] = useState<DecodedFriendRoute | null>(null);
  const [friendError, setFriendError] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = getTodayDateString();
  const todayResult = stats.history[todayStr];
  const winRate = stats.played > 0 ? Math.round((stats.won / stats.played) * 100) : 0;
  const challengeNumber = getDailyChallengeNumber(todayStr);

  const handleShare = () => {
    if (!todayResult) return;
    const text = generateDailyShareText(todayResult, mapModel);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyCode = () => {
    if (!todayResult) return;
    const code = encodeRouteShareCode(todayResult);
    navigator.clipboard.writeText(code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    });
  };

  const handleCompareFriend = () => {
    setFriendError(null);
    if (!friendInput.trim()) return;

    const decoded = decodeRouteShareCode(friendInput);
    if (!decoded) {
      setFriendError('Invalid route code format. Ask your friend to click "Copy Route Code".');
      return;
    }

    if (decoded.dateStr !== todayStr) {
      setFriendError(`This code is from ${formatDisplayDate(decoded.dateStr)}, not today's challenge.`);
      return;
    }

    setFriendRoute(decoded);
    if (onLoadFriendPath) {
      onLoadFriendPath(decoded.path);
    }
  };

  return (
    <div
      id="daily-stats-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in select-none text-neutral-900"
    >
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-2xl max-w-lg w-full p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900">
                  Daily Challenge #{challengeNumber}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                  Global Seed
                </span>
              </div>
              <p className="text-xs text-neutral-500">{formatDisplayDate(todayStr)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Challenge Guarantee Info Banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 leading-relaxed flex items-start gap-2.5">
          <Users className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Same start & target for everyone today!</strong> All players across the world receive the exact same puzzle generated from the date. Compare your path length and turn count against your friends.
          </div>
        </div>

        {/* Streak & Aggregate Statistics Grid */}
        <div className="grid grid-cols-4 gap-2 text-center bg-neutral-50 p-3 rounded-xl border border-neutral-200">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black font-mono text-neutral-900">{stats.played}</span>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Played</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-600">{winRate}%</span>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Win Rate</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black font-mono text-amber-600 flex items-center justify-center gap-0.5">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
              {stats.streak}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Streak</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-black font-mono text-indigo-600 flex items-center justify-center gap-0.5">
              <Trophy className="w-4 h-4 text-indigo-500" />
              {stats.maxStreak}
            </span>
            <span className="text-[10px] text-neutral-500 uppercase font-semibold">Max Streak</span>
          </div>
        </div>

        {/* Today's Result or Play Prompt */}
        {todayResult ? (
          <div className="flex flex-col gap-3 bg-neutral-50/80 border border-neutral-200 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {todayResult.status === 'won' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <span className="font-bold text-sm text-neutral-900">
                  {todayResult.status === 'won'
                    ? `Completed in ${todayResult.turnsUsed} turns!`
                    : 'Turn limit reached'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-500">
                Optimal: {todayResult.bestPathDistance} steps
              </span>
            </div>

            {/* Path Length & Turns Comparison Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-neutral-200 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Path Length</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold font-mono text-neutral-900">
                    {todayResult.path.length}
                  </span>
                  <span className="text-[11px] text-neutral-500">suburbs</span>
                </div>
                <div className="text-[10px] text-neutral-500 border-t border-neutral-100 pt-1 mt-0.5 flex justify-between">
                  <span>Optimal Route:</span>
                  <strong className="font-mono text-neutral-800">{todayResult.bestPathDistance + 1} suburbs</strong>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-neutral-200 flex flex-col gap-1">
                <span className="text-[10px] text-neutral-500 uppercase font-bold">Turn Count</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold font-mono text-emerald-600">
                    {todayResult.turnsUsed}
                  </span>
                  <span className="text-[11px] text-neutral-500">turns used</span>
                </div>
                <div className="text-[10px] text-neutral-500 border-t border-neutral-100 pt-1 mt-0.5 flex justify-between">
                  <span>Efficiency:</span>
                  <strong className="text-emerald-700">
                    {todayResult.turnsUsed === todayResult.bestPathDistance
                      ? '100% (Optimal)'
                      : `+${todayResult.turnsUsed - todayResult.bestPathDistance} turns`}
                  </strong>
                </div>
              </div>
            </div>

            {/* Visual Route Trail Comparison */}
            <div className="bg-white p-3 rounded-lg border border-neutral-200 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-neutral-400">Route Overview</span>
              <div className="text-xs flex flex-wrap items-center gap-1.5 leading-relaxed">
                {todayResult.path.map((id, index) => {
                  const sub = mapModel.suburbMap.get(id);
                  const isStart = index === 0;
                  const isEnd = index === todayResult.path.length - 1;
                  const isOptimal = todayResult.bestPath.includes(id);

                  return (
                    <React.Fragment key={id}>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                          isStart
                            ? 'bg-red-50 text-red-700 border-red-200 font-bold'
                            : isEnd
                            ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold'
                            : isOptimal
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                        }`}
                      >
                        {sub?.name || id}
                      </span>
                      {index < todayResult.path.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-neutral-300 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Sharing & Route Comparison Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={handleShare}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Copied Summary!' : 'Share Score / Wordle Style'}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="py-2 px-3 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copy route code so a friend can compare paths side by side"
              >
                {codeCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Compass className="w-4 h-4" />}
                <span>{codeCopied ? 'Code Copied!' : 'Copy Route Code'}</span>
              </button>
            </div>

            {/* Friend Route Comparison Tool */}
            <div className="border-t border-neutral-200/80 pt-3 mt-1 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-neutral-700 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-neutral-500" /> Compare with a Friend's Route
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                  placeholder="Paste friend's route code (MST-...)"
                  className="flex-1 text-xs px-2.5 py-1.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-white"
                />
                <button
                  onClick={handleCompareFriend}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Compare
                </button>
              </div>

              {friendError && (
                <p className="text-[11px] text-rose-600 leading-tight">{friendError}</p>
              )}

              {friendRoute && (
                <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 text-xs text-neutral-900 flex flex-col gap-1.5 animate-fade-in">
                  <div className="flex items-center justify-between font-semibold text-[11px] text-amber-900">
                    <span>Friend's Route Comparison</span>
                    <span>{friendRoute.turnsUsed} turns ({friendRoute.path.length} suburbs)</span>
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    {friendRoute.turnsUsed < todayResult.turnsUsed ? (
                      <span className="text-amber-700 font-medium">Your friend solved it in fewer turns ({friendRoute.turnsUsed} vs {todayResult.turnsUsed})!</span>
                    ) : friendRoute.turnsUsed > todayResult.turnsUsed ? (
                      <span className="text-emerald-700 font-medium">You solved it in fewer turns ({todayResult.turnsUsed} vs {friendRoute.turnsUsed})!</span>
                    ) : (
                      <span className="text-blue-700 font-medium">Tied! You both solved it in {todayResult.turnsUsed} turns.</span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    Friend's path: {friendRoute.path.map((id) => mapModel.suburbMap.get(id)?.name || id).join(' ➔ ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex flex-col items-center text-center gap-3">
            <Calendar className="w-8 h-8 text-amber-600" />
            <div>
              <h4 className="font-bold text-sm text-neutral-900">Daily Challenge Ready!</h4>
              <p className="text-xs text-neutral-600 max-w-xs mt-0.5">
                Take on today's universal Melbourne route. Solve it in minimal steps and share your path with friends!
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                onPlayDaily();
              }}
              className="py-2.5 px-6 rounded-lg bg-black hover:bg-neutral-800 text-white font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Play Today's Challenge</span>
            </button>
          </div>
        )}

        {/* Past History */}
        {Object.keys(stats.history).length > 1 && (
          <div className="flex flex-col gap-2 border-t border-neutral-100 pt-3">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Recent Challenges
            </span>
            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
              {(Object.values(stats.history) as StoredDailyResult[])
                .sort((a, b) => b.dateStr.localeCompare(a.dateStr))
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item.dateStr}
                    className="flex items-center justify-between text-xs p-2 bg-neutral-50 rounded-lg border border-neutral-100"
                  >
                    <span className="font-medium text-neutral-700">
                      #{item.challengeNumber} ({formatDisplayDate(item.dateStr)})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-neutral-600 text-[11px]">
                        {item.turnsUsed} turns / {item.path.length} suburbs
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'won'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.status === 'won' ? 'Won' : 'Lost'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-neutral-100">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
