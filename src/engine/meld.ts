import { Tile, Meld, MeldType } from '../types';
import { isSameTileType, tileToString } from '../constants';

// 创建一个副露
export function createMeld(type: MeldType, tiles: Tile[]): Meld {
  return { type, tiles: [...tiles] };
}

// 验证吃组合是否合法（只能吃上家的牌，且组成顺子）
export function isValidChi(handTiles: Tile[], discardTile: Tile): Tile[][] {
  if (discardTile.suit === 'feng') return []; // 风牌不能吃

  const suit = discardTile.suit;
  const rank = discardTile.rank as number;
  const results: Tile[][] = [];

  // 需要找手牌中同花色的两张牌，和 discard 组成顺子
  const sameSuitTiles = handTiles.filter(t => t.suit === suit && t.rank !== 7); // 排除财神

  // 顺子: rank-2, rank-1, rank
  if (rank >= 3) {
    const t1 = sameSuitTiles.find(t => t.rank === rank - 2);
    const t2 = sameSuitTiles.find(t => t.rank === rank - 1 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  // 顺子: rank-1, rank, rank+1
  if (rank >= 2 && rank <= 8) {
    const t1 = sameSuitTiles.find(t => t.rank === rank - 1);
    const t2 = sameSuitTiles.find(t => t.rank === rank + 1 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  // 顺子: rank, rank+1, rank+2
  if (rank <= 7) {
    const t1 = sameSuitTiles.find(t => t.rank === rank + 1);
    const t2 = sameSuitTiles.find(t => t.rank === rank + 2 && t.id !== t1?.id);
    if (t1 && t2) results.push([t1, t2]);
  }

  return results;
}

// 验证碰是否合法
export function canPeng(handTiles: Tile[], discardTile: Tile): boolean {
  const sameType = handTiles.filter(t => isSameTileType(t, discardTile));
  return sameType.length >= 2;
}

// 验证明杠是否合法
export function canGang(handTiles: Tile[], discardTile: Tile): boolean {
  const sameType = handTiles.filter(t => isSameTileType(t, discardTile));
  return sameType.length >= 3;
}

// 验证暗杠是否合法（手牌中有 4 张相同的）
export function canAnGang(handTiles: Tile[]): Tile[][] {
  const countMap = new Map<string, { tile: Tile; count: number }>();
  for (const t of handTiles) {
    const key = `${t.suit}-${t.rank}`;
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, { tile: t, count: 1 });
    }
  }

  const results: Tile[][] = [];
  for (const [, entry] of countMap) {
    if (entry.count === 4) {
      results.push(handTiles.filter(t => isSameTileType(t, entry.tile)));
    }
  }
  return results;
}

// 验证补杠是否合法（手牌中有一张可以加到已有碰上）
export function canBuGang(handTiles: Tile[], melds: Meld[]): Tile[][] {
  const results: Tile[][] = [];
  for (const meld of melds) {
    if (meld.type === 'peng') {
      const pengType = meld.tiles[0];
      const extra = handTiles.find(t => isSameTileType(t, pengType));
      if (extra) {
        results.push([extra]);
      }
    }
  }
  return results;
}

// 获取副露的显示文本
export function meldToString(meld: Meld): string {
  const prefix = { chi: '吃', peng: '碰', gang: '杠', angang: '暗杠' }[meld.type];
  return `${prefix}[${meld.tiles.map(tileToString).join('')}]`;
}
