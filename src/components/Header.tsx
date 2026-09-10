import React, { useState, useRef, useEffect } from 'react';
import { GameMode, GameState, CityId } from '../types';
import { CityMapModel, CITIES } from '../utils/mapGeometry';
import {
  HelpCircle,
  Trophy,
  Sparkles,
  RotateCcw,
  Flag,
  Calendar,
  Dices,
  ChevronDown,
  Check,
  Coffee,
} from 'lucide-react';

interface HeaderProps {
  gameState: GameState;
  mapModel: CityMapModel;
  selectedCity: CityId;
  onSelectCity: (city: CityId) => void;
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
  selectedCity,
  onSelectCity,
  onNewGame,
  onOpenHowToPlay,
  onOpenResultModal,
  showBestPath,
  onToggleBestPath,
  onGiveUp,
  onSelectMode,
}) => {
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        cityDropdownRef.current &&
        !cityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCityDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCityDropdownOpen(false);
      }
    }
    if (isCityDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isCityDropdownOpen]);

  const startSuburb = mapModel.suburbMap.get(gameState.startSuburbId);
  const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

  const isGameOver = gameState.status !== 'playing';
  const isDaily = gameState.gameMode === 'daily';

  return (
    <header
      id="game-header"
      className="h-14 sm:h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-2.5 sm:px-4 md:px-5 z-30 shadow-xs shrink-0 select-none text-neutral-900 gap-2"
    >
      {/* Brand & Suburb Route Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-black rounded-lg flex items-center justify-center text-white font-black text-sm tracking-wider shrink-0 shadow-xs">
          S
        </div>
        <div className="min-w-0">
          <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-neutral-900 flex items-center gap-1.5">
            <span>SUBURBIA</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-neutral-500 truncate max-w-[110px] xs:max-w-[170px] sm:max-w-md lg:hidden leading-tight">
            <span className="text-red-600 font-semibold">{startSuburb?.name || 'Start'}</span> ➔{' '}
            <span className="text-blue-600 font-semibold">{targetSuburb?.name || 'Target'}</span>
          </p>
        </div>
      </div>

      {/* City / Map Dropdown Selector */}
      <div ref={cityDropdownRef} className="relative shrink-0" id="map-city-dropdown-container">
        <button
          id="city-dropdown-trigger"
          type="button"
          onClick={() => setIsCityDropdownOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isCityDropdownOpen}
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-neutral-100 hover:bg-neutral-200/90 border border-neutral-200 rounded-lg text-xs font-semibold text-neutral-900 transition-all cursor-pointer shadow-xs select-none"
          title="Select city map"
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              selectedCity === 'melbourne'
                ? 'bg-emerald-500'
                : selectedCity === 'adelaide'
                ? 'bg-sky-500'
                : 'bg-amber-500'
            }`}
          />
          <span className="font-bold">{CITIES[selectedCity]?.name || 'City'}</span>
          <span className="text-[10px] text-neutral-500 font-mono hidden xs:inline">
            ({CITIES[selectedCity]?.badge})
          </span>
          {CITIES[selectedCity]?.isBeta && (
            <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide">
              Beta
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${
              isCityDropdownOpen ? 'rotate-180 text-neutral-900' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu Popover */}
        {isCityDropdownOpen && (() => {
          const visibleCities = Object.values(CITIES).filter((city) => !city.hidden);
          return (
            <div
              id="city-dropdown-menu"
              role="listbox"
              aria-label="Available cities"
              className="absolute left-0 mt-1.5 w-60 sm:w-68 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 p-1.5"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 flex items-center justify-between">
                <span>Available Cities</span>
                <span className="font-mono text-neutral-400">{visibleCities.length} maps</span>
              </div>

              <div className="py-1 flex flex-col gap-0.5">
                {visibleCities.map((city) => {
                  const isSelected = selectedCity === city.id;
                  return (
                    <button
                      key={city.id}
                      id={`city-option-${city.id}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onSelectCity(city.id);
                        setIsCityDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-neutral-100 text-neutral-900 font-bold'
                          : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            city.id === 'melbourne'
                              ? 'bg-emerald-500'
                              : city.id === 'adelaide'
                              ? 'bg-sky-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-neutral-900">{city.name}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({city.badge})</span>
                            {city.isBeta && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wider">
                                Beta
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-neutral-500 font-normal">
                            {city.suburbCount} {city.id === 'chennai' ? 'wards' : 'suburbs'} • {city.state}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-semibold shrink-0">
        <button
          id="mode-daily-btn"
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
          id="mode-practice-btn"
          onClick={() => onSelectMode('practice')}
          className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer text-[11px] sm:text-xs ${
            !isDaily
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
          title="Play unlimited random practice puzzles"
        >
          <Dices className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${!isDaily ? 'text-indigo-500' : 'text-neutral-400'}`} />
          <span className="hidden sm:inline">Practice</span>
          <span className="sm:hidden">Free</span>
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
                ? 'bg-violet-50 text-violet-800 border-violet-300 shadow-xs'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${showBestPath ? 'text-violet-600' : 'text-neutral-500'}`} />
            <span className="hidden md:inline">Optimal</span>
          </button>
        )}

        {/* View results modal button if game ended */}
        {isGameOver && (
          <button
            id="view-results-btn"
            onClick={onOpenResultModal}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 hover:bg-neutral-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-neutral-700" />
            <span className="hidden sm:inline">Scorecard</span>
          </button>
        )}

        {/* Buy Me a Coffee Badge */}
        <a
          id="header-buy-me-coffee-btn"
          href="https://buymeacoffee.com/suburbia"
          target="_blank"
          rel="noopener noreferrer"
          title="Buy me a coffee"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-bold bg-[#FFDD00] hover:bg-[#F2D200] text-neutral-900 border border-amber-400/70 shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Coffee className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">Buy me a coffee</span>
          <span className="hidden sm:inline md:hidden whitespace-nowrap">Coffee</span>
        </a>

        {/* How to Play button */}
        <button
          id="how-to-play-btn"
          onClick={onOpenHowToPlay}
          title="How to Play"
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 transition-colors flex items-center gap-1 cursor-pointer"
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
