import type { GameState, PlayerId, DiceRoll, HexCoord } from '../types';
import { areAdjacent, getNeighbors } from './hex';
import { getConnectedComponents } from './map';

export class GameEngine {
  private rng: () => number;

  constructor(seed?: number) {
    this.rng = this.createSeededRandom(seed || Math.random() * 1000000);
  }

  private createSeededRandom(seed: number): () => number {
    let x = Math.sin(seed) * 10000;
    return () => {
      x = Math.sin(x) * 10000;
      return x - Math.floor(x);
    };
  }

  canReinforce(state: GameState, cellId: number): boolean {
    if (state.phase !== 'reinforce' || state.reinfLeft <= 0) return false;
    
    const cell = state.cells.find(c => c.id === cellId);
    if (!cell || !cell.land || cell.owner !== state.current) return false;
    
    return cell.units < 8;
  }

  reinforce(state: GameState, cellId: number): GameState {
    if (!this.canReinforce(state, cellId)) return state;

    const newState = { ...state };
    newState.cells = state.cells.map(cell => 
      cell.id === cellId 
        ? { ...cell, units: Math.min(8, cell.units + 1) }
        : cell
    );
    newState.reinfLeft = state.reinfLeft - 1;

    if (newState.reinfLeft <= 0) {
      newState.phase = 'attack';
    }

    return newState;
  }

  canAttack(state: GameState, fromId: number, toId: number): boolean {
    if (state.phase !== 'attack' || state.actionsLeft <= 0) return false;

    const fromCell = state.cells.find(c => c.id === fromId);
    const toCell = state.cells.find(c => c.id === toId);

    if (!fromCell || !toCell || !fromCell.land || !toCell.land) return false;
    if (fromCell.owner !== state.current || toCell.owner === state.current) return false;
    if (fromCell.units < 1) return false; // Can attack from 1-unit tiles

    return areAdjacent(
      { q: fromCell.q, r: fromCell.r },
      { q: toCell.q, r: toCell.r }
    );
  }

  attack(state: GameState, fromId: number, toId: number): { state: GameState; dice: DiceRoll } {
    if (!this.canAttack(state, fromId, toId)) {
      return { state, dice: this.createEmptyDiceRoll() };
    }

    const fromCell = state.cells.find(c => c.id === fromId)!;
    const toCell = state.cells.find(c => c.id === toId)!;

    // Auto-capture if target has 0 units
    if (toCell.units === 0) {
      const unitsToMove = fromCell.units >= 2 ? fromCell.units - 1 : fromCell.units;
      const unitsRemaining = fromCell.units >= 2 ? 1 : 0;
      
      const newState = { ...state };
      newState.cells = state.cells.map(cell => {
        if (cell.id === fromId) {
          return { ...cell, units: unitsRemaining }; // Leave 1 behind if 2+ units
        }
        if (cell.id === toId) {
          return { ...cell, owner: state.current, units: unitsToMove };
        }
        return cell;
      });
      
      return { state: newState, dice: this.createEmptyDiceRoll() };
    }

    const dice = this.rollDice(fromCell.units, toCell.units, state.current, toCell.owner); // Use all units for rolling
    const newState = { ...state };
    
    if (dice.attackerWins) {
      const unitsToMove = fromCell.units >= 2 ? fromCell.units - 1 : fromCell.units;
      const unitsRemaining = fromCell.units >= 2 ? 1 : 0;
      
      newState.cells = state.cells.map(cell => {
        if (cell.id === fromId) {
          return { ...cell, units: unitsRemaining }; // Leave 1 behind if 2+ units
        }
        if (cell.id === toId) {
          return { ...cell, owner: state.current, units: unitsToMove };
        }
        return cell;
      });
    } else {
      // Sacrificial rule: origin flips to defender
      newState.cells = state.cells.map(cell => {
        if (cell.id === fromId) {
          return { ...cell, owner: toCell.owner };
        }
        if (cell.id === toId && toCell.units > 0) {
          return { ...cell, units: Math.min(8, toCell.units + 1) };
        }
        return cell;
      });
    }

    // Consume one action for the attack
    newState.actionsLeft = state.actionsLeft - 1;

    // Check for new exclaves after combat and award points
    this.updateExclaveScores(newState);

    return { state: newState, dice };
  }

