/**
 * 游戏房间 — 管理一桌麻将
 *
 * - 维护 4 个座位（人类 / AI）
 * - 游戏引擎运行在房间内
 * - AI 座位自动决策，人类座位通过 WebSocket 通信
 */

import { Game } from '../engine/game';
import { AIPlayer } from '../ai/ai-player';
import type { Action, GameState, HuResult, SeatType } from '../types';
import type { ServerMessage, SanitizedGameState, SanitizedPlayerState } from './protocol';
import type { WebSocket } from 'ws';

export interface Player {
  ws: WebSocket | null;  // null = AI
  seat: number;
  seatType: SeatType;
}

export class GameRoom {
  readonly id: string;
  players: (Player | null)[] = [null, null, null, null];
  game: Game;
  aiPlayers: Map<number, AIPlayer> = new Map();
  private messageLog: string[] = [];

  constructor(id: string) {
    this.id = id;
    this.game = new Game({
      onStateChange: (state) => this.broadcastState(state),
      onActionRequired: (playerIndex, actions) => this.handleActionRequired(playerIndex, actions),
      onGameEnd: (winner, result) => this.handleGameEnd(winner, result),
      onMessage: (msg) => this.handleMessage(msg),
    });
  }

  // ==================== 玩家管理 ====================

  /** 玩家加入，返回分配的座位号，-1 表示满员 */
  join(ws: WebSocket): number {
    const seat = this.players.findIndex(p => p === null);
    if (seat === -1) return -1;

    this.players[seat] = { ws, seat, seatType: 'human' };

    // 通知所有人
    this.broadcast({ type: 'player_joined', seat, seatTypes: this.getSeatTypes() });

    return seat;
  }

  /** 玩家离开 */
  leave(ws: WebSocket): void {
    const idx = this.players.findIndex(p => p?.ws === ws);
    if (idx === -1) return;

    this.players[idx] = null;
    // 如果游戏进行中，该座位转为 AI
    if (this.game.state.phase === 'playing') {
      this.convertToAI(idx);
    }

    this.broadcast({ type: 'player_left', seat: idx, seatTypes: this.getSeatTypes() });
  }

  /** 将某个座位转为 AI */
  private convertToAI(seat: number): void {
    if (!this.aiPlayers.has(seat)) {
      this.aiPlayers.set(seat, new AIPlayer(seat));
    }
    // 如果当前轮到该座位，立即执行 AI 决策
    if (this.game.state.currentPlayer === seat) {
      const actions = this.game.state.pendingActions;
      if (actions.length > 0) {
        this.scheduleAIAction(seat, actions);
      } else {
        // 需要出牌
        this.scheduleAIAction(seat, [{ type: 'discard' }]);
      }
    }
  }

  /** 获取每个座位的类型 */
  getSeatTypes(): SeatType[] {
    return this.players.map(p => p?.seatType ?? 'ai');
  }

  /** 是否有人类玩家 */
  hasHumanPlayers(): boolean {
    return this.players.some(p => p !== null);
  }

  /** 是否已有游戏在进行 */
  isPlaying(): boolean {
    return this.game.state.phase === 'playing';
  }

  // ==================== 游戏控制 ====================

  /** 开始新一局（至少有 1 个人类玩家） */
  startGame(): void {
    // 确保 AI 座位有 AIPlayer 实例
    for (let i = 0; i < 4; i++) {
      if (this.players[i] === null) {
        this.convertToAI(i);
      }
    }
    this.messageLog = [];
    this.game.startGame();
  }

  /** 人类玩家提交动作 */
  submitAction(ws: WebSocket, action: Action): void {
    const player = this.players.find(p => p?.ws === ws);
    if (!player) return;

    // 验证是轮到该玩家
    if (this.game.state.currentPlayer !== player.seat) return;

    this.game.executeAction(player.seat, action);
  }

  // ==================== 游戏回调处理 ====================

  private handleActionRequired(playerIndex: number, actions: Action[]): void {
    const player = this.players[playerIndex];

    if (!player || player.seatType === 'ai') {
      // AI 座位：自动决策
      this.scheduleAIAction(playerIndex, actions);
    } else {
      // 人类座位：通过 WebSocket 发送
      this.sendTo(player.ws, { type: 'action_required', actions });
    }
  }

  private handleGameEnd(winner: number, result: HuResult): void {
    this.broadcast({ type: 'game_end', winner, result });
  }

  private handleMessage(msg: string): void {
    this.messageLog.push(msg);
    this.broadcast({ type: 'message', text: msg });
  }

  // ==================== AI 决策 ====================

  private scheduleAIAction(playerIndex: number, actions: Action[]): void {
    setTimeout(() => {
      if (this.game.state.phase !== 'playing') return;
      if (this.game.state.currentPlayer !== playerIndex) return;

      let ai = this.aiPlayers.get(playerIndex);
      if (!ai) {
        ai = new AIPlayer(playerIndex);
        this.aiPlayers.set(playerIndex, ai);
      }

      const state = this.game.getState();
      let action: Action;

      if (actions.length === 1 && actions[0].type === 'discard') {
        // 只需要出牌
        const discard = ai.chooseDiscard(state);
        action = { type: 'discard', tiles: [discard] };
      } else {
        // 选择动作（碰/杠/胡/吃/过）
        action = ai.decideAction(state, actions);
      }

      this.game.executeAction(playerIndex, action);
    }, 500);
  }

  // ==================== 网络通信 ====================

  /** 广播游戏状态给所有人类玩家（每人只能看到自己的手牌） */
  private broadcastState(state: GameState): void {
    for (const player of this.players) {
      if (!player) continue;
      const sanitized = this.sanitizeState(state, player.seat);
      this.sendTo(player.ws, { type: 'state_update', state: sanitized });
    }
  }

  /** 广播消息给所有人类玩家 */
  private broadcast(msg: ServerMessage): void {
    for (const player of this.players) {
      if (!player) continue;
      this.sendTo(player.ws, msg);
    }
  }

  /** 发送消息给单个玩家 */
  private sendTo(ws: WebSocket | null, msg: ServerMessage): void {
    if (!ws) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // 发送失败，忽略
    }
  }

  /** 脱敏游戏状态：其他玩家只显示手牌数量 */
  sanitizeState(state: GameState, forSeat: number): SanitizedGameState {
    const players: SanitizedPlayerState[] = state.players.map((p, i) => {
      if (i === forSeat) {
        // 自己：显示完整手牌
        return {
          handCount: p.hand.length,
          melds: p.melds,
          discards: p.discards,
          isDealer: p.isDealer,
          seatType: this.players[i]?.seatType ?? 'ai',
        };
      }
      // 其他人：只显示数量
      return {
        handCount: p.hand.length,
        melds: p.melds,
        discards: p.discards,
        isDealer: p.isDealer,
        seatType: this.players[i]?.seatType ?? 'ai',
      };
    });

    return {
      players,
      wallCount: state.wall.length,
      caishen: state.caishen,
      currentPlayer: state.currentPlayer,
      lastDiscard: state.lastDiscard,
      lastDiscardPlayer: state.lastDiscardPlayer,
      phase: state.phase,
      turnCount: state.turnCount,
      diceResult: state.diceResult,
      myHand: state.players[forSeat]?.hand ?? [],
    };
  }
}
