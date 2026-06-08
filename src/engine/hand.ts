import { Tile } from '../types';
import { sortTiles, countTiles } from '../constants';

// 手牌管理
export class Hand {
  tiles: Tile[];

  constructor(tiles: Tile[] = []) {
    this.tiles = sortTiles(tiles);
  }

  add(tile: Tile): void {
    this.tiles.push(tile);
    this.tiles = sortTiles(this.tiles);
  }

  remove(tileId: number): Tile | null {
    const idx = this.tiles.findIndex(t => t.id === tileId);
    if (idx === -1) return null;
    const removed = this.tiles.splice(idx, 1)[0];
    return removed;
  }

  removeByType(suit: string, rank: number): Tile | null {
    const idx = this.tiles.findIndex(t => t.suit === suit && t.rank === rank);
    if (idx === -1) return null;
    return this.tiles.splice(idx, 1)[0];
  }

  get size(): number {
    return this.tiles.length;
  }

  sort(): void {
    this.tiles = sortTiles(this.tiles);
  }

  // 获取手牌的计数映射
  getCountMap(): Map<string, number> {
    const map = new Map<string, number>();
    for (const t of this.tiles) {
      const key = `${t.suit}-${t.rank}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }
}
