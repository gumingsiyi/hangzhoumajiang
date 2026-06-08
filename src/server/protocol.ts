/**
 * 多人游戏消息协议
 *
 * 客户端和服务器之间通过 JSON 消息通信
 */

import type { Action, GameState, HuResult, Tile, Meld, GamePhase } from '../types';

// ==================== 座位类型 ====================

export type SeatType = 'human' | 'ai';

// ==================== 脱敏后的游戏状态（发送给客户端） ====================

/** 对手只显示手牌数量，不暴露具体牌面 */
export interface SanitizedPlayerState {
  handCount: number;      // 手牌数量
  melds: Meld[];
  discards: Tile[];
  isDealer: boolean;
  seatType: SeatType;     // 人类还是 AI
}

export interface SanitizedGameState {
  players: SanitizedPlayerState[];
  wallCount: number;       // 牌墙剩余数量
  caishen: Tile;
  currentPlayer: number;
  lastDiscard: Tile | null;
  lastDiscardPlayer: number;
  phase: GamePhase;
  turnCount: number;
  // 当前玩家自己的完整手牌（只有自己能看到）
  myHand: Tile[];
}

// ==================== 服务器 → 客户端 ====================

export interface SeatAssignedMsg {
  type: 'seat_assigned';
  seat: number;
  seatTypes: SeatType[];
}

export interface StateUpdateMsg {
  type: 'state_update';
  state: SanitizedGameState;
}

export interface ActionRequiredMsg {
  type: 'action_required';
  actions: Action[];
}

export interface GameMessageMsg {
  type: 'message';
  text: string;
}

export interface GameEndMsg {
  type: 'game_end';
  winner: number;
  result: HuResult;
}

export interface PlayerJoinedMsg {
  type: 'player_joined';
  seat: number;
  seatTypes: SeatType[];
}

export interface PlayerLeftMsg {
  type: 'player_left';
  seat: number;
  seatTypes: SeatType[];
}

export type ServerMessage =
  | SeatAssignedMsg
  | StateUpdateMsg
  | ActionRequiredMsg
  | GameMessageMsg
  | GameEndMsg
  | PlayerJoinedMsg
  | PlayerLeftMsg;

// ==================== 客户端 → 服务器 ====================

export interface ClientActionMsg {
  type: 'action';
  action: Action;
}

export interface ClientRestartMsg {
  type: 'restart';
}

export type ClientMessage = ClientActionMsg | ClientRestartMsg;
