(() => {
  const W = 720;
  const H = 480;
  const PLAYER_R = 11;
  const ENEMY_R = 8;
  const ECHO_R = 48;
  const MAX_ECHOES = 3;
  const ECHO_LIFE_MS = 3200;
  const PLACE_COOLDOWN_MS = 280;

  const canvas = document.getElementById("feld");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elScore = document.getElementById("score");
  const elEcho = document.getElementById("echo-count");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const overMsg = document.getElementById("over-msg");

  let state = "menu";
  let lastTs = 0;
  let score = 0;
  let px = W / 2;
  let py = H / 2;
  let tx = px;
  let ty = py;
  let spawnAcc = 0;
  let placeCd = 0;
  let shake = 0;

  const echoes = [];
  const enemies = [];
  const sparks = [];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function dist(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
  }

  function spawnEnemy() {
    const side = (Math.random() * 4) | 0;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = -ENEMY_R;
      y = rand(0, H);
    } else if (side === 1) {
      x = W + ENEMY_R;
      y = rand(0, H);
    } else if (side === 2) {
      x = rand(0, W);
      y = -ENEMY_R;
    } else {
      x = rand(0, W);
      y = H + ENEMY_R;
    }
    const slow = 18 + score * 0.08;
    const d = dist(x, y, px, py) || 1;
    enemies.push({
      x,
      y,
      vx: ((px - x) / d) * slow * 0.012,
      vy: ((py - y) / d) * slow * 0.012,
      hue: 320 + Math.random() * 45,
    });
  }

  function burst(x, y, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(1.5, 4.5);
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        col,
      });
    }
  }

  function tryPlaceEcho() {
    if (state !== "play" || placeCd > 0) return;
    if (echoes.length >= MAX_ECHOES) return;
    placeCd = PLACE_COOLDOWN_MS;
    echoes.push({
      x: px,
      y: py,
      born: performance.now(),
      pulse: Math.random() * Math.PI * 2,
    });
    burst(px, py, "rgba(0,245,212,0.9)", 8);
  }

  function removeOldestEcho() {
    if (echoes.length === 0) return;
    echoes.shift();
  }

  function updateHud() {
    elScore.textContent = String(score);
    elEcho.textContent = `${echoes.length}/${MAX_ECHOES}`;
  }

  function resetGame() {
    score = 0;
    px = W / 2;
    py = H / 2;
    tx = px;
    ty = py;
    spawnAcc = 0;
    placeCd = 0;
    shake = 0;
    echoes.length = 0;
    enemies.length = 0;
    sparks.length = 0;
    updateHud();
  }

  function gameOver() {
    state = "over";
    overMsg.textContent = `Punkte ${score} — Echo-Ringe: ${MAX_ECHOES} max, Zeit läuft ab`;
    overlay.classList.remove("hidden");
    menu.classList.add("hidden");
  }

  function update(dt) {
    const follow = 0.08 * (dt / 16);
    px += (tx - px) * follow;
    py += (ty - py) * follow;

    if (placeCd > 0) placeCd -= dt;
    if (shake > 0) shake *= 0.88;

    const now = performance.now();
    for (let i = echoes.length - 1; i >= 0; i--) {
      if (now - echoes[i].born > ECHO_LIFE_MS) echoes.splice(i, 1);
      else echoes[i].pulse += dt * 0.004;
    }

    const spawnEvery = Math.max(340, 820 - score * 0.55);
    spawnAcc += dt;
    while (spawnAcc >= spawnEvery && enemies.length < 48) {
      spawnAcc -= spawnEvery;
      spawnEnemy();
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      let killed = false;
      for (const echo of echoes) {
        if (dist(e.x, e.y, echo.x, echo.y) < ECHO_R + ENEMY_R) {
          burst(e.x, e.y, `hsla(${e.hue},90%,60%,1)`, 14);
          score += 15;
          shake = 5;
          killed = true;
          break;
        }
      }
      if (killed) {
        enemies.splice(i, 1);
        continue;
      }

      const toward = dist(e.x, e.y, px, py) || 1;
      e.vx += ((px - e.x) / toward) * 0.018 * dt;
      e.vy += ((py - e.y) / toward) * 0.018 * dt;
      const sp = Math.hypot(e.vx, e.vy);
      const cap = 1.85 + score * 0.002;
      if (sp > cap) {
        e.vx = (e.vx / sp) * cap;
        e.vy = (e.vy / sp) * cap;
      }

      if (dist(e.x, e.y, px, py) < PLAYER_R + ENEMY_R) {
        gameOver();
        return;
      }
    }

    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx * (dt / 16);
      s.y += s.vy * (dt / 16);
      s.life -= dt * 0.004;
      if (s.life <= 0) sparks.splice(i, 1);
    }

    updateHud();
  }

  function drawBg(sx, sy) {
    const g = ctx.createRadialGradient(sx + W * 0.35, sy + H * 0.25, 0, sx + W / 2, sy + H / 2, H * 0.75);
    g.addColorStop(0, "#12152d");
    g.addColorStop(0.55, "#080a18");
    g.addColorStop(1, "#020208");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, W, H);

    ctx.strokeStyle = "rgba(157, 78, 221, 0.06)";
    const step = 56;
    const off = (performance.now() * 0.015) % step;
    for (let x = -step; x < W + step; x += step) {
      ctx.beginPath();
      ctx.moveTo(sx + x + off, sy);
      ctx.lineTo(sx + x + off, sy + H);
      ctx.stroke();
    }
  }

  function draw(sx, sy) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBg(sx, sy);

    for (const echo of echoes) {
      const age = (performance.now() - echo.born) / ECHO_LIFE_MS;
      const alpha = 0.35 + (1 - age) * 0.45;
      const pr = 1 + 0.06 * Math.sin(echo.pulse);
      ctx.strokeStyle = `rgba(0, 245, 212, ${alpha * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx + echo.x, sy + echo.y, ECHO_R * pr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(157, 78, 221, ${alpha * 0.25})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(sx + echo.x, sy + echo.y, ECHO_R * pr * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const e of enemies) {
      const rg = ctx.createRadialGradient(sx + e.x, sy + e.y, 0, sx + e.x, sy + e.y, ENEMY_R * 3);
      rg.addColorStop(0, `hsla(${e.hue}, 95%, 58%, 0.95)`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx + e.x, sy + e.y, ENEMY_R * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff0f8";
      ctx.beginPath();
      ctx.arc(sx + e.x, sy + e.y, ENEMY_R * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const glow = ctx.createRadialGradient(sx + px, sy + py, 0, sx + px, sy + py, 36);
    glow.addColorStop(0, "rgba(255,255,255,0.45)");
    glow.addColorStop(0.4, "rgba(0,245,212,0.18)");
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sx + px, sy + py, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0ffff";
    ctx.beginPath();
    ctx.arc(sx + px, sy + py, PLAYER_R * 0.55, 0, Math.PI * 2);
    ctx.fill();

    for (const s of sparks) {
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.col;
      ctx.beginPath();
      ctx.arc(sx + s.x, sy + s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(0, 245, 212, 0.22)";
    ctx.strokeRect(sx + 1, sy + 1, W - 2, H - 2);
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(45, ts - lastTs);
    lastTs = ts;

    if (state === "play") update(dt);

    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    draw(sx, sy);
    requestAnimationFrame(loop);
  }

  function screenToGame(cx, cy) {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width;
    const sy = H / r.height;
    return {
      x: (cx - r.left) * sx,
      y: (cy - r.top) * sy,
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const p = screenToGame(e.clientX, e.clientY);
    tx = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x));
    ty = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y));
  });

  canvas.addEventListener("mousedown", (e) => {
    if (e.button === 2) {
      e.preventDefault();
      if (state === "play") removeOldestEcho();
      return;
    }
    if (e.button === 0 && state === "play") tryPlaceEcho();
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches[0]) {
        const p = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        tx = Math.max(PLAYER_R, Math.min(W - PLAYER_R, p.x));
        ty = Math.max(PLAYER_R, Math.min(H - PLAYER_R, p.y));
        e.preventDefault();
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches[0]) {
        const p = screenToGame(e.touches[0].clientX, e.touches[0].clientY);
        tx = p.x;
        ty = p.y;
        if (state === "play") tryPlaceEcho();
      }
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === "e" || e.key === "E") {
      if (state === "play") {
        e.preventDefault();
        tryPlaceEcho();
      }
    }
    if (e.key === "q" || e.key === "Q") {
      if (state === "play") {
        e.preventDefault();
        removeOldestEcho();
      }
    }
  });

  btnStart.addEventListener("click", () => {
    resetGame();
    state = "play";
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    lastTs = 0;
  });

  btnAgain.addEventListener("click", () => {
    resetGame();
    state = "play";
    overlay.classList.add("hidden");
    lastTs = 0;
  });

  draw(0, 0);
  requestAnimationFrame(loop);
})();
