/**
 * 大厅界面 — 创建房间 / 加入房间
 */

interface RoomInfo {
  id: string;
  players: number;
  playing: boolean;
}

export class Lobby {
  private container: HTMLElement;
  private refreshTimer: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private async render(): Promise<void> {
    this.container.innerHTML = `
      <div class="lobby">
        <h1 class="lobby-title">🀄 杭州麻将</h1>
        <p class="lobby-subtitle">在线多人对战</p>

        <div class="lobby-actions">
          <button class="btn-create" id="btn-create">创建房间</button>
        </div>

        <div class="room-list-section">
          <h2 class="room-list-title">房间列表</h2>
          <div id="room-list" class="room-list">
            <p class="room-list-empty">加载中...</p>
          </div>
        </div>
      </div>
    `;

    const btnCreate = document.getElementById('btn-create')!;
    btnCreate.addEventListener('click', () => this.createRoom());

    await this.loadRooms();

    // 每 3 秒刷新房间列表
    this.refreshTimer = window.setInterval(() => this.loadRooms(), 3000);
  }

  /** 销毁大厅（进入游戏时调用） */
  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private async loadRooms(): Promise<void> {
    const listEl = document.getElementById('room-list')!;

    try {
      const res = await fetch('/api/rooms');
      const rooms: RoomInfo[] = await res.json();

      if (rooms.length === 0) {
        listEl.innerHTML = '<p class="room-list-empty">暂无房间，点击上方创建</p>';
        return;
      }

      listEl.innerHTML = rooms.map(room => `
        <div class="room-card" data-id="${room.id}">
          <div class="room-card-info">
            <span class="room-id">房间 ${room.id}</span>
            <span class="room-players">${room.players}/4 人</span>
            ${room.playing ? '<span class="room-playing">进行中</span>' : '<span class="room-waiting">等待中</span>'}
          </div>
          <button class="btn-join">加入</button>
        </div>
      `).join('');

      // 绑定加入按钮
      listEl.querySelectorAll('.btn-join').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const roomId = (e.target as HTMLElement).closest('.room-card')?.getAttribute('data-id');
          if (roomId) this.joinRoom(roomId);
        });
      });
    } catch {
      listEl.innerHTML = '<p class="room-list-empty">无法连接服务器</p>';
    }
  }

  private async createRoom(): Promise<void> {
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const { roomId } = await res.json();
      this.joinRoom(roomId);
    } catch {
      alert('创建房间失败，请检查服务器');
    }
  }

  private joinRoom(roomId: string): void {
    // 跳转到游戏页面，房间号作为 URL 参数
    location.href = `/?room=${roomId}`;
  }
}
