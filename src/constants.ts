import { Suit, Tile, Rank, FengRank } from './types';

export const SUITS: Suit[] = ['wan', 'tiao', 'tong'];
export const RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const FENG_RANKS: FengRank[] = [1, 2, 3, 4, 5, 6, 7];

// 风牌名称
export const FENG_NAMES: Record<FengRank, string> = {
  1: '东', 2: '南', 3: '西', 4: '北', 5: '中', 6: '发', 7: '白',
};

// 花色中文名
export const SUIT_NAMES: Record<Suit, string> = {
  wan: '万', tiao: '条', tong: '筒', feng: '风',
};

// 每种牌 4 张
export const TILE_COUNT_PER_KIND = 4;

// 财神固定为白板
export const CAISHEN_TILE: Omit<Tile, 'id'> = { suit: 'feng', rank: 7 };

// 创建完整的 136 张牌
export function createAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  // 万条筒各 1-9，每种 4 张
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      for (let i = 0; i < TILE_COUNT_PER_KIND; i++) {
        tiles.push({ suit, rank, id: id++ });
      }
    }
  }

  // 风牌：东南西北中发白，每种 4 张
  for (const rank of FENG_RANKS) {
    for (let i = 0; i < TILE_COUNT_PER_KIND; i++) {
      tiles.push({ suit: 'feng', rank, id: id++ });
    }
  }

  return tiles;
}

// 牌的显示文本
export function tileToString(tile: Tile): string {
  if (tile.suit === 'feng') {
    return FENG_NAMES[tile.rank as FengRank];
  }
  return `${tile.rank}${SUIT_NAMES[tile.suit]}`;
}

// 比较两张牌是否同一种类（忽略 id）
export function isSameTileType(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

// 牌排序用的权重
export function tileWeight(tile: Tile): number {
  const suitOrder: Record<Suit, number> = { wan: 0, tiao: 100, tong: 200, feng: 300 };
  return suitOrder[tile.suit] + (tile.rank as number);
}

// 排序手牌
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => tileWeight(a) - tileWeight(b));
}

// 是否是财神（白板）
export function isCaishen(tile: Tile): boolean {
  return tile.suit === 'feng' && tile.rank === 7;
}

// 统计手牌中每种牌的数量
export function countTiles(tiles: Tile[]): Map<string, { tile: Omit<Tile, 'id'>; count: number }> {
  const map = new Map<string, { tile: Omit<Tile, 'id'>; count: number }>();
  for (const t of tiles) {
    const key = `${t.suit}-${t.rank}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { tile: { suit: t.suit, rank: t.rank }, count: 1 });
    }
  }
  return map;
}
