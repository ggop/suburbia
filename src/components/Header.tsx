import React from 'react';
import { GameMode, GameState } from '../types';
import { MelbourneMapModel } from '../utils/mapGeometry';
import {
  HelpCircle,
  Trophy,
  Sparkles,
  RotateCcw,
  Flag,
  Calendar,
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
  onSelectMode: (mode: GameMode) => void;
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
  onSelectMode,
}) => {
  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const isGameOver = gameState.status !== 'playing';
  const isDaily = gameState.gameMode === 'daily';

  return (
    <header
      id="game-header"
      className="h-14 sm:h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-2.5 sm:px-5 z-30 shadow-xs shrink-0 select-none text-neutral-900 gap-2"
    >
      {/* Brand & Suburb Route Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-sm tracking-wider shrink-0 shadow-xs">
          S
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 flex items-center gap-1.5">
              <span>SUBURBIA</span>
            </h1>
            <span
              id="header-goal-badge"
              className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold tracking-wide uppercase border shrink-0 bg-neutral-100 text-neutral-700 border-neutral-200"
            >
              10 turns max
            </span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate max-w-[130px] xs:max-w-[200px] sm:max-w-md lg:hidden leading-tight">
            <span className="text-red-600 font-semibold">{startSuburb?.name || 'Start'}</span> ➔{' '}
            <span className="text-blue-600 font-semibold">{targetSuburb?.name || 'Target'}</span>
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-neutral-100 p-0.5 sm:p-1 rounded-lg border border-neutral-200 text-xs font-semibold shrink-0">
        <button
          onClick={() => onSelectMode('daily')}
          className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-xs ${
            isDaily
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
          title="Play today's universal daily challenge"
        >
          <Calendar className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isDaily ? 'text-amber-500' : 'text-neutral-400'}`} />
          <span>Daily</span>
        </button>

        <button
          onClick={() => onSelectMode('practice')}
          className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-xs ${
            !isDaily
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
          title="Play unlimited random practice puzzles"
        >
          <Dices className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${!isDaily ? 'text-indigo-500' : 'text-neutral-400'}`} />
          <span className="hidden xs:inline">Practice</span>
          <span className="xs:hidden">Free</span>
        </button>
      </div>

      {/* Center Route Status (Large desktop) */}
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
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Give up button during active game */}
        {!isGameOver && onGiveUp && (
          <button
            id="header-give-up-btn"
            onClick={onGiveUp}
            title="Give up and reveal shortest path"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
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
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showBestPath
                ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Optimal</span>
          </button>
        )}

        {/* View results modal button if game ended */}
        {isGameOver && (
          <button
            id="view-results-btn"
            onClick={onOpenResultModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200 flex items-center gap-1.5 transition-colors"
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
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5 text-neutral-500" />
          <span className="hidden sm:inline">Help</span>
        </button>

        {/* Practice Mode New Round OR Daily Switch */}
        {!isDaily ? (
          <button
            id="header-new-round-btn"
            onClick={onNewGame}
            title="Start a new practice puzzle with random suburbs"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold bg-black hover:bg-neutral-800 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Round</span>
            <span className="sm:hidden">New</span>
          </button>
        ) : isGameOver ? (
          <button
            id="header-practice-mode-btn"
            onClick={() => onSelectMode('practice')}
            title="Today's Daily is finished. Play unlimited Practice puzzles!"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-bold bg-black hover:bg-neutral-800 text-white transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Dices className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Play Practice</span>
            <span className="sm:hidden">Practice</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};