  private rollDice(attackerCount: number, defenderCount: number, attackerId: PlayerId, defenderId: PlayerId): DiceRoll {
    const attackerRolls: number[] = [];
    const defenderRolls: number[] = [];

    for (let i = 0; i < attackerCount; i++) {
      attackerRolls.push(Math.floor(this.rng() * 6) + 1);
    }

    for (let i = 0; i < defenderCount; i++) {
      defenderRolls.push(Math.floor(this.rng() * 6) + 1);
    }

    const attackerTotal = attackerRolls.reduce((sum, roll) => sum + roll, 0);
    const defenderTotal = defenderRolls.reduce((sum, roll) => sum + roll, 0);

    return {
      attacker: attackerRolls,
      defender: defenderRolls,
      attackerTotal,
      defenderTotal,
      attackerWins: attackerTotal > defenderTotal,
      attackerId,
      defenderId
    };
  }

  private createEmptyDiceRoll(): DiceRoll {
    return {
      attacker: [],
      defender: [],
      attackerTotal: 0,
      defenderTotal: 0,
      attackerWins: false,
      attackerId: 0 as PlayerId,
      defenderId: 0 as PlayerId
    };
  }

  canMove(state: GameState, fromId: number, toId: number): boolean {
    if (state.phase !== 'attack' || state.actionsLeft <= 0) return false;

    const fromCell = state.cells.find(c => c.id === fromId);
    const toCell = state.cells.find(c => c.id === toId);

    if (!fromCell || !toCell || !fromCell.land || !toCell.land) return false;
    if (fromCell.owner !== state.current || toCell.owner !== state.current) return false;
    if (fromCell.units <= 1) return false; // Must leave at least 1 unit behind

    return true;
  }

  move(state: GameState, fromId: number, toId: number, unitCount: number): GameState {
    if (!this.canMove(state, fromId, toId)) return state;

    const fromCell = state.cells.find(c => c.id === fromId)!;
    const toCell = state.cells.find(c => c.id === toId)!;

    // Validate unit count
    const maxMove = fromCell.units - 1; // Must leave 1 behind
    const actualMove = Math.min(unitCount, maxMove);
    const maxDestination = 8 - toCell.units; // Destination can't exceed 8
    const finalMove = Math.min(actualMove, maxDestination);

    if (finalMove <= 0) return state;

    const newState = { ...state };
    newState.cells = state.cells.map(cell => {
      if (cell.id === fromId) {
        return { ...cell, units: cell.units - finalMove };
      }
      if (cell.id === toId) {
        return { ...cell, units: cell.units + finalMove };
      }
      return cell;
    });

    // Consume one action for the move
    newState.actionsLeft = state.actionsLeft - 1;

    return newState;
  }

  canEndTurn(state: GameState): boolean {
    return state.reinfLeft === 0 || state.actionsLeft === 0;
  }

  private updateExclaveScores(state: GameState): void {
    // Check all players for exclaves and update their scores
    for (const playerId of state.players) {
      const exclaves = this.detectExclaves(state, playerId);
      state.scores[playerId] = exclaves.length;
    }
  }

  endTurn(state: GameState): GameState {
    if (!this.canEndTurn(state)) return state;

    const newState = { ...state };

    const nextPlayerIndex = (state.players.indexOf(state.current) + 1) % state.players.length;
    const nextPlayer = state.players[nextPlayerIndex];

    if (nextPlayer === state.players[0]) {
      newState.round = state.round + 1;
    }

    // Calculate reinforcements based on hex count (reduced by 50%)
    const nextPlayerHexCount = this.getPlayerTerritoryCount(state, nextPlayer);
    const reinforcements = Math.max(1, Math.floor(nextPlayerHexCount / 6));

    newState.current = nextPlayer;
    newState.phase = 'reinforce';
    newState.reinfLeft = reinforcements;
    newState.actionsLeft = 5;
    newState.selected = null;

    return newState;
  }

