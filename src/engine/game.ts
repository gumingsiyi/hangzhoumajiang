import { GameState, PlayerState, Tile, Meld, Action, GameCallbacks, GamePhase } from '../types';
import { isCaishen, sortTiles, tileToString } from '../constants';
import { createDeck, drawTile, dealTiles, rollDice, getWallStartIndex } from './deck';
import { Hand } from './hand';
import { canHu, calculateFan } from './pattern';
import { getAvailableActions, getDrawActions, executePeng, executeChi, executeGang } from './rules';

/**
 * 杭州麻将游戏主循环
 *
 * 流程：发牌 → 摸牌 → 出牌 → 检查动作 → 循环
 */
export class Game {
  state: GameState;
  callbacks: GameCallbacks;
  hands: Hand[]; // 方便操作的手牌管理器

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.state = this.createInitialState();
    this.hands = [];
  }

  private createInitialState(): GameState {
    return {
      players: [],
      wall: [],
      caishen: { suit: 'feng', rank: 7, id: -1 },
      currentPlayer: 0,
      lastDiscard: null,
      lastDiscardPlayer: -1,
      lastDrawnTile: null,
      phase: 'idle',
      pendingActions: [],
      turnCount: 0,
      diceResult: null,
    };
  }

  // 开始新一局
  startGame(): void {
    const wall = createDeck();
    const caishen = wall.find(t => isCaishen(t)) || { suit: 'feng' as const, rank: 7 as const, id: -1 };

    // 掷骰子
    const diceResult = rollDice();
    const startIndex = getWallStartIndex(diceResult);

    // 发牌：每人 13 张，起手玩家 14 张，从骰子决定的位置开始
    const starter = diceResult.wallOwner;
    const { hands, remaining } = dealTiles(wall, 4, 13, startIndex);

    // 起手玩家多摸一张
    const dealerDraw = remaining[0];
    hands[starter].push(dealerDraw);
    const wallAfterDealer = remaining.slice(1);

    // 初始化玩家状态
    const players: PlayerState[] = hands.map((hand, i) => ({
      hand: sortTiles(hand),
      melds: [],
      discards: [],
      isDealer: i === starter,
    }));

    this.hands = hands.map(h => new Hand(h));

    this.state = {
      players,
      wall: wallAfterDealer,
      caishen,
      currentPlayer: starter,
      lastDiscard: null,
      lastDiscardPlayer: -1,
      lastDrawnTile: null,
      phase: 'playing',
      pendingActions: [],
      turnCount: 0,
      diceResult,
    };

    this.callbacks.onMessage(
      `庄家掷出 ${diceResult.dice1} 和 ${diceResult.dice2}（共 ${diceResult.total} 点），` +
      `从玩家${starter} 门前抓牌，玩家${starter} 先出牌`
    );
    this.callbacks.onStateChange(this.state);

    // 起手玩家先出牌
    this.callbacks.onActionRequired(starter, [{ type: 'discard' }]);
  }

  // 玩家执行动作
  executeAction(playerIndex: number, action: Action): void {
    if (this.state.phase !== 'playing') return;

    // 清除待处理动作（当前动作已被消费）
    this.state.pendingActions = [];

    switch (action.type) {
      case 'discard':
        this.handleDiscard(playerIndex, action.tiles![0]);
        break;
      case 'hu':
        this.handleHu(playerIndex);
        break;
      case 'peng':
        this.handlePeng(playerIndex, action);
        break;
      case 'chi':
        this.handleChi(playerIndex, action);
        break;
      case 'gang':
        this.handleGang(playerIndex, action);
        break;
      case 'pass':
        this.handlePass(playerIndex);
        break;
    }
  }

  // 出牌
  private handleDiscard(playerIndex: number, tile: Tile): void {
    const player = this.state.players[playerIndex];

    // 从手牌移除
    const hand = this.hands[playerIndex];
    const removed = hand.remove(tile.id);
    if (!removed) return;

    // 同步到 state
    player.hand = [...hand.tiles];
    player.discards.push(removed);
    this.state.lastDiscard = removed;
    this.state.lastDiscardPlayer = playerIndex;

    this.callbacks.onMessage(`玩家${playerIndex}打出 ${tileToString(removed)}`);
    this.callbacks.onStateChange(this.state);

    // 检查其他玩家是否可以碰/杠/胡
    this.checkOtherActions(playerIndex, removed);
  }

  // 检查其他玩家对打出的牌能做什么
  private checkOtherActions(fromPlayer: number, discard: Tile): void {
    const allActions: { player: number; actions: Action[] }[] = [];

    for (let i = 0; i < 4; i++) {
      if (i === fromPlayer) continue;
      const actions = getAvailableActions(this.state, i);
      if (actions.length > 0) {
        allActions.push({ player: i, actions });
      }
    }

    // 优先级：胡 > 杠 > 碰 > 吃
    // 找到最高优先级的动作
    const huAction = allActions.find(a => a.actions.some(ac => ac.type === 'hu'));
    const gangAction = allActions.find(a => a.actions.some(ac => ac.type === 'gang'));
    const pengAction = allActions.find(a => a.actions.some(ac => ac.type === 'peng'));
    const chiAction = allActions.find(a => a.actions.some(ac => ac.type === 'chi'));

    const priority = huAction || gangAction || pengAction || chiAction;

    if (priority) {
      this.state.currentPlayer = priority.player;
      this.state.pendingActions = priority.actions;
      this.callbacks.onActionRequired(priority.player, priority.actions);
    } else {
      // 没人要，下一家摸牌
      this.nextTurn(fromPlayer);
    }
  }

  // 处理"过"：如果有多个玩家有动作，尝试下一个；否则下一家摸牌
  private handlePass(playerIndex: number): void {
    // 简化：直接跳到下一家摸牌
    this.nextTurn(this.state.lastDiscardPlayer);
  }

  // 下一个玩家摸牌
  private nextTurn(fromPlayer: number): void {
    const nextPlayer = (fromPlayer + 1) % 4;
    this.state.currentPlayer = nextPlayer;
    this.state.lastDiscard = null;
    this.state.lastDiscardPlayer = -1;
    this.state.turnCount++;

    // 摸牌
    const { tile, remaining } = drawTile(this.state.wall);
    this.state.wall = remaining;

    if (!tile) {
      // 流局
      this.state.phase = 'finished';
      this.callbacks.onMessage('流局！牌墙已空');
      this.callbacks.onStateChange(this.state);
      return;
    }

    // 记录摸到的牌
    this.state.lastDrawnTile = tile;

    // 加入手牌
    this.hands[nextPlayer].add(tile);
    this.state.players[nextPlayer].hand = [...this.hands[nextPlayer].tiles];

    this.callbacks.onMessage(`玩家${nextPlayer}摸牌`);
    this.callbacks.onStateChange(this.state);

    // 检查摸牌后的动作（自摸胡、暗杠、补杠）
    const drawActions = getDrawActions(this.state, nextPlayer);

    if (drawActions.some(a => a.type === 'hu') || drawActions.length > 0) {
      // 有额外动作可选，交给回调处理（AI 或人类各自决定）
      this.state.pendingActions = drawActions;
      this.callbacks.onActionRequired(nextPlayer, drawActions);
      return;
    }

    // 出牌
    this.callbacks.onActionRequired(nextPlayer, [{ type: 'discard' }]);
  }

  // 胡牌
  private handleHu(playerIndex: number): void {
    const player = this.state.players[playerIndex];
    const isZiMo = this.state.lastDiscardPlayer === -1;
    const result = calculateFan(player.hand, player.melds, isZiMo);

    // 计算胡牌牌型：手牌和摸到的牌分开
    let winnerHand: Tile[];
    let winningTile: Tile;

    if (isZiMo) {
      // 自摸：摸到的牌已在手牌中，需要分离出来
      winningTile = this.state.lastDrawnTile!;
      winnerHand = [...player.hand];
      const idx = winnerHand.findIndex(t => t.id === winningTile.id);
      if (idx !== -1) winnerHand.splice(idx, 1);
    } else {
      // 点炮：点炮牌不在手牌中
      winningTile = this.state.lastDiscard!;
      winnerHand = [...player.hand];
    }

    result.winnerHand = sortTiles(winnerHand);
    result.winningTile = winningTile;
    result.winnerMelds = [...player.melds];

    this.state.phase = 'finished';
    this.callbacks.onMessage(`🎉 玩家${playerIndex}胡牌！${result.fan}番`);
    this.callbacks.onGameEnd(playerIndex, result);
    this.callbacks.onStateChange(this.state);
  }

  // 碰
  private handlePeng(playerIndex: number, action: Action): void {
    const discard = action.tiles![0];
    const { hand, melds } = executePeng(
      this.hands[playerIndex].tiles,
      this.state.players[playerIndex].melds,
      discard
    );

    this.hands[playerIndex] = new Hand(hand);
    this.state.players[playerIndex].hand = hand;
    this.state.players[playerIndex].melds = melds;

    // 从弃牌堆移除被碰的牌
    const discards = this.state.players[this.state.lastDiscardPlayer].discards;
    discards.pop();
    this.state.lastDiscard = null;

    this.callbacks.onMessage(`玩家${playerIndex}碰 ${tileToString(discard)}`);
    this.callbacks.onStateChange(this.state);

    // 碰完后出牌
    this.state.currentPlayer = playerIndex;
    this.callbacks.onActionRequired(playerIndex, [{ type: 'discard' }]);
  }

  // 吃
  private handleChi(playerIndex: number, action: Action): void {
    const tiles = action.tiles!;
    const discard = tiles[tiles.length - 1]; // 最后一张是别人打的
    const chiTiles = tiles.slice(0, -1);     // 前两张是自己的

    const { hand, melds } = executeChi(
      this.hands[playerIndex].tiles,
      this.state.players[playerIndex].melds,
      chiTiles,
      discard
    );

    this.hands[playerIndex] = new Hand(hand);
    this.state.players[playerIndex].hand = hand;
    this.state.players[playerIndex].melds = melds;

    // 从弃牌堆移除被吃的牌
    const chiDiscards = this.state.players[this.state.lastDiscardPlayer].discards;
    chiDiscards.pop();
    this.state.lastDiscard = null;
    this.callbacks.onStateChange(this.state);

    // 吃完后出牌
    this.state.currentPlayer = playerIndex;
    this.callbacks.onActionRequired(playerIndex, [{ type: 'discard' }]);
  }

  // 杠
  private handleGang(playerIndex: number, action: Action): void {
    const tiles = action.tiles!;
    const isAnGang = !action.fromPlayer && action.fromPlayer !== 0;

    const { hand, melds } = executeGang(
      this.hands[playerIndex].tiles,
      this.state.players[playerIndex].melds,
      tiles,
      isAnGang
    );

    this.hands[playerIndex] = new Hand(hand);
    this.state.players[playerIndex].hand = hand;
    this.state.players[playerIndex].melds = melds;

    // 明杠：从弃牌堆移除被杠的牌（暗杠不涉及弃牌）
    if (action.fromPlayer !== undefined) {
      const gangDiscards = this.state.players[this.state.lastDiscardPlayer].discards;
      gangDiscards.pop();
      this.state.lastDiscard = null;
    }

    this.callbacks.onMessage(`玩家${playerIndex}杠`);
    this.callbacks.onStateChange(this.state);

    // 杠后补摸一张
    const { tile, remaining } = drawTile(this.state.wall);
    this.state.wall = remaining;

    if (tile) {
      this.state.lastDrawnTile = tile;
      this.hands[playerIndex].add(tile);
      this.state.players[playerIndex].hand = [...this.hands[playerIndex].tiles];
      this.state.currentPlayer = playerIndex;
      this.state.lastDiscardPlayer = -1; // 杠后摸牌，重置为自摸状态

      // 检查杠上花
      const drawActions = getDrawActions(this.state, playerIndex);
      if (drawActions.some(a => a.type === 'hu')) {
        this.handleHu(playerIndex);
        return;
      }

      this.callbacks.onActionRequired(playerIndex, [{ type: 'discard' }]);
    }
  }

  // 获取当前状态（供 UI 使用）
  getState(): GameState {
    return this.state;
  }
}
