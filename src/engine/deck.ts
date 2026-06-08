import { Tile } from '../types';
import { createAllTiles } from '../constants';

// Fisher-Yates 洗牌
export function shuffle(tiles: Tile[]): Tile[] {
  const arr = [...tiles];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 创建洗好的牌墙
export function createDeck(): Tile[] {
  return shuffle(createAllTiles());
}

// 从牌墙摸一张牌
export function drawTile(wall: Tile[]): { tile: Tile | null; remaining: Tile[] } {
  if (wall.length === 0) return { tile: null, remaining: [] };
  const tile = wall[0];
  return { tile, remaining: wall.slice(1) };
}

// 发牌：给每个玩家发指定数量的牌
export function dealTiles(
  wall: Tile[],
  playerCount: number,
  tilesPerPlayer: number
): { hands: Tile[][]; remaining: Tile[] } {
  const hands: Tile[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;
  for (let i = 0; i < playerCount * tilesPerPlayer; i++) {
    hands[idx].push(wall[i]);
    idx = (idx + 1) % playerCount;
  }
  const remaining = wall.slice(playerCount * tilesPerPlayer);
  return { hands, remaining };
}
