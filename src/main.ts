import './ui/styles.css';
import { App } from './ui/app';
import { Lobby } from './ui/lobby';

// 根据 URL 决定显示大厅还是游戏
const params = new URLSearchParams(location.search);
const roomId = params.get('room');

const appEl = document.getElementById('app')!;

if (roomId) {
  // 有房间号 → 进入游戏
  const app = new App(roomId);
  app.start();
} else {
  // 无房间号 → 显示大厅
  new Lobby(appEl);
}
