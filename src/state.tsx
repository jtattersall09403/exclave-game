import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { GameState, PlayerId } from './types';
import { GameEngine } from './core/rules';
import { MapGenerator } from './core/map';
import { TerritorySplitter } from './core/split';

export interface GameAction {
  type: 'NEW_GAME' | 'REINFORCE' | 'ATTACK' | 'MOVE' | 'END_TURN' | 'SELECT_CELL' | 'DESELECT' | 'APPLY_COMBAT_RESULT';
  payload?: any;
}

export interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  engine: GameEngine;
}

const initialState: GameState = {
  cells: [],
  players: [0, 1],
  current: 0 as PlayerId,
  phase: 'reinforce',
  reinfLeft: 3,
  actionsLeft: 5,
  scores: { 0: 0, 1: 0, 2: 0 },
  round: 1,
  selected: null,
  winGoal: 10,
  lastDiceRoll: null,
  pendingCombatResult: null
};

const GameContext = createContext<GameContextType | null>(null);

let gameEngine = new GameEngine();

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      const { playerCount, seed, winGoal } = action.payload;
      
      gameEngine = new GameEngine(seed);
      
      const mapGenerator = new MapGenerator(seed);
      const splitter = new TerritorySplitter(seed);
      
      // Smaller map for 2 player games (reduced by 20%)
      const mapSize = playerCount === 2 ? { width: 8, height: 8 } : { width: 12, height: 10 };
      
      const landHexes = mapGenerator.generateLandmass({
        width: mapSize.width,
        height: mapSize.height,
        landRatio: 0.7,
        smoothingPasses: 2
      });
      
      const cells = mapGenerator.generateCells(landHexes);
      
      const splitCells = splitter.splitTerritory(cells, {
        playerCount: playerCount as 2 | 3,
        minTerritorySize: 8
      });
      
      const players: PlayerId[] = playerCount === 3 ? [0, 1, 2] : [0, 1];
      const scores: Record<PlayerId, number> = { 0: 0, 1: 0, 2: 0 };
      
      // Calculate initial reinforcements based on starting hex count (reduced by 50%)
      const player0HexCount = splitCells.filter(c => c.owner === 0).length;
      const initialReinforcements = Math.max(1, Math.floor(player0HexCount / 6));
      
      return {
        cells: splitCells,
        players,
        current: 0 as PlayerId,
        phase: 'reinforce',
        reinfLeft: initialReinforcements,
        actionsLeft: 5,
        scores,
        round: 1,
        selected: null,
        winGoal: winGoal || 10,
        lastDiceRoll: null,
        pendingCombatResult: null
      };
    }
    
    case 'REINFORCE': {
      const { cellId } = action.payload;
      return gameEngine.reinforce(state, cellId);
    }
    
    case 'ATTACK': {
      const { fromId, toId } = action.payload;
      const result = gameEngine.attack(state, fromId, toId);
      // Return current state with dice roll stored, but combat result pending
      return {
        ...state,
        lastDiceRoll: result.dice,
        pendingCombatResult: result.state
      };
    }
    
    case 'APPLY_COMBAT_RESULT': {
      if (state.pendingCombatResult) {
        const resultState = state.pendingCombatResult;
        // Update exclave scores after applying combat result
        gameEngine.updateExclaveScores(resultState);
        return {
          ...resultState,
          lastDiceRoll: null,
          pendingCombatResult: null
        };
      }
      return state;
    }
    
    case 'MOVE': {
      const { fromId, toId, unitCount } = action.payload;
      return gameEngine.move(state, fromId, toId, unitCount);
    }
    
    case 'END_TURN': {
      return gameEngine.endTurn(state);
    }
    
    case 'SELECT_CELL': {
      const { cellId } = action.payload;
      return { ...state, selected: cellId };
    }
    
    case 'DESELECT': {
      return { ...state, selected: null };
    }
    
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  
  const contextValue: GameContextType = {
    state,
    dispatch,
    engine: gameEngine
  };
  
  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

export function useGameActions() {
  const { dispatch, engine, state } = useGame();
  
  return {
    newGame: (playerCount: 2 | 3, seed?: number, winGoal?: number) => {
      dispatch({ 
        type: 'NEW_GAME', 
        payload: { playerCount, seed: seed || Math.random() * 1000000, winGoal: winGoal || 10 } 
      });
    },
    
    reinforce: (cellId: number) => {
      if (engine.canReinforce(state, cellId)) {
        dispatch({ type: 'REINFORCE', payload: { cellId } });
      }
    },
    
    attack: (fromId: number, toId: number) => {
      if (engine.canAttack(state, fromId, toId)) {
        dispatch({ type: 'ATTACK', payload: { fromId, toId } });
      }
    },
    
    move: (fromId: number, toId: number, unitCount: number) => {
      if (engine.canMove(state, fromId, toId)) {
        dispatch({ type: 'MOVE', payload: { fromId, toId, unitCount } });
      }
    },
    
    endTurn: () => {
      if (engine.canEndTurn(state)) {
        dispatch({ type: 'END_TURN' });
      }
    },
    
    selectCell: (cellId: number) => {
      dispatch({ type: 'SELECT_CELL', payload: { cellId } });
    },
    
    deselectCell: () => {
      dispatch({ type: 'DESELECT' });
    }
  };
}