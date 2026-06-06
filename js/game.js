const ARENA = { w: 960, h: 540 };
const PLAYER_R = 26;
const SPEED = 220;
/** Roboter ohne Krone: langsamer als Menschen */
const SPEED_AI = 170;
const CROWN_SPEED = 198;
/** Roboter mit Krone: langsamer und etwas vorhersehbarer als Menschen mit Krone */
const CROWN_SPEED_AI = 150;
/** Berührung für Krone: etwas großzügiger als reine Kreisüberlappung (KI sonst kaum tagbar) */
const TAG_RANGE = PLAYER_R * 2 + 14;
/** Nach Krone-Wechsel: kurze Zeit niemand kann sie wieder nehmen (ms) */
const CROWN_PROTECT_MS = 5000;

/** Gleiche Hindernisse wie in server/krone_server.py */
const OBSTACLES = [
  { x: 100, y: 70, w: 130, h: 36 },
  { x: 730, y: 434, w: 130, h: 36 },
  { x: 440, y: 90, w: 36, h: 140 },
  { x: 484, y: 310, w: 36, h: 140 },
  { x: 200, y: 240, w: 90, h: 36 },
  { x: 670, y: 264, w: 90, h: 36 },
];

let meadowDecorInited = false;
/** @type {{ x: number, y: number, t: number, ph: number }[]} */
let meadowFlowers = [];

function pointInObstacle(px, py, pad = 0) {
  for (const o of OBSTACLES) {
    if (px >= o.x - pad && px <= o.x + o.w + pad && py >= o.y - pad && py <= o.y + o.h + pad) return true;
  }
  return false;
}

function initMeadowDecor() {
  if (meadowDecorInited) return;
  meadowDecorInited = true;
  const rnd = (i, k) => {
    const t = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return t - Math.floor(t);
  };
  let attempts = 0;
  while (meadowFlowers.length < 130 && attempts < 800) {
    attempts++;
    const fx = 10 + rnd(attempts, 0) * (ARENA.w - 20);
    const fy = 95 + rnd(attempts, 1) * (ARENA.h - 110);
    if (pointInObstacle(fx, fy, 22)) continue;
    meadowFlowers.push({
      x: fx,
      y: fy,
      t: attempts % 9,
      ph: rnd(attempts, 2) * Math.PI * 2,
    });
  }
}

