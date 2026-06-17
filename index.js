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
export class RelaySession {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.agentSocket = null;       // C# Agent 的 WS
    this.controlSockets = new Set(); // 浏览器控制端 WS（可多个）
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.headers.get("Upgrade") !== "websocket") {
      if (url.pathname === "/status") {
        return Response.json({ online: this.agentSocket !== null });
      }
      return new Response("Expected WebSocket", { status: 426 });
    }

    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const role = url.searchParams.get("role");

    if (role === "agent") {
      // ── Agent 接入 ──────────────────────────────────────────────────
      if (this.agentSocket) {
        // 已有 agent，拒绝重复接入
        server.close(4001, "Already connected");
        return new Response(null, { status: 101, webSocket: client });
      }
      this.agentSocket = server;
      this._broadcast({ type: "agent_online" });

      server.addEventListener("message", (ev) => {
        // Agent → 所有控制端
        this._broadcast(JSON.parse(ev.data));
      });

      server.addEventListener("close", () => {
        this.agentSocket = null;
        this._broadcast({ type: "agent_offline" });
      });

      server.addEventListener("error", () => {
        this.agentSocket = null;
        this._broadcast({ type: "agent_offline" });
      });

    } else {
      // ── 浏览器控制端接入 ────────────────────────────────────────────
      this.controlSockets.add(server);

      // 立刻告知当前 agent 状态
      server.send(JSON.stringify({
        type: this.agentSocket ? "agent_online" : "agent_offline"
      }));

      server.addEventListener("message", (ev) => {
        // 控制端 → Agent
        if (this.agentSocket && this.agentSocket.readyState === WebSocket.OPEN) {
          this.agentSocket.send(ev.data);
        } else {
          server.send(JSON.stringify({ type: "error", message: "Agent 离线" }));
        }
      });

      server.addEventListener("close", () => {
        this.controlSockets.delete(server);
      });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  _broadcast(obj) {
    const msg = JSON.stringify(obj);
    for (const ws of this.controlSockets) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      } catch (_) {}
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
