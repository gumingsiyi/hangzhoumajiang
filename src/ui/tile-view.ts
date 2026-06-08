import { Tile, FengRank } from '../types';
import { isCaishen } from '../constants';

/**
 * Unicode 麻将牌字符映射
 *
 * 万子: 🀇🀈🀉🀊🀋🀌🀍🀎🀏  (U+1F007 - U+1F00F)
 * 条子: 🀐🀑🀒🀓🀔🀕🀖🀗🀘  (U+1F010 - U+1F018)
 * 筒子: 🀙🀚🀛🀜🀝🀞🀟🀠🀡  (U+1F019 - U+1F021)
 * 风牌: 🀀🀁🀂🀃            (U+1F000 - U+1F003)
 * 中:   🀄                  (U+1F004)
 * 发:   🀅                  (U+1F005)
 * 白:   🀆                  (U+1F006)
 */

// 使用 ︎ 文本变体选择器，确保显示为文本样式而非 emoji
const T = '︎';

const WAN_CHARS  = ['\u{1F007}', '\u{1F008}', '\u{1F009}', '\u{1F00A}', '\u{1F00B}', '\u{1F00C}', '\u{1F00D}', '\u{1F00E}', '\u{1F00F}'];
const TIAO_CHARS = ['\u{1F010}', '\u{1F011}', '\u{1F012}', '\u{1F013}', '\u{1F014}', '\u{1F015}', '\u{1F016}', '\u{1F017}', '\u{1F018}'];
const TONG_CHARS = ['\u{1F019}', '\u{1F01A}', '\u{1F01B}', '\u{1F01C}', '\u{1F01D}', '\u{1F01E}', '\u{1F01F}', '\u{1F020}', '\u{1F021}'];
const FENG_CHARS: Record<FengRank, string> = {
  1: '\u{1F000}', // 东
  2: '\u{1F001}', // 南
  3: '\u{1F002}', // 西
  4: '\u{1F003}', // 北
  5: '\u{1F004}', // 中
  6: '\u{1F005}', // 发
  7: '\u{1F006}', // 白
};

/**
 * 渲染单张麻将牌 — 使用 Unicode 麻将牌字符
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

  el.classList.add(tile.suit);
  if (isCaishen(tile)) el.classList.add('caishen');

  // 获取 Unicode 字符
  const char = getTileChar(tile);
  const face = document.createElement('div');
  face.className = 'tile-face';
  face.textContent = char + T;
  el.appendChild(face);

  // 风牌特殊颜色
  if (tile.suit === 'feng') {
    const rank = tile.rank as FengRank;
    if (rank === 5) el.classList.add('feng-zhong');
    if (rank === 6) el.classList.add('feng-fa');
    if (rank === 7) el.classList.add('feng-bai');
  }

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

function getTileChar(tile: Tile): string {
  const rank = tile.rank as number;
  switch (tile.suit) {
    case 'wan':  return WAN_CHARS[rank - 1];
    case 'tiao': return TIAO_CHARS[rank - 1];
    case 'tong': return TONG_CHARS[rank - 1];
    case 'feng': return FENG_CHARS[tile.rank as FengRank];
  }
}
