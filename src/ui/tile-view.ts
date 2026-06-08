import { Tile, FengRank } from '../types';
import { isCaishen } from '../constants';

/**
 * 渲染单张麻将牌 — 真实麻将牌风格
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

  // 构建牌面内容
  const face = document.createElement('div');
  face.className = 'tile-face';

  if (tile.suit === 'feng') {
    face.innerHTML = renderFengTile(tile.rank as FengRank);
  } else if (tile.suit === 'wan') {
    face.innerHTML = renderWanTile(tile.rank as number);
  } else if (tile.suit === 'tiao') {
    face.innerHTML = renderTiaoTile(tile.rank as number);
  } else if (tile.suit === 'tong') {
    face.innerHTML = renderTongTile(tile.rank as number);
  }

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

// ==================== 万子 ====================
function renderWanTile(rank: number): string {
  const numColor = '#c00';
  return `
    <div class="tile-symbol wan-symbol">
      <span class="tile-number" style="color:${numColor}">${rank}</span>
      <span class="tile-wan-char" style="color:${numColor}">万</span>
    </div>
  `;
}

// ==================== 条子（竹子） ====================
function renderTiaoTile(rank: number): string {
  if (rank === 1) {
    // 一条：鸟（麻雀）
    return `
      <div class="tile-symbol tiao-symbol">
        <svg viewBox="0 0 40 50" width="32" height="40">
          <ellipse cx="20" cy="18" rx="8" ry="7" fill="#2e8b57" stroke="#1a5c3a" stroke-width="1"/>
          <ellipse cx="20" cy="32" rx="10" ry="12" fill="#3cb371" stroke="#1a5c3a" stroke-width="1"/>
          <circle cx="17" cy="16" r="1.5" fill="#fff"/>
          <circle cx="17.3" cy="15.8" r="0.7" fill="#000"/>
          <path d="M10 18 Q6 16 8 12" stroke="#e74c3c" stroke-width="2" fill="none"/>
          <path d="M10 17 Q5 14 7 10" stroke="#e74c3c" stroke-width="1.5" fill="none"/>
          <path d="M26 28 Q34 32 36 42" stroke="#2e8b57" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <path d="M34 40 L36 42 L38 39" stroke="#2e8b57" stroke-width="2" fill="none"/>
        </svg>
      </div>
    `;
  }
  // 2-9条：竹棍排列
  const sticks = renderBambooSticks(rank);
  return `
    <div class="tile-symbol tiao-symbol">
      <div class="bamboo-grid">${sticks}</div>
    </div>
  `;
}

function renderBambooSticks(count: number): string {
  let html = '';
  for (let i = 0; i < count; i++) {
    const color = i % 2 === 0 ? '#2e8b57' : '#1a8c50';
    const highlight = i % 2 === 0 ? '#3cb371' : '#2eaa66';
    html += `
      <svg class="bamboo-stick" viewBox="0 0 8 36" width="6" height="28">
        <rect x="1" y="0" width="6" height="36" rx="3" fill="${color}"/>
        <rect x="1" y="0" width="3" height="36" rx="2" fill="${highlight}" opacity="0.4"/>
        <rect x="0" y="8" width="8" height="2" rx="1" fill="#1a5c3a" opacity="0.6"/>
        <rect x="0" y="17" width="8" height="2" rx="1" fill="#1a5c3a" opacity="0.6"/>
        <rect x="0" y="26" width="8" height="2" rx="1" fill="#1a5c3a" opacity="0.6"/>
      </svg>
    `;
  }
  return html;
}

// ==================== 筒子（圆饼） ====================
function renderTongTile(rank: number): string {
  const circles = renderCircles(rank);
  return `
    <div class="tile-symbol tong-symbol">
      <div class="tong-grid">${circles}</div>
    </div>
  `;
}

function renderCircles(count: number): string {
  // 颜色排列：蓝、红、绿（传统配色）
  const colors: [string, string][] = [
    ['#1e90ff', '#4db8ff'], // 蓝
    ['#e74c3c', '#ff7979'], // 红
    ['#2ecc71', '#7bed9f'], // 绿
  ];

  let html = '';
  for (let i = 0; i < count; i++) {
    const [fill, highlight] = colors[i % 3];
    html += `
      <svg class="tong-circle" viewBox="0 0 24 24" width="16" height="16">
        <circle cx="12" cy="12" r="10" fill="${fill}" stroke="#333" stroke-width="0.5"/>
        <circle cx="12" cy="12" r="7" fill="none" stroke="${highlight}" stroke-width="1"/>
        <circle cx="12" cy="12" r="4" fill="${highlight}" opacity="0.6"/>
        <circle cx="10" cy="10" r="2" fill="#fff" opacity="0.3"/>
      </svg>
    `;
  }
  return html;
}

// ==================== 风牌 ====================
function renderFengTile(rank: FengRank): string {
  const chars: Record<FengRank, string> = {
    1: '东', 2: '南', 3: '西', 4: '北',
    5: '中', 6: '發', 7: '',
  };
  const colors: Record<FengRank, string> = {
    1: '#333', 2: '#333', 3: '#333', 4: '#333',
    5: '#cc0000', 6: '#228b22', 7: '#666',
  };

  if (rank === 7) {
    // 白板：空心方框
    return `
      <div class="tile-symbol feng-symbol">
        <svg viewBox="0 0 36 36" width="28" height="28">
          <rect x="4" y="4" width="28" height="28" rx="3" fill="none" stroke="#666" stroke-width="2.5"/>
          <rect x="10" y="10" width="16" height="16" rx="2" fill="none" stroke="#999" stroke-width="1"/>
        </svg>
      </div>
    `;
  }

  const color = colors[rank];
  const char = chars[rank];

  if (rank === 5) {
    // 中：红字
    return `
      <div class="tile-symbol feng-symbol">
        <span class="feng-char" style="color:${color};font-size:28px;font-weight:900;">${char}</span>
      </div>
    `;
  }

  if (rank === 6) {
    // 发：绿字带底纹
    return `
      <div class="tile-symbol feng-symbol">
        <span class="feng-char" style="color:${color};font-size:26px;font-weight:900;">${char}</span>
      </div>
    `;
  }

  // 东南西北
  return `
    <div class="tile-symbol feng-symbol">
      <span class="feng-char" style="color:${color};font-size:26px;font-weight:900;">${char}</span>
    </div>
  `;
}
