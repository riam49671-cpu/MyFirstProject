(() => {
  const W = 960;
  const H = 400;
  const GROUND = H - 72;
  const MID = W / 2;
  const GRAVITY = 2000;
  const JUMP_V = -640;
  const P1X = 95;
  const P2X = MID + 95;
  const PLAYER_W = 44;
  const PLAYER_H = 58;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");
  const finalEl = document.getElementById("final-score");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnMute = document.getElementById("btn-mute");

  const LS_MUTE = "neon-sprinter-muted";

  let audioCtx = null;
  let musicId = null;
  let musicBeat = 0;
  let muted = localStorage.getItem(LS_MUTE) === "1";
  const NOTES = [392, 466.16, 523.25, 587.33, 659.25, 587.33, 523.25, 392];

  let running = false;
  let raf = 0;
  let lastT = 0;
  const BASE_SPEED = 280;
  let speed = BASE_SPEED;
  let score1 = 0;
  let score2 = 0;

  /** @type {{ x: number; w: number; h: number; lane: 0 | 1; passed: boolean }[]} */
  let obstacles = [];
  let spawnT = 0;
  let nextSpawnGap = 1.5;
  let scroll = 0;

  let p1y = GROUND - PLAYER_H;
  let p2y = GROUND - PLAYER_H;
  let p1vy = 0;
  let p2vy = 0;
  let g1 = true;
  let g2 = true;

  function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
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
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.06);
  }

  function musicStep() {
    if (muted || !running) return;
    playTone(NOTES[musicBeat % NOTES.length], 0.14, 0.055, "triangle");
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
      musicId = setInterval(musicStep, 292);
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

  function syncMuteButton() {
    btnMute.textContent = muted ? "🔇" : "🔊";
    btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
    btnMute.title = muted ? "Ton an" : "Ton aus";
  }

  function resetRun() {
    speed = BASE_SPEED;
    score1 = 0;
    score2 = 0;
    obstacles = [];
    spawnT = 0;
    nextSpawnGap = 1.4 + Math.random() * 0.5;
    scroll = 0;
    p1y = p2y = GROUND - PLAYER_H;
    p1vy = p2vy = 0;
    g1 = g2 = true;
  }

  function startGame() {
    resetRun();
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    document.documentElement.classList.add("runner-active");
    running = true;
    lastT = performance.now();
    startMusic();
    raf = requestAnimationFrame(loop);
  }

  function endRun(winner) {
    running = false;
    stopMusic();
    if (!muted) {
      playTone(winner === 1 ? 659.25 : 587.33, 0.18, 0.065, "triangle");
    }
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove("runner-active");
    finalEl.textContent =
      winner === 1 ? "Spieler 1 gewinnt – Spieler 2 ist rein." : "Spieler 2 gewinnt – Spieler 1 ist rein.";
    overlay.classList.remove("hidden");
  }

  function tryJump1() {
    if (!running || !g1) return;
    p1vy = JUMP_V;
    g1 = false;
  }

  function tryJump2() {
    if (!running || !g2) return;
    p2vy = JUMP_V;
    g2 = false;
  }

  function spawnObstacle(lane) {
    const h = 28 + Math.random() * 38;
    const w = 22 + Math.random() * 22;
    if (lane === 0) {
      const maxW = MID - P1X - PLAYER_W - 24;
      const ww = Math.min(w, maxW);
      obstacles.push({ x: MID - 16 - ww, w: ww, h, lane: 0, passed: false });
    } else {
      obstacles.push({ x: W + 14, w, h, lane: 1, passed: false });
    }
  }

  function update(dt) {
    scroll += speed * dt;
    speed = Math.min(480, BASE_SPEED + (score1 + score2) * 0.015);

    p1vy += GRAVITY * dt;
    p2vy += GRAVITY * dt;
    p1y += p1vy * dt;
    p2y += p2vy * dt;
    if (p1y + PLAYER_H >= GROUND) {
      p1y = GROUND - PLAYER_H;
      p1vy = 0;
      g1 = true;
    }
    if (p2y + PLAYER_H >= GROUND) {
      p2y = GROUND - PLAYER_H;
      p2vy = 0;
      g2 = true;
    }

    spawnT += dt;
    if (spawnT >= nextSpawnGap) {
      spawnT = 0;
      nextSpawnGap = 1.05 + Math.random() * 0.75;
      spawnObstacle(Math.random() < 0.5 ? 0 : 1);
    }

    for (const o of obstacles) {
      o.x -= speed * dt;
      if (o.lane === 0 && !o.passed && o.x + o.w < P1X) {
        o.passed = true;
        score1 += 1;
      }
      if (o.lane === 1 && !o.passed && o.x + o.w < P2X) {
        o.passed = true;
        score2 += 1;
      }
    }
    obstacles = obstacles.filter((o) => o.x + o.w > -60);

    for (const o of obstacles) {
      if (o.lane === 0 && aabb(P1X, p1y, PLAYER_W, PLAYER_H, o.x, GROUND - o.h, o.w, o.h)) {
        endRun(2);
        return;
      }
      if (o.lane === 1 && aabb(P2X, p2y, PLAYER_W, PLAYER_H, o.x, GROUND - o.h, o.w, o.h)) {
        endRun(1);
        return;
      }
    }

    score1 += dt * 1.5;
    score2 += dt * 1.5;
  }

  function drawHills() {
    const bw = 200;
    ctx.fillStyle = "rgba(51,65,85,0.45)";
    for (let i = -1; i < 7; i++) {
      const x = (((i * bw + scroll * 0.18) % (bw * 5)) + bw * 5) % (bw * 5) - bw;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + bw * 0.5, GROUND - 85);
      ctx.lineTo(x + bw, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawPlayer(x, y, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(x + 8, y + 20, PLAYER_W - 16, PLAYER_H - 20);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 8, y + 20, PLAYER_W - 16, PLAYER_H - 20);
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(x + PLAYER_W / 2, y + 14, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#312e81");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(34,211,238,0.06)";
    ctx.fillRect(0, 0, MID, GROUND);
    ctx.fillStyle = "rgba(167,139,250,0.06)";
    ctx.fillRect(MID, 0, W - MID, GROUND);

    drawHills();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(MID + 0.5, 0);
    ctx.lineTo(MID + 0.5, GROUND);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = "rgba(34,211,238,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 0.5);
    ctx.lineTo(W, GROUND + 0.5);
    ctx.stroke();

    for (const o of obstacles) {
      ctx.fillStyle = o.lane === 0 ? "#a855f7" : "#06b6d4";
      ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
      ctx.strokeStyle = o.lane === 0 ? "#c4b5fd" : "#67e8f9";
      ctx.strokeRect(o.x + 0.5, GROUND - o.h + 0.5, o.w - 1, o.h - 1);
    }

    drawPlayer(P1X, p1y, "#ca8a04", "#fbbf24");
    drawPlayer(P2X, p2y, "#0891b2", "#22d3ee");

    score1El.textContent = String(Math.floor(score1));
    score2El.textContent = String(Math.floor(score2));
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 1 / 60);
    lastT = t;
    update(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function onKey(e) {
    if (e.code === "KeyW") {
      e.preventDefault();
      if (!running) {
        if (!menu.classList.contains("hidden") || !overlay.classList.contains("hidden")) startGame();
        return;
      }
      tryJump1();
      return;
    }
    if (e.code === "ArrowUp") {
      e.preventDefault();
      if (!running) {
        if (!menu.classList.contains("hidden") || !overlay.classList.contains("hidden")) startGame();
        return;
      }
      tryJump2();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      if (!running && (!menu.classList.contains("hidden") || !overlay.classList.contains("hidden"))) {
        startGame();
      }
    }
  }

  window.addEventListener("keydown", onKey, { passive: false });

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      e.preventDefault();
      if (!running && !overlay.classList.contains("hidden")) {
        startGame();
        return;
      }
      if (!running) return;
      const r = canvas.getBoundingClientRect();
      const nx = (e.clientX - r.left) / (r.width || 1);
      if (nx < 0.5) tryJump1();
      else tryJump2();
    },
    { passive: false }
  );

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);

  btnMute.addEventListener("click", (e) => {
    e.stopPropagation();
    muted = !muted;
    localStorage.setItem(LS_MUTE, muted ? "1" : "0");
    syncMuteButton();
    if (muted) stopMusic();
    else if (running) startMusic();
  });

  syncMuteButton();

  let audioPrimed = false;
  function primeAudioFromGesture() {
    if (audioPrimed) return;
    audioPrimed = true;
    const c = ensureAudio();
    if (c && c.state === "suspended") {
      const p = c.resume();
      if (p && typeof p.then === "function") p.catch(() => {});
    }
  }
  window.addEventListener("pointerdown", primeAudioFromGesture, { capture: true, passive: true });
  window.addEventListener("keydown", primeAudioFromGesture, { capture: true, passive: true });

  draw();
})();
