export type GameDifficulty = 'Easy' | 'Medium' | 'Hard';
export type GameMode = 'daily' | 'practice';

export interface SuburbData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  postcode: string;
  region: 'Inner' | 'Northern' | 'Western' | 'Eastern' | 'Bayside' | 'South Eastern';
  historicalFact?: string;
  description?: string;
  population?: number;
  areaKm2?: number;
  approximateAge?: string;
}

export interface SuburbProjected extends SuburbData {
  x: number;
  y: number;
  polygon: [number, number][];
  neighbors: string[]; // Adjacent suburb IDs
}

export type SuburbRole = 'start' | 'target' | 'visited' | 'current' | 'valid-move' | 'default' | 'best-path' | 'guessed' | 'guessed-optimal';

export interface GameState {
  gameMode: GameMode;
  dailyDate?: string;
  challengeNumber?: number;
  startSuburbId: string;
  targetSuburbId: string;
  path: string[]; // List of suburb IDs visited, starting with startSuburbId
  turnsUsed: number;
  maxTurns: number;
  status: 'playing' | 'won' | 'lost';
  bestPath: string[]; // BFS shortest path from start to target
  bestPathDistance: number; // Shortest distance
  difficulty: GameDifficulty;
  gaveUp?: boolean;
  guessedSuburbs?: string[]; // All suburbs guessed anywhere on map
  friendPath?: string[]; // Optional friend path for route comparison
  turnHistory?: {
    type: 'step' | 'guess';
    suburbId: string;
    prevConsecutiveErrors: number;
  }[];
}

export interface SuburbTooltipInfo {
  suburb: SuburbProjected;
  role: SuburbRole;
  distanceToTarget: number;
  distanceToCurrent: number;
  screenX: number;
  screenY: number;
  suburbBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  containerBounds?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
}
