/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  buildMelbourneMapModel,
  generateRandomGame,
  getDistancesFrom,
} from './utils/mapGeometry';
import { GameMode, GameState } from './types';
import { MapViewport } from './components/MapViewport';
import { GameControls } from './components/GameControls';
import { Header } from './components/Header';
import { GameResultModal } from './components/GameResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import {
  generateDailyChallenge,
  getTodayDateString,
} from './utils/dailyChallenge';
import {
  saveActiveGameState,
  loadActiveDailyState,
  loadActivePracticeState,
  loadLastMode,
} from './utils/gameStateStorage';

export default function App() {
  // Pre-calculate Melbourne geometry, Voronoi line polygons, and adjacency graph
  const mapModel = useMemo(() => buildMelbourneMapModel(), []);

  // Initialize game on load with full refresh persistence (preventing reset on tab refresh)
  const [gameState, setGameState] = useState<GameState>(() => {
    const lastMode = loadLastMode();
    const todayStr = getTodayDateString();

    if (lastMode === 'practice') {
      const savedPractice = loadActivePracticeState();
      if (
        savedPractice &&
        mapModel.suburbMap.has(savedPractice.startSuburbId) &&
        mapModel.suburbMap.has(savedPractice.targetSuburbId)
      ) {
        return savedPractice;
      }
      const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency);
      const newPracticeState: GameState = {
        gameMode: 'practice',
        startSuburbId: generated.startSuburbId,
        targetSuburbId: generated.targetSuburbId,
        path: [generated.startSuburbId],
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
    const dailyGame = generateDailyChallenge(mapModel.suburbs, mapModel.adjacency, todayStr);

    // Check if player had an in-progress daily challenge for today
    const savedActiveDaily = loadActiveDailyState(todayStr);
    if (
      savedActiveDaily &&
      savedActiveDaily.startSuburbId === dailyGame.startSuburbId &&
      savedActiveDaily.targetSuburbId === dailyGame.targetSuburbId
    ) {
      return savedActiveDaily;
    }

    const freshDailyState: GameState = {
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
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [showBestPathOverlay, setShowBestPathOverlay] = useState(false);

  // Automatically persist every state change to localStorage immediately
  useEffect(() => {
    saveActiveGameState(gameState);
  }, [gameState]);

  const handleMapClickDisabled = useCallback(() => {
    if (gameState.status !== 'playing') return;
    setErrorMessage('Please choose an available neighbour to advance your route.');
  }, [gameState.status]);

  const handleInvalidGuess = useCallback((query: string) => {
    setErrorMessage(`No Melbourne suburb found matching "${query}". Check your spelling.`);
    setConsecutiveErrors((prev) => prev + 1);
  }, []);

  // Distances to target for every suburb (used for tactical guidance & tooltips)
  const distancesToTarget = useMemo(() => {
    return getDistancesFrom(gameState.targetSuburbId, mapModel.adjacency);
  }, [gameState.targetSuburbId, mapModel.adjacency]);

  // Distances from current suburb to all other suburbs
  const currentSuburbId = gameState.path[gameState.path.length - 1];
  const distancesToCurrent = useMemo(() => {
    return getDistancesFrom(currentSuburbId, mapModel.adjacency);
  }, [currentSuburbId, mapModel.adjacency]);

  // When game completes (won or lost), open results
  useEffect(() => {
    if (gameState.status === 'won' || gameState.status === 'lost') {
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

    // Target suburb is an available neighbour! Automatically choose it and end the game.
    const targetSuburb = mapModel?.suburbMap.get(gameState.targetSuburbId);
    const targetName = targetSuburb?.name || 'Target';

    const timer = setTimeout(() => {
      setGameState((prev) => {
        if (prev.status !== 'playing') return prev;
        const currId = prev.path[prev.path.length - 1];
        const currSub = mapModel?.suburbMap.get(currId);
        if (!currSub || !currSub.neighbors.includes(prev.targetSuburbId)) return prev;

        const newTurnsUsed = prev.turnsUsed + 1;
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

      setErrorMessage(`Destination reached! Automatically connected into ${targetName}.`);
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

      const newTurnsUsed = gameState.turnsUsed + 1;
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
          setConsecutiveErrors(0);
        } else {
          setErrorMessage(
            `${distanceMsg}. Guess a bordering suburb of ${currentSuburb.name} to advance!`
          );
          setConsecutiveErrors((prev) => prev + 1);
        }

        const newGuessed = Array.from(new Set([...(gameState.guessedSuburbs || []), nextSuburbId]));
        const newHistory = [
          ...(gameState.turnHistory || []),
          { type: 'guess' as const, suburbId: nextSuburbId, prevConsecutiveErrors: consecutiveErrors },
        ];

        setGameState((prev) => ({
          ...prev,
          turnsUsed: newTurnsUsed,
          status: isTurnLimitReached ? 'lost' : prev.status,
          guessedSuburbs: newGuessed,
          turnHistory: newHistory,
        }));
        return;
      }

      // 4. Valid tactical move! Reset consecutive errors so hint clears for the next step
      setErrorMessage(null);
      setConsecutiveErrors(0);

      const newPath = [...gameState.path, nextSuburbId];
      const newRouteHistory = [
        ...(gameState.routeHistory || [{ suburbId: gameState.startSuburbId, backtracked: false }]),
        { suburbId: nextSuburbId, backtracked: false },
      ];
      const newHistory = [
        ...(gameState.turnHistory || []),
        { type: 'step' as const, suburbId: nextSuburbId, prevConsecutiveErrors: consecutiveErrors },
      ];

      // Check win condition
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
      const newRouteHistory = [...currentRoute].reverse().map((step) => {
        if (!marked && !step.backtracked && step.suburbId === backtrackedSuburbId) {
          marked = true;
          return { ...step, backtracked: true };
        }
        return step;
      }).reverse();

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
        // DO NOT return any turns used!
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
    setGameState((prev) => ({
      ...prev,
      status: 'lost',
      gaveUp: true,
    }));
    setShowBestPathOverlay(true);
    setIsResultModalOpen(true);
  }, [gameState.status]);

  // Mode switcher (Daily vs Practice)
  const handleSelectMode = useCallback(
    (mode: GameMode) => {
      if (mode === 'daily') {
        const todayStr = getTodayDateString();
        const dailyGame = generateDailyChallenge(mapModel.suburbs, mapModel.adjacency, todayStr);

        // Restore active in-progress daily challenge if available
        const savedActiveDaily = loadActiveDailyState(todayStr);
        if (
          savedActiveDaily &&
          savedActiveDaily.startSuburbId === dailyGame.startSuburbId &&
          savedActiveDaily.targetSuburbId === dailyGame.targetSuburbId
        ) {
          setGameState(savedActiveDaily);
          setIsResultModalOpen(savedActiveDaily.status !== 'playing');
          setShowBestPathOverlay(savedActiveDaily.status !== 'playing');
        } else {
          const freshState: GameState = {
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
          setGameState(freshState);
          setIsResultModalOpen(false);
          setShowBestPathOverlay(false);
        }
      } else {
        // Practice mode: restore active in-progress game or create a new one
        const savedPractice = loadActivePracticeState();
        if (
          savedPractice &&
          mapModel.suburbMap.has(savedPractice.startSuburbId) &&
          mapModel.suburbMap.has(savedPractice.targetSuburbId)
        ) {
          setGameState(savedPractice);
          setIsResultModalOpen(savedPractice.status !== 'playing');
          setShowBestPathOverlay(savedPractice.status !== 'playing');
        } else {
          const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency);
          const freshPracticeState: GameState = {
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
          setIsResultModalOpen(false);
          setShowBestPathOverlay(false);
        }
      }

      setErrorMessage(null);
      setConsecutiveErrors(0);
    },
    [mapModel]
  );

  // Start new round / restart (Practice only; Daily cannot be restarted mid-game)
  const handleNewGame = useCallback(() => {
    if (gameState.gameMode === 'daily') {
      if (gameState.status !== 'playing') {
        setIsResultModalOpen(true);
      }
      return;
    }

    const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency);
    setGameState({
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
    });

    setErrorMessage(null);
    setConsecutiveErrors(0);
    setIsResultModalOpen(false);
    setShowBestPathOverlay(false);
  }, [mapModel, gameState.gameMode, gameState.status]);

  return (
    <div className="flex flex-col w-screen h-screen bg-neutral-50 text-neutral-900 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header
        gameState={gameState}
        mapModel={mapModel}
        onNewGame={handleNewGame}
        onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
        onOpenResultModal={() => setIsResultModalOpen(true)}
        showBestPath={showBestPathOverlay}
        onToggleBestPath={() => setShowBestPathOverlay((prev) => !prev)}
        onGiveUp={handleGiveUp}
        onSelectMode={handleSelectMode}
      />

      {/* Main Container with Sidebar and Map Viewport */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative min-h-0">
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
            onMoveToSuburb={handleMoveToSuburb}
            onMapClickDisabled={handleMapClickDisabled}
          />
        </section>
      </main>

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
    </div>
  );
}