function drawMeadowBackground() {
  const bg = ctx.createLinearGradient(0, 0, 0, ARENA.h);
  bg.addColorStop(0, "#87ceeb");
  bg.addColorStop(0.22, "#bfe9ff");
  bg.addColorStop(0.34, "#d4f4dd");
  bg.addColorStop(0.42, "#86efac");
  bg.addColorStop(0.62, "#4ade80");
  bg.addColorStop(0.88, "#22c55e");
  bg.addColorStop(1, "#15803d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);

  ctx.strokeStyle = "rgba(21, 128, 61, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 220; i++) {
    const x = (i * 97) % ARENA.w;
    const y = 175 + (i * 53) % (ARENA.h - 185);
    if (pointInObstacle(x, y, 18)) continue;
    const h = 3 + (i % 6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + ((i % 5) - 2) * 0.5, y - h);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.beginPath();
  ctx.ellipse(720, 95, 90, 28, 0, 0, Math.PI * 2);
  ctx.ellipse(180, 115, 70, 22, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawOneFlower(cx, cy, kind, bob) {
  ctx.save();
  ctx.translate(cx, cy + bob);
  const petals = kind % 3 === 0 ? "#f472b6" : kind % 3 === 1 ? "#fb7185" : "#fde047";
  const center = "#fef08a";
  const n = 5;
  for (let p = 0; p < n; p++) {
    const a = (p / n) * Math.PI * 2;
    ctx.fillStyle = petals;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 4, Math.sin(a) * 4, 4, 2.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = center;
  ctx.beginPath();
  ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(21,128,61,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 3);
  ctx.quadraticCurveTo(2, 10, 0, 14);
  ctx.stroke();
  ctx.restore();
}

function drawMeadowFlowers(nowMs) {
  const t = nowMs * 0.003;
  for (const f of meadowFlowers) {
    drawOneFlower(f.x, f.y, f.t, Math.sin(t + f.ph) * 1.2);
  }
}

function drawTree(x, baseY, scale) {
  ctx.save();
  ctx.translate(x, baseY);
  const tw = 11 * scale;
  const th = 42 * scale;
  ctx.fillStyle = "#5c4033";
  ctx.fillRect(-tw / 2, -th, tw, th);
  const layers = [
    { r: 38, y: -th - 8 * scale, c: "#166534" },
    { r: 32, y: -th - 22 * scale, c: "#15803d" },
    { r: 26, y: -th - 36 * scale, c: "#22c55e" },
  ];
  for (const L of layers) {
    ctx.fillStyle = L.c;
    ctx.beginPath();
    ctx.arc(0, L.y, L.r * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.beginPath();
  ctx.ellipse(0, 0, tw * 1.8, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMeadowTrees() {
  const topY = 92;
  const tops = [38, 110, 185, 260, 420, 520, 620, 760, 840, 905];
  for (let i = 0; i < tops.length; i++) {
    drawTree(tops[i], topY, 0.42 + (i % 3) * 0.06);
  }
  drawTree(48, ARENA.h - 8, 1.05);
  drawTree(ARENA.w - 52, ARENA.h - 10, 1.0);
  drawTree(28, 310, 0.72);
  drawTree(ARENA.w - 30, 295, 0.68);
}

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
const crownProtectEl = document.getElementById("crown-protect");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMsg = document.getElementById("overlay-msg");
const btnStart = document.getElementById("btn-start");
const btnAgain = document.getElementById("btn-again");
const selTotal = document.getElementById("total");
const selHumans = document.getElementById("humans");
const selComputers = document.getElementById("computers");
const rowHumans = document.getElementById("row-humans");
const hintHumansOnly = document.getElementById("hint-humans-only");
const selDuration = document.getElementById("duration");
const selMode = document.getElementById("game-mode");
const panelLocal = document.getElementById("panel-local");
const panelOnline = document.getElementById("panel-online");
const inpWsUrl = document.getElementById("ws-url");
const inpSharePageUrl = document.getElementById("share-page-url");
const onlineFileHint = document.getElementById("online-file-hint");
const btnMute = document.getElementById("btn-mute");

const keys = new Set();

/** Online: Krone für Sound-Vergleich */
let netLastCrown = -1;

/** Nur Kosmetik: Krone getagged */
let screenShake = 0;
let tagFlash = 0;
let shakePhase = 0;
/** @type {{ x: number, y: number, vx: number, vy: number, life: number, hue: number }[]} */
let tagParticles = [];

/** @type {{ x: number, y: number, color: string, name: string, human: boolean, aiAngle: number, faceDir: number, bob: number, velX?: number, velY?: number }}[] */
let players = [];
let crownIndex = 0;
/** `performance.now()` bis wann der aktuelle Kronen-Träger nicht getaggt werden kann (nur lokal) */
let crownProtectedUntil = 0;
/** Online: geschätztes Ende des Schutzes (performance.now()) */
let netProtectUntil = 0;
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

function updateCrownProtectHud(nowMs) {
  if (!crownProtectEl) return;
  let leftMs;
  if (playOnline) {
    leftMs = Math.max(0, netProtectUntil - nowMs);
  } else {
    leftMs = Math.max(0, crownProtectedUntil - nowMs);
  }
  if (leftMs <= 0) {
    crownProtectEl.classList.add("hidden");
    crownProtectEl.textContent = "";
    return;
  }
  const sec = Math.ceil(leftMs / 1000);
  crownProtectEl.classList.remove("hidden");
  crownProtectEl.textContent = `Schutz: ${sec}s`;
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

function syncPlayerCounts(fromTotalPick) {
  if (!selHumans || !selComputers) return;
  if (fromTotalPick && selTotal) {
    const t = clamp(parseInt(selTotal.value, 10), 2, 4);
    let h = clamp(parseInt(selHumans.value, 10) || 2, 1, 4);
    let c = t - h;
    if (c < 0) {
      h = t;
      c = 0;
    }
    if (c === 0 && h < 2) h = 2;
    if (h === 1 && c < 1 && t >= 2) c = 1;
    selHumans.value = String(h);
    selComputers.value = String(c);
  }

  let h = parseInt(selHumans.value, 10);
  let c = parseInt(selComputers.value, 10);
  if (Number.isNaN(h)) h = 2;
  if (Number.isNaN(c)) c = 2;

  if (c === 0 && h < 2) {
    h = 2;
    selHumans.value = "2";
  }
  if (h + c > 4) {
    c = 4 - h;
    selComputers.value = String(c);
  }
  if (h + c < 2) {
    c = 2 - h;
    if (c < 0) {
      h = 2;
      c = 0;
      selHumans.value = "2";
      selComputers.value = "0";
    } else {
      selComputers.value = String(c);
    }
  }
  h = parseInt(selHumans.value, 10);
  c = parseInt(selComputers.value, 10);
  if (h > 4 - c) {
    h = 4 - c;
    selHumans.value = String(h);
  }

  const sum = parseInt(selHumans.value, 10) + parseInt(selComputers.value, 10);
  const td = document.getElementById("total-display");
  if (td) td.textContent = String(sum);
  if (selTotal) selTotal.value = String(sum);

  const onlyHumans = parseInt(selComputers.value, 10) === 0;
  if (hintHumansOnly) hintHumansOnly.classList.toggle("hidden", !onlyHumans);
}

function syncModePanel() {
  const online = selMode && selMode.value === "online";
  if (panelLocal) panelLocal.classList.toggle("hidden", online);
  if (panelOnline) panelOnline.classList.toggle("hidden", !online);
  updateOnlineShareFields();
}

function updateOnlineShareFields() {
  if (inpSharePageUrl) {
    if (location.protocol === "http:" || location.protocol === "https:") {
      try {
        const u = new URL(location.href);
        u.hash = "";
        let href = u.href;
        if (u.pathname.endsWith("/")) href = `${u.origin}${u.pathname}index.html`;
        else if (!/index\.html$/i.test(u.pathname)) href = `${u.origin}${u.pathname.replace(/\/?$/, "/")}index.html`;
        inpSharePageUrl.value = href.replace(/([^:]\/)\/+/g, "$1");
      } catch (_) {
        inpSharePageUrl.value = location.href.split("#")[0];
      }
    } else {
      inpSharePageUrl.value =
        "→ Auf dem Host: ./start-online-party.sh — dann die http-Zeile aus dem Terminal kopieren";
    }
  }
  if (onlineFileHint) {
    onlineFileHint.classList.toggle("hidden", location.protocol === "http:" || location.protocol === "https:");
  }
  if (inpWsUrl && (location.protocol === "http:" || location.protocol === "https:")) {
    const h = location.hostname || "127.0.0.1";
    inpWsUrl.placeholder = `ws://${h}:8770`;
    if (!inpWsUrl.dataset.userEdited) {
      inpWsUrl.value = h === "localhost" || h === "127.0.0.1" ? "ws://127.0.0.1:8770" : `ws://${h}:8770`;
    }
  }
}

if (selTotal) {
  selTotal.addEventListener("change", () => syncPlayerCounts(true));
}
if (selHumans) selHumans.addEventListener("change", () => syncPlayerCounts(false));
if (selComputers) selComputers.addEventListener("change", () => syncPlayerCounts(false));
if (selMode) selMode.addEventListener("change", syncModePanel);
syncPlayerCounts(false);
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

function aiVelocity(i, dt) {
  const p = players[i];
  if (!p.human && i !== crownIndex) {
    p.aiFleeSmX = undefined;
    p.aiFleeSmY = undefined;
  }

  const holder = players[crownIndex];
  const crownSpd = holder.human ? CROWN_SPEED : CROWN_SPEED_AI;
  const speed = i === crownIndex ? crownSpd : SPEED_AI;

  if (i === crownIndex) {
    let bx = 0;
    let by = 0;
    const aiCrown = !p.human;
    if (aiCrown) {
      // Nur vom nächsten Gegner weglaufen + schwache Mitte — verhindert hektisches Hin und Her
      let bestJ = -1;
      let bestD = Infinity;
      for (let j = 0; j < players.length; j++) {
        if (j === i) continue;
        const d = Math.hypot(p.x - players[j].x, p.y - players[j].y);
        if (d < bestD) {
          bestD = d;
          bestJ = j;
        }
      }
      if (bestJ >= 0) {
        const dx = p.x - players[bestJ].x;
        const dy = p.y - players[bestJ].y;
        const d = Math.hypot(dx, dy) || 1;
        const pull = (SPEED_AI * 1.2) / (d * d) * 800 * 0.48;
        bx += (dx / d) * pull;
        by += (dy / d) * pull;
      }
      bx += (ARENA.w / 2 - p.x) * 0.00028;
      by += (ARENA.h / 2 - p.y) * 0.00028;
      let len = Math.hypot(bx, by) || 1;
      let rdx = bx / len;
      let rdy = by / len;
      if (p.aiFleeSmX == null || p.aiFleeSmY == null) {
        p.aiFleeSmX = rdx;
        p.aiFleeSmY = rdy;
      }
      const smoothK = 1 - Math.exp(-5 * dt);
      p.aiFleeSmX += (rdx - p.aiFleeSmX) * smoothK;
      p.aiFleeSmY += (rdy - p.aiFleeSmY) * smoothK;
      const smLen = Math.hypot(p.aiFleeSmX, p.aiFleeSmY) || 1;
      return { dx: (p.aiFleeSmX / smLen) * speed, dy: (p.aiFleeSmY / smLen) * speed };
    }
    for (let j = 0; j < players.length; j++) {
      if (j === i) continue;
      const dx = p.x - players[j].x;
      const dy = p.y - players[j].y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = (SPEED_AI * 1.2) / (d * d) * 800;
      bx += (dx / d) * pull;
      by += (dy / d) * pull;
    }
    bx += (ARENA.w / 2 - p.x) * 0.0008;
    by += (ARENA.h / 2 - p.y) * 0.0008;
    p.aiAngle += 0.05 + Math.sin(performance.now() * 0.002 + i) * 0.02;
    const wig = 0.35;
    bx += Math.cos(p.aiAngle) * wig;
    by += Math.sin(p.aiAngle) * wig;
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
      velX: 0,
      velY: 0,
    });
  }
  crownIndex = Math.floor(Math.random() * n);
  crownProtectedUntil = performance.now() + CROWN_PROTECT_MS;
}

function resolveCollisions() {
  const minSep = PLAYER_R * 2;
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist < 1e-6) continue;

      if (dist < TAG_RANGE) {
        const now = performance.now();
        if (now >= crownProtectedUntil) {
          if (i === crownIndex && j !== crownIndex) {
            crownIndex = j;
            crownProtectedUntil = now + CROWN_PROTECT_MS;
          } else if (j === crownIndex && i !== crownIndex) {
            crownIndex = i;
            crownProtectedUntil = now + CROWN_PROTECT_MS;
          }
        }
      }

      if (dist < minSep) {
        const push = (minSep - dist) / 2;
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
  ctx.fillStyle = "rgba(15, 80, 30, 0.22)";
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

function triggerTagJuice(atX, atY) {
  screenShake = Math.min(screenShake + 7, 13);
  tagFlash = Math.max(tagFlash, 0.42);
  for (let i = 0; i < 32; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 95 + Math.random() * 200;
    tagParticles.push({
      x: atX,
      y: atY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 0.38 + Math.random() * 0.2,
      hue: 38 + Math.random() * 32,
    });
  }
}

function updateTagJuice(dt) {
  shakePhase += dt * 72;
  screenShake *= Math.exp(-dt * 11);
  tagFlash *= Math.exp(-dt * 9);
  for (let i = tagParticles.length - 1; i >= 0; i--) {
    const p = tagParticles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.vx *= Math.exp(-dt * 2.2);
    if (p.life <= 0) tagParticles.splice(i, 1);
  }
}

function drawTagParticles() {
  for (const p of tagParticles) {
    const a = Math.max(0, p.life / 0.45);
    ctx.globalAlpha = a * 0.95;
    ctx.fillStyle = `hsla(${p.hue}, 92%, 62%, ${0.35 + a * 0.55})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2 + (1 - a) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScene(nowMs) {
  initMeadowDecor();

  const sx =
    screenShake > 0.15
      ? Math.sin(shakePhase) * screenShake * 0.42 + Math.cos(shakePhase * 1.31) * screenShake * 0.38
      : 0;
  const sy =
    screenShake > 0.15
      ? Math.cos(shakePhase * 0.87) * screenShake * 0.4 + Math.sin(shakePhase * 1.07) * screenShake * 0.32
      : 0;

  ctx.save();
  ctx.translate(sx, sy);

  drawMeadowBackground();
  drawMeadowFlowers(nowMs);
  drawMeadowTrees();

  drawObstacles();

  const order = players.map((_, i) => i).sort((a, b) => players[a].y - players[b].y);
  for (const i of order) {
    drawPlayer(players[i], i, nowMs);
  }

  drawTagParticles();

  if (tagFlash > 0.02) {
    const g = ctx.createRadialGradient(ARENA.w / 2, ARENA.h / 2, 40, ARENA.w / 2, ARENA.h / 2, ARENA.w * 0.72);
    g.addColorStop(0, `rgba(253, 224, 71, ${tagFlash * 0.22})`);
    g.addColorStop(0.55, `rgba(251, 191, 36, ${tagFlash * 0.08})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.w, ARENA.h);
  }

  ctx.restore();
}

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function tick(now) {
  if (!running || playOnline) return;
  const rawDt = (now - (tick.lastNow ?? now)) / 1000;
  const dt = Math.min(0.05, Math.max(1 / 500, rawDt || 1 / 60));
  tick.lastNow = now;
  const left = gameEndAt - now;
  timerEl.textContent = formatTime(left);
  crownHud.textContent = `Krone: ${players[crownIndex].name}`;
  updateCrownProtectHud(now);

  const crownBeforeTick = crownIndex;

  const crownHolder = players[crownIndex];
  const crownSpdHuman = crownHolder.human ? CROWN_SPEED : CROWN_SPEED_AI;

  const ACCEL_HUMAN = 4800;
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const spd = i === crownIndex ? crownSpdHuman : p.human ? SPEED : SPEED_AI;
    let vx = 0;
    let vy = 0;
    if (p.human) {
      const v = humanVelocity(i);
      const tx = v.dx * spd;
      const ty = v.dy * spd;
      let pvx = p.velX ?? 0;
      let pvy = p.velY ?? 0;
      pvx += clamp(tx - pvx, -ACCEL_HUMAN * dt, ACCEL_HUMAN * dt);
      pvy += clamp(ty - pvy, -ACCEL_HUMAN * dt, ACCEL_HUMAN * dt);
      p.velX = pvx;
      p.velY = pvy;
      vx = pvx;
      vy = pvy;
    } else {
      const v = aiVelocity(i, dt);
      vx = v.dx;
      vy = v.dy;
      p.velX = 0;
      p.velY = 0;
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

  if (crownBeforeTick !== crownIndex) {
    const h = players[crownIndex];
    triggerTagJuice(h.x, h.y);
    GameAudio.playTag();
  }

  updateTagJuice(dt);
  drawScene(now);

  if (left <= 0) {
    endGame();
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function applyNetworkState(d) {
  const crownChanged = netLastCrown >= 0 && netLastCrown !== d.crownIndex;
  crownIndex = d.crownIndex;
  crownHud.textContent = `Krone: ${d.players[crownIndex].name}`;
  timerEl.textContent = formatTime(d.timeLeftMs);
  const pl = d.crownProtectLeftMs ?? 0;
  netProtectUntil = performance.now() + pl;
  updateCrownProtectHud(performance.now());
  players = d.players.map((p, i) => ({
    x: p.x,
    y: p.y,
    color: p.color || SHIRT_COLORS[i],
    human: p.human,
    name: p.name,
    faceDir: p.faceDir ?? 1,
    bob: p.bob ?? 0,
    aiAngle: 0,
    velX: 0,
    velY: 0,
  }));
  if (!d.running) {
    running = false;
  }

  netLastCrown = d.crownIndex;
  if (crownChanged && d.running) {
    const h = players[crownIndex];
    if (h) triggerTagJuice(h.x, h.y);
    GameAudio.playTag();
  }
}

function networkLoop(now) {
  if (!playOnline) return;
  const rawDt = (now - (networkLoop.lastNow ?? now)) / 1000;
  const dt = Math.min(0.05, Math.max(1 / 500, rawDt || 1 / 60));
  networkLoop.lastNow = now;
  if (netWs && netWs.readyState === WebSocket.OPEN) {
    const v = humanVelocity(netSlot);
    netWs.send(JSON.stringify({ type: "input", dx: v.dx, dy: v.dy }));
  }
  updateCrownProtectHud(now);
  updateTagJuice(dt);
  drawScene(now);
  rafId = requestAnimationFrame(networkLoop);
}

function endGame() {
  running = false;
  GameAudio.stopMusic();
  cancelAnimationFrame(rafId);
  const winner = players[crownIndex];
  overlayTitle.textContent = "Zeit abgelaufen!";
  overlayMsg.textContent = `${winner.name} hat die Krone und gewinnt.`;
  overlay.classList.remove("hidden");
}

function startLocalGame() {
  playOnline = false;
  GameAudio.resume();
  GameAudio.startMusic();
  gameDurationMs = getDurationMs();
  syncPlayerCounts(false);
  const humans = parseInt(selHumans.value, 10);
  const total = humans + parseInt(selComputers.value, 10);

  placePlayers(total, humans);
  tagParticles = [];
  screenShake = 0;
  tagFlash = 0;

  menu.classList.add("hidden");
  hud.classList.remove("hidden");
  overlay.classList.add("hidden");
  gameEndAt = performance.now() + gameDurationMs;
  timerEl.textContent = formatTime(gameDurationMs);
  running = true;
  tick.lastNow = undefined;
  rafId = requestAnimationFrame(tick);
}

function startOnlineGame() {
  const url = (inpWsUrl && inpWsUrl.value.trim()) || `ws://${location.hostname}:8770`;
  playOnline = true;
  netLastCrown = -1;
  gameDurationMs = getDurationMs();

  netWs = new WebSocket(url);

  netWs.onopen = () => {};

  netWs.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.type === "welcome") {
      netSlot = d.slot;
      netLastCrown = -1;
      netProtectUntil = 0;
      tagParticles = [];
      screenShake = 0;
      tagFlash = 0;
      networkLoop.lastNow = undefined;
      GameAudio.resume();
      GameAudio.startMusic();
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
      GameAudio.stopMusic();
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
    GameAudio.resume();
    GameAudio.startMusic();
    return;
  }
  GameAudio.stopMusic();
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
  const c = ctx.createLinearGradient(0, 0, 0, ARENA.h);
  c.addColorStop(0, "#87ceeb");
  c.addColorStop(1, "#166534");
  ctx.fillStyle = c;
  ctx.fillRect(0, 0, ARENA.w, ARENA.h);
});

function syncMuteButton() {
  if (!btnMute || typeof GameAudio === "undefined") return;
  const m = GameAudio.isMuted();
  btnMute.textContent = m ? "🔇" : "🔊";
  btnMute.setAttribute("aria-pressed", m ? "true" : "false");
}

if (btnMute) {
  syncMuteButton();
  btnMute.addEventListener("click", () => {
    GameAudio.toggleMute();
    syncMuteButton();
    if (!GameAudio.isMuted() && running) {
      GameAudio.resume();
      GameAudio.startMusic();
    }
  });
}

if (inpWsUrl && !inpWsUrl.value && !inpWsUrl.dataset.userEdited) {
  inpWsUrl.value = "ws://127.0.0.1:8770";
}
if (inpWsUrl) {
  inpWsUrl.addEventListener("input", () => {
    inpWsUrl.dataset.userEdited = "1";
  });
}

drawScene(performance.now());