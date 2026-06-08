import { Tile, Suit, Rank, FengRank } from '../types';
import { tileToString, isSameTileType, isCaishen, tileWeight, sortTiles } from '../constants';

export { tileToString, isSameTileType, isCaishen, tileWeight, sortTiles };

// 判断两张牌是否完全相同（含 id）
export function isSameTile(a: Tile, b: Tile): boolean {
  return a.id === b.id;
}

// 从数组中移除指定 id 的牌
export function removeTile(tiles: Tile[], tileId: number): { updated: Tile[]; removed: Tile | null } {
  const idx = tiles.findIndex(t => t.id === tileId);
  if (idx === -1) return { updated: tiles, removed: null };
  const removed = tiles[idx];
  const updated = [...tiles.slice(0, idx), ...tiles.slice(idx + 1)];
  return { updated, removed };
}

// 按种类（suit+rank）移除一张牌
export function removeTileByType(tiles: Tile[], suit: Suit, rank: Rank | FengRank): { updated: Tile[]; removed: Tile | null } {
  const idx = tiles.findIndex(t => t.suit === suit && t.rank === rank);
  if (idx === -1) return { updated: tiles, removed: null };
  const removed = tiles[idx];
  const updated = [...tiles.slice(0, idx), ...tiles.slice(idx + 1)];
  return { updated, removed };
}
