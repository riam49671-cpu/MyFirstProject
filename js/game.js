const ARENA = { w: 960, h: 540 };
const PLAYER_R = 26;
const SPEED = 220;
const CROWN_SPEED = 198;
const TAG_DIST = PLAYER_R * 2 + 4;

/** Gleiche Hindernisse wie in server/krone_server.py */
const OBSTACLES = [
  { x: 100, y: 70, w: 130, h: 36 },
  { x: 730, y: 434, w: 130, h: 36 },
  { x: 440, y: 90, w: 36, h: 140 },
  { x: 484, y: 310, w: 36, h: 140 },
  { x: 200, y: 240, w: 90, h: 36 },
  { x: 670, y: 264, w: 90, h: 36 },
];

/** Reihenfolge: Rot, Blau, Grün, Gelb */
const SHIRT_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#eab308"];
const SKIN_COLORS = ["#fcd9c4", "#e8b896", "#c58b5a", "#7d4e32"];
const HAIR_COLORS = ["#3f2e24", "#c2410c", "#1e3a5f", "#15803d"];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const timerEl = document.getElementById("timer");
const crownHud = document.getElementById("crown-hud");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMsg = document.getElementById("overlay-msg");
const btnStart = document.getElementById("btn-start");
const btnAgain = document.getElementById("btn-again");
const selTotal = document.getElementById("total");
const selHumans = document.getElementById("humans");
const chkUseBots = document.getElementById("use-bots");
const rowHumans = document.getElementById("row-humans");
const hintHumansOnly = document.getElementById("hint-humans-only");
const selDuration = document.getElementById("duration");
const selMode = document.getElementById("game-mode");
const panelLocal = document.getElementById("panel-local");
const panelOnline = document.getElementById("panel-online");
const inpWsUrl = document.getElementById("ws-url");

const keys = new Set();

/** @type {{ x: number, y: number, color: string, name: string, human: boolean, aiAngle: number, faceDir: number, bob: number }}[] */
let players = [];
let crownIndex = 0;
let running = false;
let gameEndAt = 0;
let rafId = 0;
let gameDurationMs = 120000;

/** Online */
let netWs = null;
let netSlot = 0;
let playOnline = false;

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function getDurationMs() {
  const v = selDuration ? selDuration.value : "120";
  return parseInt(v, 10) * 1000;
}

function circleOverlapsObstacle(px, py) {
  for (const o of OBSTACLES) {
    const cx = clamp(px, o.x, o.x + o.w);
    const cy = clamp(py, o.y, o.y + o.h);
    if (Math.hypot(px - cx, py - cy) < PLAYER_R - 0.5) return true;
  }
  return false;
}

function resolveObstacles(px, py) {
  let x = px;
  let y = py;
  for (const o of OBSTACLES) {
    const ox = o.x;
    const oy = o.y;
    const ow = o.w;
    const oh = o.h;
    const cpx = clamp(x, ox, ox + ow);
    const cpy = clamp(y, oy, oy + oh);
    let dx = x - cpx;
    let dy = y - cpy;
    let dist = Math.hypot(dx, dy);
    if (dist < PLAYER_R && dist > 1e-6) {
      const push = (PLAYER_R - dist) / dist;
      x += dx * push;
      y += dy * push;
    } else if (dist < 1e-6) {
      const dl = x - ox;
      const dr = ox + ow - x;
      const dt = y - oy;
      const db = oy + oh - y;
      const m = Math.min(dl, dr, dt, db);
      if (m === dl) x = ox - PLAYER_R;
      else if (m === dr) x = ox + ow + PLAYER_R;
      else if (m === dt) y = oy - PLAYER_R;
      else y = oy + oh + PLAYER_R;
    }
  }
  x = clamp(x, PLAYER_R, ARENA.w - PLAYER_R);
  y = clamp(y, PLAYER_R, ARENA.h - PLAYER_R);
  return { x, y };
}

function resolvePlayerObstacles(p) {
  const r = resolveObstacles(p.x, p.y);
  p.x = r.x;
  p.y = r.y;
}

