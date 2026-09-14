/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  buildCityMapModel,
  generateRandomGame,
  getDistancesFrom,
  CityMapModel,
  CITIES,
} from './utils/mapGeometry';
import { GameMode, GameState, CityId } from './types';
import { MapViewport } from './components/MapViewport';
import { GameControls } from './components/GameControls';
import { Header } from './components/Header';
import { GameResultModal } from './components/GameResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { FirstTimeVisitorModal } from './components/FirstTimeVisitorModal';
import { MobileLandscapeBlocker } from './components/MobileLandscapeBlocker';
import {
  generateDailyChallenge,
  getTodayDateString,
} from './utils/dailyChallenge';
import {
  saveActiveGameState,
  loadActiveDailyState,
  loadActivePracticeState,
  loadLastMode,
  loadSelectedCity,
  saveSelectedCity,
} from './utils/gameStateStorage';

function createInitialGameState(
  cityId: CityId,
  mode: GameMode,
  model: CityMapModel
): GameState {
  const todayStr = getTodayDateString();

  if (mode === 'practice') {
    const savedPractice = loadActivePracticeState(cityId);
    if (
      savedPractice &&
      model.suburbMap.has(savedPractice.startSuburbId) &&
      model.suburbMap.has(savedPractice.targetSuburbId)
    ) {
      return savedPractice;
    }
    const generated = generateRandomGame(model.suburbs, model.adjacency, cityId);
    const newPracticeState: GameState = {
      cityId,
      gameMode: 'practice',
      startSuburbId: generated.startSuburbId,
      targetSuburbId: generated.targetSuburbId,
      path: [generated.startSuburbId],
      routeHistory: [{ suburbId: generated.startSuburbId, backtracked: false }],
      turnsUsed: 0,
      maxTurns: generated.maxTurns,
      status: 'playing',
      bestPath: generated.bestPath,
      bestPathDistance: generated.bestPathDistance,
      guessedSuburbs: [],
      turnHistory: [],
    };
    saveActiveGameState(newPracticeState);
    return newPracticeState;
  }

  // Default to Daily Challenge
  const dailyGame = generateDailyChallenge(model.suburbs, model.adjacency, todayStr, cityId);

  // Check if player had an in-progress daily challenge for today in this city
  const savedActiveDaily = loadActiveDailyState(todayStr, cityId);
  if (
    savedActiveDaily &&
    savedActiveDaily.startSuburbId === dailyGame.startSuburbId &&
    savedActiveDaily.targetSuburbId === dailyGame.targetSuburbId
  ) {
    return savedActiveDaily;
  }

  const freshDailyState: GameState = {
    cityId,
    gameMode: 'daily',
    dailyDate: dailyGame.dateStr,
    challengeNumber: dailyGame.challengeNumber,
    startSuburbId: dailyGame.startSuburbId,
    targetSuburbId: dailyGame.targetSuburbId,
    path: [dailyGame.startSuburbId],
    routeHistory: [{ suburbId: dailyGame.startSuburbId, backtracked: false }],
    turnsUsed: 0,
    maxTurns: dailyGame.maxTurns,
    status: 'playing',
    bestPath: dailyGame.bestPath,
    bestPathDistance: dailyGame.bestPathDistance,
    guessedSuburbs: [],
    turnHistory: [],
  };
  saveActiveGameState(freshDailyState);
  return freshDailyState;
}

