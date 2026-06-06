(() => {
  const W = 960;
  const H = 540;
  const MAX_LEVEL = 20;
  const SCORE_PER_LEVEL = 625;
  const WIN_TIME_MS = 3 * 60 * 1000;
  const STORAGE_KEY = "lumenArena_save_v3";
  /** Gespeichert: wie oft insgesamt Game Over (3× = kompletter Neustart) */
  let gameOvers = 0;

  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: false });

  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const winOverlay = document.getElementById("win-overlay");
  const shopLayer = document.getElementById("shop");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnWinAgain = document.getElementById("btn-win-again");
  const btnShop = document.getElementById("btn-shop");
  const btnShopClose = document.getElementById("btn-shop-close");
  const elSurvivalTime = document.getElementById("survival-time");
  const elCombo = document.getElementById("combo");
  const elLevel = document.getElementById("level-num");
  const elCoins = document.getElementById("coins");
  const elLives = document.getElementById("lives");
  const elShopCoins = document.getElementById("shop-coins");
  const shopList = document.getElementById("shop-list");
  const overTitle = document.getElementById("over-title");
  const overMsg = document.getElementById("over-msg");
  const winMsg = document.getElementById("win-msg");
  const arenaWrap = document.querySelector(".arena-wrap");

  /** Shop: jedes Upgrade hat Stufen — Preis steigt mit pow^rank */
  const SHOP_ITEMS = [
    {
      id: "turbo",
      name: "Turbo-Triebwerk",
      desc: "Höhere Maximalgeschwindigkeit — flieg cooler durchs Feld.",
      max: 10,
      base: 16,
      pow: 1.38,
    },
    {
      id: "armor",
      name: "Panzerung",
      desc: "+1 zusätzliches Leben (max. +3, insgesamt bis 6 Herzen).",
      max: 3,
      base: 55,
      pow: 1.55,
    },
    {
      id: "magnet",
      name: "Lumen-Magnet",
      desc: "Zieht Kugeln an — größerer Radius je Stufe.",
      max: 8,
      base: 28,
      pow: 1.4,
    },
    {
      id: "chill",
      name: "Zeitlupe-Feld",
      desc: "Jäger spawnen seltener — mehr Ruhe je Stufe.",
      max: 12,
      base: 32,
      pow: 1.36,
    },
    {
      id: "golden",
      name: "Goldrausch",
      desc: "Deutlich mehr Münzen pro Kugel — wird richtig teuer, lohnt sich aber.",
      max: 12,
      base: 45,
      pow: 1.48,
    },
  ];

  let state = "menu";
  let lastTs = 0;
  let shake = 0;
  let gridPhase = 0;
  let wonNotified = false;

  const keys = {};
  let mouseX = W / 2;
  let mouseY = H / 2;
  let useMouse = false;

  const player = {
    x: W / 2,
    y: H / 2,
    vx: 0,
    vy: 0,
    r: 14,
    ang: 0,
    invuln: 0,
  };

  /** Gesamt-Münzen (=Punkte), persistent — gleicher Wert wie Ladungszahl */
  let coins = 0;
  /** Nur diese Runde — steuert Level-Schwierigkeit */
  let runPoints = 0;
  let level = 1;
  /** Startzeit der aktuellen Runde (Date.now); 0 = keine laufende Uhr */
  let runStartedAt = 0;
  /** Eingefrorene Zeit für Game-Over/Sieg-Anzeige */
  let survivalFrozenMs = null;
  let combo = 0;
  let comboTimer = 0;
  let lives = 3;
  let spawnAcc = 0;
  let orbAcc = 0;

  const up = { turbo: 0, armor: 0, magnet: 0, chill: 0, golden: 0 };

  const orbs = [];
  const hunters = [];
  const particles = [];
  const stars = [];
  const coinPops = [];

  function priceFor(id) {
    const item = SHOP_ITEMS.find((x) => x.id === id);
    if (!item) return 99999;
    const r = up[id] || 0;
    return Math.max(1, Math.floor(item.base * Math.pow(item.pow, r)));
  }

  function getMaxLives() {
    return 3 + Math.min(up.armor, 3);
  }

  function getSpeedMult() {
    return 1 + 0.062 * up.turbo;
  }

  function getMagnetR() {
    return up.magnet * 24;
  }

  function getSpawnScale() {
    return Math.pow(1.072, up.chill);
  }

  function getCoinMult() {
    return 1 + 0.15 * up.golden;
  }

  function levelFromRunPoints(s) {
    return Math.min(MAX_LEVEL, 1 + Math.floor(s / SCORE_PER_LEVEL));
  }

  function formatTimeMmSs(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function getRunElapsedMs() {
    if (survivalFrozenMs != null) return survivalFrozenMs;
    if (!runStartedAt) return 0;
    return Math.min(WIN_TIME_MS, Date.now() - runStartedAt);
  }

  function loadState() {
    try {
      let raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        raw = localStorage.getItem("lumenArena_save_v2");
        if (raw) {
          localStorage.setItem(STORAGE_KEY, raw);
        }
      }
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.coins === "number" && Number.isFinite(d.coins) && d.coins >= 0) {
        coins = Math.floor(d.coins);
      }
      if (d.up && typeof d.up === "object") {
        for (const id of Object.keys(up)) {
          const v = d.up[id];
          const item = SHOP_ITEMS.find((x) => x.id === id);
          const max = item ? item.max : 99;
          if (typeof v === "number" && Number.isFinite(v)) {
            up[id] = Math.max(0, Math.min(max, Math.floor(v)));
          }
        }
      }
      if (typeof d.gameOvers === "number" && Number.isFinite(d.gameOvers) && d.gameOvers >= 0) {
        gameOvers = Math.min(99, Math.floor(d.gameOvers));
      }
    } catch (_) {
      /* ignore */
    }
  }

  /** Münzen, Upgrades und Niederlagen-Zähler auf Anfang — nach Sieg oder 3× Game Over */
  function fullResetProgress() {
    coins = 0;
    for (const id of Object.keys(up)) up[id] = 0;
    gameOvers = 0;
    saveState();
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ coins, up: { ...up }, gameOvers })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.hypot(dx, dy);
  }

  function initStars() {
    stars.length = 0;
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        s: Math.random() * 1.8 + 0.3,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  function spawnOrb() {
    const pad = 40;
    orbs.push({
      x: rand(pad, W - pad),
      y: rand(pad, H - pad),
      r: 9,
      phase: Math.random() * Math.PI * 2,
      ttl: 450 + Math.random() * 200,
    });
  }

  function spawnHunter() {
    const side = (Math.random() * 4) | 0;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = -20;
      y = rand(0, H);
    } else if (side === 1) {
      x = W + 20;
      y = rand(0, H);
    } else if (side === 2) {
      x = rand(0, W);
      y = -20;
    } else {
      x = rand(0, W);
      y = H + 20;
    }
    const spd = 0.72 + level * 0.068 + Math.random() * 0.38;
    hunters.push({
      x,
      y,
      r: 10 + Math.min(level, 18) * 0.35,
      spd,
      hue: 330 + Math.random() * 40,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  function burst(px, py, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(1, 4);
      particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        col,
      });
    }
  }

  function popCoin(x, y, n) {
    coinPops.push({
      x,
      y,
      vy: -rand(1.4, 2.6),
      life: 1,
      t: 0,
      val: n,
    });
  }

  function resetGame() {
    player.x = W / 2;
    player.y = H / 2;
    player.vx = 0;
    player.vy = 0;
    player.invuln = 0;
    runPoints = 0;
    level = 1;
    runStartedAt = 0;
    survivalFrozenMs = null;
    combo = 0;
    comboTimer = 0;
    lives = getMaxLives();
    spawnAcc = 0;
    orbAcc = 0;
    wonNotified = false;
    orbs.length = 0;
    hunters.length = 0;
    particles.length = 0;
    coinPops.length = 0;
    for (let i = 0; i < 6; i++) spawnOrb();
    initStars();
    updateHud();
  }

  function updateHud() {
    const elapsed =
      state === "menu" ? 0 : getRunElapsedMs();
    const rem = Math.max(0, WIN_TIME_MS - elapsed);
    if (elSurvivalTime) {
      elSurvivalTime.textContent = formatTimeMmSs(rem);
    }
    elLevel.textContent = String(level);
    elCoins.textContent = String(coins);
    elCombo.textContent = combo > 1 ? `×${combo}` : "—";
    const ml = getMaxLives();
    elLives.textContent = "♥".repeat(lives) + "♡".repeat(Math.max(0, ml - lives));
    elShopCoins.textContent = String(coins);
  }

  function renderShop() {
    shopList.innerHTML = "";
    for (const item of SHOP_ITEMS) {
      const r = up[item.id];
      const price = priceFor(item.id);
      const maxed = r >= item.max;
      const li = document.createElement("li");
      li.className = "shop-item";
      li.innerHTML = `
        <div class="shop-item-meta">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
          <div class="shop-item-tier">Stufe ${r} / ${item.max}</div>
        </div>
        <button type="button" class="shop-buy" data-id="${item.id}" ${maxed || coins < price ? "disabled" : ""}>
          ${maxed ? "MAX" : `${price} 🪙`}
        </button>
      `;
      shopList.appendChild(li);
    }
    shopList.querySelectorAll(".shop-buy").forEach((btn) => {
      btn.addEventListener("click", () => tryBuy(btn.dataset.id));
    });
    elShopCoins.textContent = String(coins);
  }

  function tryBuy(id) {
    const item = SHOP_ITEMS.find((x) => x.id === id);
    if (!item || up[id] >= item.max) return;
    const p = priceFor(id);
    if (coins < p) return;
    coins -= p;
    up[id] += 1;
    if (id === "armor" && lives < getMaxLives()) lives += 1;
    burst(player.x, player.y, "#ffd54a", 16);
    saveState();
    updateHud();
    renderShop();
  }

  function openShop() {
    if (state !== "play" && state !== "shop") return;
    state = "shop";
    arenaWrap.classList.add("is-paused");
    shopLayer.classList.remove("hidden");
    renderShop();
  }

  function closeShop() {
    if (state !== "shop") return;
    state = "play";
    shopLayer.classList.add("hidden");
    arenaWrap.classList.remove("is-paused");
    lastTs = 0;
  }

  function trySurvivalWin() {
    if (wonNotified || !runStartedAt) return false;
    if (Date.now() - runStartedAt < WIN_TIME_MS) return false;
    wonNotified = true;
    survivalFrozenMs = WIN_TIME_MS;
    state = "win";
    arenaWrap.classList.add("is-paused");
    const lastCoins = coins;
    const lastLevel = level;
    winMsg.textContent = `3 Minuten geschafft! Zuletzt: ${lastCoins} 🪙, Level ${lastLevel}/${MAX_LEVEL}. Alles wird zurückgesetzt — du beginnst beim nächsten Spiel bei null.`;
    fullResetProgress();
    winOverlay.classList.remove("hidden");
    shopLayer.classList.add("hidden");
    updateHud();
    return true;
  }

  function hurtPlayer() {
    if (player.invuln > 0) return;
    lives -= 1;
    shake = 16;
    player.invuln = 90;
    combo = 0;
    comboTimer = 0;
    burst(player.x, player.y, "#ff3366", 24);
    updateHud();
    if (lives <= 0) {
      if (runStartedAt) {
        survivalFrozenMs = Math.min(WIN_TIME_MS, Date.now() - runStartedAt);
      } else {
        survivalFrozenMs = 0;
      }
      state = "over";
      arenaWrap.classList.add("is-paused");
      overTitle.textContent = "Signal verloren";
      gameOvers += 1;
      if (gameOvers >= 3) {
        fullResetProgress();
        overMsg.textContent =
          "3× Game Over — Münzen und Upgrades sind zurückgesetzt. Du startest wieder komplett von vorn.";
      } else {
        saveState();
        overMsg.textContent = `Münzen: ${coins} 🪙 · Level in der Runde: ${level}. Niederlagen insgesamt: ${gameOvers}/3 — bei 3× wird alles gelöscht.`;
      }
      overlay.classList.remove("hidden");
      menu.classList.add("hidden");
      winOverlay.classList.add("hidden");
      updateHud();
    }
  }

  function collectOrb(i) {
    const o = orbs[i];
    burst(o.x, o.y, "#00f0ff", 14);
    orbs.splice(i, 1);
    comboTimer = 50 + up.golden * 2;
    combo = Math.min(combo + 1, 12);
    const gained = Math.max(1, Math.floor((3 + combo * 2) * getCoinMult()));
    coins += gained;
    runPoints += gained;
    popCoin(o.x, o.y, gained);

    const newLevel = levelFromRunPoints(runPoints);
    if (newLevel > level) {
      level = newLevel;
      shake = 8;
      burst(player.x, player.y, "#bf5fff", 24);
    }
    saveState();
    updateHud();
  }

  function updateCoinPops(dt) {
    for (let i = coinPops.length - 1; i >= 0; i--) {
      const c = coinPops[i];
      c.t += dt * 0.022;
      c.y += c.vy * (dt / 16);
      c.life -= dt * 0.002;
      if (c.life <= 0) coinPops.splice(i, 1);
    }
  }

  function update(dt) {
    gridPhase += dt * 0.012;
    if (shake > 0) shake *= 0.88;

    const accel = useMouse ? 0.018 : 0.022;
    const maxSp = (5.8 + Math.min(level, 12) * 0.22) * getSpeedMult();
    const fr = Math.pow(0.92, dt / 16);

    if (useMouse) {
      const dx = mouseX - player.x;
      const dy = mouseY - player.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 8) {
        player.vx += (dx / d) * accel * dt;
        player.vy += (dy / d) * accel * dt;
      }
    } else {
      let ix = 0;
      let iy = 0;
      if (keys.ArrowLeft || keys.a || keys.A) ix -= 1;
      if (keys.ArrowRight || keys.d || keys.D) ix += 1;
      if (keys.ArrowUp || keys.w || keys.W) iy -= 1;
      if (keys.ArrowDown || keys.s || keys.S) iy += 1;
      const il = Math.hypot(ix, iy);
      if (il > 0) {
        player.vx += (ix / il) * accel * dt;
        player.vy += (iy / il) * accel * dt;
      }
    }

    player.vx *= fr;
    player.vy *= fr;
    const sp = Math.hypot(player.vx, player.vy);
    if (sp > maxSp) {
      player.vx = (player.vx / sp) * maxSp;
      player.vy = (player.vy / sp) * maxSp;
    }

    player.x += player.vx * (dt / 16);
    player.y += player.vy * (dt / 16);
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));

    if (Math.abs(player.vx) + Math.abs(player.vy) > 0.2) {
      player.ang = Math.atan2(player.vy, player.vx);
    }

    if (player.invuln > 0) player.invuln -= dt / 16;

    if (comboTimer > 0) {
      comboTimer -= dt / 16;
      if (comboTimer <= 0) {
        combo = 0;
        updateHud();
      }
    }

    const mag = getMagnetR();
    for (const o of orbs) {
      if (mag <= 0) continue;
      const d0 = dist(player.x, player.y, o.x, o.y);
      if (d0 < mag + o.r + 30 && d0 > 2) {
        const pull = (12 * dt) / 16;
        o.x += ((player.x - o.x) / d0) * pull;
        o.y += ((player.y - o.y) / d0) * pull;
      }
    }

    spawnAcc += dt;
    const spawnEvery = Math.max(260, 1520 - level * 36) * getSpawnScale();
    while (spawnAcc >= spawnEvery) {
      spawnAcc -= spawnEvery;
      spawnHunter();
    }
    if (hunters.length > 72) hunters.splice(0, hunters.length - 72);

    orbAcc += dt;
    if (orbAcc > 680 && orbs.length < 11) {
      orbAcc = 0;
      spawnOrb();
    }

    for (let i = orbs.length - 1; i >= 0; i--) {
      orbs[i].phase += dt * 0.004;
      orbs[i].ttl -= dt / 16;
      if (orbs[i].ttl <= 0) orbs.splice(i, 1);
      else if (dist(player.x, player.y, orbs[i].x, orbs[i].y) < player.r + orbs[i].r) {
        collectOrb(i);
      }
    }

    for (const h of hunters) {
      const dx = player.x - h.x;
      const dy = player.y - h.y;
      const d = Math.hypot(dx, dy) || 1;
      h.x += (dx / d) * h.spd * (dt / 16);
      h.y += (dy / d) * h.spd * (dt / 16);
      h.pulse += dt * 0.005;
      if (dist(player.x, player.y, h.x, h.y) < player.r + h.r) {
        hurtPlayer();
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt * 0.0025;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateCoinPops(dt);
  }

  function drawBg(sx, sy) {
    const hueShift = Math.min(MAX_LEVEL, level) * 0.8;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${240 + hueShift}, 45%, 8%)`);
    g.addColorStop(0.5, `hsl(${270 + hueShift * 0.5}, 40%, 12%)`);
    g.addColorStop(1, "#040218");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, W, H);

    ctx.strokeStyle = `rgba(0, 240, 255, ${0.05 + level * 0.0012})`;
    ctx.lineWidth = 1;
    const step = 48;
    const off = (gridPhase * 40) % step;
    for (let x = -step + off; x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(sx + x, sy);
      ctx.lineTo(sx + x, sy + H);
      ctx.stroke();
    }
    for (let y = -step + off; y < H + step; y += step) {
      ctx.beginPath();
      ctx.moveTo(sx, sy + y);
      ctx.lineTo(sx + W, sy + y);
      ctx.stroke();
    }

    for (const st of stars) {
      const tw = 0.5 + 0.5 * Math.sin(st.tw + gridPhase * 2);
      ctx.fillStyle = `rgba(200, 210, 255, ${tw * (0.35 + level * 0.008)})`;
      ctx.beginPath();
      ctx.arc(sx + st.x, sy + st.y, st.s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOrb(sx, sy, o) {
    const pulse = 1 + 0.12 * Math.sin(o.phase);
    const r = o.r * pulse;
    const rg = ctx.createRadialGradient(sx + o.x, sy + o.y, 0, sx + o.x, sy + o.y, r * 3);
    rg.addColorStop(0, "rgba(0, 255, 255, 0.95)");
    rg.addColorStop(0.4, "rgba(0, 200, 255, 0.35)");
    rg.addColorStop(1, "rgba(0, 100, 200, 0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx + o.x, sy + o.y, r * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8ffff";
    ctx.beginPath();
    ctx.arc(sx + o.x, sy + o.y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHunter(sx, sy, h) {
    const pr = 1 + 0.08 * Math.sin(h.pulse);
    const r = h.r * pr;
    const rg = ctx.createRadialGradient(sx + h.x, sy + h.y, 0, sx + h.x, sy + h.y, r * 2.2);
    rg.addColorStop(0, `hsla(${h.hue}, 90%, 55%, 0.9)`);
    rg.addColorStop(0.5, `hsla(${h.hue}, 80%, 40%, 0.4)`);
    rg.addColorStop(1, "transparent");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx + h.x, sy + h.y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `hsla(${h.hue}, 100%, 65%, 0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx + h.x, sy + h.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawPlayer(sx, sy) {
    const flash = player.invuln > 0 && Math.floor(player.invuln / 5) % 2 === 0;
    if (flash) return;

    const px = sx + player.x;
    const py = sy + player.y;

    const mr = getMagnetR();
    if (mr > 0) {
      ctx.strokeStyle = "rgba(255, 213, 74, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, mr, 0, Math.PI * 2);
      ctx.stroke();
    }

    const glowR = player.r * (4 + Math.min(up.turbo, 10) * 0.08);
    const outer = ctx.createRadialGradient(px, py, 0, px, py, glowR);
    outer.addColorStop(0, "rgba(0, 240, 255, 0.28)");
    outer.addColorStop(1, "transparent");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(px, py, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(player.ang + Math.PI / 2);
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18 + up.turbo * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -player.r * 1.2);
    ctx.lineTo(player.r * 0.85, player.r * 0.75);
    ctx.lineTo(0, player.r * 0.35);
    ctx.lineTo(-player.r * 0.85, player.r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, -player.r * 0.25, player.r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(sx, sy) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(sx + p.x, sy + p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawCoinPops(sx, sy) {
    ctx.font = "bold 15px system-ui,sans-serif";
    ctx.textAlign = "center";
    for (const c of coinPops) {
      ctx.globalAlpha = Math.max(0, c.life);
      ctx.fillStyle = "#ffd54a";
      ctx.fillText(`+${c.val} 🪙`, sx + c.x, sy + c.y + Math.sin(c.t) * 5);
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBg(sx, sy);

    for (const o of orbs) drawOrb(sx, sy, o);
    for (const h of hunters) drawHunter(sx, sy, h);
    drawPlayer(sx, sy);
    drawParticles(sx, sy);
    drawCoinPops(sx, sy);

    ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 + level * 0.008})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, W - 2, H - 2);

    if (state === "play" || state === "shop") {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.font = "700 13px system-ui,sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`LEVEL ${level}/${MAX_LEVEL}`, sx + 12, sy + 22);
    }
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(48, ts - lastTs);
    lastTs = ts;

    if (state === "play" || state === "shop") {
      trySurvivalWin();
    }
    if (state === "play") {
      update(dt);
    } else if (state === "shop") {
      updateCoinPops(dt);
    }
    if (state === "play" || state === "shop") {
      updateHud();
    }
    draw();
    requestAnimationFrame(loop);
  }

  function onKeyDown(e) {
    keys[e.key] = true;
    if (e.key === "b" || e.key === "B") {
      if (state === "play") openShop();
      else if (state === "shop") closeShop();
      e.preventDefault();
    }
    if (e.key === "Escape" && state === "shop") {
      closeShop();
      e.preventDefault();
    }
    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"].includes(
        e.key
      )
    ) {
      useMouse = false;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    keys[e.key] = false;
  }

  function screenToGame(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width;
    const sy = H / r.height;
    return {
      x: (clientX - r.left) * sx,
      y: (clientY - r.top) * sy,
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const p = screenToGame(e.clientX, e.clientY);
    mouseX = p.x;
    mouseY = p.y;
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length) {
        const p = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        mouseX = p.x;
        mouseY = p.y;
        useMouse = true;
        e.preventDefault();
      }
    },
    { passive: false }
  );

  canvas.addEventListener("mousedown", () => {
    useMouse = true;
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      useMouse = true;
      if (e.touches.length) {
        const p = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        mouseX = p.x;
        mouseY = p.y;
      }
    },
    { passive: true }
  );

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  btnStart.addEventListener("click", () => {
    resetGame();
    runStartedAt = Date.now();
    state = "play";
    arenaWrap.classList.remove("is-paused");
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    shopLayer.classList.add("hidden");
    lastTs = 0;
  });

  btnAgain.addEventListener("click", () => {
    resetGame();
    runStartedAt = Date.now();
    state = "play";
    arenaWrap.classList.remove("is-paused");
    overlay.classList.add("hidden");
    winOverlay.classList.add("hidden");
    shopLayer.classList.add("hidden");
    lastTs = 0;
  });

  btnWinAgain.addEventListener("click", () => {
    resetGame();
    runStartedAt = 0;
    state = "menu";
    arenaWrap.classList.add("is-paused");
    winOverlay.classList.add("hidden");
    menu.classList.remove("hidden");
    overlay.classList.add("hidden");
    shopLayer.classList.add("hidden");
    lastTs = 0;
    updateHud();
  });

  btnShop.addEventListener("click", () => {
    if (state === "play") openShop();
    else if (state === "shop") closeShop();
  });

  btnShopClose.addEventListener("click", closeShop);

  loadState();
  initStars();
  updateHud();
  draw();
  requestAnimationFrame(loop);

  window.addEventListener("beforeunload", saveState);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveState();
  });
})();
