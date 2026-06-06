(() => {
  const W = 960;
  const H = 400;
  const GROUND = H - 72;
  const GRAVITY = 2000;
  const JUMP_V = -640;
  const PLAYER_X = 120;
  const PLAYER_W = 44;
  const PLAYER_H = 58;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const finalEl = document.getElementById("final-score");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnMute = document.getElementById("btn-mute");

  const LS_KEY = "neon-sprinter-best";
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
  let score = 0;
  let highScore = Number(localStorage.getItem(LS_KEY)) || 0;
  let bestElText = highScore > 0 ? `Best: ${Math.floor(highScore)}` : "Best: —";

  /** @type {{ x: number, w: number, h: number, passed: boolean }[]} */
  let obstacles = [];
  let spawnT = 0;
  let nextSpawnGap = 1.5;
  let scroll = 0;

  let playerY = GROUND - PLAYER_H;
  let playerVy = 0;
  let onGround = true;

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
    score = 0;
    obstacles = [];
    spawnT = 0;
    nextSpawnGap = 1.4 + Math.random() * 0.5;
    scroll = 0;
    playerY = GROUND - PLAYER_H;
    playerVy = 0;
    onGround = true;
  }

  function startGame() {
    resetRun();
    bestEl.textContent = bestElText;
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    document.documentElement.classList.add("runner-active");
    running = true;
    lastT = performance.now();
    startMusic();
    raf = requestAnimationFrame(loop);
  }

  function endRun() {
    running = false;
    stopMusic();
    if (!muted) playTone(220, 0.2, 0.06, "triangle");
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove("runner-active");
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(LS_KEY, String(Math.floor(highScore)));
      bestElText = `Best: ${Math.floor(highScore)}`;
      bestEl.textContent = bestElText;
    }
    finalEl.textContent = `Punkte: ${Math.floor(score)}`;
    overlay.classList.remove("hidden");
  }

  function tryJump() {
    if (!running || !onGround) return;
    playerVy = JUMP_V;
    onGround = false;
  }

  function spawnObstacle() {
    const h = 32 + Math.random() * 40;
    const w = 26 + Math.random() * 22;
    obstacles.push({ x: W + 10, w, h, passed: false });
  }

  function update(dt) {
    scroll += speed * dt;
    speed = Math.min(480, BASE_SPEED + score * 0.022);

    playerVy += GRAVITY * dt;
    playerY += playerVy * dt;
    if (playerY + PLAYER_H >= GROUND) {
      playerY = GROUND - PLAYER_H;
      playerVy = 0;
      onGround = true;
    }

    spawnT += dt;
    if (spawnT >= nextSpawnGap) {
      spawnT = 0;
      nextSpawnGap = 1.1 + Math.random() * 0.75;
      spawnObstacle();
    }

    for (const o of obstacles) {
      o.x -= speed * dt;
      if (!o.passed && o.x + o.w < PLAYER_X) {
        o.passed = true;
        score += 1;
      }
    }
    obstacles = obstacles.filter((o) => o.x + o.w > -50);

    const px = PLAYER_X;
    const py = playerY;
    for (const o of obstacles) {
      if (aabb(px, py, PLAYER_W, PLAYER_H, o.x, GROUND - o.h, o.w, o.h)) {
        endRun();
        return;
      }
    }
    score += dt * 3;
  }

  function drawHills() {
    const w = 200;
    ctx.fillStyle = "rgba(51,65,85,0.55)";
    for (let i = -1; i < 7; i++) {
      const x = (((i * w + scroll * 0.18) % (w * 5)) + w * 5) % (w * 5) - w;
      ctx.beginPath();
      ctx.moveTo(x, H);
      ctx.lineTo(x + w * 0.5, GROUND - 85);
      ctx.lineTo(x + w, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  function draw() {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0f172a");
    bg.addColorStop(1, "#312e81");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawHills();

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.strokeStyle = "rgba(34,211,238,0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND + 0.5);
    ctx.lineTo(W, GROUND + 0.5);
    ctx.stroke();

    for (const o of obstacles) {
      ctx.fillStyle = "#7c3aed";
      ctx.fillRect(o.x, GROUND - o.h, o.w, o.h);
      ctx.strokeStyle = "#a78bfa";
      ctx.strokeRect(o.x + 0.5, GROUND - o.h + 0.5, o.w - 1, o.h - 1);
    }

    const px = PLAYER_X;
    const py = playerY;
    ctx.fillStyle = "#f4c430";
    ctx.fillRect(px + 8, py + 20, PLAYER_W - 16, PLAYER_H - 20);
    ctx.fillStyle = "#fef3c7";
    ctx.beginPath();
    ctx.arc(px + PLAYER_W / 2, py + 14, 12, 0, Math.PI * 2);
    ctx.fill();

    scoreEl.textContent = String(Math.floor(score));
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
    if (e.code !== "Space" && e.code !== "ArrowUp") return;
    e.preventDefault();
    if (!running) {
      if (!menu.classList.contains("hidden") || !overlay.classList.contains("hidden")) startGame();
      return;
    }
    tryJump();
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
      tryJump();
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
  bestEl.textContent = bestElText;

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
