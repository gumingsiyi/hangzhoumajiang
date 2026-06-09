import { Tile, Meld, FanType, HuResult, Suit } from '../types';
import { isCaishen, isSameTileType } from '../constants';

/**
 * 胡牌检测 & 番型计算
 *
 * 核心思路：将手牌中的财神分离出来，枚举财神替代哪些牌，
 * 然后用标准麻将胡牌算法检测 4面子+1雀头 或 七对。
 */

interface TileCount {
  suit: Suit;
  rank: number;
  count: number;
}

// 将手牌转为计数数组（不含财神）
function toCountArray(tiles: Tile[]): { counts: TileCount[]; caishenCount: number } {
  const map = new Map<string, TileCount>();
  let caishenCount = 0;

  for (const t of tiles) {
    if (isCaishen(t)) {
      caishenCount++;
      continue;
    }
    const key = `${t.suit}-${t.rank}`;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, { suit: t.suit, rank: t.rank as number, count: 1 });
    }
  }

  return { counts: [...map.values()], caishenCount };
}

// 检测是否能胡牌（不含副露，纯手牌部分）
// 手牌应为 2/5/8/11/14 张（减去副露后的张数）
export function canHu(handTiles: Tile[], melds: Meld[]): boolean {
  // 加上副露的牌数后，总牌数应为 14
  const totalFromMelds = melds.reduce((sum, m) => sum + m.tiles.length, 0);
  if (handTiles.length + totalFromMelds !== 14) return false;

  // 七对检测（不能有副露）
  if (melds.length === 0 && handTiles.length === 14) {
    if (isQiDui(handTiles)) return true;
  }

  // 标准胡牌：4面子+1雀头
  return isStandardHu(handTiles);
}

// 七对检测（含财神）
function isQiDui(tiles: Tile[]): boolean {
  const { counts, caishenCount } = toCountArray(tiles);
  // 每种牌需要偶数张，财神补齐
  let needCaishen = 0;
  let pairs = 0;

  for (const c of counts) {
    if (c.count % 2 === 0) {
      pairs += c.count / 2;
    } else {
      pairs += Math.floor(c.count / 2);
      needCaishen++;
    }
  }

  // 财神自己组成对
  pairs += Math.floor(caishenCount / 2);
  const leftoverCaishen = caishenCount % 2;

  // 如果有单张需要财神补齐
  if (needCaishen <= leftoverCaishen + (caishenCount - leftoverCaishen)) {
    return pairs + Math.ceil(needCaishen / 2) >= 7;
  }

  return false;
}

// 标准胡牌：4面子+1雀头
function isStandardHu(handTiles: Tile[]): boolean {
  const { counts, caishenCount } = toCountArray(handTiles);

  // 枚举雀头（将对）
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c.count >= 2) {
      // 用两张做雀头
      const remaining = counts.map(cc => ({ ...cc }));
      remaining[i].count -= 2;
      if (canFormMentsu(remaining, caishenCount)) return true;
    }
    // 用一张 + 一个财神做雀头
    if (c.count >= 1 && caishenCount >= 1) {
      const remaining = counts.map(cc => ({ ...cc }));
      remaining[i].count -= 1;
      if (canFormMentsu(remaining, caishenCount - 1)) return true;
    }
  }

  // 两个财神做雀头
  if (caishenCount >= 2) {
    if (canFormMentsu(counts, caishenCount - 2)) return true;
  }

  return false;
}

// 尝试从 startRank 开始的顺子 (startRank, startRank+1, startRank+2)
// 用财神补齐缺失的牌，返回成功时的剩余牌和剩余财神数
function tryShunzi(
  counts: TileCount[],
  suit: Suit,
  startRank: number,
  caishenCount: number,
): { next: TileCount[]; caishenLeft: number } | null {
  if (startRank < 1 || startRank > 7) return null;
  if (suit === 'feng') return null;

  const ranks = [startRank, startRank + 1, startRank + 2];
  const next = counts.map(cc => ({ ...cc }));
  let caishenUsed = 0;

  for (const r of ranks) {
    const idx = next.findIndex(cc => cc.suit === suit && cc.rank === r);
    if (idx !== -1 && next[idx].count > 0) {
      next[idx].count--;
    } else {
      caishenUsed++;
    }
  }

  if (caishenUsed > caishenCount) return null;
  return { next, caishenLeft: caishenCount - caishenUsed };
}

