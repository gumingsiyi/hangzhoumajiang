import { Action } from '../types';
import { createTileElement } from './tile-view';

/**
 * 操作按钮栏
 */
export function renderActionBar(
  container: HTMLElement,
  actions: Action[],
  onAction: (action: Action) => void
): void {
  container.innerHTML = '';

  if (actions.length === 0) return;

  const labels: Record<string, string> = {
    hu: '胡',
    peng: '碰',
    gang: '杠',
    chi: '吃',
    pass: '过',
    discard: '出牌',
  };

  for (const action of actions) {
    const wrapper = document.createElement('span');
    wrapper.className = 'action-btn-wrapper';

    const btn = document.createElement('button');
    btn.className = `action-btn ${action.type}`;
    btn.textContent = labels[action.type] || action.type;

    // 吃牌或碰牌时悬停显示麻将牌
    if ((action.type === 'chi' || action.type === 'peng') && action.tiles) {
      const sorted = [...action.tiles].sort((a, b) => {
        if (a.suit !== b.suit) return 0;
        return (a.rank as number) - (b.rank as number);
      });

      const tooltip = document.createElement('div');
      tooltip.className = 'meld-tooltip';
      for (const tile of sorted) {
        tooltip.appendChild(createTileElement(tile, { meldTooltip: true }));
      }
      wrapper.appendChild(tooltip);
    }

    btn.addEventListener('click', () => onAction(action));
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  }
}
