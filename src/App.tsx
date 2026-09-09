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
      const newHistory = [
        ...(gameState.turnHistory || []),
        { type: 'step' as const, suburbId: nextSuburbId, prevConsecutiveErrors: consecutiveErrors },
      ];

      // Check win condition
      if (nextSuburbId === gameState.targetSuburbId) {
        setGameState((prev) => ({
          ...prev,
          path: newPath,
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
        turnsUsed: newTurnsUsed,
        turnHistory: newHistory,
      }));
    },
    [gameState, mapModel, distancesToCurrent, distancesToTarget, consecutiveErrors]
  );

  // Undo last move
  const handleUndoLastMove = useCallback(() => {
    if (gameState.status !== 'playing' || gameState.turnsUsed <= 0) return;

    setGameState((prev) => {
      const history = prev.turnHistory || [];
      if (history.length === 0) {
        if (prev.path.length <= 1) return prev;
        return {
          ...prev,
          path: prev.path.slice(0, -1),
          turnsUsed: Math.max(0, prev.turnsUsed - 1),
        };
      }

      const lastAction = history[history.length - 1];
      const newHistory = history.slice(0, -1);

      if (lastAction.type === 'branch' && lastAction.prevPath) {
        return {
          ...prev,
          path: lastAction.prevPath,
          turnHistory: newHistory,
        };
      }

      if (lastAction.type === 'step') {
        return {
          ...prev,
          path: prev.path.length > 1 ? prev.path.slice(0, -1) : prev.path,
          turnsUsed: Math.max(0, prev.turnsUsed - 1),
          turnHistory: newHistory,
        };
      } else {
        // Last turn was an off-path guess
        const newGuessed = (prev.guessedSuburbs || []).filter((id, i, arr) => {
          return !(id === lastAction.suburbId && i === arr.lastIndexOf(lastAction.suburbId));
        });
        return {
          ...prev,
          turnsUsed: Math.max(0, prev.turnsUsed - 1),
          guessedSuburbs: newGuessed,
          turnHistory: newHistory,
        };
      }
    });

    setErrorMessage(null);
    setConsecutiveErrors((prev) => Math.max(0, prev - 1));
  }, [gameState.status, gameState.turnsUsed]);

  // Continue from any suburb already visited in the path
  const handleSelectPathSuburb = useCallback(
    (suburbId: string) => {
      if (gameState.status !== 'playing') return;
      const targetIndex = gameState.path.indexOf(suburbId);
      if (targetIndex === -1 || targetIndex === gameState.path.length - 1) return;

      const targetSuburb = mapModel?.suburbMap.get(suburbId);

      setGameState((prev) => {
        const idx = prev.path.indexOf(suburbId);
        if (idx === -1 || idx === prev.path.length - 1) return prev;

        const newPath = prev.path.slice(0, idx + 1);
        const prunedSuburbs = prev.path.slice(idx + 1);

        // Do not remove suburbs already guessed.
        // Keep all existing guessed suburbs, and preserve pruned path suburbs in guessedSuburbs
        // so that all player explorations remain visible and active on the map!
        const newGuessedSuburbs = Array.from(
          new Set([...(prev.guessedSuburbs || []), ...prunedSuburbs])
        );

        // Record branch in turnHistory for undo capability without changing turnsUsed
        const newHistory = [
          ...(prev.turnHistory || []),
          {
            type: 'branch' as const,
            suburbId,
            prevConsecutiveErrors: consecutiveErrors,
            prevPath: prev.path,
          },
        ];

        return {
          ...prev,
          path: newPath,
          // CRUCIAL: Players should not be able to gain back turns!
          // turnsUsed is preserved and NOT reduced.
          turnsUsed: prev.turnsUsed,
          turnHistory: newHistory,
          guessedSuburbs: newGuessedSuburbs,
        };
      });

      setErrorMessage(
        targetSuburb
          ? `Continuing route from ${targetSuburb.name} (${targetIndex === 0 ? 'Start' : `Step #${targetIndex}`}).`
          : 'Continuing from selected step in path.'
      );
      setConsecutiveErrors(0);
    },
    [gameState.status, gameState.path, mapModel, consecutiveErrors]
  );

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
          onSelectPathSuburb={handleSelectPathSuburb}
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
            onSelectPathSuburb={handleSelectPathSuburb}
            onMoveToSuburb={handleMoveToSuburb}
            onMapClickDisabled={handleMapClickDisabled}
          />
        </section>
      </main>

      {/* Minimalist Footer (hidden on mobile phones to maximize map screen real-estate) */}
      <footer className="hidden md:flex h-9 sm:h-10 bg-neutral-900 text-neutral-400 text-[10px] items-center justify-between px-6 sm:px-8 uppercase tracking-widest font-bold shrink-0 select-none z-20">
        <div>COORD: -37.8136° S, 144.9631° E</div>
        <div className="hidden sm:block">SUBURBS: {mapModel.suburbs.length}</div>
        <div>
          {gameState.gameMode === 'daily'
            ? `DAILY • ${gameState.turnsUsed}/${gameState.maxTurns} TURNS`
            : `PRACTICE • ${gameState.turnsUsed}/${gameState.maxTurns} TURNS`}
        </div>
      </footer>

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