// 检测剩余的牌能否全部组成面子（刻子或顺子）
function canFormMentsu(counts: TileCount[], caishenCount: number): boolean {
  // 找到第一个有牌的位置
  const first = counts.findIndex(c => c.count > 0);
  if (first === -1) {
    // 全部消完，检查财神是否也用完
    return caishenCount >= 0;
  }

  const c = counts[first];

  // 尝试刻子：3 张相同
  if (c.count >= 3) {
    const next = counts.map(cc => ({ ...cc }));
    next[first].count -= 3;
    if (canFormMentsu(next, caishenCount)) return true;
  }

  // 尝试刻子：2 张 + 1 财神
  if (c.count >= 2 && caishenCount >= 1) {
    const next = counts.map(cc => ({ ...cc }));
    next[first].count -= 2;
    if (canFormMentsu(next, caishenCount - 1)) return true;
  }

  // 尝试刻子：1 张 + 2 财神
  if (c.count >= 1 && caishenCount >= 2) {
    const next = counts.map(cc => ({ ...cc }));
    next[first].count -= 1;
    if (canFormMentsu(next, caishenCount - 2)) return true;
  }

  // 尝试顺子（只有数牌可以，风牌不行）
  // 当前牌可以作为顺子的起点、中间或终点
  if (c.suit !== 'feng') {
    const rank = c.rank as number;
    const startPositions = [rank, rank - 1, rank - 2];

    for (const startRank of startPositions) {
      const result = tryShunzi(counts, c.suit, startRank, caishenCount);
      if (result) {
        if (canFormMentsu(result.next, result.caishenLeft)) return true;
      }
    }
  }

  return false;
}

// ==================== 番型计算 ====================

export function calculateFan(handTiles: Tile[], melds: Meld[], isZiMo: boolean, isGangShang: boolean = false): HuResult {
  const fanTypes: FanType[] = [];
  let totalFan = 0;

  if (isZiMo) {
    fanTypes.push('ziMo');
    totalFan += 1;
  }

  if (isGangShang && isZiMo) {
    fanTypes.push('gangShangHua');
    totalFan += 2;
  }

  // 清一色：手牌+副露全是同一花色
  if (isQingYiSe(handTiles, melds)) {
    fanTypes.push('qingYiSe');
    totalFan += 4;
  }

  // 碰碰胡：全是刻子/杠 + 一对雀头
  if (isPengPengHu(handTiles, melds)) {
    fanTypes.push('pengPengHu');
    totalFan += 2;
  }

  // 七对
  if (melds.length === 0 && handTiles.length === 14 && isQiDui(handTiles)) {
    fanTypes.push('qiDui');
    totalFan += 4;
  }

  // 财神头：雀头是财神
  if (isCaiShenTou(handTiles)) {
    fanTypes.push('caiShenTou');
    totalFan += 1;
  }

  // 平胡（默认 1 番，如果没其他牌型）
  if (fanTypes.length === 0 || (fanTypes.length === 1 && fanTypes[0] === 'ziMo')) {
    fanTypes.push('pingHu');
    totalFan += 1;
  }

  return { fan: totalFan, fanTypes, isZiMo };
}

// 清一色
function isQingYiSe(handTiles: Tile[], melds: Meld[]): boolean {
  const allTiles = [...handTiles, ...melds.flatMap(m => m.tiles)];
  // 过滤掉财神
  const nonCaishen = allTiles.filter(t => !isCaishen(t));
  if (nonCaishen.length === 0) return false;
  const suit = nonCaishen[0].suit;
  return nonCaishen.every(t => t.suit === suit);
}

// 碰碰胡
function isPengPengHu(handTiles: Tile[], melds: Meld[]): boolean {
  // 副露必须全是刻子/杠
  if (!melds.every(m => m.type === 'peng' || m.type === 'gang' || m.type === 'angang')) return false;

  // 手牌部分：找一对雀头，其余全部是刻子
  const { counts, caishenCount } = toCountArray(handTiles);

  for (let i = 0; i < counts.length; i++) {
    if (counts[i].count >= 2) {
      const remaining = counts.map(cc => ({ ...cc }));
      remaining[i].count -= 2;
      if (remaining.every(cc => cc.count % 3 === 0) && caishenCount === 0) return true;
    }
  }
  return false;
}

// 财神头：雀头是财神对
function isCaiShenTou(handTiles: Tile[]): boolean {
  const caishenInHand = handTiles.filter(t => isCaishen(t));
  return caishenInHand.length >= 2;
}
