import { Tile, FengRank } from '../types';
import { isCaishen } from '../constants';

/**
 * 麻将牌图片路径映射
 *
 * 万子: m1.gif - m9.gif
 * 条子: s1.gif - s9.gif
 * 筒子: p1.gif - p9.gif
 * 风牌: z1.gif(东) z2.gif(南) z3.gif(西) z4.gif(北)
 * 白板: z5.gif
 * 发财: z6.gif
 * 红中: z7.gif
 * 背面: m0.gif
 */

const IMG_BASE = 'img';

function getTileImgSrc(tile: Tile): string {
  if (tile.suit === 'wan') {
    return `${IMG_BASE}/m${tile.rank}.gif`;
  }
  if (tile.suit === 'tiao') {
    return `${IMG_BASE}/s${tile.rank}.gif`;
  }
  if (tile.suit === 'tong') {
    return `${IMG_BASE}/p${tile.rank}.gif`;
  }
  // 风牌: code rank → image name
  // code: 1=东 2=南 3=西 4=北 5=中 6=发 7=白
  // img:  z1    z2    z3    z4    z7    z6    z5
  const fengImgMap: Record<FengRank, string> = {
    1: 'z1', // 东
    2: 'z2', // 南
    3: 'z3', // 西
    4: 'z4', // 北
    5: 'z7', // 中
    6: 'z6', // 发
    7: 'z5', // 白
  };
  return `${IMG_BASE}/${fengImgMap[tile.rank as FengRank]}.gif`;
}

/**
 * 渲染单张麻将牌 — 使用图片
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
    newlyDrawn?: boolean;
    onClick?: (tile: Tile) => void;
  } = {}
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tile';
  el.dataset.tileId = String(tile.id);

  if (options.faceDown) {
    el.classList.add('back');
    const img = document.createElement('img');
    img.src = `${IMG_BASE}/pai.gif`;
    img.draggable = false;
    el.appendChild(img);
    return el;
  }

  el.classList.add(tile.suit);
  if (isCaishen(tile)) el.classList.add('caishen');

  const img = document.createElement('img');
  img.src = getTileImgSrc(tile);
  img.draggable = false;
  el.appendChild(img);

  // 风牌特殊颜色标记
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
  if (options.newlyDrawn) el.classList.add('newly-drawn');
  if (options.clickable) el.style.cursor = 'pointer';

  if (options.onClick) {
    el.addEventListener('click', () => options.onClick!(tile));
  }

  return el;
}
