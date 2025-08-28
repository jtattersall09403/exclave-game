import { getNeighbors } from './hex';
import type { Cell, HexCoord, PlayerId } from '../types';

export interface MapConfig {
  width: number;
  height: number;
  landRatio: number;
  smoothingPasses: number;
}

export class MapGenerator {
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

  generateLandmass(config: MapConfig): HexCoord[] {
    const landMap = new Map<string, boolean>();
    
    // Create organic blob-like shapes using multiple overlapping circles
    const numBlobs = 2 + Math.floor(this.rng() * 3); // 2-4 main blobs
    const centerQ = 0;
    const centerR = 0;
    
    for (let blobIndex = 0; blobIndex < numBlobs; blobIndex++) {
      // Random blob center within a rough area
      const blobCenterQ = centerQ + Math.floor((this.rng() - 0.5) * config.width * 0.8);
      const blobCenterR = centerR + Math.floor((this.rng() - 0.5) * config.height * 0.8);
      
      // Variable blob size
      const blobRadius = 3 + Math.floor(this.rng() * 4); // 3-6 radius
      
      // Create irregular blob using perlin-like noise
      for (let q = blobCenterQ - blobRadius; q <= blobCenterQ + blobRadius; q++) {
        for (let r = blobCenterR - blobRadius; r <= blobCenterR + blobRadius; r++) {
          const distance = Math.sqrt(Math.pow(q - blobCenterQ, 2) + Math.pow(r - blobCenterR, 2));
          
          if (distance <= blobRadius) {
            // Add noise to make edges irregular
            const noise = (this.rng() - 0.5) * 2; // -1 to 1
            const edgeFactor = 1 - (distance / blobRadius); // 1 at center, 0 at edge
            const probability = edgeFactor + noise * 0.4;
            
            if (probability > 0.3) {
              landMap.set(`${q},${r}`, true);
            }
          }
        }
      }
    }
    
    // Add some random tendrils and peninsulas
    const numTendrils = 2 + Math.floor(this.rng() * 4); // 2-5 tendrils
    for (let i = 0; i < numTendrils; i++) {
      // Find a random edge hex as starting point
      const landHexes = Array.from(landMap.keys()).map(key => {
        const [q, r] = key.split(',').map(Number);
        return { q, r };
      });
      
      if (landHexes.length === 0) continue;
      
      const startHex = landHexes[Math.floor(this.rng() * landHexes.length)];
      
      // Create a meandering tendril
      let currentQ = startHex.q;
      let currentR = startHex.r;
      const tendrilLength = 2 + Math.floor(this.rng() * 4); // 2-5 length
      
      for (let step = 0; step < tendrilLength; step++) {
        // Random walk with bias
        const directions = [
          { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
          { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
        ];
        
        const direction = directions[Math.floor(this.rng() * directions.length)];
        currentQ += direction.q;
        currentR += direction.r;
        
        if (this.rng() > 0.3) { // 70% chance to place land
          landMap.set(`${currentQ},${currentR}`, true);
        }
      }
    }
    
    // Light smoothing to clean up but preserve character
    for (let pass = 0; pass < Math.min(2, config.smoothingPasses); pass++) {
      const newLandMap = new Map<string, boolean>();
      
      // Get all hexes in the area we're working with
      const allKeys = Array.from(landMap.keys());
      const allHexes = allKeys.map(key => {
        const [q, r] = key.split(',').map(Number);
        return { q, r };
      });
      
      for (const hex of allHexes) {
        const key = `${hex.q},${hex.r}`;
        const neighbors = getNeighbors(hex);
        
        let landNeighbors = 0;
        let totalNeighbors = 0;
        
        for (const neighbor of neighbors) {
          const neighborKey = `${neighbor.q},${neighbor.r}`;
          totalNeighbors++;
          if (landMap.get(neighborKey)) {
            landNeighbors++;
          }
        }
        
        const landRatio = landNeighbors / 6; // Always 6 neighbors in hex grid
        const currentIsLand = landMap.get(key) || false;
        
        // Preserve existing land more aggressively, only smooth edges lightly
        if (currentIsLand) {
          newLandMap.set(key, landRatio > 0.2); // Keep land unless very isolated
        } else {
          newLandMap.set(key, landRatio > 0.6); // Only add land if mostly surrounded
        }
      }
      
      landMap.clear();
      for (const [key, value] of newLandMap) {
        if (value) {
          landMap.set(key, value);
        }
      }
    }

    const landHexes = Array.from(landMap.keys())
      .filter(key => landMap.get(key))
      .map(key => {
        const [q, r] = key.split(',').map(Number);
        return { q, r };
      });

    return this.getLargestComponent(landHexes);
  }


  private getLargestComponent(hexes: HexCoord[]): HexCoord[] {
    if (hexes.length === 0) return [];

    const hexSet = new Set(hexes.map(h => `${h.q},${h.r}`));
    const visited = new Set<string>();
    let largestComponent: HexCoord[] = [];

    for (const hex of hexes) {
      const key = `${hex.q},${hex.r}`;
      if (visited.has(key)) continue;

      const component = this.floodFill(hex, hexSet, visited);
      if (component.length > largestComponent.length) {
        largestComponent = component;
      }
    }

    return largestComponent;
  }

  private floodFill(start: HexCoord, hexSet: Set<string>, visited: Set<string>): HexCoord[] {
    const component: HexCoord[] = [];
    const queue: HexCoord[] = [start];
    const startKey = `${start.q},${start.r}`;
    
    if (visited.has(startKey)) return component;
    
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const key = `${neighbor.q},${neighbor.r}`;
        if (!visited.has(key) && hexSet.has(key)) {
          visited.add(key);
          queue.push(neighbor);
        }
      }
    }

    return component;
  }

  generateCells(landHexes: HexCoord[]): Cell[] {
    return landHexes.map((hex, index) => ({
      id: index,
      q: hex.q,
      r: hex.r,
      owner: 0 as PlayerId,
      units: 1,
      land: true
    }));
  }
}

export function isBoundaryHex(hex: HexCoord, landHexes: HexCoord[]): boolean {
  const landSet = new Set(landHexes.map(h => `${h.q},${h.r}`));
  const neighbors = getNeighbors(hex);
  
  return neighbors.some(neighbor => !landSet.has(`${neighbor.q},${neighbor.r}`));
}

export function getBoundaryHexes(landHexes: HexCoord[]): HexCoord[] {
  return landHexes.filter(hex => isBoundaryHex(hex, landHexes));
}

export function getConnectedComponents(hexes: HexCoord[], ownedBy: (hex: HexCoord) => boolean): HexCoord[][] {
  const hexSet = new Set(hexes.filter(ownedBy).map(h => `${h.q},${h.r}`));
  const visited = new Set<string>();
  const components: HexCoord[][] = [];

  for (const hex of hexes) {
    if (!ownedBy(hex)) continue;
    
    const key = `${hex.q},${hex.r}`;
    if (visited.has(key)) continue;

    const component: HexCoord[] = [];
    const queue: HexCoord[] = [hex];
    visited.add(key);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);

      const neighbors = getNeighbors(current);
      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.q},${neighbor.r}`;
        if (!visited.has(neighborKey) && hexSet.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push(neighbor);
        }
      }
    }

    if (component.length > 0) {
      components.push(component);
    }
  }

  return components;
}