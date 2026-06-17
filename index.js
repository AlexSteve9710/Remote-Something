/**
 * Remote Launcher — Cloudflare Worker
 *
 * 路由：
 *   GET  /              → 前端 HTML 控制台
 *   GET  /agent         → C# Agent 的 WebSocket 连接端（需 X-Agent-Secret）
 *   GET  /control       → 浏览器控制端的 WebSocket 连接
 *   GET  /status        → 查询 Agent 是否在线（JSON）
 */

import { FRONTEND_HTML } from "./frontend.js";

// ── Durable Object：单台主机的中继会话 ──────────────────────────────────
// 免费套餐必须继承 DurableObject，且使用 new_sqlite_classes 迁移
export class RelaySession extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
    // 用 tag 区分 agent 与 control 连接（存在内存中，DO 存活期间有效）
    this.agentWs = null;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // 非 WebSocket：状态查询
    if (request.headers.get("Upgrade") !== "websocket") {
      if (url.pathname === "/status") {
        return Response.json({ online: this.agentWs !== null });
      }
      return new Response("Expected WebSocket", { status: 426 });
    }

    const role = url.searchParams.get("role");
    const [client, server] = Object.values(new WebSocketPair());

    // 使用 DO WebSocket Hibernation API（免费套餐推荐方式）
    this.state.acceptWebSocket(server, [role]);   // tag = "agent" | "control"

    if (role === "agent") {
      // 若已有 agent 在线，先踢掉旧的
      if (this.agentWs) {
        try { this.agentWs.close(4001, "Replaced by new agent"); } catch (_) {}
      }
      this.agentWs = server;
      this._broadcastToControls({ type: "agent_online" });
    } else {
      // 控制端接入：立即告知 agent 状态
      server.send(JSON.stringify({
        type: this.agentWs ? "agent_online" : "agent_offline"
      }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Hibernation 回调 ─────────────────────────────────────────────────
  async webSocketMessage(ws, message) {
    const tags = this.state.getTags(ws);
    const role = tags[0];

    if (role === "agent") {
      // Agent → 广播给所有控制端
      try {
        const obj = JSON.parse(message);
        this._broadcastToControls(obj);
      } catch (_) {}

    } else {
      // 控制端 → 转发给 Agent
      if (this.agentWs) {
        try { this.agentWs.send(message); } catch (_) {}
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Agent 离线" }));
      }
    }
  }

  async webSocketClose(ws, code) {
    const tags = this.state.getTags(ws);
    if (tags[0] === "agent") {
      this.agentWs = null;
      this._broadcastToControls({ type: "agent_offline" });
    }
  }

  async webSocketError(ws) {
    const tags = this.state.getTags(ws);
    if (tags[0] === "agent") {
      this.agentWs = null;
      this._broadcastToControls({ type: "agent_offline" });
    }
  }

  _broadcastToControls(obj) {
    const msg = JSON.stringify(obj);
    for (const ws of this.state.getWebSockets("control")) {
      try { ws.send(msg); } catch (_) {}
    }
  }
}

// ── Worker 主入口 ────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 静态前端
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(FRONTEND_HTML, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // 验证 Secret（Agent 和控制端都需要）
    const secret = url.searchParams.get("secret") || request.headers.get("X-Secret");
    if (secret !== env.SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // 获取目标主机的 Durable Object（以 hostId 区分，支持多台机器）
    const hostId = url.searchParams.get("host") || "default";
    const id = env.RELAY.idFromName(hostId);
    const obj = env.RELAY.get(id);

    // 把路径中的 /agent 或 /control 统一转给 DO 的 /status 或 WebSocket
    return obj.fetch(new Request(url.origin + "/?role=" + (url.pathname === "/agent" ? "agent" : "control") + "&_path=" + url.pathname, {
      method: request.method,
      headers: request.headers,
    }));
  }
};
