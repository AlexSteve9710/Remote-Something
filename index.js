/**
 * Remote Launcher — Cloudflare Worker
 *
 * 路由：
 *   GET  /              → 前端 HTML 控制台
 *   GET  /agent?secret= → C# Agent WebSocket 接入
 *   GET  /control?secret= → 浏览器控制端 WebSocket 接入
 */

import { DurableObject } from "cloudflare:workers";
import { FRONTEND_HTML } from "./frontend.js";

// ── Durable Object ───────────────────────────────────────────────────────────
export class RelaySession extends DurableObject {

  async fetch(request) {
    const url = new URL(request.url);

    // 必须是 WebSocket 升级请求
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const role = url.searchParams.get("role"); // "agent" | "control"
    const [client, server] = Object.values(new WebSocketPair());

    // Hibernation API：用 tag 区分角色，DO 休眠后仍可通过 getWebSockets() 恢复
    this.ctx.acceptWebSocket(server, [role]);

    if (role === "agent") {
      // 踢掉旧 agent（如果有）
      for (const old of this.ctx.getWebSockets("agent")) {
        if (old !== server) {
          try { old.close(4001, "Replaced"); } catch (_) {}
        }
      }
      // 通知所有控制端 agent 已上线
      this._broadcast("control", { type: "agent_online" });

    } else {
      // 控制端接入：立刻推送当前 agent 状态
      const agentOnline = this.ctx.getWebSockets("agent").length > 0;
      server.send(JSON.stringify({ type: agentOnline ? "agent_online" : "agent_offline" }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  // ── Hibernation 回调 ──────────────────────────────────────────────────────
  webSocketMessage(ws, message) {
    const role = this.ctx.getTags(ws)[0];

    if (role === "agent") {
      // Agent → 广播给所有控制端
      try { this._broadcast("control", JSON.parse(message)); } catch (_) {}
    } else {
      // 控制端 → 转发给 Agent
      const agents = this.ctx.getWebSockets("agent");
      if (agents.length > 0) {
        try { agents[0].send(message); } catch (_) {}
      } else {
        ws.send(JSON.stringify({ type: "error", message: "Agent 离线" }));
      }
    }
  }

  webSocketClose(ws) {
    if (this.ctx.getTags(ws)[0] === "agent") {
      this._broadcast("control", { type: "agent_offline" });
    }
  }

  webSocketError(ws) {
    if (this.ctx.getTags(ws)[0] === "agent") {
      this._broadcast("control", { type: "agent_offline" });
    }
  }

  _broadcast(tag, obj) {
    const msg = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets(tag)) {
      try { ws.send(msg); } catch (_) {}
    }
  }
}

// ── Worker 入口 ──────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 首页：返回前端控制台 HTML
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(FRONTEND_HTML, {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    // 鉴权
    const secret = url.searchParams.get("secret") || request.headers.get("X-Secret") || "";
    if (secret !== env.SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 确定角色
    let role;
    if (url.pathname === "/agent")   role = "agent";
    else if (url.pathname === "/control") role = "control";
    else return new Response("Not Found", { status: 404 });

    // 路由到对应 Durable Object（支持多台机器：?host=pc1）
    const hostId = url.searchParams.get("host") || "default";
    const stub = env.RELAY.get(env.RELAY.idFromName(hostId));

    // ★ 关键：直接透传原始 request，只替换 URL 加上 role 参数
    //    不要 new Request()——会丢失 WebSocket 升级头
    const doUrl = new URL(request.url);
    doUrl.pathname = "/";
    doUrl.searchParams.set("role", role);

    return stub.fetch(new Request(doUrl.toString(), request));
  },
};