export default function App() {
  // Selected city/map (persisted across sessions)
  const [selectedCity, setSelectedCity] = useState<CityId>(() => {
    const loaded = loadSelectedCity();
    return CITIES[loaded]?.hidden ? 'melbourne' : loaded;
  });

  // Pre-calculate city geometry, Voronoi line polygons, and adjacency graph for selected city
  const mapModel = useMemo(() => buildCityMapModel(selectedCity), [selectedCity]);

  // Initialize game on load with full refresh persistence (preventing reset on tab refresh)
  const [gameState, setGameState] = useState<GameState>(() => {
    const lastMode = loadLastMode();
    const city = loadSelectedCity();
    const effectiveCity = CITIES[city]?.hidden ? 'melbourne' : city;
    const initialModel = buildCityMapModel(effectiveCity);
    return createInitialGameState(effectiveCity, lastMode, initialModel);
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [showBestPathOverlay, setShowBestPathOverlay] = useState(false);

  // Check if someone is visiting the game for the first time
  const [showFirstTimeOffer, setShowFirstTimeOffer] = useState<boolean>(() => {
    try {
      const hasVisited = localStorage.getItem('suburb_game_has_visited_v1');
      return !hasVisited;
    } catch {
      return false;
    }
  });

  const handleAcceptRulesOffer = useCallback(() => {
    try {
      localStorage.setItem('suburb_game_has_visited_v1', 'true');
    } catch {}
    setShowFirstTimeOffer(false);
    setIsHowToPlayOpen(true);
  }, []);

  const handleDeclineRulesOffer = useCallback(() => {
    try {
      localStorage.setItem('suburb_game_has_visited_v1', 'true');
    } catch {}
    setShowFirstTimeOffer(false);
  }, []);

  // Automatically persist every state change to localStorage immediately
  useEffect(() => {
    saveActiveGameState(gameState);
  }, [gameState]);

  const handleMapClickDisabled = useCallback(() => {
    if (gameState.status !== 'playing') return;
    setErrorMessage(
      'Map suburb selection is disabled. Please select from the "Available Neighbours" list to make your move.'
    );
  }, [gameState.status]);

  const handleInvalidGuess = useCallback(
    (query: string) => {
      setErrorMessage(`No ${mapModel.cityName} suburb found matching "${query}". Check your spelling.`);
      setConsecutiveErrors((prev) => prev + 1);
    },
    [mapModel.cityName]
  );

  // Distances to target for every suburb (used for tactical guidance & tooltips)
  const distancesToTarget = useMemo(() => {
    return getDistancesFrom(gameState.targetSuburbId, mapModel.adjacency);
  }, [gameState.targetSuburbId, mapModel.adjacency]);

  // Distances from current suburb to all other suburbs
  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const distancesToCurrent = useMemo(() => {
    return getDistancesFrom(currentSuburbId, mapModel.adjacency);
  }, [currentSuburbId, mapModel.adjacency]);

  // Track previous status and initial mount to avoid showing results popup on page load in a new tab
  const isInitialMountRef = useRef<boolean>(true);
  const prevStatusRef = useRef<GameState['status']>(gameState.status);

  // When game completes (won or lost) during active play, open results and clear any error/warning messages
  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
      setErrorMessage(null);
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      // On initial page load / new browser tab: do NOT load the results popup!
      if (gameState.status === 'won' || gameState.status === 'lost') {
        setShowBestPathOverlay(true);
      }
      return;
    }

    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = gameState.status;

    // Only auto-open result modal if transition occurred from playing to won/lost during active play
    if (prevStatus === 'playing' && (gameState.status === 'won' || gameState.status === 'lost')) {
      setIsResultModalOpen(true);
      setShowBestPathOverlay(true);
    }
  }, [gameState.status]);

  // If one of the available neighbours in the current turn is the target suburb,
  // automatically choose it and end the game.
  useEffect(() => {
    if (gameState.status !== 'playing') return;

    const currentId = gameState.path[gameState.path.length - 1];
    const currentSuburb = mapModel?.suburbMap.get(currentId);
    if (!currentSuburb) return;

    // Check if target is an available neighbour in the current turn (and not already in path)
    const isTargetAdjacent =
      currentSuburb.neighbors.includes(gameState.targetSuburbId) &&
      !gameState.path.includes(gameState.targetSuburbId);

    if (!isTargetAdjacent) return;

    // Target suburb is an available neighbour! Automatically connect it without counting target as an extra turn.
    const targetSuburb = mapModel?.suburbMap.get(gameState.targetSuburbId);
    const targetName = targetSuburb?.name || 'Target';

    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (prev.status !== 'playing') return prev;
        const currId = prev.path[prev.path.length - 1];
        const currSub = mapModel?.suburbMap.get(currId);
        if (!currSub || !currSub.neighbors.includes(prev.targetSuburbId)) return prev;

        // The turn to reach currSub already counted. Target does NOT count as an extra turn.
        const newTurnsUsed = prev.turnsUsed;
        const newPath = [...prev.path, prev.targetSuburbId];
        const newRouteHistory = [
          ...(prev.routeHistory || [{ suburbId: prev.startSuburbId, backtracked: false }]),
          { suburbId: prev.targetSuburbId, backtracked: false },
        ];
        const newHistory = [
          ...(prev.turnHistory || []),
          {
            type: 'step' as const,
            suburbId: prev.targetSuburbId,
            prevConsecutiveErrors: 0,
          },
        ];

        return {
          ...prev,
          path: newPath,
          routeHistory: newRouteHistory,
          turnsUsed: newTurnsUsed,
          status: 'won',
          turnHistory: newHistory,
        };
      });

      setErrorMessage(null);
    }, 400);

    return () => clearTimeout(timer);
  }, [gameState.status, gameState.path, gameState.targetSuburbId, mapModel]);

  // Core move execution
  const handleMoveToSuburb = useCallback(
    (nextSuburbId: string) => {
      if (gameState.status !== 'playing') return;

      const currentId = gameState.path[gameState.path.length - 1];
      const currentSuburb = mapModel.suburbMap.get(currentId);
      const nextSuburb = mapModel.suburbMap.get(nextSuburbId);
      const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

      if (!currentSuburb || !nextSuburb) return;

      // 1. Current position check
      if (nextSuburbId === currentId) {
        setErrorMessage(`You are currently in ${currentSuburb.name}. Choose an unvisited neighbouring suburb.`);
        return;
      }

      // 2. Suburb already present in path cannot be chosen
      if (gameState.path.includes(nextSuburbId)) {
        setErrorMessage(`${nextSuburb.name} is already in your path! You cannot choose a previously visited suburb.`);
        return;
      }

      // Check if clicking directly on the target from an adjacent suburb
      const isDirectTargetClick = nextSuburbId === gameState.targetSuburbId;
      // Moving to target from an adjacent suburb does not count as an extra turn
      const newTurnsUsed = isDirectTargetClick
        ? gameState.path.length <= 1
          ? 1
          : gameState.turnsUsed
        : gameState.turnsUsed + 1;
      const isTurnLimitReached = newTurnsUsed >= gameState.maxTurns;

      // 3. Check adjacency (Allow guessing anywhere on the map!)
      const isAdjacent = currentSuburb.neighbors.includes(nextSuburbId);
      if (!isAdjacent) {
        const distFromCurrent = distancesToCurrent.get(nextSuburbId) ?? -1;
        const distFromTarget = distancesToTarget.get(nextSuburbId) ?? -1;
        const isOnOptimalPath = gameState.bestPath.includes(nextSuburbId);

        let distanceMsg = '';
        if (distFromCurrent > 0) {
          distanceMsg = `${nextSuburb.name} is ${distFromCurrent} ${distFromCurrent === 1 ? 'step' : 'steps'} from ${currentSuburb.name}`;
        } else {
          distanceMsg = `${nextSuburb.name} does not directly connect to ${currentSuburb.name}`;
        }

        if (distFromTarget >= 0) {
          distanceMsg += ` and ${distFromTarget} ${distFromTarget === 1 ? 'step' : 'steps'} from ${targetSuburb?.name || 'target'}`;
        }

        if (isOnOptimalPath) {
          // Guess is on the optimal shortest route: shade green and reward player with positive feedback
          setErrorMessage(
            `${nextSuburb.name} is on the optimal route! Shaded green on map. Connect to it by guessing a bordering suburb of ${currentSuburb.name}.`
          );
        } else {
          setErrorMessage(
            `Not an available neighbour! ${distanceMsg}. Select an adjacent bordering suburb.`
          );
        }

        // Add to guessedSuburbs list
        const updatedGuessed = Array.from(new Set([...(gameState.guessedSuburbs || []), nextSuburbId]));
        const newHistory = [
          ...(gameState.turnHistory || []),
          {
            type: 'guess' as const,
            suburbId: nextSuburbId,
            prevConsecutiveErrors: consecutiveErrors,
          },
        ];

        // If turn limit reached through guessing
        if (isTurnLimitReached) {
          setGameState((prev) => ({
            ...prev,
            turnsUsed: newTurnsUsed,
            status: 'lost',
            guessedSuburbs: updatedGuessed,
            turnHistory: newHistory,
          }));
        } else {
          setGameState((prev) => ({
            ...prev,
            turnsUsed: newTurnsUsed,
            guessedSuburbs: updatedGuessed,
            turnHistory: newHistory,
          }));
        }

        setConsecutiveErrors((prev) => prev + 1);
        return;
      }

      // Valid move to an adjacent bordering suburb!
      setErrorMessage(null);
      setConsecutiveErrors(0);

      const newPath = [...gameState.path, nextSuburbId];
      const newRouteHistory = [
        ...(gameState.routeHistory || [{ suburbId: gameState.startSuburbId, backtracked: false }]),
        { suburbId: nextSuburbId, backtracked: false },
      ];
      const newHistory = [
        ...(gameState.turnHistory || []),
        {
          type: 'step' as const,
          suburbId: nextSuburbId,
          prevConsecutiveErrors: consecutiveErrors,
        },
      ];

      // Check win condition (landing on target directly)
      if (nextSuburbId === gameState.targetSuburbId) {
        setGameState((prev) => ({
          ...prev,
          path: newPath,
          routeHistory: newRouteHistory,
          turnsUsed: newTurnsUsed,
          status: 'won',
          turnHistory: newHistory,
        }));
        return;
      }

      // Check if this turn borders the target suburb
      const bordersTarget = nextSuburb.neighbors.includes(gameState.targetSuburbId);
      if (bordersTarget) {
        // Target is reached! Connect target to complete route without counting target as an extra turn.
        const newPathWithTarget = [...newPath, gameState.targetSuburbId];
        const newRouteWithTarget = [
          ...newRouteHistory,
          { suburbId: gameState.targetSuburbId, backtracked: false },
        ];
        const newTurnHistoryWithTarget = [
          ...newHistory,
          { type: 'step' as const, suburbId: gameState.targetSuburbId, prevConsecutiveErrors: 0 },
        ];

        setGameState((prev) => ({
          ...prev,
          path: newPathWithTarget,
          routeHistory: newRouteWithTarget,
          turnsUsed: newTurnsUsed,
          status: 'won',
          turnHistory: newTurnHistoryWithTarget,
        }));
        setErrorMessage(null);
        return;
      }

      // Check loss condition (exceeding turn limit)
      if (isTurnLimitReached) {
        setGameState((prev) => ({
          ...prev,
          path: newPath,
          routeHistory: newRouteHistory,
          turnsUsed: newTurnsUsed,
          status: 'lost',
          turnHistory: newHistory,
        }));
        return;
      }

      // Continue playing
      setGameState((prev) => ({
        ...prev,
        path: newPath,
        routeHistory: newRouteHistory,
        turnsUsed: newTurnsUsed,
        turnHistory: newHistory,
      }));
    },
    [gameState, mapModel, distancesToCurrent, distancesToTarget, consecutiveErrors]
  );

  // Undo last move: goes back one step, but DO NOT return any turns used.
  // The undone suburb is recorded in routeHistory as backtracked.
  const handleUndoLastMove = useCallback(() => {
    if (gameState.status !== 'playing' || gameState.path.length <= 1) return;

    setGameState((prev) => {
      if (prev.path.length <= 1 || prev.status !== 'playing') return prev;

      const backtrackedSuburbId = prev.path[prev.path.length - 1];
      const newPath = prev.path.slice(0, -1);

      // In routeHistory, mark the last non-backtracked occurrence as backtracked
      const currentRoute = prev.routeHistory || prev.path.map((id) => ({ suburbId: id, backtracked: false }));
      let marked = false;
      const newRouteHistory = [...currentRoute]
        .reverse()
        .map((step) => {
          if (!marked && !step.backtracked && step.suburbId === backtrackedSuburbId) {
            marked = true;
            return { ...step, backtracked: true };
          }
          return step;
        })
        .reverse();

      const newHistory = [
        ...(prev.turnHistory || []),
        {
          type: 'undo' as const,
          suburbId: backtrackedSuburbId,
          prevConsecutiveErrors: consecutiveErrors,
        },
      ];

      return {
        ...prev,
        path: newPath,
        routeHistory: newRouteHistory,
        turnsUsed: prev.turnsUsed,
        turnHistory: newHistory,
      };
    });

    setErrorMessage(null);
    setConsecutiveErrors(0);
  }, [gameState.status, gameState.path.length, consecutiveErrors]);

  // Give up on puzzle
  const handleGiveUp = useCallback(() => {
    if (gameState.status !== 'playing') return;
    setErrorMessage(null);
    setGameState((prev) => ({
      ...prev,
      status: 'lost',
      gaveUp: true,
    }));
    setShowBestPathOverlay(true);
    setIsResultModalOpen(true);
  }, [gameState.status]);

  // City Switcher (Melbourne vs. Adelaide)
  const handleSelectCity = useCallback(
    (newCity: CityId) => {
      if (newCity === selectedCity || CITIES[newCity]?.hidden) return;
      saveSelectedCity(newCity);
      setSelectedCity(newCity);
      setErrorMessage(null);
      setConsecutiveErrors(0);
      setShowBestPathOverlay(false);
      setIsResultModalOpen(false);

      const newModel = buildCityMapModel(newCity);
      const nextState = createInitialGameState(newCity, gameState.gameMode, newModel);
      prevStatusRef.current = nextState.status;
      if (nextState.status !== 'playing') {
        setShowBestPathOverlay(true);
      }
      setGameState(nextState);
    },
    [selectedCity, gameState.gameMode]
  );

  // Mode switcher (Daily vs Practice)
  const handleSelectMode = useCallback(
    (mode: GameMode) => {
      if (mode === gameState.gameMode) return;
      setErrorMessage(null);
      setConsecutiveErrors(0);
      setShowBestPathOverlay(false);
      setIsResultModalOpen(false);

      const nextState = createInitialGameState(selectedCity, mode, mapModel);
      prevStatusRef.current = nextState.status;
      if (nextState.status !== 'playing') {
        setShowBestPathOverlay(true);
      }
      setGameState(nextState);
    },
    [gameState.gameMode, selectedCity, mapModel]
  );

  // Start new round / restart (Practice only; Daily cannot be restarted mid-game)
  const handleNewGame = useCallback(() => {
    if (gameState.gameMode === 'daily') {
      if (gameState.status !== 'playing') {
        setIsResultModalOpen(true);
      }
      return;
    }

    const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency, selectedCity);
    const freshPracticeState: GameState = {
      cityId: selectedCity,
      gameMode: 'practice',
      startSuburbId: generated.startSuburbId,
      targetSuburbId: generated.targetSuburbId,
      path: [generated.startSuburbId],
      routeHistory: [{ suburbId: generated.startSuburbId, backtracked: false }],
      turnsUsed: 0,
      maxTurns: generated.maxTurns,
      status: 'playing',
      bestPath: generated.bestPath,
      bestPathDistance: generated.bestPathDistance,
      guessedSuburbs: [],
      turnHistory: [],
    };
    setGameState(freshPracticeState);
    saveActiveGameState(freshPracticeState);

    setErrorMessage(null);
    setConsecutiveErrors(0);
    setIsResultModalOpen(false);
    setShowBestPathOverlay(false);
  }, [mapModel, gameState.gameMode, gameState.status, selectedCity]);

  return (
    <div className="flex flex-col w-screen h-screen bg-neutral-50 text-neutral-900 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header
        gameState={gameState}
        mapModel={mapModel}
        selectedCity={selectedCity}
        onSelectCity={handleSelectCity}
        onNewGame={handleNewGame}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        onOpenResultModal={() => setIsResultModalOpen(true)}
        showBestPath={showBestPathOverlay}
        onToggleBestPath={() => setShowBestPathOverlay((prev) => !prev)}
        onGiveUp={handleGiveUp}
        onSelectMode={handleSelectMode}
      />

      {/* Main Container with Sidebar and Map Viewport */}
      <main id="main-app-content" className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
        {/* Sidebar Tactical Game Controls & Suburb Naming Panel */}
        <GameControls
          gameState={gameState}
          mapModel={mapModel}
          distancesToTarget={distancesToTarget}
          errorMessage={errorMessage}
          consecutiveErrors={consecutiveErrors}
          onMoveToSuburb={handleMoveToSuburb}
          onInvalidGuess={handleInvalidGuess}
          onUndoLastMove={handleUndoLastMove}
          onGiveUp={handleGiveUp}
          onResetGame={handleNewGame}
        />

        {/* Main Interactive Map Viewport (Touch Pan & Zoom) */}
        <section className="flex-1 relative w-full h-full min-h-0 bg-neutral-100 overflow-hidden pb-16 md:pb-0">
          <MapViewport
            mapModel={mapModel}
            gameState={gameState}
            distancesToTarget={distancesToTarget}
            distancesToCurrent={distancesToCurrent}
            showBestPathOverlay={showBestPathOverlay}
            onMapClickDisabled={handleMapClickDisabled}
          />
        </section>
      </main>

      {/* Mobile Landscape Orientation Blocker (Restricts mobile to portrait mode only) */}
      <MobileLandscapeBlocker />

      {/* Victory / Game Over Modal with Path Comparison */}
      <GameResultModal
        gameState={gameState}
        mapModel={mapModel}
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        onNewRound={handleNewGame}
        onToggleBestPathReview={() => setShowBestPathOverlay(true)}
        showBestPath={showBestPathOverlay}
      />

      {/* Rules and How to Play Guide Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* First-Time Visitor Rules Prompt Modal */}
      <FirstTimeVisitorModal
        isOpen={showFirstTimeOffer}
        onShowRules={handleAcceptRulesOffer}
        onSkip={handleDeclineRulesOffer}
      />
    </div>
  );
}
