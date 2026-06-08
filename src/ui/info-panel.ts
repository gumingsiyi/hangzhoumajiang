import { Tile, GameState, HuResult } from '../types';
import type { SanitizedGameState } from '../server/protocol';
import { tileToString } from '../constants';

/**
 * 信息面板：财神、剩余牌数
 */
export function renderInfoPanel(
  container: HTMLElement,
  state: GameState | SanitizedGameState
): void {
  container.innerHTML = '';

  const caishenEl = document.createElement('div');
  caishenEl.innerHTML = `<span class="caishen">财神：${tileToString(state.caishen)}</span>`;
  container.appendChild(caishenEl);

  const wallCount = 'wall' in state ? state.wall.length : state.wallCount;
  const wallEl = document.createElement('div');
  wallEl.className = 'wall-count';
  wallEl.textContent = `剩余：${wallCount} 张`;
  container.appendChild(wallEl);

  const turnEl = document.createElement('div');
  turnEl.textContent = `第 ${state.turnCount} 巡`;
  container.appendChild(turnEl);

  const turnIndicator = document.createElement('div');
  turnIndicator.textContent = `当前：玩家${state.currentPlayer}`;
  turnIndicator.style.marginTop = '4px';
  container.appendChild(turnIndicator);
}

/**
 * 游戏结束遮罩
 */
export function renderGameOver(
  container: HTMLElement,
  winner: number,
  result: HuResult,
  onRestart: () => void
): void {
  container.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.className = 'game-over-overlay';

  const content = document.createElement('div');
  content.className = 'game-over-content';

  const title = document.createElement('h2');
  title.textContent = winner === 0 ? '🎉 你赢了！' : `玩家${winner} 胡牌`;
  content.appendChild(title);

  const fanInfo = document.createElement('p');
  fanInfo.textContent = `${result.fan} 番`;
  content.appendChild(fanInfo);

  const fanTypes = document.createElement('p');
  fanTypes.textContent = result.fanTypes.join('、');
  content.appendChild(fanTypes);

  const restartBtn = document.createElement('button');
  restartBtn.className = 'restart-btn';
  restartBtn.textContent = '再来一局';
  restartBtn.addEventListener('click', onRestart);
  content.appendChild(restartBtn);

  overlay.appendChild(content);
  container.appendChild(overlay);
}

/**
 * 消息日志
 */
export function addMessage(container: HTMLElement, msg: string): void {
  const p = document.createElement('p');
  p.textContent = msg;
  container.appendChild(p);
  container.scrollTop = container.scrollHeight;

  // 保留最近 20 条
  while (container.children.length > 20) {
    container.removeChild(container.firstChild!);
  }
}
