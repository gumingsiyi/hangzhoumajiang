import { Tile, DiceResult } from '../types';
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

// 掷两枚骰子
export function rollDice(): DiceResult {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  const total = dice1 + dice2;

  // 以庄家为"1"（seat 0），逆时针数
  // 2/6/10 → seat 0（庄家）  3/7/11 → seat 1（下家）
  // 4/8/12 → seat 2（对家）  5/9    → seat 3（上家）
  let wallOwner: number;
  const rem = total % 4;
  if (rem === 2) {
    wallOwner = 0; // 2, 6, 10
  } else if (rem === 3) {
    wallOwner = 1; // 3, 7, 11
  } else if (rem === 0) {
    wallOwner = 2; // 4, 8, 12
  } else {
    wallOwner = 3; // 1, 5, 9
  }

  return { dice1, dice2, total, wallOwner };
}

// 根据骰子结果计算牌墙起始索引
// 每个玩家前面有 34 张牌（17 墩），跳过 total 墩（每墩 2 张）
export function getWallStartIndex(diceResult: DiceResult): number {
  return diceResult.wallOwner * 34 + diceResult.total * 2;
}

// 发牌：从牌墙指定位置开始，给每个玩家发指定数量的牌（按顺序循环）
export function dealTiles(
  wall: Tile[],
  playerCount: number,
  tilesPerPlayer: number,
  startIndex: number = 0
): { hands: Tile[][]; remaining: Tile[] } {
  const total = playerCount * tilesPerPlayer;
  const hands: Tile[][] = Array.from({ length: playerCount }, () => []);
  let idx = 0;
  for (let i = 0; i < total; i++) {
    const wallIdx = (startIndex + i) % wall.length;
    hands[idx].push(wall[wallIdx]);
    idx = (idx + 1) % playerCount;
  }
  // remaining: 跳过已发的牌，从 startIndex + total 开始
  const usedSet = new Set<number>();
  for (let i = startIndex; i < startIndex + total; i++) {
    usedSet.add(i % wall.length);
  }
  const remaining = wall.filter((_, i) => !usedSet.has(i));
  // 从 wall[startIndex + total] 开始排列
  const remainingStart = (startIndex + total) % wall.length;
  const remainingOrdered: Tile[] = [];
  for (let i = 0; i < wall.length - total; i++) {
    remainingOrdered.push(wall[(remainingStart + i) % wall.length]);
  }
  return { hands, remaining: remainingOrdered };
}
