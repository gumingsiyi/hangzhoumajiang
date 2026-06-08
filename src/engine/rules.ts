import { Tile, Meld, MeldType, Action, ActionType, GameState } from '../types';
import { isSameTileType, isCaishen } from '../constants';
import { canPeng, canGang, canAnGang, canBuGang, isValidChi } from './meld';
import { canHu } from './pattern';

/**
 * 规则引擎：判断当前玩家可以执行哪些动作
 */

// 当别人打出牌时，检测当前玩家可以执行的动作
export function getAvailableActions(
  state: GameState,
  playerIndex: number
): Action[] {
  const player = state.players[playerIndex];
  const hand = player.hand;
  const discard = state.lastDiscard;

  if (!discard) return [];

  const actions: Action[] = [];
  const fromPlayer = state.lastDiscardPlayer;

  // 胡
  if (canHu([...hand, discard], player.melds)) {
    actions.push({ type: 'hu', tiles: [discard], fromPlayer });
  }

  // 杠
  if (canGang(hand, discard)) {
    actions.push({ type: 'gang', tiles: [discard], fromPlayer });
  }

  // 碰
  if (canPeng(hand, discard)) {
    actions.push({ type: 'peng', tiles: [discard], fromPlayer });
  }

  // 吃（只能吃上家的牌）
  const prevPlayer = (state.currentPlayer + 3) % 4;
  if (playerIndex === prevPlayer) {
    const chiOptions = isValidChi(hand, discard);
    for (const chiTiles of chiOptions) {
      actions.push({ type: 'chi', tiles: [...chiTiles, discard], fromPlayer });
    }
  }

  // 过（总是可以选择不操作）
  if (actions.length > 0) {
    actions.push({ type: 'pass' });
  }

  return actions;
}

// 自己摸牌后，检测可以执行的动作（暗杠、补杠、自摸胡）
export function getDrawActions(
  state: GameState,
  playerIndex: number
): Action[] {
  const player = state.players[playerIndex];
  const actions: Action[] = [];

  // 自摸胡
  if (canHu(player.hand, player.melds)) {
    actions.push({ type: 'hu' });
  }

  // 暗杠
  const anGangOptions = canAnGang(player.hand);
  for (const gangTiles of anGangOptions) {
    actions.push({ type: 'gang', tiles: gangTiles });
  }

  // 补杠
  const buGangOptions = canBuGang(player.hand, player.melds);
  for (const gangTile of buGangOptions) {
    actions.push({ type: 'gang', tiles: gangTile });
  }

  return actions;
}

// 执行碰
export function executePeng(hand: Tile[], melds: Meld[], discard: Tile): { hand: Tile[]; melds: Meld[] } {
  const used: Tile[] = [];
  const remaining: Tile[] = [];

  let need = 2;
  for (const t of hand) {
    if (need > 0 && isSameTileType(t, discard)) {
      used.push(t);
      need--;
    } else {
      remaining.push(t);
    }
  }

  const newMeld: Meld = { type: 'peng', tiles: [...used, discard] };
  return { hand: remaining, melds: [...melds, newMeld] };
}

// 执行吃
export function executeChi(hand: Tile[], melds: Meld[], chiTiles: Tile[], discard: Tile): { hand: Tile[]; melds: Meld[] } {
  let remaining = [...hand];
  for (const ct of chiTiles) {
    const idx = remaining.findIndex(t => t.id === ct.id);
    if (idx !== -1) {
      remaining.splice(idx, 1);
    }
  }

  const newMeld: Meld = { type: 'chi', tiles: [...chiTiles, discard] };
  return { hand: remaining, melds: [...melds, newMeld] };
}

// 执行杠
export function executeGang(hand: Tile[], melds: Meld[], gangTiles: Tile[], isAnGang: boolean): { hand: Tile[]; melds: Meld[] } {
  if (isAnGang) {
    // 暗杠：从手牌移除 4 张
    let remaining = [...hand];
    for (const gt of gangTiles) {
      const idx = remaining.findIndex(t => t.id === gt.id);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    const newMeld: Meld = { type: 'angang', tiles: gangTiles };
    return { hand: remaining, melds: [...melds, newMeld] };
  }

  // 检查是否是补杠
  const existingPeng = melds.find(m => m.type === 'peng' && isSameTileType(m.tiles[0], gangTiles[0]));
  if (existingPeng) {
    // 补杠
    const remaining = hand.filter(t => t.id !== gangTiles[0].id);
    const newMelds = melds.map(m =>
      m === existingPeng
        ? { type: 'gang' as MeldType, tiles: [...m.tiles, gangTiles[0]] }
        : m
    );
    return { hand: remaining, melds: newMelds };
  }

  // 明杠
  const remaining = hand.filter(t => t.id !== gangTiles[0]?.id);
  const newMeld: Meld = { type: 'gang', tiles: gangTiles };
  return { hand: remaining, melds: [...melds, newMeld] };
}
