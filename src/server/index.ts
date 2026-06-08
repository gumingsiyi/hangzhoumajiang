/**
 * 多人麻将服务器
 *
 * - HTTP API：房间创建 / 列表
 * - WebSocket：按房间号路由
 * - 不足 4 人的座位由 AI 补位
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom } from './room';
import type { ClientMessage } from './protocol';

const PORT = Number(process.env.PORT) || 3000;

// 房间表：roomId → GameRoom
const rooms = new Map<string, GameRoom>();

function createRoom(): string {
  // 生成 4 位房间号
  let id: string;
  do {
    id = String(Math.floor(1000 + Math.random() * 9000));
  } while (rooms.has(id));

  rooms.set(id, new GameRoom(id));
  console.log(`房间创建：${id}`);
  return id;
}

// HTTP API：房间管理
function handleHttp(req: IncomingMessage, res: ServerResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && req.url === '/api/rooms') {
    // 创建房间
    const id = createRoom();
    res.end(JSON.stringify({ roomId: id }));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/rooms') {
    // 房间列表
    const list = [...rooms.entries()].map(([id, room]) => ({
      id,
      players: room.players.filter(Boolean).length,
      playing: room.isPlaying(),
    }));
    res.end(JSON.stringify(list));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
}

const server = createServer(handleHttp);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  // 从 URL 解析房间号：/ws?room=1234
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const roomId = url.searchParams.get('room');

  if (!roomId || !rooms.has(roomId)) {
    ws.send(JSON.stringify({ type: 'error', message: '房间不存在' }));
    ws.close();
    return;
  }

  const room = rooms.get(roomId)!;
  const seat = room.join(ws);

  if (seat === -1) {
    ws.send(JSON.stringify({ type: 'error', message: '房间已满' }));
    ws.close();
    return;
  }

  console.log(`[房间${roomId}] 玩家加入：座位 ${seat}`);

  // 发送座位信息
  ws.send(JSON.stringify({
    type: 'seat_assigned',
    seat,
    seatTypes: room.getSeatTypes(),
  }));

  // 如果游戏已开始，发送当前状态；否则自动开始
  if (room.isPlaying()) {
    const state = room.game.getState();
    const sanitized = room.sanitizeState(state, seat);
    ws.send(JSON.stringify({ type: 'state_update', state: sanitized }));
  } else if (room.hasHumanPlayers()) {
    // 有人类玩家加入，稍等后开始游戏
    setTimeout(() => {
      if (!room.isPlaying()) {
        console.log(`[房间${roomId}] 开始新一局`);
        room.startGame();
      }
    }, 1000);
  }

  // 处理客户端消息
  ws.on('message', (data: Buffer) => {
    try {
      const msg: ClientMessage = JSON.parse(data.toString());
      if (msg.type === 'action') {
        room.submitAction(ws, msg.action);
      } else if (msg.type === 'restart') {
        // 游戏结束后，有人请求重新开始
        if (room.game.state.phase === 'finished') {
          setTimeout(() => {
            console.log(`[房间${roomId}] 重新开始`);
            room.startGame();
          }, 1000);
        }
      }
    } catch {
      // 忽略非法消息
    }
  });

  // 玩家断线
  ws.on('close', () => {
    room.leave(ws);
    console.log(`[房间${roomId}] 玩家离开：座位 ${seat}`);
  });

  ws.on('error', () => {
    room.leave(ws);
  });
});

server.listen(PORT, () => {
  console.log(`麻将服务器已启动：http://localhost:${PORT}`);
  console.log(`WebSocket：ws://localhost:${PORT}`);
});
