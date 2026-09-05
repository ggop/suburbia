import React from 'react';
import { GameMode, GameState } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  HelpCircle,
  Trophy,
  Sparkles,
  RotateCcw,
  Flag,
  Compass,
  Calendar,
  Flame,
  Dices,
} from 'lucide-react';

interface HeaderProps {
  gameState: GameState;
  mapModel: MelbourneMapModel;
  onNewGame: () => void;
  onOpenHowToPlay: () => void;
  onOpenResultModal: () => void;
  showBestPath: boolean;
  onToggleBestPath: () => void;
  onGiveUp?: () => void;
  isNeighboursVisible?: boolean;
  onToggleNeighbours?: () => void;
  onSelectMode: (mode: GameMode) => void;
  onOpenDailyStats: () => void;
  dailyStreak: number;
}

export const Header: React.FC<HeaderProps> = ({
  gameState,
  mapModel,
  onNewGame,
  onOpenHowToPlay,
  onOpenResultModal,
  showBestPath,
  onToggleBestPath,
  onGiveUp,
  isNeighboursVisible = false,
  onToggleNeighbours,
  onSelectMode,
  onOpenDailyStats,
  dailyStreak,
}) => {
  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const isGameOver = gameState.status !== 'playing';
  const isDaily = gameState.gameMode === 'daily';

  return (
    <header
      id="game-header"
      className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-3 sm:px-6 z-30 shadow-xs shrink-0 select-none text-neutral-900"
    >
      {/* Brand & Suburb Route Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold text-sm shrink-0">
          M
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base tracking-tight text-neutral-900 flex items-center gap-1.5">
              <span>MELBOURNE TRAVERSE</span>
            </h1>
            <span
              id="header-difficulty-badge"
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                gameState.difficulty === 'Easy'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : gameState.difficulty === 'Medium'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {gameState.difficulty} ({gameState.bestPathDistance} steps)
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 truncate max-w-xs sm:max-w-md lg:hidden">
            <span className="text-red-600 font-semibold">{startSuburb?.name || 'Start'}</span> to{' '}
            <span className="text-blue-600 font-semibold">{targetSuburb?.name || 'Target'}</span> (≤ {gameState.maxTurns} turns)
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-semibold">
        <button
          onClick={() => onSelectMode('daily')}
          className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
            isDaily
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
          title="Play today's universal daily challenge"
        >
          <Calendar className={`w-3.5 h-3.5 ${isDaily ? 'text-amber-500' : 'text-neutral-400'}`} />
          <span>Daily</span>
          {dailyStreak > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-bold ml-0.5">
              <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              {dailyStreak}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectMode('practice')}
          className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
            !isDaily
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
          title="Play unlimited random practice puzzles"
        >
          <Dices className={`w-3.5 h-3.5 ${!isDaily ? 'text-indigo-500' : 'text-neutral-400'}`} />
          <span>Practice</span>
        </button>
      </div>

      {/* Center Route Status */}
      <div className="hidden xl:flex items-center gap-4 text-xs font-medium text-neutral-700">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
          <span>
            START: <strong className="text-neutral-900">{startSuburb?.name?.toUpperCase() || 'START'}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
          <span>
            TARGET: <strong className="text-neutral-900">{targetSuburb?.name?.toUpperCase() || 'TARGET'}</strong>
          </span>
        </div>
        <div className="text-neutral-400 font-normal">|</div>
        <div className="flex items-center gap-1.5 text-neutral-600">
          <span>Min Steps:</span>
          <strong className="text-neutral-900 font-mono">{gameState.bestPathDistance}</strong>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Daily Stats Button */}
        <button
          id="header-daily-stats-btn"
          onClick={onOpenDailyStats}
          title="Daily Challenge Statistics & Route Comparisons"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Daily Stats</span>
        </button>

        {/* Show Neighbours button during active game */}
        {!isGameOver && onToggleNeighbours && (
          <button
            id="header-toggle-neighbours-btn"
            onClick={onToggleNeighbours}
            title={isNeighboursVisible ? 'Hide neighbours of current step' : 'Show neighbours of current step'}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
              isNeighboursVisible
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Compass className={`w-3.5 h-3.5 ${isNeighboursVisible ? 'text-emerald-600' : 'text-neutral-500'}`} />
            <span className="hidden sm:inline">{isNeighboursVisible ? 'Hide Neighbours' : 'Show Neighbours'}</span>
            <span className="sm:hidden">{isNeighboursVisible ? 'Hide' : 'Hint'}</span>
          </button>
        )}

        {/* Give up button during active game */}
        {!isGameOver && onGiveUp && (
          <button
            id="header-give-up-btn"
            onClick={onGiveUp}
            title="Give up and reveal shortest path"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Give Up</span>
          </button>
        )}

        {/* Toggle Best Path button when game completed */}
        {isGameOver && (
          <button
            id="toggle-best-path-header-btn"
            onClick={onToggleBestPath}
            title="Toggle optimal path overlay on map"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showBestPath
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Optimal Path</span>
          </button>
        )}

        {/* View results modal button if game ended */}
        {isGameOver && (
          <button
            id="view-results-btn"
            onClick={onOpenResultModal}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200 flex items-center gap-1.5 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-neutral-700" />
            <span className="hidden sm:inline">Scorecard</span>
          </button>
        )}

        {/* How to Play button */}
        <button
          id="how-to-play-btn"
          onClick={onOpenHowToPlay}
          title="How to Play"
          className="p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-4 h-4 text-neutral-500" />
          <span className="hidden sm:inline">Help</span>
        </button>

        {/* New Round / Reset button */}
        <button
          id="header-new-round-btn"
          onClick={onNewGame}
          title={isDaily ? 'Restart today\'s daily challenge' : 'Start a new challenge with random suburbs'}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-black hover:bg-neutral-800 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isDaily ? 'Restart Daily' : 'New Round'}</span>
          <span className="sm:hidden">{isDaily ? 'Restart' : 'New'}</span>
        </button>
      </div>
    </header>
  );
};