function syncHumanSelect() {
  const total = parseInt(selTotal.value, 10);
  const useBots = chkUseBots.checked;
  selHumans.innerHTML = "";
  if (useBots) {
    for (let i = 1; i < total; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = String(i);
      selHumans.appendChild(o);
    }
    const maxH = total - 1;
    let cur = parseInt(selHumans.value, 10);
    if (!cur || cur >= total) cur = Math.min(2, maxH);
    selHumans.value = String(clamp(cur, 1, maxH));
    rowHumans.classList.remove("muted");
    hintHumansOnly.classList.add("hidden");
  } else {
    for (let i = 1; i <= total; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = String(i);
      selHumans.appendChild(o);
    }
    selHumans.value = String(total);
    rowHumans.classList.add("muted");
    hintHumansOnly.classList.remove("hidden");
  }
}

function syncModePanel() {
  const online = selMode && selMode.value === "online";
  if (panelLocal) panelLocal.classList.toggle("hidden", online);
  if (panelOnline) panelOnline.classList.toggle("hidden", !online);
}

selTotal.addEventListener("change", syncHumanSelect);
chkUseBots.addEventListener("change", syncHumanSelect);
if (selMode) selMode.addEventListener("change", syncModePanel);
syncHumanSelect();
syncModePanel();

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

function humanVelocity(index) {
  let dx = 0;
  let dy = 0;
  if (index === 0) {
    if (keys.has("KeyW")) dy -= 1;
    if (keys.has("KeyS")) dy += 1;
    if (keys.has("KeyA")) dx -= 1;
    if (keys.has("KeyD")) dx += 1;
  } else if (index === 1) {
    if (keys.has("ArrowUp")) dy -= 1;
    if (keys.has("ArrowDown")) dy += 1;
    if (keys.has("ArrowLeft")) dx -= 1;
    if (keys.has("ArrowRight")) dx += 1;
  } else if (index === 2) {
    if (keys.has("KeyI")) dy -= 1;
    if (keys.has("KeyK")) dy += 1;
    if (keys.has("KeyJ")) dx -= 1;
    if (keys.has("KeyL")) dx += 1;
  } else if (index === 3) {
    if (keys.has("KeyT")) dy -= 1;
    if (keys.has("KeyG")) dy += 1;
    if (keys.has("KeyF")) dx -= 1;
    if (keys.has("KeyH")) dx += 1;
  }
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { dx: 0, dy: 0 };
  return { dx: dx / len, dy: dy / len };
}

function aiVelocity(i) {
  const p = players[i];
  const speed = i === crownIndex ? CROWN_SPEED : SPEED;

  if (i === crownIndex) {
    let bx = 0;
    let by = 0;
    for (let j = 0; j < players.length; j++) {
      if (j === i) continue;
      const dx = p.x - players[j].x;
      const dy = p.y - players[j].y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = (SPEED * 1.2) / (d * d) * 800;
      bx += (dx / d) * pull;
      by += (dy / d) * pull;
    }
    bx += (ARENA.w / 2 - p.x) * 0.0008;
    by += (ARENA.h / 2 - p.y) * 0.0008;
    p.aiAngle += 0.05 + Math.sin(performance.now() * 0.002 + i) * 0.02;
    bx += Math.cos(p.aiAngle) * 0.35;
    by += Math.sin(p.aiAngle) * 0.35;
    const len = Math.hypot(bx, by) || 1;
    return { dx: (bx / len) * speed, dy: (by / len) * speed };
  }

  const target = players[crownIndex];
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: (dx / len) * speed, dy: (dy / len) * speed };
}

function spawnPosition(i, n) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = (i / n) * Math.PI * 2 + 0.3 + attempt * 0.12;
    const rad = Math.min(ARENA.w, ARENA.h) * (0.24 + (attempt % 5) * 0.02);
    let x = ARENA.w / 2 + Math.cos(angle) * rad;
    let y = ARENA.h / 2 + Math.sin(angle) * rad;
    x = clamp(x, PLAYER_R, ARENA.w - PLAYER_R);
    y = clamp(y, PLAYER_R, ARENA.h - PLAYER_R);
    if (!circleOverlapsObstacle(x, y)) {
      const r = resolveObstacles(x, y);
      return { x: r.x, y: r.y };
    }
  }
  return { x: ARENA.w / 2 + 100, y: ARENA.h / 2 };
}

function placePlayers(n, humanCount) {
  players = [];
  for (let i = 0; i < n; i++) {
    const pos = spawnPosition(i, n);
    const human = i < humanCount;
    players.push({
      x: pos.x,
      y: pos.y,
      color: SHIRT_COLORS[i],
      human,
      name: human ? `Spieler ${i + 1}` : `Roboter ${i + 1}`,
      aiAngle: Math.random() * Math.PI * 2,
      faceDir: 1,
      bob: 0,
    });
  }
  crownIndex = Math.floor(Math.random() * n);
}

