(() => {
  const COLS = 30;
  const ROWS = 15;
  const CELL = 32;
  const W = COLS * CELL;
  const H = ROWS * CELL;

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

  const LS_KEY = "krone-snake-1p-best";
  const LS_MUTE = "krone-snake-muted";

  const BG_NOTES = [329.63, 293.66, 349.23, 392.0, 440.0, 392.0, 329.63, 293.66];
  let musicBeat = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let musicId = null;

  let audioCtx = null;
  let muted = localStorage.getItem(LS_MUTE) === "1";

  let running = false;
  let raf = 0;
  let lastTick = 0;
  let tickMs = 140;

  /** @type {{ x: number, y: number }[]} */
  let snake = [];
  let dir = { dx: 1, dy: 0 };
  let pendingDir = { dx: 1, dy: 0 };
  let food = { x: 15, y: 7 };
  let score = 0;
  let highScore = Number(localStorage.getItem(LS_KEY)) || 0;

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playTone(freq, duration, vol, wave = "square") {
    if (muted) return;
    const c = ensureAudio();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.04);
  }

  function musicStep() {
    if (muted || !running) return;
    playTone(BG_NOTES[musicBeat % BG_NOTES.length], 0.13, 0.042, "triangle");
    musicBeat++;
  }

  function startMusic() {
    stopMusic();
    if (muted) return;
    ensureAudio();
    musicBeat = 0;
    musicStep();
    musicId = setInterval(musicStep, 268);
  }

  function stopMusic() {
    if (musicId) {
      clearInterval(musicId);
      musicId = null;
    }
  }

  function cellTaken(x, y) {
    return snake.some((s) => s.x === x && s.y === y);
  }

  function placeFood() {
    let tries = 0;
    do {
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      tries++;
    } while (cellTaken(food.x, food.y) && tries < 500);
  }

  function resetGame() {
    const mx = Math.floor(COLS / 2);
    const my = Math.floor(ROWS / 2);
    snake = [
      { x: mx - 1, y: my },
      { x: mx - 2, y: my },
      { x: mx - 3, y: my },
    ];
    dir = { dx: 1, dy: 0 };
    pendingDir = { dx: 1, dy: 0 };
    score = 0;
    tickMs = 140;
    placeFood();
    scoreEl.textContent = "0";
  }

  function updateHudBest() {
    bestEl.textContent = highScore > 0 ? `Best: ${highScore}` : "Best: —";
  }

  function gameOver() {
    stopMusic();
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove("snake-active");
    if (score > highScore) {
      highScore = score;
      localStorage.setItem(LS_KEY, String(highScore));
    }
    updateHudBest();
    finalEl.textContent = `Punkte: ${score}`;
    overlay.classList.remove("hidden");
    menu.classList.add("hidden");
  }

  function tick() {
    dir = pendingDir;
    const head = snake[0];
    const nx = head.x + dir.dx;
    const ny = head.y + dir.dy;

    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
      playTone(120, 0.2, 0.06);
      gameOver();
      return;
    }

    const eating = nx === food.x && ny === food.y;
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x !== nx || snake[i].y !== ny) continue;
      if (i === snake.length - 1 && !eating) continue;
      playTone(100, 0.22, 0.07);
      gameOver();
      return;
    }

    snake.unshift({ x: nx, y: ny });
    if (eating) {
      score += 1;
      scoreEl.textContent = String(score);
      playTone(440 + Math.min(score, 12) * 30, 0.06, 0.05);
      tickMs = Math.max(72, 140 - Math.floor(score / 4) * 6);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function drawSnake() {
    snake.forEach((seg, i) => {
      const px = seg.x * CELL;
      const py = seg.y * CELL;
      const pad = i === 0 ? 3 : 5;
      const r = i === 0 ? 8 : 6;
      const g = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
      if (i === 0) {
        g.addColorStop(0, "#86efac");
        g.addColorStop(1, "#16a34a");
      } else {
        g.addColorStop(0, "#4ade80");
        g.addColorStop(1, "#15803d");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, r);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        const eye = CELL * 0.12;
        ctx.beginPath();
        ctx.arc(px + CELL * 0.38, py + CELL * 0.38, eye, 0, Math.PI * 2);
        ctx.arc(px + CELL * 0.62, py + CELL * 0.38, eye, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function draw() {
    ctx.fillStyle = "#0c1814";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(34, 197, 94, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    const fx = food.x * CELL;
    const fy = food.y * CELL;
    const grad = ctx.createRadialGradient(
      fx + CELL / 2,
      fy + CELL / 2,
      2,
      fx + CELL / 2,
      fy + CELL / 2,
      CELL * 0.55,
    );
    grad.addColorStop(0, "#fbbf24");
    grad.addColorStop(1, "#b45309");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(fx + 4, fy + 4, CELL - 8, CELL - 8, 6);
    ctx.fill();

    drawSnake();
  }

  function loop(now) {
    if (!running) return;
    if (!lastTick) lastTick = now;
    const elapsed = now - lastTick;
    if (elapsed >= tickMs) {
      lastTick = now - (elapsed % tickMs);
      tick();
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  function start() {
    resetGame();
    running = true;
    lastTick = 0;
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    document.documentElement.classList.add("snake-active");
    const c = ensureAudio();
    const kick = () => running && startMusic();
    if (c && c.state === "suspended") c.resume().then(kick).catch(kick);
    else kick();
    raf = requestAnimationFrame(loop);
  }

  function setMute(on) {
    muted = on;
    localStorage.setItem(LS_MUTE, muted ? "1" : "0");
    btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
    btnMute.textContent = muted ? "🔇" : "🔊";
    btnMute.title = muted ? "Ton an (Musik + Effekte)" : "Ton aus (Musik + Effekte)";
    if (muted) stopMusic();
    else if (running) startMusic();
  }

  btnStart.addEventListener("click", start);
  btnAgain.addEventListener("click", start);

  btnMute.addEventListener("click", () => {
    setMute(!muted);
    ensureAudio();
  });
  setMute(muted);
  updateHudBest();

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "a", "A", "w", "W", "s", "S", "d", "D"].includes(e.key)) {
      e.preventDefault();
    }
    if (!running) return;
    let ndx = pendingDir.dx;
    let ndy = pendingDir.dy;
    if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
      ndx = 0;
      ndy = -1;
    } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
      ndx = 0;
      ndy = 1;
    } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      ndx = -1;
      ndy = 0;
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      ndx = 1;
      ndy = 0;
    } else {
      return;
    }
    if (ndx === -dir.dx && ndy === -dir.dy) return;
    pendingDir = { dx: ndx, dy: ndy };
  });

  let touchStart = null;
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (!running) return;
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );
  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!running || !touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      let ndx = pendingDir.dx;
      let ndy = pendingDir.dy;
      if (Math.abs(dx) > Math.abs(dy)) {
        ndx = dx > 0 ? 1 : -1;
        ndy = 0;
      } else {
        ndx = 0;
        ndy = dy > 0 ? 1 : -1;
      }
      if (ndx === -dir.dx && ndy === -dir.dy) return;
      pendingDir = { dx: ndx, dy: ndy };
    },
    { passive: true },
  );

  draw();
})();
