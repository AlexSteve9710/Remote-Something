// frontend.js — 前端 HTML，由 Worker 直接内联返回

export const FRONTEND_HTML = /* html */`<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Remote Launcher</title>
<style>
:root {
  --bg: #0b0d14;
  --s1: #13161f;
  --s2: #1c2030;
  --s3: #252a3d;
  --border: rgba(255,255,255,0.06);
  --border2: rgba(255,255,255,0.11);
  --text: #dde1f0;
  --text2: #7b82a0;
  --text3: #454c68;
  --accent: #6c8eff;
  --accent-d: rgba(108,142,255,0.15);
  --green: #3ecf8e;
  --green-d: rgba(62,207,142,0.12);
  --red: #f25f5c;
  --red-d: rgba(242,95,92,0.12);
  --amber: #f5a623;
  --amber-d: rgba(245,166,35,0.1);
  --r: 9px;
  --font: -apple-system,'SF Pro Text','Segoe UI',system-ui,sans-serif;
  --mono: 'SF Mono','Cascadia Code','Fira Code',monospace;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;display:flex;flex-direction:column;align-items:center}

/* ── Header ── */
header{width:100%;max-width:920px;padding:2rem 1.5rem 0;display:flex;align-items:center;gap:14px}
.mark{width:38px;height:38px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mark svg{width:22px;height:22px;fill:#fff}
.htext h1{font-size:17px;font-weight:600;letter-spacing:-.3px;line-height:1.2}
.htext p{font-size:12px;color:var(--text3);margin-top:2px}

/* ── Layout ── */
main{width:100%;max-width:920px;padding:1.5rem;flex:1;display:flex;flex-direction:column;gap:14px}

/* ── Panel ── */
.panel{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:1.25rem 1.5rem}
.plabel{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3);margin-bottom:.9rem}

/* ── Setup grid ── */
.setup-grid{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:end}
.field label{display:block;font-size:11px;color:var(--text3);margin-bottom:5px}
.field input{width:100%;background:var(--s2);border:1px solid var(--border2);border-radius:7px;color:var(--text);font-family:var(--mono);font-size:13px;padding:8px 12px;outline:none;transition:border-color .15s}
.field input:focus{border-color:var(--accent)}
button{border:none;border-radius:7px;font-family:var(--font);font-size:13px;font-weight:600;padding:9px 20px;cursor:pointer;transition:all .15s;white-space:nowrap}
.btn-connect{background:var(--accent);color:#fff;align-self:flex-end;margin-top:21px}
.btn-connect:hover{filter:brightness(1.1)}
.btn-connect:disabled{opacity:.4;cursor:not-allowed}
.btn-disc{background:var(--red-d);color:var(--red);border:1px solid rgba(242,95,92,.2);display:none}
.btn-disc:hover{background:rgba(242,95,92,.22)}
.btn-sm{background:transparent;color:var(--text3);font-size:11px;font-weight:500;padding:3px 8px;border:1px solid var(--border2);border-radius:5px}
.btn-sm:hover{color:var(--text2)}

/* ── Status bar ── */
.sbar{display:flex;align-items:center;gap:8px;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
.dot{width:7px;height:7px;border-radius:50%;background:var(--text3);flex-shrink:0;transition:background .3s}
.dot.connecting{background:var(--amber);animation:blink 1s infinite}
.dot.online{background:var(--green)}
.dot.error{background:var(--red)}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.stext{font-size:13px;color:var(--text2)}
.ping{margin-left:auto;font-size:12px;font-family:var(--mono);color:var(--text3)}
.ping.good{color:var(--green)}

/* ── Agent card ── */
.agent-card{display:flex;align-items:center;gap:10px;padding:.75rem 1rem;border-radius:7px;font-size:13px}
.agent-card.offline{background:var(--s2);color:var(--text3)}
.agent-card.online{background:var(--green-d);color:var(--green);border:1px solid rgba(62,207,142,.2)}
.agent-card.online .adot{background:var(--green);animation:blink 2.5s infinite}
.adot{width:7px;height:7px;border-radius:50%;background:var(--text3);flex-shrink:0}

/* ── App grid ── */
.app-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.app-card{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);padding:1rem;cursor:pointer;transition:all .15s;display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;user-select:none}
.app-card::after{content:'';position:absolute;inset:0;background:var(--accent-d);opacity:0;transition:opacity .15s}
.app-card:hover::after{opacity:1}
.app-card:hover{border-color:rgba(108,142,255,.3)}
.app-card:active{transform:scale(.96)}
.app-card.disabled{opacity:.35;cursor:not-allowed;pointer-events:none}
.app-icon{width:40px;height:40px;background:var(--s2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:21px}
.app-name{font-size:13px;font-weight:500;color:var(--text)}
.app-sub{font-size:11px;color:var(--text3)}
.badge{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;opacity:0;transition:opacity .25s}
.badge.ok{background:var(--green-d);color:var(--green);opacity:1}
.badge.fail{background:var(--red-d);color:var(--red);opacity:1}

/* ── Log ── */
.log-wrap{background:var(--s1);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
.log-hd{display:flex;align-items:center;justify-content:space-between;padding:.7rem 1rem;border-bottom:1px solid var(--border)}
.log-hd span{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--text3)}
#log{height:150px;overflow-y:auto;padding:.75rem 1rem;display:flex;flex-direction:column;gap:2px}
.ll{font-family:var(--mono);font-size:12px;line-height:1.7;display:flex;gap:10px}
.ll .ts{color:var(--text3);flex-shrink:0}
.ll .m{color:var(--text2)}
.ll.ok .m{color:var(--green)}
.ll.err .m{color:var(--red)}
.ll.warn .m{color:var(--amber)}
.ll.info .m{color:var(--accent)}

/* ── Empty ── */
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:2.5rem;color:var(--text3);font-size:13px;border:1px dashed var(--border2);border-radius:var(--r);text-align:center}

/* ── Footer ── */
footer{font-size:11px;color:var(--text3);padding:0 1.5rem 1.2rem;display:flex;gap:6px;align-items:center}
footer .fd{width:5px;height:5px;border-radius:50%;background:var(--green)}

@media(max-width:600px){
  .setup-grid{grid-template-columns:1fr}
  .btn-connect{width:100%}
}
</style>
</head>
<body>

<header>
  <div class="mark">
    <svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
  </div>
  <div class="htext">
    <h1>Remote Launcher</h1>
    <p>通过 Cloudflare Worker 中继 · 无需公网 IP</p>
  </div>
</header>

<main>
  <!-- 连接配置 -->
  <div class="panel">
    <div class="plabel">Worker 连接</div>
    <div class="setup-grid">
      <div class="field">
        <label>Worker 地址</label>
        <input id="i-url" type="text" placeholder="miku.wahleak.top （只填域名即可）" />
      </div>
      <div class="field">
        <label>访问密钥</label>
        <input id="i-secret" type="password" placeholder="SECRET 环境变量的值" />
      </div>
      <div>
        <button class="btn-connect" id="btn-conn" onclick="connect()">连接</button>
        <button class="btn-disc" id="btn-disc" onclick="disconnect()">断开</button>
      </div>
    </div>
    <div class="sbar">
      <div class="dot" id="dot"></div>
      <span class="stext" id="stext">未连接</span>
      <span class="ping" id="ping"></span>
    </div>
  </div>

  <!-- Agent 状态 -->
  <div id="agent-card" class="agent-card offline">
    <div class="adot"></div>
    <span id="agent-label">Agent 离线 — 请在目标电脑上启动 RemoteLauncher.exe</span>
  </div>

  <!-- 应用列表 -->
  <div id="apps-section" style="display:none">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
      <div class="plabel" style="margin:0">可用应用</div>
      <span style="font-size:12px;color:var(--text3)" id="app-count"></span>
    </div>
    <div class="app-grid" id="app-grid"></div>
  </div>

  <div class="empty" id="empty-hint">
    连接 Worker 后，等待 Agent 上线，应用列表将自动加载
  </div>

  <!-- 日志 -->
  <div class="log-wrap">
    <div class="log-hd">
      <span>事件日志</span>
      <button class="btn-sm" onclick="document.getElementById('log').innerHTML=''">清空</button>
    </div>
    <div id="log"></div>
  </div>
</main>

<footer>
  <div class="fd"></div>
  Cloudflare Worker 中继 · 端对端流量不落盘
</footer>

<script>
let ws = null, pingTimer = null, pingTs = 0;
const icons = ['🖥','📝','📊','🌐','🎮','🎵','📸','🔧','⚙','🚀','📦','🔒','🗂','🖨','📡'];
let icoIdx = 0;

function connect() {
  let base = document.getElementById('i-url').value.trim().replace(/\/+$/, '');
  const secret = document.getElementById('i-secret').value.trim();
  if (!base) return;
  // 自动补协议头、强制走 /control 路径
  base = base.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://');
  if (!/^wss?:\/\//i.test(base)) base = 'wss://' + base;
  const wsHost = base.replace(/\/(agent|control|status).*$/, '');
  const url = wsHost + '/control?secret=' + encodeURIComponent(secret);

  setStatus('connecting','正在连接...');
  log('info','连接到 ' + wsHost + '/control?secret=***');
  document.getElementById('btn-conn').disabled = true;

  ws = new WebSocket(url);

  ws.onopen = () => {
    setStatus('online','已连接 Worker');
    log('ok','WebSocket 已建立');
    document.getElementById('btn-conn').style.display = 'none';
    document.getElementById('btn-disc').style.display = '';
    document.getElementById('btn-conn').disabled = false;
    startPing();
  };

  ws.onmessage = (ev) => {
    let msg; try { msg = JSON.parse(ev.data); } catch{ return; }
    if (msg.type === 'pong') { updatePing(Date.now() - pingTs); return; }
    handle(msg);
  };

  ws.onerror = () => {
    setStatus('error','连接失败');
    log('err','WebSocket 错误，请检查 Worker 地址和密钥');
    reset();
  };

  ws.onclose = (e) => {
    clearInterval(pingTimer);
    setStatus('','已断开');
    log('warn','连接已关闭 (code ' + e.code + ')');
    reset();
  };
}

function disconnect() {
  if (ws) ws.close();
}

function handle(msg) {
  switch(msg.type) {
    case 'agent_online':
      document.getElementById('agent-card').className = 'agent-card online';
      document.getElementById('agent-label').textContent = 'Agent 在线 · 目标电脑已就绪';
      log('ok','Agent 已上线');
      break;
    case 'agent_offline':
      document.getElementById('agent-card').className = 'agent-card offline';
      document.getElementById('agent-label').textContent = 'Agent 离线 — 请在目标电脑上启动 RemoteLauncher.exe';
      document.getElementById('apps-section').style.display = 'none';
      document.getElementById('empty-hint').style.display = '';
      log('warn','Agent 已下线');
      break;
    case 'auth_ok':
      log('ok','认证成功，已加载 ' + msg.apps.length + ' 个应用');
      renderApps(msg.apps);
      break;
    case 'auth_fail':
      log('err','认证失败：密钥错误');
      break;
    case 'launch_ok':
      log('ok','✓ 已启动：' + msg.appName);
      flash(msg.appId, 'ok', '已启动');
      break;
    case 'launch_fail':
      log('err','✗ 启动失败：' + msg.appName + ' — ' + msg.message);
      flash(msg.appId, 'fail', '失败');
      break;
    case 'error':
      log('err','错误: ' + msg.message);
      break;
  }
}

function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function launch(id) { send({ type:'launch', payload:id }); log('info','启动应用: ' + id); }

function flash(id, cls, text) {
  const b = document.querySelector('[data-id="'+id+'"] .badge');
  if (!b) return;
  b.className = 'badge ' + cls; b.textContent = text;
  setTimeout(() => { b.className = 'badge'; }, 2800);
}

function renderApps(apps) {
  const g = document.getElementById('app-grid');
  g.innerHTML = '';
  document.getElementById('empty-hint').style.display = 'none';
  document.getElementById('apps-section').style.display = '';
  document.getElementById('app-count').textContent = apps.length + ' 个应用';
  apps.forEach(a => {
    const ic = icons[icoIdx++ % icons.length];
    const d = document.createElement('div');
    d.className = 'app-card'; d.setAttribute('data-id', a.Id);
    d.onclick = () => launch(a.Id);
    d.innerHTML = '<div class="badge"></div><div class="app-icon">'+ic+'</div><div class="app-name">'+a.Name+'</div><div class="app-sub">点击启动</div>';
    g.appendChild(d);
  });
}

function reset() {
  document.getElementById('btn-conn').style.display = '';
  document.getElementById('btn-conn').disabled = false;
  document.getElementById('btn-disc').style.display = 'none';
  document.getElementById('agent-card').className = 'agent-card offline';
  document.getElementById('agent-label').textContent = 'Agent 离线 — 请在目标电脑上启动 RemoteLauncher.exe';
  document.getElementById('apps-section').style.display = 'none';
  document.getElementById('empty-hint').style.display = '';
  document.getElementById('ping').textContent = '';
  clearInterval(pingTimer);
}

function setStatus(cls, text) {
  document.getElementById('dot').className = 'dot ' + cls;
  document.getElementById('stext').textContent = text;
}

function startPing() {
  clearInterval(pingTimer);
  pingTimer = setInterval(() => {
    pingTs = Date.now();
    send({ type:'ping' });
  }, 5000);
}

function updatePing(ms) {
  const el = document.getElementById('ping');
  el.textContent = ms + ' ms';
  el.className = 'ping' + (ms < 150 ? ' good' : '');
}

function log(type, msg) {
  const el = document.getElementById('log');
  const ts = new Date().toLocaleTimeString('zh-CN',{hour12:false});
  const d = document.createElement('div');
  d.className = 'll ' + type;
  d.innerHTML = '<span class="ts">'+ts+'</span><span class="m">'+msg+'</span>';
  el.appendChild(d); el.scrollTop = el.scrollHeight;
}

log('info','Remote Launcher (Cloud) 已就绪 · 填入 Worker 地址和密钥后连接');
</script>
</body>
</html>`;
