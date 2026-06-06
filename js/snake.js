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
  const score1El = document.getElementById("score1");
  const score2El = document.getElementById("score2");
  const bestEl = document.getElementById("best");
  const finalEl = document.getElementById("final-score");
  const endTitle = document.getElementById("end-title");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnMute = document.getElementById("btn-mute");

  const LS_KEY = "krone-snake-2p-best";
  const LS_MUTE = "krone-snake-muted";

  let audioCtx = null;
  let muted = localStorage.getItem(LS_MUTE) === "1";

  let running = false;
  let raf = 0;
  let lastTick = 0;
  let tickMs = 140;

  /** @type {{ x: number, y: number }[]} */
  let snake1 = [];
  /** @type {{ x: number, y: number }[]} */
  let snake2 = [];
  let dir1 = { dx: 1, dy: 0 };
  let dir2 = { dx: -1, dy: 0 };
  let pending1 = { dx: 1, dy: 0 };
  let pending2 = { dx: -1, dy: 0 };
  let food = { x: 15, y: 7 };
  let score1 = 0;
  let score2 = 0;
  let highBestTotal = Number(localStorage.getItem(LS_KEY)) || 0;
  let alive1 = true;
  let alive2 = true;

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  const BG_NOTES = [329.63, 293.66, 349.23, 392.0, 440.0, 392.0, 329.63, 293.66];
  let musicBeat = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let musicId = null;

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

  function cellOccupied(x, y) {
    return (
      snake1.some((s) => s.x === x && s.y === y) || snake2.some((s) => s.x === x && s.y === y)
    );
  }

  function placeFood() {
    let tries = 0;
    do {
      food = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
      tries++;
    } while (cellOccupied(food.x, food.y) && tries < 800);
  }

  /**
   * @param {{ x: number, y: number }} nh
   * @param {{ x: number, y: number }[]} snake
   * @param {boolean} eating
   */
  function hitsSelf(nh, snake, eating) {
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x !== nh.x || snake[i].y !== nh.y) continue;
      if (i === snake.length - 1 && !eating) continue;
      return true;
    }
    return false;
  }

  /**
   * Körpertreffer beim Gegner: „von hinten“ fressen nur ab Segment 2+ (bzw. bei Länge 2 nur Schwanz).
   * Segment 1 bei Länge > 2 = Hals von vorn → Crash für den Angreifer.
   * @returns {"none"|"eat"|"crash"}
   */
  function classifyHitOpponent(nh, other, otherEating) {
    for (let i = 1; i < other.length; i++) {
      if (other[i].x !== nh.x || other[i].y !== nh.y) continue;
      const tailIdx = other.length - 1;
      if (i === tailIdx && !otherEating) return "none";
      if (other.length > 2 && i === 1) return "crash";
      return "eat";
    }
    return "none";
  }

  function resetGame() {
    const my = Math.floor(ROWS / 2);
    snake1 = [
      { x: 6, y: my },
      { x: 5, y: my },
      { x: 4, y: my },
    ];
    snake2 = [
      { x: COLS - 7, y: my },
      { x: COLS - 6, y: my },
      { x: COLS - 5, y: my },
    ];
    dir1 = { dx: 1, dy: 0 };
    dir2 = { dx: -1, dy: 0 };
    pending1 = { dx: 1, dy: 0 };
    pending2 = { dx: -1, dy: 0 };
    score1 = 0;
    score2 = 0;
    tickMs = 140;
    placeFood();
    score1El.textContent = "0";
    score2El.textContent = "0";
    alive1 = true;
    alive2 = true;
  }

  function updateHudBest() {
    bestEl.textContent = highBestTotal > 0 ? `Best (Äpfel): ${highBestTotal}` : "Best: —";
  }

  function endGameByScore() {
    stopMusic();
    running = false;
    cancelAnimationFrame(raf);
    document.documentElement.classList.remove("snake-active");
    const total = score1 + score2;
    if (total > highBestTotal) {
      highBestTotal = total;
      localStorage.setItem(LS_KEY, String(highBestTotal));
    }
    updateHudBest();
    if (score1 > score2) {
      endTitle.textContent = "Spieler 1 gewinnt";
      finalEl.textContent = `Mehr Punkte: ${score1} : ${score2} (Grün vs Blau)`;
      playTone(523, 0.12, 0.06);
    } else if (score2 > score1) {
      endTitle.textContent = "Spieler 2 gewinnt";
      finalEl.textContent = `Mehr Punkte: ${score2} : ${score1} (Blau vs Grün)`;
      playTone(659, 0.12, 0.06);
    } else {
      endTitle.textContent = "Unentschieden";
      finalEl.textContent = `Gleichstand: je ${score1} Punkte`;
      playTone(150, 0.18, 0.05);
    }
    overlay.classList.remove("hidden");
    menu.classList.add("hidden");
  }

  function tickSolo1() {
    dir1 = pending1;
    const h1 = snake1[0];
    const n1 = { x: h1.x + dir1.dx, y: h1.y + dir1.dy };
    const eat1 = n1.x === food.x && n1.y === food.y;
    const dead1 =
      n1.x < 0 || n1.x >= COLS || n1.y < 0 || n1.y >= ROWS || hitsSelf(n1, snake1, eat1);
    if (dead1) {
      playTone(130, 0.2, 0.06);
      alive1 = false;
      snake1 = [];
      endGameByScore();
      return;
    }
    snake1.unshift(n1);
    if (!eat1) snake1.pop();
    else {
      score1 += 1;
      score1El.textContent = String(score1);
      playTone(440 + Math.min(score1, 12) * 25, 0.06, 0.05);
      placeFood();
    }
    tickMs = Math.max(72, 140 - Math.floor(score1 / 4) * 6);
  }

  function tickSolo2() {
    dir2 = pending2;
    const h2 = snake2[0];
    const n2 = { x: h2.x + dir2.dx, y: h2.y + dir2.dy };
    const eat2 = n2.x === food.x && n2.y === food.y;
    const dead2 =
      n2.x < 0 || n2.x >= COLS || n2.y < 0 || n2.y >= ROWS || hitsSelf(n2, snake2, eat2);
    if (dead2) {
      playTone(130, 0.2, 0.06);
      alive2 = false;
      snake2 = [];
      endGameByScore();
      return;
    }
    snake2.unshift(n2);
    if (!eat2) snake2.pop();
    else {
      score2 += 1;
      score2El.textContent = String(score2);
      playTone(520 + Math.min(score2, 12) * 25, 0.06, 0.05);
      placeFood();
    }
    tickMs = Math.max(72, 140 - Math.floor(score2 / 4) * 6);
  }

  function tick() {
    if (alive1 && !alive2 && snake1.length) {
      tickSolo1();
      return;
    }
    if (!alive1 && alive2 && snake2.length) {
      tickSolo2();
      return;
    }
    if (!alive1 && !alive2) {
      endGameByScore();
      return;
    }

    dir1 = pending1;
    dir2 = pending2;

    const h1 = snake1[0];
    const h2 = snake2[0];
    const n1 = { x: h1.x + dir1.dx, y: h1.y + dir1.dy };
    const n2 = { x: h2.x + dir2.dx, y: h2.y + dir2.dy };

    /* Kuss: gleiche Zelle oder Köpfe tauschen die Plätze (Kreuzung) */
    if (n1.x === n2.x && n1.y === n2.y) {
      playTone(110, 0.22, 0.07);
      alive1 = false;
      alive2 = false;
      snake1 = [];
      snake2 = [];
      endGameByScore();
      return;
    }
    const headsKissCross =
      n1.x === h2.x &&
      n1.y === h2.y &&
      n2.x === h1.x &&
      n2.y === h1.y &&
      (n1.x !== n2.x || n1.y !== n2.y);
    if (headsKissCross) {
      playTone(110, 0.22, 0.07);
      alive1 = false;
      alive2 = false;
      snake1 = [];
      snake2 = [];
      endGameByScore();
      return;
    }

    const eat1 = n1.x === food.x && n1.y === food.y;
    const eat2 = n2.x === food.x && n2.y === food.y;

    const hitP1onP2 = alive2 && snake2.length > 0 ? classifyHitOpponent(n1, snake2, eat2) : "none";
    const hitP2onP1 = alive1 && snake1.length > 0 ? classifyHitOpponent(n2, snake1, eat1) : "none";

    const p1EatsP2Body = hitP1onP2 === "eat";
    const p2EatsP1Body = hitP2onP1 === "eat";

    if (p1EatsP2Body && p2EatsP1Body) {
      playTone(140, 0.2, 0.06);
      const len1 = snake1.length;
      const len2 = snake2.length;
      score1 += len2;
      score2 += len1;
      score1El.textContent = String(score1);
      score2El.textContent = String(score2);
      alive1 = false;
      alive2 = false;
      snake1 = [];
      snake2 = [];
      endGameByScore();
      return;
    }

    if (p1EatsP2Body) {
      const bonus = snake2.length;
      score1 += bonus;
      score1El.textContent = String(score1);
      playTone(340, 0.12, 0.065);
      snake2 = [];
      alive2 = false;
      snake1.unshift(n1);
      if (eat1) {
        score1 += 1;
        score1El.textContent = String(score1);
        playTone(440 + Math.min(score1, 12) * 25, 0.06, 0.05);
        placeFood();
      } else {
        snake1.pop();
      }
      tickMs = Math.max(72, 140 - Math.floor(Math.max(score1, score2) / 4) * 6);
      return;
    }

    if (p2EatsP1Body) {
      const bonus = snake1.length;
      score2 += bonus;
      score2El.textContent = String(score2);
      playTone(340, 0.12, 0.065);
      snake1 = [];
      alive1 = false;
      snake2.unshift(n2);
      if (eat2) {
        score2 += 1;
        score2El.textContent = String(score2);
        playTone(520 + Math.min(score2, 12) * 25, 0.06, 0.05);
        placeFood();
      } else {
        snake2.pop();
      }
      tickMs = Math.max(72, 140 - Math.floor(Math.max(score1, score2) / 4) * 6);
      return;
    }

    let dead1 =
      n1.x < 0 ||
      n1.x >= COLS ||
      n1.y < 0 ||
      n1.y >= ROWS ||
      hitsSelf(n1, snake1, eat1) ||
      hitP1onP2 === "crash";
    let dead2 =
      n2.x < 0 ||
      n2.x >= COLS ||
      n2.y < 0 ||
      n2.y >= ROWS ||
      hitsSelf(n2, snake2, eat2) ||
      hitP2onP1 === "crash";

    if (dead1 && dead2) {
      playTone(120, 0.2, 0.06);
      alive1 = false;
      alive2 = false;
      snake1 = [];
      snake2 = [];
      endGameByScore();
      return;
    }
    if (dead1) {
      playTone(130, 0.2, 0.06);
      alive1 = false;
      snake1 = [];
      return;
    }
    if (dead2) {
      playTone(130, 0.2, 0.06);
      alive2 = false;
      snake2 = [];
      return;
    }

    snake1.unshift(n1);
    if (!eat1) snake1.pop();
    else {
      score1 += 1;
      score1El.textContent = String(score1);
      playTone(440 + Math.min(score1, 12) * 25, 0.06, 0.05);
    }

    snake2.unshift(n2);
    if (!eat2) snake2.pop();
    else {
      score2 += 1;
      score2El.textContent = String(score2);
      playTone(520 + Math.min(score2, 12) * 25, 0.06, 0.05);
    }

    if (eat1 || eat2) placeFood();

    tickMs = Math.max(72, 140 - Math.floor(Math.max(score1, score2) / 4) * 6);
  }

  function drawSnake(snake, isP1) {
    snake.forEach((seg, i) => {
      const px = seg.x * CELL;
      const py = seg.y * CELL;
      const pad = i === 0 ? 3 : 5;
      const r = i === 0 ? 8 : 6;
      const g = ctx.createLinearGradient(px, py, px + CELL, py + CELL);
      if (isP1) {
        if (i === 0) {
          g.addColorStop(0, "#86efac");
          g.addColorStop(1, "#16a34a");
        } else {
          g.addColorStop(0, "#4ade80");
          g.addColorStop(1, "#15803d");
        }
      } else if (i === 0) {
        g.addColorStop(0, "#93c5fd");
        g.addColorStop(1, "#2563eb");
      } else {
        g.addColorStop(0, "#60a5fa");
        g.addColorStop(1, "#1d4ed8");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2, r);
      ctx.fill();
      if (i === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        const eye = CELL * 0.11;
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

    const midX = (W / 2) | 0;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, H);
    ctx.stroke();
    ctx.setLineDash([]);

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

    drawSnake(snake1, true);
    drawSnake(snake2, false);
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
    endTitle.textContent = "Game Over";
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

  function tryDir(ndx, ndy, curDir, pending) {
    if (ndx === -curDir.dx && ndy === -curDir.dy) return pending;
    return { dx: ndx, dy: ndy };
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
    if (!running) return;

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "a", "A", "w", "W", "s", "S", "d", "D"].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      let ndx = pending2.dx;
      let ndy = pending2.dy;
      if (e.key === "ArrowUp") {
        ndx = 0;
        ndy = -1;
      } else if (e.key === "ArrowDown") {
        ndx = 0;
        ndy = 1;
      } else if (e.key === "ArrowLeft") {
        ndx = -1;
        ndy = 0;
      } else {
        ndx = 1;
        ndy = 0;
      }
      pending2 = tryDir(ndx, ndy, dir2, pending2);
      return;
    }

    if (e.key === "w" || e.key === "W" || e.key === "s" || e.key === "S" || e.key === "a" || e.key === "A" || e.key === "d" || e.key === "D") {
      let ndx = pending1.dx;
      let ndy = pending1.dy;
      if (e.key === "w" || e.key === "W") {
        ndx = 0;
        ndy = -1;
      } else if (e.key === "s" || e.key === "S") {
        ndx = 0;
        ndy = 1;
      } else if (e.key === "a" || e.key === "A") {
        ndx = -1;
        ndy = 0;
      } else {
        ndx = 1;
        ndy = 0;
      }
      pending1 = tryDir(ndx, ndy, dir1, pending1);
    }
  });

  let touchStart = null;
  /** @type {1 | 2 | null} */
  let touchPlayer = null;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (!running) return;
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const rx = t.clientX - rect.left;
      touchPlayer = rx < rect.width / 2 ? 1 : 2;
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true },
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      if (!running || !touchStart || !touchPlayer) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      const pl = touchPlayer;
      touchPlayer = null;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
      let ndx = 0;
      let ndy = 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        ndx = dx > 0 ? 1 : -1;
      } else {
        ndy = dy > 0 ? 1 : -1;
      }
      if (pl === 1) {
        pending1 = tryDir(ndx, ndy, dir1, pending1);
      } else {
        pending2 = tryDir(ndx, ndy, dir2, pending2);
      }
    },
    { passive: true },
  );

  draw();
})();
