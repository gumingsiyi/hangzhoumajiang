import { Tile, GameState, HuResult, DiceResult } from '../types';
import type { SanitizedGameState } from '../server/protocol';
import { tileToString, FAN_NAMES } from '../constants';
import { createTileElement } from './tile-view';

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

  // 骰子信息
  if (state.diceResult) {
    const diceEl = document.createElement('div');
    diceEl.className = 'dice-info';
    const d = state.diceResult;
    diceEl.innerHTML = `<span class="dice-icon">🎲</span> ${d.dice1} + ${d.dice2} = <strong>${d.total}</strong> 点`;
    container.appendChild(diceEl);
  }

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
  fanTypes.textContent = result.fanTypes.map(f => FAN_NAMES[f] || f).join('、');
  content.appendChild(fanTypes);

  // 摸到的牌（自摸牌或点炮牌）
  if (result.winningTile) {
    const winTileSection = document.createElement('div');
    winTileSection.className = 'winning-tile-section';
    const winTileLabel = document.createElement('p');
    winTileLabel.textContent = result.isZiMo ? '🀄 自摸牌' : '🎯 点炮牌';
    winTileLabel.className = 'winning-tile-label';
    winTileSection.appendChild(winTileLabel);
    winTileSection.appendChild(createTileElement(result.winningTile, { isWinningTile: true }));
    content.appendChild(winTileSection);
  }

  // 手牌
  if (result.winnerHand && result.winnerHand.length > 0) {
    const handSection = document.createElement('div');
    handSection.className = 'winner-hand-section';
    const handLabel = document.createElement('p');
    handLabel.textContent = '手牌';
    handLabel.className = 'winner-hand-label';
    handSection.appendChild(handLabel);

    const handContainer = document.createElement('div');
    handContainer.className = 'winner-hand-tiles';
    for (const tile of result.winnerHand) {
      handContainer.appendChild(createTileElement(tile, {}));
    }
    handSection.appendChild(handContainer);
    content.appendChild(handSection);
  }

  // 副露
  if (result.winnerMelds && result.winnerMelds.length > 0) {
    const meldsSection = document.createElement('div');
    meldsSection.className = 'winner-melds-section';
    const meldsLabel = document.createElement('p');
    meldsLabel.textContent = '副露';
    meldsLabel.className = 'winner-melds-label';
    meldsSection.appendChild(meldsLabel);

    for (const meld of result.winnerMelds) {
      const meldGroup = document.createElement('div');
      meldGroup.className = 'meld-group';
      for (let i = 0; i < meld.tiles.length; i++) {
        const isBorrowed = meld.borrowedIndex === i;
        meldGroup.appendChild(createTileElement(meld.tiles[i], { isMeld: true, isBorrowed }));
      }
      meldsSection.appendChild(meldGroup);
    }
    content.appendChild(meldsSection);
  }

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
