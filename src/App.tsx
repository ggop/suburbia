/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  buildMelbourneMapModel,
  generateRandomGame,
  getDistancesFrom,
  findShortestPath,
} from './utils/mapGeometry';
import { GameState } from './types';
import { MapViewport } from './components/MapViewport';
import { GameControls } from './components/GameControls';
import { Header } from './components/Header';
import { GameResultModal } from './components/GameResultModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { sounds } from './utils/soundEffects';

export default function App() {
  // Pre-calculate Melbourne geometry, Voronoi line polygons, and adjacency graph
  const mapModel = useMemo(() => buildMelbourneMapModel(), []);

  // Initialize random game on first load
  const [gameState, setGameState] = useState<GameState>(() => {
    const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency);
    return {
      startSuburbId: generated.startSuburbId,
      targetSuburbId: generated.targetSuburbId,
      path: [generated.startSuburbId],
      turnsUsed: 0,
      maxTurns: 10,
      status: 'playing',
      bestPath: generated.bestPath,
      bestPathDistance: generated.bestPathDistance,
      difficulty: generated.difficulty,
      guessedSuburbs: [],
      turnHistory: [],
    };
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState<number>(0);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState(false);
  const [showBestPathOverlay, setShowBestPathOverlay] = useState(false);

  const handleMapClickDisabled = useCallback(() => {
    if (gameState.status !== 'playing') return;
    setErrorMessage('Map clicking is disabled. Type any suburb name in the box to navigate.');
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

  // Check if result modal should open
  useEffect(() => {
    if (gameState.status === 'won') {
      sounds.playVictory();
      setIsResultModalOpen(true);
      setShowBestPathOverlay(true);
    } else if (gameState.status === 'lost') {
      sounds.playError();
      setIsResultModalOpen(true);
      setShowBestPathOverlay(true);
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

        let distanceMsg = '';
        if (distFromCurrent > 0) {
          distanceMsg = `${nextSuburb.name} is ${distFromCurrent} ${distFromCurrent === 1 ? 'step' : 'steps'} from ${currentSuburb.name}`;
        } else {
          distanceMsg = `${nextSuburb.name} does not directly connect to ${currentSuburb.name}`;
        }

        if (distFromTarget >= 0) {
          distanceMsg += ` and ${distFromTarget} ${distFromTarget === 1 ? 'step' : 'steps'} from ${targetSuburb?.name || 'target'}`;
        }

        setErrorMessage(
          `${distanceMsg}. Guess a bordering suburb of ${currentSuburb.name} to advance!`
        );
        sounds.playError();
        setConsecutiveErrors((prev) => prev + 1);

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

      // Check loss condition (exceeding 10 turns)
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

  // Start new random game
  const handleNewGame = useCallback(() => {
    const generated = generateRandomGame(mapModel.suburbs, mapModel.adjacency);
    setGameState({
      startSuburbId: generated.startSuburbId,
      targetSuburbId: generated.targetSuburbId,
      path: [generated.startSuburbId],
      turnsUsed: 0,
      maxTurns: 10,
      status: 'playing',
      bestPath: generated.bestPath,
      bestPathDistance: generated.bestPathDistance,
      difficulty: generated.difficulty,
      guessedSuburbs: [],
      turnHistory: [],
    });
    setErrorMessage(null);
    setConsecutiveErrors(0);
    setIsResultModalOpen(false);
    setShowBestPathOverlay(false);
  }, [mapModel]);

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
        <section className="flex-1 relative w-full h-full min-h-0 bg-neutral-100 overflow-hidden">
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

      {/* Minimalist Footer matching Design HTML */}
      <footer className="h-9 sm:h-10 bg-neutral-900 text-neutral-400 text-[10px] flex items-center justify-between px-6 sm:px-8 uppercase tracking-widest font-bold shrink-0 select-none z-20">
        <div>COORD: -37.8136° S, 144.9631° E</div>
        <div className="hidden sm:block">SUBURBS: {mapModel.suburbs.length}</div>
        <div>SESSION: {gameState.turnsUsed}/{gameState.maxTurns} TURNS</div>
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
