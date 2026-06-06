(() => {
  const W = 720;
  const H = 520;
  const MID = W / 2;
  const CAT_Y = H - 95;
  const GATE_H = 118;
  const DECIDE_Y = CAT_Y - 40;
  const LEVEL_MAX = 20;

  const PAIRS = [
    { L: { emoji: "🐜", name: "Ameise" }, R: { emoji: "🥫", name: "Katzenfutter" }, ok: "right" },
    { L: { emoji: "🐭", name: "Maus" }, R: { emoji: "🪱", name: "Wurm" }, ok: "left" },
    { L: { emoji: "🐟", name: "Fisch" }, R: { emoji: "🧅", name: "Zwiebel" }, ok: "left" },
    { L: { emoji: "💧", name: "Wasser" }, R: { emoji: "🍫", name: "Schokolade" }, ok: "left" },
    { L: { emoji: "🐕", name: "Hund" }, R: { emoji: "🧶", name: "Spielzeug" }, ok: "right" },
    { L: { emoji: "🍖", name: "Fleisch" }, R: { emoji: "🌶️", name: "Chili" }, ok: "left" },
    { L: { emoji: "🪳", name: "Kakerlake" }, R: { emoji: "🐔", name: "Hühnchen" }, ok: "right" },
    { L: { emoji: "🐦", name: "Vogel" }, R: { emoji: "🥒", name: "Salat" }, ok: "left" },
  ];

  const FOOD_BONUS = [
    { emoji: "🐟", name: "Thunfisch" },
    { emoji: "🍗", name: "Hühnchen" },
    { emoji: "🧅", name: "Zwiebel" },
    { emoji: "🍫", name: "Schokolade" },
  ];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const hintEl = document.getElementById("hint");
  const levelDisplay = document.getElementById("level-display");
  const forkDisplay = document.getElementById("fork-display");
  const coinHud = document.getElementById("coin-hud");
  const coinCountEl = document.getElementById("coin-count");
  const coinNeedEl = document.getElementById("coin-need");
  const coinTimeEl = document.getElementById("coin-time");
  const moodHearts = document.getElementById("mood-hearts");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnMute = document.getElementById("btn-mute");
  const foodBonus = document.getElementById("food-bonus");
  const foodBonusGrid = document.getElementById("food-bonus-grid");
  const foodLevelNum = document.getElementById("food-level-num");
  const toastEl = document.getElementById("toast");

  const LS_BEST_LEVEL = "katze-wahl-best-level";
  const LS_MUTE = "katze-wahl-muted";

  let audioCtx = null;
  let musicId = null;
  let musicBeat = 0;
  let muted = localStorage.getItem(LS_MUTE) === "1";
  const NOTES = [493.88, 554.37, 587.33, 659.25, 739.99, 659.25, 587.33, 523.25];

  /** @type {"forks"|"coins"|"idle"} */
  let phase = "idle";
  let playing = false;
  let raf = 0;
  let lastT = 0;

  let level = 1;
  let catX = MID;
  /** Läuft mit den Gabelungen mit (alles bewegt sich) */
  let forkBgScroll = 0;
  let scrollSpeed = 132;
  let gates = [];
  let nextSpawnY = -70;
  let gatesPassed = 0;
  let forksInLevel = 0;
  let catMood = 5;

  /** @type {{ x: number, y: number, vy: number, got: boolean }[]} */
  let coins = [];
  let coinsCollected = 0;
  let coinsNeeded = 8;
  let coinTimeLeft = 14;
  let coinSpawnAcc = 0;

  let hatedFoodIndex = 0;
  let bestLevel = Number(localStorage.getItem(LS_BEST_LEVEL)) || 0;
  /** Verhindert doppeltes Beenden der Münzen-Phase */
  let coinExit = false;
  /** Finger/Maus zieht die Katze auf der Straße */
  let forkDrag = false;

  const keys = new Set();

  function forksNeeded(L) {
    return Math.min(14, 4 + Math.floor(L * 0.75));
  }

  function coinsTarget(L) {
    return 12 + L * 3;
  }

  function coinSeconds(L) {
    return Math.min(48, 18 + Math.ceil(L * 1.85));
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playTone(freq, duration, vol, type) {
    if (muted) return;
    const c = ensureAudio();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function musicStep() {
    if (!playing || muted) return;
    playTone(NOTES[musicBeat % NOTES.length], 0.11, 0.038, "triangle");
    musicBeat++;
  }

  function startMusic() {
    stopMusic();
    if (muted) return;
    const c = ensureAudio();
    if (!c) return;
    const go = () => {
      if (muted) return;
      musicBeat = 0;
      musicStep();
      musicId = setInterval(musicStep, 298);
    };
    if (c.state === "running") go();
    else {
      const p = c.resume();
      if (p && typeof p.then === "function") p.then(go).catch(go);
      else go();
    }
  }

  function stopMusic() {
    if (musicId) {
      clearInterval(musicId);
      musicId = null;
    }
  }

  function syncMute() {
    btnMute.textContent = muted ? "🔇" : "🔊";
    btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 2600);
  }

  function pickPair() {
    return PAIRS[Math.floor(Math.random() * PAIRS.length)];
  }

  function updateHudFork() {
    levelDisplay.textContent = String(level);
    forkDisplay.textContent = `Gabelungen: ${forksInLevel} / ${forksNeeded(level)}`;
  }

  function resetForkSection() {
    scrollSpeed = Math.min(248, 118 + level * 4.5);
    gates = [];
    nextSpawnY = -90;
    catX = MID;
    forksInLevel = 0;
    for (let i = 0; i < 5; i++) spawnGate();
    updateHudFork();
  }

  function spawnGate() {
    gates.push({ y: nextSpawnY, pair: pickPair(), decided: false });
    nextSpawnY -= 318 + Math.random() * 110;
  }

  function gameOver(msg) {
    playing = false;
    phase = "idle";
    stopMusic();
    if (!muted) playTone(130, 0.22, 0.055, "triangle");
    cancelAnimationFrame(raf);
    coinHud.classList.add("hidden");
    forkDisplay.classList.remove("hidden");
    foodBonus.classList.add("hidden");
    bestLevel = Math.max(bestLevel, level);
    localStorage.setItem(LS_BEST_LEVEL, String(bestLevel));
    bestEl.textContent = `Bestes Level: ${bestLevel}`;
    overlayTitle.textContent = "Game Over";
    overlayMsg.textContent = msg;
    overlay.classList.remove("hidden");
    menu.classList.remove("hidden");
    hintEl.textContent = "";
  }

  function winGame() {
    playing = false;
    phase = "idle";
    stopMusic();
    if (!muted) {
      playTone(523.25, 0.12, 0.06, "sine");
      playTone(659.25, 0.14, 0.055, "sine");
    }
    cancelAnimationFrame(raf);
    coinHud.classList.add("hidden");
    forkDisplay.classList.remove("hidden");
    foodBonus.classList.add("hidden");
    bestLevel = Math.max(bestLevel, LEVEL_MAX);
    localStorage.setItem(LS_BEST_LEVEL, String(bestLevel));
    bestEl.textContent = `Bestes Level: ${bestLevel}`;
    overlayTitle.textContent = "Geschafft!";
    overlayMsg.textContent = "Alle 20 Level — du und die Katze seid Profis.";
    overlay.classList.remove("hidden");
    menu.classList.remove("hidden");
    hintEl.textContent = "";
  }

  function evaluateGate(g) {
    if (g.decided) return;
    g.decided = true;
    /** Wo die Katze steht = welche Spur (frei beweglich bis zur Linie) */
    const pick = catX < MID ? "left" : "right";

    if (pick !== g.pair.ok) {
      gameOver("Falsche Spur — mit ← → genau in die richtige Hälfte fahren!");
      return;
    }

    forksInLevel += 1;
    gatesPassed += 1;
    scoreEl.textContent = String(gatesPassed);
    updateHudFork();
    scrollSpeed = Math.min(285, scrollSpeed + 3);
    if (!muted) playTone(784, 0.08, 0.045, "sine");

    if (forksInLevel >= forksNeeded(level)) {
      startCoinPhase();
    }
  }

  function startCoinPhase() {
    phase = "coins";
    coinExit = false;
    gates = [];
    coins = [];
    coinsCollected = 0;
    coinsNeeded = coinsTarget(level);
    coinTimeLeft = coinSeconds(level);
    coinSpawnAcc = 0;
    catX = MID;

    forkDisplay.classList.add("hidden");
    coinHud.classList.remove("hidden");
    coinCountEl.textContent = "0";
    coinNeedEl.textContent = String(coinsNeeded);
    coinTimeEl.textContent = String(Math.ceil(coinTimeLeft));
    hintEl.textContent = `Fang mindestens ${coinsNeeded} Münzen — Katze mit ← → bewegen!`;
  }

  function spawnCoin() {
    coins.push({
      x: 40 + Math.random() * (W - 80),
      y: -24,
      vy: 175 + level * 4,
      got: false,
    });
  }

  function updateCoins(dt) {
    coinTimeLeft -= dt;
    coinTimeEl.textContent = String(Math.max(0, Math.ceil(coinTimeLeft)));

    const moveSpd = 340;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) catX -= moveSpd * dt;
    if (keys.has("ArrowRight") || keys.has("KeyD")) catX += moveSpd * dt;
    catX = clamp(catX, 44, W - 44);

    coinSpawnAcc += dt;
    const spawnEvery = Math.max(0.14, 0.42 - level * 0.012);
    if (coinSpawnAcc >= spawnEvery) {
      coinSpawnAcc = 0;
      spawnCoin();
    }

    for (const c of coins) {
      if (c.got) continue;
      c.y += c.vy * dt;
      const dx = c.x - catX;
      const dy = c.y - (CAT_Y - 8);
      if (Math.hypot(dx, dy) < 36) {
        c.got = true;
        coinsCollected += 1;
        coinCountEl.textContent = String(coinsCollected);
        if (!muted) playTone(880 + coinsCollected * 12, 0.06, 0.04, "sine");
      }
    }

    coins = coins.filter((c) => !c.got && c.y < H + 40);

    if (coinsCollected >= coinsNeeded) {
      finishCoinPhaseSuccess();
      return;
    }
    if (coinTimeLeft <= 0) {
      if (coinsCollected < coinsNeeded) {
        gameOver(`Zu wenig Münzen (${coinsCollected}/${coinsNeeded}). Nochmal!`);
      } else {
        finishCoinPhaseSuccess();
      }
    }
  }

  function finishCoinPhaseSuccess() {
    if (coinExit) return;
    coinExit = true;
    coinHud.classList.add("hidden");
    forkDisplay.classList.remove("hidden");

    if (level % 5 === 0) {
      openFoodBonusPanel();
    } else {
      advanceLevelAfterCoins();
    }
  }

  function openFoodBonusPanel() {
    hatedFoodIndex = Math.floor(Math.random() * FOOD_BONUS.length);
    foodLevelNum.textContent = String(level);
    foodBonusGrid.innerHTML = "";
    FOOD_BONUS.forEach((f, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn-food-mini";
      b.innerHTML = `<span class="em">${f.emoji}</span>${f.name}`;
      b.addEventListener("click", () => onFoodBonusPick(i));
      foodBonusGrid.appendChild(b);
    });
    foodBonus.classList.remove("hidden");
    hintEl.textContent = "Wähle ein Essen für die Katze …";
    cancelAnimationFrame(raf);
    phase = "idle";
  }

  function onFoodBonusPick(index) {
    foodBonus.classList.add("hidden");
    if (index === hatedFoodIndex) {
      catMood = Math.max(0, catMood - 1);
      moodHearts.textContent = String(catMood);
      showToast("Die Katze mag das nicht besonders — aber es geht weiter.");
      if (!muted) playTone(180, 0.15, 0.045, "triangle");
    } else {
      showToast("Schmeckt — die Katze ist zufrieden.");
      if (!muted) playTone(659.25, 0.1, 0.045, "sine");
    }
    advanceLevelAfterCoins();
  }

  function advanceLevelAfterCoins() {
    level += 1;
    if (level > LEVEL_MAX) {
      winGame();
      return;
    }
    phase = "forks";
    hintEl.textContent = `Level ${level}: wieder Gabelungen, dann Münzen.`;
    resetForkSection();
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function updateForks(dt) {
    const moveSpd = 340;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) catX -= moveSpd * dt;
    if (keys.has("ArrowRight") || keys.has("KeyD")) catX += moveSpd * dt;
    catX = clamp(catX, 44, W - 44);

    forkBgScroll += scrollSpeed * dt;

    for (const g of gates) {
      g.y += scrollSpeed * dt;
    }

    gates = gates.filter((g) => g.y < H + GATE_H + 60);

    const undec = gates.filter((g) => !g.decided);
    if (undec.length) {
      const lead = undec.reduce((a, b) => (a.y > b.y ? a : b));
      if (lead.y + GATE_H >= DECIDE_Y && lead.y <= DECIDE_Y + 28) {
        evaluateGate(lead);
      }
    }

    if (phase === "forks") {
      while (gates.filter((g) => !g.decided).length < 5) spawnGate();
    }
  }

  function drawRoad(coinMode) {
    if (coinMode) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#1e3a2f");
      g.addColorStop(1, "#14532d");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const t = performance.now() * 0.001;
      ctx.fillStyle = "rgba(250, 204, 21, 0.1)";
      for (let i = 0; i < 14; i++) {
        const x = ((i * 73 + t * 120) % (W + 50)) - 25;
        ctx.fillRect(x, (i * 47 + t * 40) % H, 3, 24);
      }
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.45);
      sky.addColorStop(0, "#1e4d2e");
      sky.addColorStop(1, "#166534");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.45);
      ctx.fillStyle = "#166534";
      ctx.fillRect(0, H * 0.45, W, H * 0.55);

      const stripeH = 46;
      const off = forkBgScroll % (stripeH * 2);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      for (let y = -off; y < H; y += stripeH * 2) {
        ctx.fillRect(MID - 3, y, 6, stripeH);
      }
      ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
      for (let i = -1; i < 10; i++) {
        const gx = ((i * 80 + forkBgScroll * 0.35) % (W + 100)) - 30;
        const gy = 60 + (i * 47) % (H - 120);
        ctx.beginPath();
        ctx.ellipse(gx, gy, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGate(g) {
    const top = g.y;
    const pair = g.pair;

    ctx.fillStyle = "rgba(34, 197, 94, 0.38)";
    ctx.fillRect(0, top, MID - 2, GATE_H);
    ctx.fillStyle = "rgba(34, 197, 94, 0.24)";
    ctx.fillRect(MID + 2, top, W - MID - 2, GATE_H);

    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, top + 1, MID - 4, GATE_H - 2);
    ctx.strokeRect(MID + 3, top + 1, W - MID - 5, GATE_H - 2);

    ctx.font = "bold 34px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(pair.L.emoji, MID * 0.5, top + 50);
    ctx.fillText(pair.R.emoji, MID + (W - MID) * 0.5, top + 50);

    ctx.font = "600 12px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(pair.L.name, MID * 0.5, top + 78);
    ctx.fillText(pair.R.name, MID + (W - MID) * 0.5, top + 78);

    ctx.strokeStyle = "rgba(250, 204, 21, 0.9)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(MID, top);
    ctx.lineTo(MID, top + GATE_H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCat(cx) {
    const cy = CAT_Y;
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 28, 36, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "54px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐱", cx, cy);

    ctx.font = "600 11px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("Du", cx, cy + 42);

    if (phase === "forks") {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, CAT_Y - 52, MID - 18, 76);
      ctx.strokeRect(MID + 10, CAT_Y - 52, W - MID - 18, 76);
      ctx.strokeStyle = catX < MID ? "#fbbf24" : "rgba(253, 224, 71, 0.45)";
      ctx.lineWidth = catX < MID ? 5 : 2;
      ctx.strokeRect(8, CAT_Y - 52, MID - 18, 76);
      ctx.strokeStyle = catX >= MID ? "#fbbf24" : "rgba(253, 224, 71, 0.45)";
      ctx.lineWidth = catX >= MID ? 5 : 2;
      ctx.strokeRect(MID + 10, CAT_Y - 52, W - MID - 18, 76);
      ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, 42, 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCoinsOverlay() {
    for (const c of coins) {
      if (c.got) continue;
      ctx.font = "26px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🪙", c.x, c.y);
    }
  }

  function draw() {
    if (phase === "coins") {
      drawRoad(true);
      drawCoinsOverlay();
      drawCat(catX);
      ctx.font = "bold 14px system-ui,sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(`Level ${level} · Münzen`, MID, 22);
      return;
    }

    drawRoad(false);
    const sorted = [...gates].sort((a, b) => a.y - b.y);
    for (const g of sorted) drawGate(g);

    ctx.fillStyle = "rgba(251, 191, 36, 0.45)";
    ctx.fillRect(0, DECIDE_Y, W, 4);

    drawCat(catX);

    ctx.font = "11px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.fillText("← → halten: Katze frei bewegen · gelbe Linie = Entscheidung", MID, 18);

    ctx.font = "bold 13px system-ui,sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`Level ${level} · Gabelungen`, MID, 34);
  }

  function loop(t) {
    if (!playing) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 1 / 60);
    lastT = t;

    if (phase === "forks") updateForks(dt);
    else if (phase === "coins") updateCoins(dt);

    if (!playing) return;
    draw();
    if (playing && phase !== "idle") raf = requestAnimationFrame(loop);
  }

  function setCatXFromClient(clientX, canvasRect) {
    const nx = (clientX - canvasRect.left) / (canvasRect.width || 1);
    catX = clamp(nx * W, 44, W - 44);
  }

  window.addEventListener(
    "keydown",
    (e) => {
      keys.add(e.code);
      if (phase === "coins" || phase === "forks") {
        if (e.code === "ArrowLeft" || e.code === "ArrowRight") e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener("keyup", (e) => keys.delete(e.code));

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!playing || phase !== "forks") return;
      forkDrag = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {}
      setCatXFromClient(e.clientX, canvas.getBoundingClientRect());
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!playing || phase !== "forks" || !forkDrag) return;
      setCatXFromClient(e.clientX, canvas.getBoundingClientRect());
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointerup",
    () => {
      forkDrag = false;
    },
    { passive: true }
  );

  canvas.addEventListener(
    "pointercancel",
    () => {
      forkDrag = false;
    },
    { passive: true }
  );

  function startGame() {
    overlay.classList.add("hidden");
    menu.classList.add("hidden");
    toastEl.classList.add("hidden");
    foodBonus.classList.add("hidden");

    level = 1;
    gatesPassed = 0;
    catMood = 5;
    moodHearts.textContent = "5";
    scoreEl.textContent = "0";
    playing = true;
    phase = "forks";
    coinHud.classList.add("hidden");
    forkDisplay.classList.remove("hidden");

    resetForkSection();
    lastT = performance.now();
    startMusic();
    hintEl.textContent = `Level 1: ${forksNeeded(1)}× zur gelben Linie — Katze mit ← → oder Ziehen positionieren, dann länger Münzen sammeln.`;
    raf = requestAnimationFrame(loop);
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);

  btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem(LS_MUTE, muted ? "1" : "0");
    syncMute();
    if (muted) stopMusic();
    else if (playing) startMusic();
  });

  let audioPrimed = false;
  function prime() {
    if (audioPrimed) return;
    audioPrimed = true;
    const c = ensureAudio();
    if (c && c.state === "suspended") {
      const p = c.resume();
      if (p && typeof p.then === "function") p.catch(() => {});
    }
  }
  window.addEventListener("pointerdown", prime, { capture: true, passive: true });
  window.addEventListener("keydown", prime, { capture: true, passive: true });

  syncMute();
  bestEl.textContent = bestLevel > 0 ? `Bestes Level: ${bestLevel}` : "Bestes Level: —";
  hintEl.textContent = "Start drücken — 20 Level mit Gabelungen, Münzen und alle 5 Level Extra-Essen.";
  drawRoad(false);
  drawCat(MID);
})();
