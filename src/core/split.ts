import type { Cell, HexCoord, PlayerId } from '../types';
import { Hex, getNeighbors } from './hex';
import { getConnectedComponents } from './map';

export interface SplitConfig {
  playerCount: 2 | 3;
  minTerritorySize: number;
}

export class TerritorySplitter {
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

  splitTerritory(cells: Cell[], config: SplitConfig): Cell[] {
    const landHexes = cells.filter(c => c.land);
    
    if (landHexes.length < config.minTerritorySize * config.playerCount) {
      throw new Error('Not enough land for all players');
    }

    const seeds = this.findOptimalSeeds(landHexes, config.playerCount);
    const territories = this.voronoiSplit(landHexes, seeds);
    const balancedTerritories = this.balanceTerritories(territories, config);
    const contiguousTerritories = this.enforceContiguity(balancedTerritories);

    return this.assignPlayersToTerritories(cells, contiguousTerritories);
  }

  private findOptimalSeeds(hexes: HexCoord[], playerCount: number): HexCoord[] {
    let bestSeeds: HexCoord[] = [];
    let bestScore = -1;

    for (let attempt = 0; attempt < 50; attempt++) {
      const seeds = this.generateSeedCandidates(hexes, playerCount);
      const score = this.evaluateSeedPlacement(seeds);
      
      if (score > bestScore) {
        bestScore = score;
        bestSeeds = [...seeds];
      }
    }

    return bestSeeds;
  }

  private generateSeedCandidates(hexes: HexCoord[], playerCount: number): HexCoord[] {
    if (playerCount === 2) {
      return this.findFarthestPair(hexes);
    } else {
      return this.findFarthestTriple(hexes);
    }
  }