function resolveCollisions() {
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const min = PLAYER_R * 2;
      if (dist < min && dist > 0) {
        const push = (min - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        a.x = clamp(a.x, PLAYER_R, ARENA.w - PLAYER_R);
        a.y = clamp(a.y, PLAYER_R, ARENA.h - PLAYER_R);
        b.x = clamp(b.x, PLAYER_R, ARENA.w - PLAYER_R);
        b.y = clamp(b.y, PLAYER_R, ARENA.h - PLAYER_R);
        resolvePlayerObstacles(a);
        resolvePlayerObstacles(b);

        if (dist < TAG_DIST) {
          if (i === crownIndex && j !== crownIndex) {
            crownIndex = j;
          } else if (j === crownIndex && i !== crownIndex) {
            crownIndex = i;
          }
        }
      }
    }
  }
}

function drawCrownIcon(x, y, nowMs) {
  const t = (nowMs || performance.now()) * 0.003;
  const bob = Math.sin(t * 2) * 2;
  ctx.save();
  ctx.translate(x, y + bob);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
  glow.addColorStop(0, "rgba(253, 224, 71, 0.55)");
  glow.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();

  const baseGrd = ctx.createLinearGradient(-18, -14, 18, 16);
  baseGrd.addColorStop(0, "#fde047");
  baseGrd.addColorStop(0.45, "#eab308");
  baseGrd.addColorStop(1, "#b45309");

  const R = 15;
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const ang = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    const px = Math.cos(ang) * R;
    const py = Math.sin(ang) * R * 0.52 + (k % 2 === 0 ? -4 : 1);
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = baseGrd;
  ctx.fill();
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 2;
  ctx.stroke();

  const gems = ["#dc2626", "#2563eb", "#16a34a", "#a855f7"];
  for (let k = 0; k < 5; k++) {
    const ang = (k * 2 * Math.PI) / 5 - Math.PI / 2;
    const tipX = Math.cos(ang) * (R - 2);
    const tipY = Math.sin(ang) * (R * 0.52 - 2) + (k % 2 === 0 ? -4 : 1);
    ctx.fillStyle = gems[k % gems.length];
    ctx.beginPath();
    ctx.arc(tipX * 0.72, tipY * 0.72 + 2, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const band = ctx.createLinearGradient(-12, 10, 12, 10);
  band.addColorStop(0, "#713f12");
  band.addColorStop(0.5, "#a16207");
  band.addColorStop(1, "#713f12");
  ctx.fillStyle = band;
  ctx.fillRect(-14, 6, 28, 8);
  ctx.strokeStyle = "#451a03";
  ctx.strokeRect(-14, 6, 28, 8);

  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-6, -4, 2.5, 0, Math.PI * 2);
  ctx.arc(7, -6, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacles() {
  for (const o of OBSTACLES) {
    const g = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y + o.h);
    g.addColorStop(0, "#334155");
    g.addColorStop(0.5, "#475569");
    g.addColorStop(1, "#1e293b");
    ctx.fillStyle = g;
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(o.x + 1.5, o.y + 1.5, o.w - 3, o.h - 3);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  }
}

function drawShadow(x, y) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + PLAYER_R - 4, 20, 9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHumanPlayer(p, i, slot, nowMs) {
  const x = p.x;
  const y = p.y + Math.sin(p.bob) * 2;
  const dir = p.faceDir;
  const shirt = p.color;
  const skin = SKIN_COLORS[slot % SKIN_COLORS.length];
  const hair = HAIR_COLORS[slot % HAIR_COLORS.length];

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-8, 12, 6, 4);
  ctx.fillRect(2, 12, 6, 4);

  const grd = ctx.createLinearGradient(-14, -8, 14, 18);
  grd.addColorStop(0, shirt);
  grd.addColorStop(1, shadeColor(shirt, -25));
  ctx.fillStyle = grd;
  roundRect(ctx, -14, -6, 28, 22, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, -14, -6, 28, 22, 8);
  ctx.stroke();

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -20, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, -26, 10, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-5, -20, 4, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(5, -20, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(-5 + dir * 1.5, -19, 2, 0, Math.PI * 2);
  ctx.arc(5 + dir * 1.5, -19, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,150,150,0.5)";
  ctx.beginPath();
  ctx.ellipse(-7, -14, 3, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -14, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (i === crownIndex) {
    drawCrownIcon(x, y - 36, nowMs);
  }

  drawBadge(x, y + 8, String(slot + 1), shirt);
}

function drawRobotPlayer(p, i, slot, nowMs) {
  const x = p.x;
  const y = p.y + Math.sin(p.bob * 1.5) * 1.5;
  const dir = p.faceDir;
  const accent = p.color;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  const metal1 = "#64748b";
  const metal2 = "#475569";

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(-10, 14, 8, 3);
  ctx.fillRect(2, 14, 8, 3);

  const bodyGrd = ctx.createLinearGradient(-16, 0, 16, 24);
  bodyGrd.addColorStop(0, metal1);
  bodyGrd.addColorStop(1, metal2);
  ctx.fillStyle = bodyGrd;
  roundRect(ctx, -16, -4, 32, 26, 6);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, -16, -4, 32, 26, 6);
  ctx.stroke();

  ctx.fillStyle = "#334155";
  roundRect(ctx, -12, 0, 24, 8, 3);
  ctx.fill();

  ctx.fillStyle = "#0ea5e9";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 6;
  ctx.fillRect(-10, 2, 6, 4);
  ctx.fillRect(4, 2, 6, 4);
  ctx.shadowBlur = 0;

  ctx.fillStyle = metal2;
  ctx.beginPath();
  ctx.arc(0, -18, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = metal1;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(0, -40);
  ctx.stroke();
  ctx.fillStyle = "#f43f5e";
  ctx.beginPath();
  ctx.arc(0, -42, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (i === crownIndex) {
    drawCrownIcon(x, y - 34, nowMs);
  }

  drawBadge(x, y + 10, String(slot + 1), accent);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shadeColor(hex, percent) {
  const n = hex.replace("#", "");
  const num = parseInt(n, 16);
  const r = clamp(((num >> 16) & 0xff) + (percent * 255) / 100, 0, 255);
  const g = clamp(((num >> 8) & 0xff) + (percent * 255) / 100, 0, 255);
  const b = clamp((num & 0xff) + (percent * 255) / 100, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function drawBadge(cx, cy, text, color) {
  ctx.save();
  ctx.font = "bold 11px system-ui,sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(15,20,25,0.85)";
  ctx.beginPath();
  ctx.arc(cx + 18, cy - 18, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#f8fafc";
  ctx.fillText(text, cx + 18, cy - 18);
  ctx.restore();
}

function drawPlayer(p, i, nowMs) {
  drawShadow(p.x, p.y);
  if (p.human) {
    drawHumanPlayer(p, i, i, nowMs);
  } else {
    drawRobotPlayer(p, i, i, nowMs);
  }
}

function drawScene(nowMs) {
  ctx.fillStyle = "#152028";
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let g = 0; g < ARENA.w; g += 48) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, ARENA.h);
    ctx.stroke();
  }
  for (let g = 0; g < ARENA.h; g += 48) {
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(ARENA.w, g);
    ctx.stroke();
  }

  drawObstacles();

  const order = players.map((_, i) => i).sort((a, b) => players[a].y - players[b].y);
  for (const i of order) {
    drawPlayer(players[i], i, nowMs);
  }
}

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function tick(now) {
  if (!running || playOnline) return;
  const dt = Math.min(0.05, 1 / 60);
  const left = gameEndAt - now;
  timerEl.textContent = formatTime(left);
  crownHud.textContent = `Krone: ${players[crownIndex].name}`;

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const spd = i === crownIndex ? CROWN_SPEED : SPEED;
    let vx = 0;
    let vy = 0;
    if (p.human) {
      const v = humanVelocity(i);
      vx = v.dx * spd;
      vy = v.dy * spd;
    } else {
      const v = aiVelocity(i);
      vx = v.dx;
      vy = v.dy;
    }
    if (Math.abs(vx) > 2) p.faceDir = vx > 0 ? 1 : -1;
    p.bob += dt * 12;
    p.x += vx * dt;
    p.y += vy * dt;
    p.x = clamp(p.x, PLAYER_R, ARENA.w - PLAYER_R);
    p.y = clamp(p.y, PLAYER_R, ARENA.h - PLAYER_R);
    resolvePlayerObstacles(p);
  }

  resolveCollisions();
  for (let i = 0; i < players.length; i++) resolvePlayerObstacles(players[i]);

  drawScene(now);

  if (left <= 0) {
    endGame();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function applyNetworkState(d) {
  crownIndex = d.crownIndex;
  crownHud.textContent = `Krone: ${d.players[crownIndex].name}`;
  timerEl.textContent = formatTime(d.timeLeftMs);
  players = d.players.map((p, i) => ({
    x: p.x,
    y: p.y,
    color: p.color || SHIRT_COLORS[i],
    human: p.human,
    name: p.name,
    faceDir: p.faceDir ?? 1,
    bob: p.bob ?? 0,
    aiAngle: 0,
  }));
  if (!d.running) {
    running = false;
  }
}

function networkLoop(now) {
  if (!playOnline) return;
  if (netWs && netWs.readyState === WebSocket.OPEN) {
    const v = humanVelocity(netSlot);
    netWs.send(JSON.stringify({ type: "input", dx: v.dx, dy: v.dy }));
  }
  drawScene(now);
  rafId = requestAnimationFrame(networkLoop);
}

function endGame() {
  running = false;
  cancelAnimationFrame(rafId);
  const winner = players[crownIndex];
  overlayTitle.textContent = "Zeit abgelaufen!";
  overlayMsg.textContent = `${winner.name} hat die Krone und gewinnt.`;
  overlay.classList.remove("hidden");
}

function startLocalGame() {
  playOnline = false;
  gameDurationMs = getDurationMs();
  const total = parseInt(selTotal.value, 10);
  let humans;
  if (chkUseBots.checked) {
    humans = clamp(parseInt(selHumans.value, 10), 1, total - 1);
  } else {
    humans = total;
  }

  placePlayers(total, humans);

  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  overlay.classList.add("hidden");
  gameEndAt = performance.now() + gameDurationMs;
  timerEl.textContent = formatTime(gameDurationMs);
  running = true;
  rafId = requestAnimationFrame(tick);
}

function startOnlineGame() {
  const url = (inpWsUrl && inpWsUrl.value.trim()) || `ws://${location.hostname}:8770`;
  playOnline = true;
  gameDurationMs = getDurationMs();

  netWs = new WebSocket(url);

  netWs.onopen = () => {};

  netWs.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.type === "welcome") {
      netSlot = d.slot;
      menu.classList.add("hidden");
      hud.classList.remove("hidden");
      overlay.classList.add("hidden");
      running = true;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(networkLoop);
    }
    if (d.type === "state") {
      applyNetworkState(d);
      if (d.running) {
        overlay.classList.add("hidden");
      }
    }
    if (d.type === "game_over") {
      overlayTitle.textContent = "Zeit abgelaufen!";
      overlayMsg.textContent = `${d.winner} hat die Krone und gewinnt.`;
      overlay.classList.remove("hidden");
      running = false;
    }
    if (d.type === "error") {
      alert(d.msg || "Verbindungsfehler");
    }
  };

  netWs.onerror = () => {
    alert("Keine Verbindung zum Server. Läuft auf dem Host-Rechner: python3 server/krone_server.py ?");
    playOnline = false;
  };

  netWs.onclose = () => {
    if (running && playOnline) {
      running = false;
    }
  };
}

btnStart.addEventListener("click", () => {
  if (selMode && selMode.value === "online") {
    startOnlineGame();
  } else {
    startLocalGame();
  }
});

btnAgain.addEventListener("click", () => {
  if (playOnline && netWs && netWs.readyState === WebSocket.OPEN) {
    try {
      netWs.send(JSON.stringify({ type: "restart" }));
    } catch (_) {}
    overlay.classList.add("hidden");
    return;
  }
  overlay.classList.add("hidden");
  menu.classList.remove("hidden");
  hud.classList.add("hidden");
  if (netWs) {
    netWs.close();
    netWs = null;
  }
  playOnline = false;
  running = false;
  cancelAnimationFrame(rafId);
  ctx.fillStyle = "#152028";
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
});

if (inpWsUrl && !inpWsUrl.value) {
  const h = location.hostname || "127.0.0.1";
  inpWsUrl.value =
    h === "127.0.0.1" || h === "localhost" ? "ws://127.0.0.1:8770" : `ws://${h}:8770`;
}

drawScene(performance.now());