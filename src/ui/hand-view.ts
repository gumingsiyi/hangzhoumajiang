import { Tile, Meld, PlayerState } from '../types';
import { createTileElement } from './tile-view';

/**
 * 渲染玩家手牌 + 副露
 */
export function renderHand(
  container: HTMLElement,
  player: PlayerState,
  options: {
    faceDown?: boolean;
    clickable?: boolean;
    selectedTileId?: number;
    newlyDrawnTileId?: number;
    onTileClick?: (tile: Tile) => void;
  } = {}
): void {
  container.innerHTML = '';

  // 副露区
  if (player.melds.length > 0) {
    const meldsArea = document.createElement('div');
    meldsArea.className = 'melds-area';
    for (const meld of player.melds) {
      const group = document.createElement('div');
      group.className = 'meld-group';
      for (let i = 0; i < meld.tiles.length; i++) {
        const isBorrowed = meld.borrowedIndex === i;
        group.appendChild(createTileElement(meld.tiles[i], { isMeld: true, isBorrowed }));
      }
      meldsArea.appendChild(group);
    }
    container.appendChild(meldsArea);
  }

  // 手牌区
  const handArea = document.createElement('div');
  handArea.className = 'hand-tiles';

  for (const tile of player.hand) {
    const isSelected = options.selectedTileId === tile.id;
    const isNewlyDrawn = options.newlyDrawnTileId === tile.id;
    handArea.appendChild(
      createTileElement(tile, {
        faceDown: options.faceDown,
        clickable: options.clickable,
        selected: isSelected,
        newlyDrawn: isNewlyDrawn,
        onClick: options.onTileClick,
      })
    );
  }

  container.appendChild(handArea);
}

/**
 * 渲染弃牌区
 */
export function renderDiscards(
  container: HTMLElement,
  discards: Tile[],
  lastDiscardId?: number
): void {
  container.innerHTML = '';
  for (const tile of discards) {
    container.appendChild(
      createTileElement(tile, {
        isDiscard: true,
        isLastDiscard: tile.id === lastDiscardId,
      })
    );
  }
}
