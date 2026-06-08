import { Tile, FengRank } from '../types';
import { isCaishen, FENG_NAMES } from '../constants';

/**
 * 渲染单张麻将牌
 */
export function createTileElement(
  tile: Tile,
  options: {
    faceDown?: boolean;
    clickable?: boolean;
    isMeld?: boolean;
    isDiscard?: boolean;
    isLastDiscard?: boolean;
    selected?: boolean;
    onClick?: (tile: Tile) => void;
  } = {}
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.tileId = String(tile.id);

  if (options.faceDown) {
    el.classList.add('back');
    return el;
  }

  // 花色样式
  el.classList.add(tile.suit);
  if (isCaishen(tile)) el.classList.add('caishen');

  // 风牌特殊颜色
  if (tile.suit === 'feng') {
    const rank = tile.rank as FengRank;
    if (rank === 5) el.classList.add('feng-zhong'); // 中
    if (rank === 6) el.classList.add('feng-fa');     // 发
    if (rank === 7) el.classList.add('feng-bai');    // 白
  }

  // 显示文字
  el.textContent = getTileText(tile);

  if (options.isMeld) el.classList.add('meld-tile');
  if (options.isDiscard) el.classList.add('discard-tile');
  if (options.isLastDiscard) el.classList.add('last-discard');
  if (options.selected) el.classList.add('selected');
  if (options.clickable) el.style.cursor = 'pointer';

  if (options.onClick) {
    el.addEventListener('click', () => options.onClick!(tile));
  }

  return el;
}

function getTileText(tile: Tile): string {
  if (tile.suit === 'feng') {
    return FENG_NAMES[tile.rank as FengRank];
  }
  const suitChar = { wan: '万', tiao: '条', tong: '筒' }[tile.suit];
  return `${tile.rank}${suitChar}`;
}
