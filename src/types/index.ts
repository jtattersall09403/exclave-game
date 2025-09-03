export type PlayerId = 0 | 1 | 2;

export interface HexCoord {
  q: number;
  r: number;
}

export interface Cell {
  id: number;
  q: number;
  r: number;
  owner: PlayerId;
  units: number;
  land: boolean;
}

export interface GameState {
  cells: Cell[];
  players: PlayerId[];
  current: PlayerId;
  phase: 'reinforce' | 'attack' | 'move';
  reinfLeft: number;
  actionsLeft: number;
  scores: Record<PlayerId, number>;
  round: number;
  selected?: number | null;
  moveSource?: number | null;
  moveDestination?: number | null;
  winGoal: number;
  lastDiceRoll?: DiceRoll | null;
  pendingCombatResult?: GameState | null;
}

export interface DiceRoll {
  attacker: number[];
  defender: number[];
  attackerTotal: number;
  defenderTotal: number;
  attackerWins: boolean;
  attackerId: PlayerId;
  defenderId: PlayerId;
}