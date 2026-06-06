(() => {
  const CELL = 30;
  const COLS = 35;
  const ROWS = 25;
  const W = COLS * CELL;
  const H = ROWS * CELL;
  const STEP_MS = 115;
  const COIN_COUNT = 26;

  const canvas = document.getElementById("feld");
  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = W;
  canvas.height = H;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "Spielfeld Schatz-Labyrinth");
  canvas.addEventListener("click", () => canvas.focus());

  const lobby = document.getElementById("lobby-panel");
  const btnStart = document.getElementById("btn-start");
  const selPlayers = document.getElementById("player-count");
  const hudPlayers = document.getElementById("hud-players");
  const shopLayer = document.getElementById("shop-layer");
  const shopList = document.getElementById("shop-list");
  const shopTabs = document.getElementById("shop-tabs");
  const elShopCoins = document.getElementById("shop-coins");
  const btnShopClose = document.getElementById("btn-shop-close");
  const btnShopHud = document.getElementById("btn-shop-hud");
  const btnFullscreen = document.getElementById("btn-fullscreen");
  const gameWrap = document.querySelector(".wrap");

  const SHOP_ITEMS = [
    {
      id: "look",
      tierKey: "lookTier",
      name: "Cooler Auftritt",
      desc: "Größerer Glow und Figur — ab Stufe 1 klar sichtbar; später Krone & mehr. Kostet mehr als eine Münze pro Stufe.",
      max: 14,
      base: 16,
      pow: 1.33,
    },
    {
      id: "pet",
      tierKey: "petTier",
      name: "Haustier-Buddy",
      desc: "Ein Begleiter folgt dir — vom kleinen Hündchen bis zur fetzen Mini-Fantasie. Kostet mehr als eine Münze pro Stufe.",
      max: 12,
      base: 26,
      pow: 1.38,
    },
    {
      id: "grab",
      tierKey: "grabTier",
      name: "Grab-Bagger",
      desc: "Stärkeres Graben — mehr Münzen pro Grab aus einem Schatzfeld. Im Spiel siehst du den Bagger hinter dir. Pro Stufe 1 Münze.",
      max: 12,
      base: 22,
      pow: 1.34,
    },
  ];

  let maze = [];
  let coins = [];
  /** Verborgene Schätze: Map „x,y“ → { amt } noch verbleibende Münzen */
  const stashMap = new Map();
  /** Kurze Grabe-Feedback-Blitze (gx, gy Raster) */
  const digBursts = [];
  let players = [];
  let numActive = 4;
  let state = "lobby";
  let shopBuyer = 0;

  const keys = {};

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function generateMaze() {
    const m = Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(1));

    function carve(cx, cy) {
      m[cy][cx] = 0;
      const dirs = shuffle([
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0],
      ]);
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 1 && nx < COLS - 1 && ny >= 1 && ny < ROWS - 1 && m[ny][nx] === 1) {
          m[cy + dy / 2][cx + dx / 2] = 0;
          carve(nx, ny);
        }
      }
    }

    carve(1, 1);
    m[1][0] = 0;
    m[ROWS - 2][COLS - 1] = 0;
    return m;
  }

  function allFloors() {
    const out = [];
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (!maze[y][x]) out.push({ x, y });
      }
    }
    return out;
  }

  /**
   * Grab-Bagger: immer 1 Münze. Look & Haustier: steigender Preis pro Stufe.
   */
  function priceFor(item, player) {
    if (item.id === "grab") return 1;
    const r = player[item.tierKey];
    if (item.id === "look") {
      return Math.max(5, Math.floor(14 * Math.pow(1.26, r)));
    }
    if (item.id === "pet") {
      return Math.max(5, Math.floor(16 * Math.pow(1.26, r)));
    }
    return 1;
  }

  function tryMove(p, dx, dy) {
    const nx = p.gx + dx;
    const ny = p.gy + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return false;
    if (maze[ny][nx]) return false;
    p.gx = nx;
    p.gy = ny;
    p.displayX = nx * CELL + CELL / 2;
    p.displayY = ny * CELL + CELL / 2;
    collectCoins(p);
    return true;
  }

  function collectCoins(p) {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      if (c.x === p.gx && c.y === p.gy) {
        coins.splice(i, 1);
        p.coins += 1;
      }
    }
  }

  function spawnCoins(blocked) {
    coins.length = 0;
    const blockedSet = new Set(blocked.map((b) => `${b.x},${b.y}`));
    let floors = shuffle(allFloors().filter((f) => !blockedSet.has(`${f.x},${f.y}`)));
    const want = Math.min(COIN_COUNT, floors.length);
    for (let i = 0; i < want; i++) coins.push(floors[i]);
  }

  function initStashes(spawnBlocked) {
    stashMap.clear();
    const blockedSet = new Set(spawnBlocked.map((b) => `${b.x},${b.y}`));
    const floors = shuffle(allFloors().filter((f) => !blockedSet.has(`${f.x},${f.y}`)));
    const n = Math.min(28, Math.max(14, Math.floor(floors.length / 3.2)));
    for (let i = 0; i < n; i++) {
      const f = floors[i];
      stashMap.set(`${f.x},${f.y}`, {
        amt: 6 + Math.floor(Math.random() * 14),
      });
    }
  }

  function createPlayers(n, spawnCells) {
    const defs = [
      {
        label: "P1",
        color: "#00f0ff",
        codes: { up: "KeyW", left: "KeyA", down: "KeyS", right: "KeyD" },
        digCodes: ["Space"],
      },
      {
        label: "P2",
        color: "#ff6b9d",
        codes: { up: "ArrowUp", left: "ArrowLeft", down: "ArrowDown", right: "ArrowRight" },
        digCodes: ["Enter", "NumpadEnter"],
      },
      {
        label: "P3",
        color: "#cfff50",
        codes: { up: "KeyI", left: "KeyJ", down: "KeyK", right: "KeyL" },
        digCodes: ["KeyR"],
      },
      {
        label: "P4",
        color: "#ffaa00",
        codes: { up: "KeyT", left: "KeyG", down: "KeyF", right: "KeyH" },
        digCodes: ["Period", "Comma", "Slash", "NumpadDecimal"],
      },
    ];
    players.length = 0;
    for (let i = 0; i < n; i++) {
      const sp = spawnCells[i];
      const d = defs[i];
      players.push({
        ...d,
        gx: sp.x,
        gy: sp.y,
        displayX: sp.x * CELL + CELL / 2,
        displayY: sp.y * CELL + CELL / 2,
        faceDx: 0,
        faceDy: 1,
        coins: 0,
        lookTier: 0,
        petTier: 0,
        grabTier: 0,
        petAngle: Math.random() * Math.PI * 2,
        nextStep: 0,
        nextDig: 0,
        walkPhase: 0,
      });
    }
  }

  function updateHud() {
    hudPlayers.innerHTML = players
      .map(
        (p) =>
          `<span style="color:${p.color}">${p.label}</span>: 🪙 <strong>${p.coins}</strong> · Look ${p.lookTier} · Haustier ${p.petTier} · Bagger ${p.grabTier}`
      )
      .join(" · ");
  }

  function openShop() {
    if (state !== "play" || players.length === 0) return;
    state = "shop";
    shopLayer.classList.remove("hidden");
    shopBuyer = Math.min(shopBuyer, Math.max(0, players.length - 1));
    renderShopTabs();
    renderShop();
  }

  function closeShop() {
    state = "play";
    shopLayer.classList.add("hidden");
    updateHud();
  }

  function renderShopTabs() {
    shopTabs.innerHTML = "";
    players.forEach((p, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${p.label} (${p.coins} 🪙)`;
      b.className = shopBuyer === i ? "is-active" : "";
      b.style.borderLeftColor = p.color;
      b.addEventListener("click", () => {
        shopBuyer = i;
        renderShopTabs();
        renderShop();
      });
      shopTabs.appendChild(b);
    });
  }

  function renderShop() {
    shopBuyer = Math.min(Math.max(0, shopBuyer), Math.max(0, players.length - 1));
    const p = players[shopBuyer];
    if (!p) return;
    elShopCoins.textContent = String(p.coins);
    shopList.innerHTML = "";
    for (const item of SHOP_ITEMS) {
      const tier = p[item.tierKey];
      const price = priceFor(item, p);
      const maxed = tier >= item.max;
      const li = document.createElement("li");
      li.className = "shop-item";
      li.innerHTML = `
        <div>
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-item-desc">Stufe ${tier} / ${item.max}</div>
        </div>
        <button type="button" class="shop-buy" data-id="${item.id}" ${maxed || p.coins < price ? "disabled" : ""}>
          ${maxed ? "MAX" : `${price} 🪙`}
        </button>
      `;
      shopList.appendChild(li);
    }
    shopList.querySelectorAll(".shop-buy").forEach((btn) => {
      btn.addEventListener("click", () => tryBuy(btn.dataset.id));
    });
    shopTabs.querySelectorAll("button").forEach((btn, i) => {
      btn.classList.toggle("is-active", i === shopBuyer);
    });
  }

  function tryBuy(id) {
    const item = SHOP_ITEMS.find((x) => x.id === id);
    const p = players[shopBuyer];
    if (!item || !p || p[item.tierKey] >= item.max) return;
    const pr = priceFor(item, p);
    if (p.coins < pr) return;
    p.coins -= pr;
    p[item.tierKey] += 1;
    renderShopTabs();
    renderShop();
    updateHud();
  }

  function pollMovement(now) {
    if (state !== "play") return;
    const dirs = [
      ["up", 0, -1],
      ["down", 0, 1],
      ["left", -1, 0],
      ["right", 1, 0],
    ];
    for (const p of players) {
      if (now < p.nextStep) continue;
      let dx = 0;
      let dy = 0;
      for (const [name, ox, oy] of dirs) {
        if (keys[p.codes[name]]) {
          dx = ox;
          dy = oy;
          break;
        }
      }
      if (dx === 0 && dy === 0) continue;
      p.faceDx = dx;
      p.faceDy = dy;
      if (tryMove(p, dx, dy)) {
        p.nextStep = now + STEP_MS;
        p.walkPhase += 1;
      }
    }
  }

  function tryDig(p, now) {
    if (now < p.nextDig) return;
    const fx = p.faceDx !== 0 || p.faceDy !== 0 ? p.faceDx : 0;
    const fy = p.faceDx !== 0 || p.faceDy !== 0 ? p.faceDy : 1;
    const forward = [p.gx + fx, p.gy + fy];
    const feet = [p.gx, p.gy];
    const candidates = [forward, feet];

    let harvested = false;
    let hitGx = p.gx;
    let hitGy = p.gy;

    for (const [gx, gy] of candidates) {
      if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) continue;
      if (maze[gy][gx]) continue;
      const key = `${gx},${gy}`;
      const entry = stashMap.get(key);
      if (!entry || entry.amt <= 0) continue;
      hitGx = gx;
      hitGy = gy;
      const power = 2 + p.grabTier * 2;
      const take = Math.min(entry.amt, power);
      p.coins += take;
      const rest = entry.amt - take;
      if (rest <= 0) stashMap.delete(key);
      else stashMap.set(key, { amt: rest });
      harvested = true;
      break;
    }

    if (!harvested) {
      let gx = forward[0];
      let gy = forward[1];
      if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS || maze[gy][gx]) {
        gx = feet[0];
        gy = feet[1];
      }
      digBursts.push({ gx, gy, t0: now, ok: false });
    } else {
      digBursts.push({ gx: hitGx, gy: hitGy, t0: now, ok: true });
      updateHud();
    }
    p.nextDig = now + 300;
  }

  function drawDigBursts(ts) {
    for (let i = digBursts.length - 1; i >= 0; i--) {
      const b = digBursts[i];
      const age = ts - b.t0;
      if (age > 420) {
        digBursts.splice(i, 1);
        continue;
      }
      const cx = b.gx * CELL + CELL / 2;
      const cy = b.gy * CELL + CELL / 2;
      const a = 1 - age / 420;
      if (b.ok) {
        ctx.fillStyle = `rgba(255, 220, 120, ${a * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + age * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 200, ${a * 0.35})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 4 + age * 0.02, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(130, 95, 60, ${a * 0.4})`;
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2 + age * 0.01;
          const r = 6 + (k % 2) * 3;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * r * 0.4, cy + Math.sin(ang) * r * 0.35, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawMaze() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const px = x * CELL;
        const py = y * CELL;
        if (maze[y][x]) {
          ctx.fillStyle = "#12161e";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.strokeStyle = "#1e2535";
          ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
        } else {
          ctx.fillStyle = "#0a0d14";
          ctx.fillRect(px, py, CELL, CELL);
        }
      }
    }
  }

  function drawStashes() {
    for (const [key, raw] of stashMap) {
      const amt = raw.amt;
      if (amt <= 0) continue;
      const [xs, ys] = key.split(",").map(Number);
      const cx = xs * CELL + CELL / 2;
      const cy = ys * CELL + CELL / 2;
      ctx.font = `${Math.floor(CELL * 0.42)}px system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(110, 75, 35, 0.55)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 3, CELL * 0.28, CELL * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText("⛏️", cx, cy - 1);
    }
  }

  function drawCoins() {
    for (const c of coins) {
      const cx = c.x * CELL + CELL / 2;
      const cy = c.y * CELL + CELL / 2;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.35);
      rg.addColorStop(0, "#fff8d0");
      rg.addColorStop(0.5, "#ffd54a");
      rg.addColorStop(1, "rgba(255,200,60,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c9a020";
      ctx.font = `bold ${Math.floor(CELL * 0.38)}px system-ui,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🪙", cx, cy + 1);
    }
  }

  function drawPet(p) {
    if (p.petTier <= 0) return;
    const dist = 20 + p.petTier * 2.2;
    p.petAngle += 0.045;
    const px = p.displayX + Math.cos(p.petAngle) * dist;
    const py = p.displayY + Math.sin(p.petAngle) * dist;
    const tier = p.petTier;
    const emojis = ["🐕", "🐈", "🐇", "🦎", "🐉", "🦄", "🦊", "🐙", "🦋", "🐲", "👾", "✨"];
    const em = emojis[Math.min(emojis.length - 1, tier - 1)];
    ctx.font = `${10 + tier * 1.8}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.globalAlpha = 0.85 + Math.min(0.12, tier * 0.01);
    ctx.fillText(em, px, py);
    ctx.globalAlpha = 1;
  }

  function drawGrabVehicle(p) {
    const dir = Math.atan2(p.faceDy || 1, p.faceDx || 0);
    const back = p.grabTier > 0 ? 16 + Math.min(14, p.grabTier * 1.2) : 13;
    const bx = p.displayX - Math.cos(dir) * back;
    const by = p.displayY - Math.sin(dir) * back;
    if (p.grabTier <= 0) {
      ctx.font = "12px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.globalAlpha = 0.9;
      ctx.fillText("⛏️", bx, by);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.font = `${11 + Math.min(10, p.grabTier)}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚜", bx - 4, by);
    if (p.grabTier >= 4) {
      ctx.font = `${10 + p.grabTier * 0.45}px system-ui,sans-serif`;
      ctx.fillText("⛏️", bx + 12, by + 2);
    }
  }

  function drawHuman(p) {
    const lt = p.lookTier || 0;
    const glowR = 13 + lt * 3.4;
    const rg = ctx.createRadialGradient(p.displayX, p.displayY, 0, p.displayX, p.displayY, glowR * 1.7);
    rg.addColorStop(0, p.color + "99");
    rg.addColorStop(0.45, p.color + Math.min(72, 36 + lt * 3).toString(16).padStart(2, "0"));
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(p.displayX, p.displayY, glowR * 1.7, 0, Math.PI * 2);
    ctx.fill();

    if (lt >= 1) {
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.45 + Math.min(0.35, lt * 0.028);
      ctx.lineWidth = 1.4 + lt * 0.35;
      ctx.beginPath();
      ctx.arc(p.displayX, p.displayY, glowR * 1.05 + lt * 1.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const dir = Math.atan2(p.faceDy || 1, p.faceDx || 0);
    const bob = Math.sin(p.walkPhase * 0.8) * 1.2;
    const sc = 0.38 + Math.min(0.28, lt * 0.018);
    const hx = Math.cos(dir) * 6;
    const hy = Math.sin(dir) * 6;

    ctx.save();
    ctx.translate(p.displayX, p.displayY + bob);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 9 * sc, 5.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 1, 10 * sc, 8 * sc, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1 + Math.min(2.2, lt * 0.18);
    ctx.stroke();

    ctx.fillStyle = "#ffd6b8";
    ctx.beginPath();
    ctx.arc(hx * 1.1, hy * 1.1 - 4 * sc, 5.2 * sc, 0, Math.PI * 2);
    ctx.fill();

    if (lt >= 1) {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx * 1.1 + 2 * sc, hy * 1.1 - 4 * sc - 1, 1.25 * sc, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(hx * 1.1 - 2 * sc, hy * 1.1 - 4 * sc - 1, 1.25 * sc, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (lt >= 4) {
      ctx.font = `${7 + sc * 8}px serif`;
      ctx.textAlign = "center";
      ctx.fillText("👑", hx * 1.2, hy * 1.2 - 14 * sc);
    }
    if (lt >= 8) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8 * sc, 3);
      ctx.lineTo(8 * sc, 3);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `bold ${8 + sc * 10}px system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(p.label, 0, 2);

    ctx.restore();
  }

  function loop(ts) {
    pollMovement(ts);
    if (state === "play" && coins.length === 0 && players.length) {
      spawnCoins(
        players.map((p) => ({ x: p.gx, y: p.gy }))
      );
    }
    for (const p of players) {
      p.displayX += (p.gx * CELL + CELL / 2 - p.displayX) * 0.28;
      p.displayY += (p.gy * CELL + CELL / 2 - p.displayY) * 0.28;
    }

    ctx.fillStyle = "#030508";
    ctx.fillRect(0, 0, W, H);
    drawMaze();
    drawStashes();
    drawCoins();
    const sortP = players.slice().sort((a, b) => a.lookTier - b.lookTier);
    for (const p of sortP) drawPet(p);
    for (const p of sortP) drawGrabVehicle(p);
    for (const p of sortP) drawHuman(p);
    drawDigBursts(ts);

    requestAnimationFrame(loop);
  }

  function digKeyMatches(e, p) {
    if (!p.digCodes) return false;
    if (p.digCodes.includes(e.code)) return true;
    if (p.digCodes.includes("Space") && e.key === " ") return true;
    return false;
  }

  window.addEventListener("keydown", (e) => {
    if (state === "play") {
      const now = performance.now();
      for (const p of players) {
        if (digKeyMatches(e, p)) {
          e.preventDefault();
          tryDig(p, now);
          break;
        }
      }
    }
    keys[e.code] = true;
    if (e.code === "KeyB") {
      if (state === "play") {
        e.preventDefault();
        openShop();
      } else if (state === "shop") {
        e.preventDefault();
        closeShop();
      }
    }
    if (state === "shop") {
      const pickBuyer = (idx) => {
        if (idx < players.length) {
          shopBuyer = idx;
          renderShopTabs();
          renderShop();
        }
      };
      if (e.code === "Digit1" || e.code === "Numpad1") pickBuyer(0);
      if (e.code === "Digit2" || e.code === "Numpad2") pickBuyer(1);
      if (e.code === "Digit3" || e.code === "Numpad3") pickBuyer(2);
      if (e.code === "Digit4" || e.code === "Numpad4") pickBuyer(3);
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  btnShopClose.addEventListener("click", closeShop);
  if (btnShopHud) {
    btnShopHud.addEventListener("click", () => {
      if (state === "play") openShop();
      else if (state === "shop") closeShop();
    });
  }

  btnStart.addEventListener("click", () => {
    numActive = parseInt(selPlayers.value, 10);
    maze = generateMaze();
    const floors = shuffle(allFloors());
    const spawns = floors.slice(0, numActive);
    createPlayers(numActive, spawns);
    initStashes(spawns);
    spawnCoins(spawns);
    state = "play";
    lobby.style.display = "none";
    updateHud();
    canvas.focus();
  });

  function updateFullscreenButton() {
    if (!btnFullscreen || !gameWrap) return;
    const fs =
      document.fullscreenElement === gameWrap ||
      document.webkitFullscreenElement === gameWrap;
    if (fs) {
      btnFullscreen.textContent = "Vollbild beenden";
      btnFullscreen.title = "Zurück zur normalen Ansicht (oder Esc)";
      return;
    }
    if (gameWrap.classList.contains("is-big")) {
      btnFullscreen.textContent = "Normal groß";
      btnFullscreen.title = "Spielfeld wieder kleiner";
      return;
    }
    btnFullscreen.textContent = "⛶ Größer";
    btnFullscreen.title = "Spielfeld über den ganzen Bildschirm";
  }

  if (btnFullscreen && gameWrap) {
    btnFullscreen.addEventListener("click", async () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl === gameWrap) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        } catch (_) {}
        updateFullscreenButton();
        return;
      }
      if (gameWrap.classList.contains("is-big")) {
        gameWrap.classList.remove("is-big");
        updateFullscreenButton();
        return;
      }
      try {
        if (gameWrap.requestFullscreen) await gameWrap.requestFullscreen();
        else if (gameWrap.webkitRequestFullscreen) gameWrap.webkitRequestFullscreen();
        else throw new Error("no-fs");
      } catch (_) {
        gameWrap.classList.add("is-big");
      }
      updateFullscreenButton();
    });
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("webkitfullscreenchange", updateFullscreenButton);
  }

  maze = generateMaze();
  requestAnimationFrame(loop);
})();
