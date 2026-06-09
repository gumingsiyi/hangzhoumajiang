/** 花色 */
export type Suit = 'wan' | 'tiao' | 'tong' | 'feng';

/** 点数 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 风牌点数: 1=东 2=南 3=西 4=北 5=中 6=发 7=白 */
export type FengRank = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 牌 */
export interface Tile {
  suit: Suit;
  rank: Rank | FengRank;
  id: number; // 唯一标识 0-135
}

/** 副露类型 */
export type MeldType = 'chi' | 'peng' | 'gang' | 'angang';

/** 副露 */
export interface Meld {
  type: MeldType;
  tiles: Tile[];
  borrowedIndex?: number;  // 从别家吃/碰/杠来的牌在 tiles 中的索引，渲染时旋转显示
}

/** 玩家状态 */
export interface PlayerState {
  hand: Tile[];
  melds: Meld[];
  discards: Tile[];
  isDealer: boolean;
}

/** 动作类型 */
export type ActionType = 'chi' | 'peng' | 'gang' | 'hu' | 'pass' | 'discard' | 'draw';

/** 可执行的动作 */
export interface Action {
  type: ActionType;
  tiles?: Tile[];       // 涉及的牌
  fromPlayer?: number;  // 来源玩家
}

/** 骰子结果 */
export interface DiceResult {
  dice1: number;   // 第一颗骰子 1-6
  dice2: number;   // 第二颗骰子 1-6
  total: number;   // 总和 2-12
  wallOwner: number; // 从哪个座位的牌墙开始抓牌 0-3
}

/** 游戏阶段 */
export type GamePhase = 'idle' | 'dealing' | 'playing' | 'finished';

/** 游戏状态 */
export interface GameState {
  players: PlayerState[];
  wall: Tile[];
  caishen: Tile;           // 财神 (白板)
  currentPlayer: number;   // 0-3
  lastDiscard: Tile | null;
  lastDiscardPlayer: number;
  lastDrawnTile: Tile | null;  // 最近摸到的牌（用于自摸时确定哪张是摸到的）
  phase: GamePhase;
  pendingActions: Action[]; // 当前可执行的动作
  turnCount: number;
  diceResult: DiceResult | null;  // 骰子结果（开局后设置）
}

/** 番型 */
export type FanType =
  | 'pingHu'       // 平胡 1番
  | 'pengPengHu'   // 碰碰胡 2番
  | 'qingYiSe'     // 清一色 4番
  | 'qiDui'        // 七对 4番
  | 'caiShenTou'   // 财神头（雀头是财神）额外1番
  | 'gangShangHua' // 杠上花
  | 'gangShangPao' // 杠上炮
  | 'qiangGangHu'  // 抢杠胡
  | 'ziMo';        // 自摸

/** 胡牌结果 */
export interface HuResult {
  fan: number;
  fanTypes: FanType[];
  isZiMo: boolean;
  winnerHand?: Tile[];     // 胡牌玩家手牌（不含自摸牌）
  winningTile?: Tile;      // 导致胡牌的那张牌（自摸牌或点炮牌）
  winnerMelds?: Meld[];    // 胡牌玩家的副露
}

/** 座位类型 */
export type SeatType = 'human' | 'ai';

/** UI 回调 */
export interface GameCallbacks {
  onStateChange: (state: GameState) => void;
  onActionRequired: (playerIndex: number, actions: Action[]) => void;
  onGameEnd: (winner: number, result: HuResult) => void;
  onMessage: (msg: string) => void;
}