  private findFarthestPair(hexes: HexCoord[]): HexCoord[] {
    let maxDistance = -1;
    let bestPair: HexCoord[] = [];

    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        const hex1 = new Hex(hexes[i].q, hexes[i].r);
        const hex2 = new Hex(hexes[j].q, hexes[j].r);
        const distance = hex1.distance(hex2);

        if (distance > maxDistance) {
          maxDistance = distance;
          bestPair = [hexes[i], hexes[j]];
        }
      }
    }

    return bestPair;
  }

  private findFarthestTriple(hexes: HexCoord[]): HexCoord[] {
    let maxMinDistance = -1;
    let bestTriple: HexCoord[] = [];

    for (let i = 0; i < hexes.length; i++) {
      for (let j = i + 1; j < hexes.length; j++) {
        for (let k = j + 1; k < hexes.length; k++) {
          const hex1 = new Hex(hexes[i].q, hexes[i].r);
          const hex2 = new Hex(hexes[j].q, hexes[j].r);
          const hex3 = new Hex(hexes[k].q, hexes[k].r);

          const d12 = hex1.distance(hex2);
          const d13 = hex1.distance(hex3);
          const d23 = hex2.distance(hex3);

          const minDistance = Math.min(d12, d13, d23);

          if (minDistance > maxMinDistance) {
            maxMinDistance = minDistance;
            bestTriple = [hexes[i], hexes[j], hexes[k]];
          }
        }
      }
    }

    return bestTriple;
  }

  private evaluateSeedPlacement(seeds: HexCoord[]): number {
    if (seeds.length < 2) return 0;

    let totalDistance = 0;
    let minDistance = Infinity;

    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        const hex1 = new Hex(seeds[i].q, seeds[i].r);
        const hex2 = new Hex(seeds[j].q, seeds[j].r);
        const distance = hex1.distance(hex2);
        
        totalDistance += distance;
        minDistance = Math.min(minDistance, distance);
      }
    }

    return minDistance * 2 + totalDistance;
  }

  private voronoiSplit(hexes: HexCoord[], seeds: HexCoord[]): Map<PlayerId, HexCoord[]> {
    const territories = new Map<PlayerId, HexCoord[]>();
    
    for (let i = 0; i < seeds.length; i++) {
      territories.set(i as PlayerId, []);
    }

    for (const hex of hexes) {
      let closestSeed = 0;
      let minDistance = Infinity;

      for (let i = 0; i < seeds.length; i++) {
        const seedHex = new Hex(seeds[i].q, seeds[i].r);
        const currentHex = new Hex(hex.q, hex.r);
        const distance = seedHex.distance(currentHex);

        if (distance < minDistance || (distance === minDistance && this.rng() < 0.5)) {
          minDistance = distance;
          closestSeed = i;
        }
      }

      territories.get(closestSeed as PlayerId)!.push(hex);
    }

    return territories;
  }

  private balanceTerritories(territories: Map<PlayerId, HexCoord[]>, config: SplitConfig): Map<PlayerId, HexCoord[]> {
    const targetSize = Math.floor(Array.from(territories.values()).reduce((sum, t) => sum + t.length, 0) / config.playerCount);
    const balanced = new Map<PlayerId, HexCoord[]>();

    for (const [playerId, territory] of territories) {
      balanced.set(playerId, [...territory]);
    }

    for (let iteration = 0; iteration < 10; iteration++) {
      let changed = false;

      for (const [playerId, territory] of balanced) {
        if (territory.length > targetSize) {
          const excess = territory.length - targetSize;
          const borderHexes = this.findBorderHexes(territory, balanced);
          
          for (let i = 0; i < Math.min(excess, borderHexes.length); i++) {
            const hexToMove = borderHexes[i];
            const newOwner = this.findBestNewOwner(hexToMove, balanced, targetSize);
            
            if (newOwner !== undefined && newOwner !== playerId) {
              this.moveHexBetweenTerritories(hexToMove, playerId, newOwner, balanced);
              changed = true;
            }
          }
        }
      }

      if (!changed) break;
    }

    return balanced;
  }

  private findBorderHexes(territory: HexCoord[], allTerritories: Map<PlayerId, HexCoord[]>): HexCoord[] {
    const territorySet = new Set(territory.map(h => `${h.q},${h.r}`));
    const allHexes = new Set<string>();
    
    for (const t of allTerritories.values()) {
      for (const hex of t) {
        allHexes.add(`${hex.q},${hex.r}`);
      }
    }

    return territory.filter(hex => {
      const neighbors = getNeighbors(hex);
      return neighbors.some(neighbor => {
        const key = `${neighbor.q},${neighbor.r}`;
        return allHexes.has(key) && !territorySet.has(key);
      });
    });
  }

  private findBestNewOwner(hex: HexCoord, territories: Map<PlayerId, HexCoord[]>, targetSize: number): PlayerId | undefined {
    const neighbors = getNeighbors(hex);
    const candidates: PlayerId[] = [];

    for (const [playerId, territory] of territories) {
      if (territory.length >= targetSize) continue;

      const territorySet = new Set(territory.map(h => `${h.q},${h.r}`));
      const isAdjacent = neighbors.some(neighbor => 
        territorySet.has(`${neighbor.q},${neighbor.r}`)
      );

      if (isAdjacent) {
        candidates.push(playerId);
      }
    }

    if (candidates.length === 0) return undefined;
    return candidates[Math.floor(this.rng() * candidates.length)];
  }

  private moveHexBetweenTerritories(hex: HexCoord, from: PlayerId, to: PlayerId, territories: Map<PlayerId, HexCoord[]>): void {
    const fromTerritory = territories.get(from)!;
    const toTerritory = territories.get(to)!;
    
    const index = fromTerritory.findIndex(h => h.q === hex.q && h.r === hex.r);
    if (index !== -1) {
      fromTerritory.splice(index, 1);
      toTerritory.push(hex);
    }
  }

  private enforceContiguity(territories: Map<PlayerId, HexCoord[]>): Map<PlayerId, HexCoord[]> {
    const contiguous = new Map<PlayerId, HexCoord[]>();

    for (const [playerId, territory] of territories) {
      const components = getConnectedComponents(territory, () => true);
      
      if (components.length === 0) {
        contiguous.set(playerId, []);
        continue;
      }

      const largestComponent = components.reduce((largest, current) => 
        current.length > largest.length ? current : largest
      );

      const strays = territory.filter(hex => 
        !largestComponent.some(c => c.q === hex.q && c.r === hex.r)
      );

      contiguous.set(playerId, largestComponent);

      for (const stray of strays) {
        const bestOwner = this.findNearestTerritoryOwner(stray, contiguous);
        if (bestOwner !== undefined) {
          contiguous.get(bestOwner)!.push(stray);
        }
      }
    }

    return contiguous;
  }

  private findNearestTerritoryOwner(hex: HexCoord, territories: Map<PlayerId, HexCoord[]>): PlayerId | undefined {
    let nearestOwner: PlayerId | undefined = undefined;
    let minDistance = Infinity;

    const currentHex = new Hex(hex.q, hex.r);

    for (const [playerId, territory] of territories) {
      for (const territoryHex of territory) {
        const distance = currentHex.distance(new Hex(territoryHex.q, territoryHex.r));
        if (distance < minDistance) {
          minDistance = distance;
          nearestOwner = playerId;
        }
      }
    }

    return nearestOwner;
  }

  private assignPlayersToTerritories(cells: Cell[], territories: Map<PlayerId, HexCoord[]>): Cell[] {
    const result = [...cells];
    
    for (const [playerId, territory] of territories) {
      // Calculate total units for this player (territory size * 4)
      const totalUnits = territory.length * 4;
      const unitsRemaining = totalUnits;
      
      // Assign ownership first
      for (const hex of territory) {
        const cell = result.find(c => c.q === hex.q && c.r === hex.r);
        if (cell) {
          cell.owner = playerId;
          cell.units = 0; // Start with 0, will distribute randomly
        }
      }
      
      // Randomly distribute units
      let remainingUnits = unitsRemaining;
      while (remainingUnits > 0) {
        const randomHex = territory[Math.floor(this.rng() * territory.length)];
        const cell = result.find(c => c.q === randomHex.q && c.r === randomHex.r);
        if (cell && cell.units < 8) { // Cap at 8 units per hex
          cell.units++;
          remainingUnits--;
        }
      }
      
      // Ensure every hex has at least 1 unit
      for (const hex of territory) {
        const cell = result.find(c => c.q === hex.q && c.r === hex.r);
        if (cell && cell.units === 0) {
          cell.units = 1;
        }
      }
    }

    return result;
  }
}