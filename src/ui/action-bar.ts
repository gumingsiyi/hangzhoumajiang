import { Action } from '../types';

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
    const btn = document.createElement('button');
    btn.className = `action-btn ${action.type}`;
    btn.textContent = labels[action.type] || action.type;
    btn.addEventListener('click', () => onAction(action));
    container.appendChild(btn);
  }
}