  private detectExclaves(state: GameState, playerId: PlayerId): HexCoord[][] {
    const playerCells = state.cells.filter(c => c.land && c.owner === playerId);
    const playerHexes: HexCoord[] = playerCells.map(c => ({ q: c.q, r: c.r }));
    
    if (playerHexes.length === 0) return [];
    
    // Get all connected components of player territory
    const components = getConnectedComponents(
      playerHexes,
      (hex: HexCoord) => playerHexes.some(ph => ph.q === hex.q && ph.r === hex.r)
    );

    if (components.length <= 1) return []; // All connected, no exclaves

    // The largest component is the main territory, all others are exclaves
    const largestComponent = components.reduce((largest, current) => 
      current.length > largest.length ? current : largest
    );

    // All components except the largest are exclaves
    const exclaves = components.filter(component => component !== largestComponent);

    return exclaves;
  }


  isGameOver(state: GameState): boolean {
    // Game ends when someone reaches the win goal
    return state.players.some(playerId => state.scores[playerId] >= state.winGoal);
  }

  getWinner(state: GameState): PlayerId | null {
    if (!this.isGameOver(state)) return null;

    // Find player with win goal or more exclaves
    for (const playerId of state.players) {
      if (state.scores[playerId] >= state.winGoal) {
        return playerId;
      }
    }

    // Fallback to highest score (shouldn't happen with new logic)
    let winner: PlayerId = state.players[0];
    let highestScore = state.scores[winner];

    for (const playerId of state.players) {
      if (state.scores[playerId] > highestScore) {
        highestScore = state.scores[playerId];
        winner = playerId;
      }
    }

    return winner;
  }

  getValidAttackTargets(state: GameState, fromId: number): number[] {
    if (state.phase !== 'attack') return [];

    const fromCell = state.cells.find(c => c.id === fromId);
    if (!fromCell || fromCell.owner !== state.current || fromCell.units < 1) return [];

    const fromHex = { q: fromCell.q, r: fromCell.r };
    const neighbors = getNeighbors(fromHex);

    return state.cells
      .filter(cell => 
        cell.land &&
        cell.owner !== state.current &&
        neighbors.some(n => n.q === cell.q && n.r === cell.r)
      )
      .map(cell => cell.id);
  }

  getValidReinforcementTargets(state: GameState): number[] {
    if (state.phase !== 'reinforce' || state.reinfLeft <= 0) return [];

    return state.cells
      .filter(cell => 
        cell.land &&
        cell.owner === state.current &&
        cell.units < 8
      )
      .map(cell => cell.id);
  }

  getValidMoveTargets(state: GameState, fromId: number): number[] {
    if (state.phase !== 'attack') return [];

    const fromCell = state.cells.find(c => c.id === fromId);
    if (!fromCell || fromCell.owner !== state.current || fromCell.units <= 1) return [];

    const fromHex = { q: fromCell.q, r: fromCell.r };
    const neighbors = getNeighbors(fromHex);

    return state.cells
      .filter(cell => 
        cell.land &&
        cell.owner === state.current &&
        cell.id !== fromId &&
        cell.units < 8 &&
        neighbors.some(n => n.q === cell.q && n.r === cell.r) // Must be adjacent
      )
      .map(cell => cell.id);
  }

  hasValidMoves(state: GameState): boolean {
    if (state.phase === 'reinforce') {
      return this.getValidReinforcementTargets(state).length > 0;
    }

    return state.cells
      .filter(cell => cell.land && cell.owner === state.current && cell.units >= 1)
      .some(cell => this.getValidAttackTargets(state, cell.id).length > 0);
  }

  getPlayerTerritoryCount(state: GameState, playerId: PlayerId): number {
    return state.cells.filter(c => c.land && c.owner === playerId).length;
  }

  getTotalUnits(state: GameState, playerId: PlayerId): number {
    return state.cells
      .filter(c => c.land && c.owner === playerId)
      .reduce((sum, cell) => sum + cell.units, 0);
  }
}