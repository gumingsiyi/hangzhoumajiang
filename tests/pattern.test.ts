import { describe, it, expect } from 'vitest';
import { Tile, Meld } from '../src/types';
import { canHu, calculateFan } from '../src/engine/pattern';

// 辅助：快速创建牌
function tile(suit: string, rank: number, id?: number): Tile {
  return { suit: suit as any, rank: rank as any, id: id ?? Math.floor(Math.random() * 10000) };
}

function caishen(id?: number): Tile {
  return { suit: 'feng', rank: 7, id: id ?? Math.floor(Math.random() * 10000) };
}

describe('胡牌检测 canHu', () => {
  it('标准胡牌：4面子+1雀头', () => {
    // 1万1万 2万3万4万 5万6万7万 8万8万8万 9万9万9万
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 9, 11), tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('七对', () => {
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 2, 3),
      tile('wan', 3, 4), tile('wan', 3, 5),
      tile('tiao', 4, 6), tile('tiao', 4, 7),
      tile('tiao', 5, 8), tile('tiao', 5, 9),
      tile('tiao', 6, 10), tile('tiao', 6, 11),
      tile('tong', 7, 12), tile('tong', 7, 13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('财神替代：缺一张用财神补', () => {
    // 1万1万 2万3万[财神] 5万6万7万 8万8万8万 9万9万9万
    // 财神替代4万
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), caishen(4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 9, 11), tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('财神做雀头', () => {
    // 两个财神做雀头 + 4组面子
    const hand = [
      caishen(0), caishen(1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 9, 11), tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('不能胡的牌', () => {
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 9, 11), tile('wan', 9, 12), tile('tiao', 1, 13),
    ];
    expect(canHu(hand, [])).toBe(false);
  });

  it('带副露的胡牌', () => {
    // 手牌 5 张 + 3 组副露 = 14 张
    const melds: Meld[] = [
      { type: 'peng', tiles: [tile('wan', 8, 20), tile('wan', 8, 21), tile('wan', 8, 22)] },
      { type: 'peng', tiles: [tile('wan', 9, 23), tile('wan', 9, 24), tile('wan', 9, 25)] },
      { type: 'chi', tiles: [tile('wan', 2, 26), tile('wan', 3, 27), tile('wan', 4, 28)] },
    ];
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 5, 2), tile('wan', 6, 3), tile('wan', 7, 4),
    ];
    expect(canHu(hand, melds)).toBe(true);
  });
});

describe('番型计算 calculateFan', () => {
  it('平胡自摸（混花色）', () => {
    // 混合花色，不是清一色
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('tiao', 5, 5), tile('tiao', 6, 6), tile('tiao', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('tong', 9, 11), tile('tong', 9, 12), tile('tong', 9, 13),
    ];
    const result = calculateFan(hand, [], true);
    expect(result.fanTypes).toContain('ziMo');
    expect(result.fanTypes).toContain('pingHu');
    expect(result.fan).toBe(2); // 自摸1 + 平胡1
  });

  it('清一色（不含平胡叠加）', () => {
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 9, 11), tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    const result = calculateFan(hand, [], false);
    expect(result.fanTypes).toContain('qingYiSe');
    expect(result.fanTypes).not.toContain('pingHu'); // 清一色已包含，不叠加平胡
    expect(result.fan).toBe(4); // 清一色4
  });
});

describe('顺子检测边界', () => {
  it('财神做顺子中间牌（8-9-财神做7）', () => {
    // 8万9万 + 财神替代7万 → 7-8-9顺子
    const hand = [
      tile('wan', 1, 0), tile('wan', 1, 1),
      tile('wan', 2, 2), tile('wan', 3, 3), tile('wan', 4, 4),
      tile('wan', 5, 5), tile('wan', 6, 6), tile('wan', 7, 7),
      tile('wan', 8, 8), tile('wan', 8, 9), tile('wan', 8, 10),
      tile('wan', 8, 11), tile('wan', 9, 12), caishen(13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('财神做顺子末尾牌（1万2万+财神做3万）', () => {
    const hand = [
      tile('wan', 1, 0), tile('wan', 2, 1), caishen(2),
      tile('wan', 4, 3), tile('wan', 5, 4), tile('wan', 6, 5),
      tile('wan', 7, 6), tile('wan', 7, 7), tile('wan', 7, 8),
      tile('wan', 9, 9), tile('wan', 9, 10), tile('wan', 9, 11),
      tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    // 1-2-财(3) 4-5-6 7-7-7 9-9-9 9-9 雀头
    expect(canHu(hand, [])).toBe(true);
  });

  it('财神做顺子开头牌（财神+4万5万做3万）', () => {
    const hand = [
      caishen(0), tile('wan', 4, 1), tile('wan', 5, 2),
      tile('wan', 6, 3), tile('wan', 7, 4), tile('wan', 8, 5),
      tile('wan', 1, 6), tile('wan', 1, 7), tile('wan', 1, 8),
      tile('wan', 9, 9), tile('wan', 9, 10), tile('wan', 9, 11),
      tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    // 财(3)-4-5 6-7-8 1-1-1 9-9-9 9-9 雀头
    expect(canHu(hand, [])).toBe(true);
  });

  it('多个顺子中间都需要财神', () => {
    // 1万2万+财(3) 4万5万+财(6) 7万7万7万 9万9万 9万9万9万
    const hand = [
      tile('wan', 1, 0), tile('wan', 2, 1), caishen(2),
      tile('wan', 4, 3), tile('wan', 5, 4), caishen(5),
      tile('wan', 7, 6), tile('wan', 7, 7), tile('wan', 7, 8),
      tile('wan', 9, 9), tile('wan', 9, 10), tile('wan', 9, 11),
      tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    expect(canHu(hand, [])).toBe(true);
  });

  it('两个财神做顺子（1万+财+财做1-2-3）', () => {
    const hand = [
      tile('wan', 1, 0), caishen(1), caishen(2),
      tile('wan', 5, 3), tile('wan', 6, 4), tile('wan', 7, 5),
      tile('wan', 4, 6), tile('wan', 4, 7), tile('wan', 4, 8),
      tile('wan', 9, 9), tile('wan', 9, 10), tile('wan', 9, 11),
      tile('wan', 9, 12), tile('wan', 9, 13),
    ];
    // 1-财(2)-财(3) 5-6-7 4-4-4 9-9-9 9-9 雀头
    expect(canHu(hand, [])).toBe(true);
  });
});
