import type { Tile, Action, HuResult } from '../types';
import type { SanitizedGameState, ServerMessage, SeatType } from '../server/protocol';
import { renderHand, renderDiscards } from './hand-view';
import { renderActionBar } from './action-bar';
import { renderInfoPanel, renderGameOver, addMessage } from './info-panel';

/**
 * 多人麻将客户端
 *
 * 通过 WebSocket 连接服务器，发送/接收游戏消息
 */
export class App {
  private ws: WebSocket | null = null;
  private roomId: string;
  private mySeat: number = -1;
  private seatTypes: SeatType[] = ['ai', 'ai', 'ai', 'ai'];
  private gameState: SanitizedGameState | null = null;
  private pendingActions: Action[] = [];
  private selectedTileId: number | null = null;
  private lastHandTileIds: Set<number> = new Set();
  private newlyDrawnTileId: number | null = null;

  // DOM 元素
  private elPlayerHand!: HTMLElement;
  private elPlayerMelds!: HTMLElement;
  private elDiscards!: HTMLElement[];
  private elOppHands!: HTMLElement[];
  private elActionBar!: HTMLElement;
  private elInfoPanel!: HTMLElement;
  private elMessageLog!: HTMLElement;
  private elGameOver!: HTMLElement;
  private elPlayerLabels!: HTMLElement[];
  private elStatus!: HTMLElement;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.initDOM();
    this.connect();
  }

  private initDOM(): void {
    const app = document.getElementById('app')!;
    app.innerHTML = '';

    // 牌桌
    const table = document.createElement('div');
    table.className = 'game-table';

    // 对手手牌（3 个对手：上、左、右）
    this.elOppHands = [];
    this.elPlayerLabels = [];
    for (let i = 0; i < 3; i++) {
      const area = document.createElement('div');
      area.className = `player-area ${['top', 'left', 'right'][i]}`;
      const label = document.createElement('div');
      label.className = 'player-label';
      label.textContent = `玩家${i + 1}`;
      area.appendChild(label);
      this.elPlayerLabels.push(label);
      const handEl = document.createElement('div');
      handEl.className = 'hand-tiles';
      area.appendChild(handEl);
      table.appendChild(area);
      this.elOppHands.push(handEl);
    }

    // 玩家区域（底部）
    const playerArea = document.createElement('div');
    playerArea.className = 'player-area bottom';

    const playerLabel = document.createElement('div');
    playerLabel.className = 'player-label';
    playerLabel.textContent = '你 (玩家0)';
    playerArea.appendChild(playerLabel);
    this.elPlayerLabels.push(playerLabel);

    this.elPlayerMelds = document.createElement('div');
    this.elPlayerMelds.className = 'melds-area';
    playerArea.appendChild(this.elPlayerMelds);

    this.elPlayerHand = document.createElement('div');
    this.elPlayerHand.className = 'hand-tiles';
    playerArea.appendChild(this.elPlayerHand);

    table.appendChild(playerArea);

    // 弃牌区（牌桌中央，4个区域按方位排列）
    this.elDiscards = [];
    const centerDiscard = document.createElement('div');
    centerDiscard.className = 'center-discard';
    centerDiscard.style.position = 'absolute';
    centerDiscard.style.top = '50%';
    centerDiscard.style.left = '50%';
    centerDiscard.style.transform = 'translate(-50%, -50%)';
    table.appendChild(centerDiscard);

    // 中央空隙
    const centerGap = document.createElement('div');
    centerGap.className = 'center-gap';
    centerDiscard.appendChild(centerGap);

    // 布局：top 在上，left 在左，right 在右，bottom 在下
    const discardPositions = ['discard-top', 'discard-left', 'discard-right', 'discard-bottom'];
    for (let i = 0; i < 4; i++) {
      const discardArea = document.createElement('div');
      discardArea.className = `discard-area ${discardPositions[i]}`;
      centerDiscard.appendChild(discardArea);
      this.elDiscards.push(discardArea);
    }

    app.appendChild(table);

    // 操作按钮栏
    this.elActionBar = document.createElement('div');
    this.elActionBar.className = 'action-bar';
    app.appendChild(this.elActionBar);

    // 信息面板
    this.elInfoPanel = document.createElement('div');
    this.elInfoPanel.className = 'info-panel';
    app.appendChild(this.elInfoPanel);

    // 消息日志
    this.elMessageLog = document.createElement('div');
    this.elMessageLog.className = 'message-log';
    app.appendChild(this.elMessageLog);

    // 游戏结束遮罩
    this.elGameOver = document.createElement('div');
    app.appendChild(this.elGameOver);

    // 连接状态
    this.elStatus = document.createElement('div');
    this.elStatus.className = 'connection-status';
    this.elStatus.textContent = '连接中...';
    app.appendChild(this.elStatus);
  }

  // ==================== WebSocket 连接 ====================

  private connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.host}/ws?room=${this.roomId}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.elStatus.textContent = '已连接，等待分配座位...';
      this.elStatus.classList.add('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data as string);
        this.handleMessage(msg);
      } catch {
        // 忽略非法消息
      }
    };

    this.ws.onclose = () => {
      this.elStatus.textContent = '连接断开，刷新页面重连';
      this.elStatus.classList.remove('connected');
      this.elStatus.classList.add('disconnected');
    };

    this.ws.onerror = () => {
      this.elStatus.textContent = '连接失败，请检查服务器';
    };
  }

  private send(msg: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // ==================== 消息处理 ====================

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'seat_assigned':
        this.mySeat = msg.seat;
        this.seatTypes = msg.seatTypes;
        this.updatePlayerLabels();
        this.elStatus.textContent = `你是 玩家${this.mySeat}`;
        addMessage(this.elMessageLog, `你加入了游戏，座位：${this.mySeat}`);
        break;

      case 'state_update': {
        const prevIds = this.lastHandTileIds;
        const newHand = msg.state.myHand ?? [];
        this.newlyDrawnTileId = null;
        if (prevIds.size > 0) {
          for (const t of newHand) {
            if (!prevIds.has(t.id)) {
              this.newlyDrawnTileId = t.id;
              break;
            }
          }
        }
        this.lastHandTileIds = new Set(newHand.map(t => t.id));
        this.gameState = msg.state;
        this.pendingActions = [];
        this.render();
        break;
      }

      case 'action_required':
        this.pendingActions = msg.actions;
        this.handleActionRequired(msg.actions);
        break;

      case 'message':
        addMessage(this.elMessageLog, msg.text);
        break;

      case 'game_end':
        this.handleGameEnd(msg.winner, msg.result);
        break;

      case 'player_joined':
        this.seatTypes = msg.seatTypes;
        this.updatePlayerLabels();
        addMessage(this.elMessageLog, `玩家${msg.seat} 加入了游戏`);
        break;

      case 'player_left':
        this.seatTypes = msg.seatTypes;
        this.updatePlayerLabels();
        addMessage(this.elMessageLog, `玩家${msg.seat} 离开了游戏`);
        break;
    }
  }

  // ==================== 操作处理 ====================

  private handleActionRequired(actions: Action[]): void {
    if (this.mySeat === -1) return; // 观战模式

    if (actions.length === 1 && actions[0].type === 'discard') {
      // 只需要出牌，不需要按钮，点击手牌即可
      this.pendingActions = [];  // 清空 pending，允许点击手牌
      this.elActionBar.innerHTML = '';
      return;
    }

    renderActionBar(this.elActionBar, actions, (action) => {
      this.elActionBar.innerHTML = '';
      this.selectedTileId = null;
      this.send({ type: 'action', action });
    });
  }

  // 玩家点击手牌
  private onTileClick(tile: Tile): void {
    if (this.mySeat === -1) return; // 观战模式
    if (this.gameState?.currentPlayer !== this.mySeat) return;
    if (this.pendingActions.length > 0) return;

    if (this.selectedTileId === tile.id) {
      // 双击出牌
      this.selectedTileId = null;
      this.send({ type: 'action', action: { type: 'discard', tiles: [tile] } });
    } else {
      this.selectedTileId = tile.id;
      this.render();
    }
  }

  // ==================== 渲染 ====================

  private render(): void {
    if (!this.gameState) return;

    const state = this.gameState;

    // 玩家手牌（myHand 是自己的完整手牌）
    const myPlayer = state.players[this.mySeat];
    if (myPlayer && state.myHand) {
      renderHand(this.elPlayerHand, {
        ...myPlayer,
        hand: state.myHand,
      }, {
        clickable: true,
        selectedTileId: this.selectedTileId ?? undefined,
        newlyDrawnTileId: this.newlyDrawnTileId ?? undefined,
        onTileClick: (tile) => this.onTileClick(tile),
      });
    }

    // 玩家副露
    this.elPlayerMelds.innerHTML = '';
    if (myPlayer) {
      for (const meld of myPlayer.melds) {
        const group = document.createElement('div');
        group.className = 'meld-group';
        for (const tile of meld.tiles) {
          const el = document.createElement('div');
          el.className = `tile meld-tile ${tile.suit}`;
          el.textContent = this.getTileText(tile);
          group.appendChild(el);
        }
        this.elPlayerMelds.appendChild(group);
      }
    }

    // 对手手牌（背面）— DOM 位置: [top, left, right]
    // 相对位置: top=对家(mySeat+2), left=上家(mySeat+3), right=下家(mySeat+1)
    const relativeOpp = [
      (this.mySeat + 2) % 4,  // 对面：对家
      (this.mySeat + 3) % 4,  // 左边：上家
      (this.mySeat + 1) % 4,  // 右边：下家
    ];
    for (let i = 0; i < 3; i++) {
      const playerIdx = relativeOpp[i];
      const el = this.elOppHands[i];
      el.innerHTML = '';
      const oppPlayer = state.players[playerIdx];
      if (oppPlayer) {
        for (let j = 0; j < oppPlayer.handCount; j++) {
          const t = document.createElement('div');
          t.className = 'tile back';
          el.appendChild(t);
        }
      }
    }

    // 弃牌区 — 牌桌中央，按相对位置: [top=对家, left=上家, right=下家, bottom=自己]
    const relativeDiscard = [
      (this.mySeat + 2) % 4,  // top: 对家
      (this.mySeat + 3) % 4,  // left: 上家
      (this.mySeat + 1) % 4,  // right: 下家
      this.mySeat,             // bottom: 自己
    ];
    for (let i = 0; i < 4; i++) {
      renderDiscards(
        this.elDiscards[i],
        state.players[relativeDiscard[i]]?.discards ?? [],
        state.lastDiscard?.id
      );
    }

    // 信息面板
    renderInfoPanel(this.elInfoPanel, state);
  }

  private updatePlayerLabels(): void {
    if (this.mySeat === -1) return;
    // 标签索引: 0=top(对家), 1=left(上家), 2=right(下家), 3=bottom(自己)
    const relativeSeats = [
      (this.mySeat + 2) % 4,  // top: 对家
      (this.mySeat + 3) % 4,  // left: 上家
      (this.mySeat + 1) % 4,  // right: 下家
      this.mySeat,             // bottom: 自己
    ];
    const relativeNames = ['对家', '上家', '下家', '你'];
    for (let i = 0; i < 4; i++) {
      const label = this.elPlayerLabels[i];
      if (!label) continue;

      const seat = relativeSeats[i];
      const type = this.seatTypes[seat];
      const isMe = seat === this.mySeat;

      if (isMe) {
        label.textContent = `你 (座位${seat})`;
      } else if (type === 'human') {
        label.textContent = `${relativeNames[i]} (座位${seat})`;
      } else {
        label.textContent = `${relativeNames[i]} (AI)`;
      }
    }
  }

  // 游戏结束
  private handleGameEnd(winner: number, result: HuResult): void {
    renderGameOver(this.elGameOver, winner, result, () => {
      this.elGameOver.innerHTML = '';
      this.selectedTileId = null;
      this.send({ type: 'restart' });
    });
  }

  private getTileText(tile: Tile): string {
    if (tile.suit === 'feng') {
      return ['东', '南', '西', '北', '中', '发', '白'][tile.rank - 1] || '';
    }
    return `${tile.rank}${'万条筒'['wan tiao tong'.split(' ').indexOf(tile.suit)]}`;
  }

  // 启动
  start(): void {
    // 连接已在构造函数中建立
  }
}
