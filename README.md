# 🀄 杭州麻将 — 在线多人对战

基于 TypeScript 的杭州麻将网页游戏，支持多人在线联机对战，不足 4 人由 AI 自动补位。

## 功能

- 多人联网对战（WebSocket）
- 大厅系统：创建房间、房间列表、加入房间
- AI 对手自动补位和决策
- 杭州麻将规则：财神、碰、杠、吃、胡牌判定
- 番型计算：平胡、碰碰胡、清一色、七对、财神头、自摸
- 游戏结束可重新开始

## 快速开始

```bash
# 安装依赖
npm install

# 启动（同时启动服务器 + 前端）
npm run dev:full
```

打开 `http://localhost:5173`，进入大厅页面。

## 使用方式

1. 点击 **创建房间** → 生成 4 位房间号 → 自动进入游戏
2. 分享房间号给朋友，他们打开同一地址即可在房间列表中看到并加入
3. 不足 4 人的座位由 AI 自动补位，游戏立即开始
4. 游戏结束后点击 **再来一局**

## 项目结构

```
src/
├── server/          # 服务器端
│   ├── index.ts     # HTTP API + WebSocket 入口
│   ├── room.ts      # 游戏房间管理
│   └── protocol.ts  # 客户端/服务器消息协议
├── engine/          # 游戏引擎（纯逻辑，无 UI 依赖）
│   ├── game.ts      # 游戏主循环
│   ├── pattern.ts   # 胡牌检测 & 番型计算
│   ├── rules.ts     # 规则引擎（碰/杠/吃判定）
│   ├── meld.ts      # 副露操作
│   ├── hand.ts      # 手牌管理
│   └── deck.ts      # 洗牌 & 发牌
├── ai/
│   └── ai-player.ts # AI 决策（孤张优先、保留财神）
├── ui/              # 前端 UI
│   ├── lobby.ts     # 大厅界面
│   ├── app.ts       # 游戏客户端（WebSocket）
│   ├── hand-view.ts # 手牌渲染
│   ├── tile-view.ts # 单张牌渲染
│   ├── action-bar.ts# 操作按钮
│   ├── info-panel.ts# 信息面板
│   └── styles.css   # 样式
├── types.ts         # 类型定义
├── constants.ts     # 常量 & 工具函数
└── main.ts          # 入口（大厅/游戏路由）
```

## 技术栈

- **前端**：TypeScript + Vite，纯 DOM 操作，无框架
- **服务器**：Node.js + ws (WebSocket)
- **测试**：Vitest

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动前端开发服务器 |
| `npm run server` | 仅启动游戏服务器 |
| `npm run dev:full` | 同时启动前端 + 服务器 |
| `npm run build` | 编译 TypeScript + 构建生产版本 |
| `npm test` | 运行测试 |
