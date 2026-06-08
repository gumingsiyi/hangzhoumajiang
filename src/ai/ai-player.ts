import { Tile, Action, GameState, Meld } from '../types';
import { isCaishen, isSameTileType, sortTiles } from '../constants';
import { canHu } from '../engine/pattern';
import { canPeng, canGang } from '../engine/meld';

/**
 * AI 玩家决策
 *
 * 策略：
 * 1. 能胡就胡
 * 2. 杠（明杠/暗杠/补杠）
 * 3. 碰（成刻子）
 * 4. 出牌：优先打孤张，保留财神和有用的牌
 */
export class AIPlayer {
  playerIndex: number;

  constructor(playerIndex: number) {
    this.playerIndex = playerIndex;
  }

  // 决定是否接受动作（碰/杠/胡/吃）
  decideAction(state: GameState, actions: Action[]): Action {
    // 能胡就胡
    const huAction = actions.find(a => a.type === 'hu');
    if (huAction) return huAction;

    // 杠
    const gangAction = actions.find(a => a.type === 'gang');
    if (gangAction) return gangAction;

    // 碰（简单策略：碰了能组成更多面子就碰）
    const pengAction = actions.find(a => a.type === 'peng');
    if (pengAction && this.shouldPeng(state)) return pengAction;

    // 吃（一般不吃，除非能直接胡）
    // 默认 pass
    const passAction = actions.find(a => a.type === 'pass');
    return passAction || actions[actions.length - 1];
  }

  // 是否应该碰
  private shouldPeng(state: GameState): boolean {
    const hand = state.players[this.playerIndex].hand;
    const melds = state.players[this.playerIndex].melds;
    // 简单策略：碰了之后手牌结构不太差就碰
    return melds.length < 4; // 副露不超过 4 组
  }

  // 选择要打出的牌
  chooseDiscard(state: GameState): Tile {
    const hand = [...state.players[this.playerIndex].hand];

    // 策略：优先打孤张，保留财神和成对/成刻的牌
    // 1. 先找孤张（只有一张且没有相邻牌）
    const isolated = this.findIsolatedTiles(hand);
    if (isolated.length > 0) {
      // 打点数最小的孤张
      return sortTiles(isolated)[0];
    }

    // 2. 找边张（只有一端有相邻牌）
    const edgeTiles = this.findEdgeTiles(hand);
    if (edgeTiles.length > 0) {
      return sortTiles(edgeTiles)[0];
    }

    // 3. 打最没用的牌（数量最少的）
    const least = this.findLeastUseful(hand);
    return least;
  }

  // 找孤张：没有相邻牌的单张
  private findIsolatedTiles(hand: Tile[]): Tile[] {
    const result: Tile[] = [];
    for (const tile of hand) {
      if (isCaishen(tile)) continue; // 保留财神

      const hasNeighbor = hand.some(other =>
        other.id !== tile.id &&
        other.suit === tile.suit &&
        Math.abs((other.rank as number) - (tile.rank as number)) <= 2
      );

      if (!hasNeighbor) {
        result.push(tile);
      }
    }
    return result;
  }

  // 找边张
  private findEdgeTiles(hand: Tile[]): Tile[] {
    const result: Tile[] = [];
    for (const tile of hand) {
      if (isCaishen(tile)) continue;
      if (tile.suit === 'feng') {
        // 风牌单独算孤张
        const count = hand.filter(t => isSameTileType(t, tile)).length;
        if (count === 1) result.push(tile);
        continue;
      }

      const rank = tile.rank as number;
      const hasLeft = hand.some(t => t.id !== tile.id && t.suit === tile.suit && t.rank === rank - 1);
      const hasRight = hand.some(t => t.id !== tile.id && t.suit === tile.suit && t.rank === rank + 1);

      // 只有一端有邻居
      if ((hasLeft && !hasRight) || (!hasLeft && hasRight)) {
        const count = hand.filter(t => isSameTileType(t, tile)).length;
        if (count === 1) result.push(tile);
      }
    }
    return result;
  }

  // 找最没用的牌
  private findLeastUseful(hand: Tile[]): Tile {
    const sorted = sortTiles(hand);
    // 排除财神
    const nonCaishen = sorted.filter(t => !isCaishen(t));
    return nonCaishen[0] || sorted[0];
  }
}
