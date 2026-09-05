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
import { DailyStatsModal } from './components/DailyStatsModal';
import { sounds } from './utils/soundEffects';
import {
  generateDailyChallenge,
  getTodayDateString,
  loadDailyStats,
  saveDailyResult,
  StoredDailyResult,
  DailyStats,
} from './utils/dailyChallenge';

export default function App() {
  // Pre-calculate Melbourne geometry, Voronoi line polygons, and adjacency graph
  const mapModel = useMemo(() => buildMelbourneMapModel(), []);

  // Daily statistics and history from localStorage
  const [dailyStats, setDailyStats] = useState<DailyStats>(() => loadDailyStats());
  const [isDailyStatsOpen, setIsDailyStatsOpen] = useState(false);

  // Initialize game on first load (default to Daily Challenge)
  const [gameState, setGameState] = useState<GameState>(() => {
    const todayStr = getTodayDateString();
    const dailyGame = generateDailyChallenge(mapModel.suburbs, mapModel.adjacency, todayStr);
    const initialStats = loadDailyStats();
    const existing = initialStats.history[todayStr];

    if (existing) {
      return {
        gameMode: 'daily',
        dailyDate: dailyGame.dateStr,
        challengeNumber: dailyGame.challengeNumber,
        startSuburbId: dailyGame.startSuburbId,
        targetSuburbId: dailyGame.targetSuburbId,
        path: existing.path,
        turnsUsed: existing.turnsUsed,
        maxTurns: existing.maxTurns,
        status: existing.status,
        bestPath: dailyGame.bestPath,
        bestPathDistance: dailyGame.bestPathDistance,
        difficulty: dailyGame.difficulty,
        guessedSuburbs: [],
        turnHistory: [],
      };
    }

    return {
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
      difficulty: dailyGame.difficulty,
      guessedSuburbs: [],
      turnHistory: [],
    };
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [showNeighboursManual, setShowNeighboursManual] = useState<boolean | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [showBestPathOverlay, setShowBestPathOverlay] = useState(false);

  // Neighbours are displayed if toggled by button at any time OR automatically after two consecutive mistakes
  const isNeighboursVisible =
    (showNeighboursManual !== null ? showNeighboursManual : consecutiveErrors >= 2) &&
    gameState.status === 'playing';

  const handleToggleNeighbours = useCallback(
    (forceState?: boolean) => {
      setShowNeighboursManual((prev) => {
        if (typeof forceState === 'boolean') return forceState;
        const current = prev !== null ? prev : consecutiveErrors >= 2;
        return !current;
      });
    },
    [consecutiveErrors]
  );

  const handleMapClickDisabled = useCallback(() => {
    if (gameState.status !== 'playing') return;
    setErrorMessage('Please choose an available neighbour from the sidebar list to advance your route.');
    sounds.playError();
  }, [gameState.status]);

  const handleInvalidGuess = useCallback((query: string) => {
    setErrorMessage(`No Melbourne suburb found matching "${query}". Check your spelling.`);
    sounds.playError();
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

  // When game completes (won or lost), trigger sounds, open results, and record stats for Daily Challenge
  useEffect(() => {
    if (gameState.status === 'won') {
      sounds.playVictory();
      setIsResultModalOpen(true);
      setShowBestPathOverlay(true);

      if (gameState.gameMode === 'daily') {
        const stored: StoredDailyResult = {
          dateStr: gameState.dailyDate || getTodayDateString(),
          challengeNumber: gameState.challengeNumber || 1,
          status: 'won',
          turnsUsed: gameState.turnsUsed,
          maxTurns: gameState.maxTurns,
          path: gameState.path,
          bestPath: gameState.bestPath,
          bestPathDistance: gameState.bestPathDistance,
          startSuburbId: gameState.startSuburbId,
          targetSuburbId: gameState.targetSuburbId,
          completedAt: new Date().toISOString(),
        };
        const updated = saveDailyResult(stored);
        setDailyStats(updated);
      }
    } else if (gameState.status === 'lost') {
      sounds.playError();
      setIsResultModalOpen(true);
      setShowBestPathOverlay(true);

      if (gameState.gameMode === 'daily') {
        const stored: StoredDailyResult = {
          dateStr: gameState.dailyDate || getTodayDateString(),
          challengeNumber: gameState.challengeNumber || 1,
          status: 'lost',
          turnsUsed: gameState.turnsUsed,
          maxTurns: gameState.maxTurns,
          path: gameState.path,
          bestPath: gameState.bestPath,
          bestPathDistance: gameState.bestPathDistance,
          startSuburbId: gameState.startSuburbId,
          targetSuburbId: gameState.targetSuburbId,
          completedAt: new Date().toISOString(),
        };
        const updated = saveDailyResult(stored);
        setDailyStats(updated);
      }
    }
  }, [gameState.status]);

  // Core move execution
  const handleMoveToSuburb = useCallback(
    (nextSuburbId: string) => {
      if (gameState.status !== 'playing') return;

      const currentId = gameState.path[gameState.path.length - 1];
      const currentSuburb = mapModel.suburbMap.get(currentId);
      const nextSuburb = mapModel.suburbMap.get(nextSuburbId);
      const targetSuburb = mapModel.suburbMap.get(gameState.targetSuburbId);

      if (!currentSuburb || !nextSuburb) return;

      const newTurnsUsed = gameState.turnsUsed + 1;
      const isTurnLimitReached = newTurnsUsed >= gameState.maxTurns;

      // 1. Current position guess
      if (nextSuburbId === currentId) {
        setErrorMessage(`You are currently in ${currentSuburb.name}. Guess a neighboring suburb to advance.`);
        sounds.playError();
        setConsecutiveErrors((prev) => prev + 1);
        const newHistory = [
          ...(gameState.turnHistory || []),
          { type: 'guess' as const, suburbId: nextSuburbId, prevConsecutiveErrors: consecutiveErrors },
        ];
        setGameState((prev) => ({
          ...prev,
          turnsUsed: newTurnsUsed,
          status: isTurnLimitReached ? 'lost' : prev.status,
          turnHistory: newHistory,
        }));
        return;
      }

      // 2. Already in path
      if (gameState.path.includes(nextSuburbId)) {
        setErrorMessage(`You have already visited ${nextSuburb.name}! Guess an unvisited suburb.`);
        sounds.playError();
        setConsecutiveErrors((prev) => prev + 1);
        const newHistory = [
          ...(gameState.turnHistory || []),
          { type: 'guess' as const, suburbId: nextSuburbId, prevConsecutiveErrors: consecutiveErrors },
        ];
        setGameState((prev) => ({
          ...prev,
          turnsUsed: newTurnsUsed,
          status: isTurnLimitReached ? 'lost' : prev.status,
          turnHistory: newHistory,
        }));
        return;
      }

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
          sounds.playStep();
          setConsecutiveErrors(0);
        } else {
          setErrorMessage(
            `${distanceMsg}. Guess a bordering suburb of ${currentSuburb.name} to advance!`
          );
          sounds.playError();
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
      sounds.playStep();
      setErrorMessage(null);
      setConsecutiveErrors(0);
      setShowNeighboursManual(null);

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
    setShowNeighboursManual(null);
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

      sounds.playStep();
      setErrorMessage(
        targetSuburb
          ? `Continuing route from ${targetSuburb.name} (${targetIndex === 0 ? 'Start' : `Step #${targetIndex}`}).`
          : 'Continuing from selected step in path.'
      );
      setConsecutiveErrors(0);
      setShowNeighboursManual(null);
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
        const stats = loadDailyStats();
        const existing = stats.history[todayStr];

        if (existing) {
          setGameState({
            gameMode: 'daily',
            dailyDate: dailyGame.dateStr,
            challengeNumber: dailyGame.challengeNumber,
            startSuburbId: dailyGame.startSuburbId,
            targetSuburbId: dailyGame.targetSuburbId,
            path: existing.path,
            turnsUsed: existing.turnsUsed,
            maxTurns: existing.maxTurns,
            status: existing.status,
            bestPath: dailyGame.bestPath,
            bestPathDistance: dailyGame.bestPathDistance,
            difficulty: dailyGame.difficulty,
            guessedSuburbs: [],
            turnHistory: [],
          });
          setIsResultModalOpen(true);
          setShowBestPathOverlay(true);
        } else {
          setGameState({
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
            difficulty: dailyGame.difficulty,
            guessedSuburbs: [],
            turnHistory: [],
          });
          setIsResultModalOpen(false);
          setShowBestPathOverlay(false);
        }
      } else {
        // Practice mode
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
          difficulty: generated.difficulty,
          guessedSuburbs: [],
          turnHistory: [],
        });
        setIsResultModalOpen(false);
        setShowBestPathOverlay(false);
      }

      setErrorMessage(null);
      setConsecutiveErrors(0);
      setShowNeighboursManual(null);
    },
    [mapModel]
  );

  // Start new round / restart
  const handleNewGame = useCallback(() => {
    if (gameState.gameMode === 'daily') {
      const todayStr = getTodayDateString();
      const dailyGame = generateDailyChallenge(mapModel.suburbs, mapModel.adjacency, todayStr);
      setGameState({
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
        difficulty: dailyGame.difficulty,
        guessedSuburbs: [],
        turnHistory: [],
      });
    } else {
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
        difficulty: generated.difficulty,
        guessedSuburbs: [],
        turnHistory: [],
      });
    }

    setErrorMessage(null);
    setConsecutiveErrors(0);
    setShowNeighboursManual(null);
    setIsResultModalOpen(false);
    setShowBestPathOverlay(false);
  }, [mapModel, gameState.gameMode]);

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
        isNeighboursVisible={isNeighboursVisible}
        onToggleNeighbours={handleToggleNeighbours}
        onSelectMode={handleSelectMode}
        onOpenDailyStats={() => setIsDailyStatsOpen(true)}
        dailyStreak={dailyStats.streak}
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
          isNeighboursVisible={isNeighboursVisible}
          onToggleNeighbours={handleToggleNeighbours}
          onMoveToSuburb={handleMoveToSuburb}
          onSelectPathSuburb={handleSelectPathSuburb}
          onInvalidGuess={handleInvalidGuess}
          onUndoLastMove={handleUndoLastMove}
          onGiveUp={handleGiveUp}
          onResetGame={handleNewGame}
        />

        {/* Main Interactive Map Viewport (Touch Pan & Zoom) */}
        <section className="flex-1 relative w-full h-full min-h-0 bg-neutral-100 overflow-hidden">
          <MapViewport
            mapModel={mapModel}
            gameState={gameState}
            distancesToTarget={distancesToTarget}
            distancesToCurrent={distancesToCurrent}
            showBestPathOverlay={showBestPathOverlay}
            isNeighboursVisible={isNeighboursVisible}
            onToggleNeighbours={handleToggleNeighbours}
            onSelectPathSuburb={handleSelectPathSuburb}
            onMapClickDisabled={handleMapClickDisabled}
          />
        </section>
      </main>

      {/* Minimalist Footer matching Design HTML */}
      <footer className="h-9 sm:h-10 bg-neutral-900 text-neutral-400 text-[10px] flex items-center justify-between px-6 sm:px-8 uppercase tracking-widest font-bold shrink-0 select-none z-20">
        <div>COORD: -37.8136° S, 144.9631° E</div>
        <div className="hidden sm:block">SUBURBS: {mapModel.suburbs.length}</div>
        <div>
          {gameState.gameMode === 'daily'
            ? `DAILY #${gameState.challengeNumber || 1} • ${gameState.turnsUsed}/${gameState.maxTurns} TURNS`
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
        onOpenDailyStats={() => setIsDailyStatsOpen(true)}
      />

      {/* Daily Challenge Stats & Path Comparison Modal */}
      <DailyStatsModal
        stats={dailyStats}
        isOpen={isDailyStatsOpen}
        onClose={() => setIsDailyStatsOpen(false)}
        mapModel={mapModel}
      />

      {/* Rules and How to Play Guide Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />
    </div>
  );
}
