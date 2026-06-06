(() => {
  const W = 720;
  const H = 480;
  const CX = W / 2;
  const CY = H / 2;
  const PLAYER_CORE_R = 12;
  const ENEMY_R = 7;
  const PULSE_MAX_R = 155;
  const PULSE_EXPAND_SPEED = 380;
  const COOLDOWN_MS = 420;

  const canvas = document.getElementById("feld");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elScore = document.getElementById("score");
  const elWave = document.getElementById("wave");
  const elCombo = document.getElementById("combo");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const overMsg = document.getElementById("over-msg");

  let state = "menu";
  let lastTs = 0;
  let score = 0;
  let wave = 1;
  let combo = 0;
  let comboTimer = 0;
  let spawnAcc = 0;
  let cooldownLeft = 0;
  let pulseR = 0;
  let pulseActive = false;
  let shake = 0;

  const enemies = [];
  const particles = [];

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
    const spd = 22 + wave * 3.2 + Math.random() * 18;
    const d = dist(x, y, CX, CY) || 1;
    enemies.push({
      x,
      y,
      vx: ((CX - x) / d) * spd * 0.011,
      vy: ((CY - y) / d) * spd * 0.011,
      hue: 280 + Math.random() * 60,
    });
  }

  function burst(px, py, col, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(1.5, 4);
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

  function tryPulse() {
    if (cooldownLeft > 0 || pulseActive || state !== "play") return;
    pulseActive = true;
    pulseR = 0;
    cooldownLeft = COOLDOWN_MS;
  }

  function updateHud() {
    elScore.textContent = String(score);
    elWave.textContent = String(wave);
    elCombo.textContent = combo > 1 ? `×${combo}` : "—";
  }

  function resetGame() {
    score = 0;
    wave = 1;
    combo = 0;
    comboTimer = 0;
    spawnAcc = 0;
    cooldownLeft = 0;
    pulseR = 0;
    pulseActive = false;
    shake = 0;
    enemies.length = 0;
    particles.length = 0;
    updateHud();
  }

  function gameOver() {
    state = "over";
    overMsg.textContent = `Punkte ${score} · Welle ${wave}`;
    overlay.classList.remove("hidden");
    menu.classList.add("hidden");
  }

  function update(dt) {
    if (cooldownLeft > 0) cooldownLeft -= dt;
    if (shake > 0) shake *= 0.9;

    if (pulseActive) {
      pulseR += (PULSE_EXPAND_SPEED * dt) / 1000;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const d = dist(e.x, e.y, CX, CY);
        if (d < pulseR + ENEMY_R) {
          burst(e.x, e.y, `hsla(${e.hue},90%,65%,1)`, 10);
          enemies.splice(i, 1);
          score += 10 + combo * 2;
          combo = Math.min(combo + 1, 12);
          comboTimer = 850;
          shake = 4;
        }
      }
      if (pulseR >= PULSE_MAX_R) {
        pulseActive = false;
        pulseR = 0;
      }
    }

    if (comboTimer > 0) {
      comboTimer -= dt;
      if (comboTimer <= 0) {
        combo = 0;
        updateHud();
      }
    }

    const spawnEvery = Math.max(280, 950 - wave * 38 - score * 0.35);
    spawnAcc += dt;
    while (spawnAcc >= spawnEvery && enemies.length < 55 + wave * 3) {
      spawnAcc -= spawnEvery;
      spawnEnemy();
    }

    while (score >= wave * 120) wave += 1;

    for (const e of enemies) {
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (dist(e.x, e.y, CX, CY) < PLAYER_CORE_R + ENEMY_R) {
        gameOver();
        return;
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.life -= dt * 0.004;
      if (p.life <= 0) particles.splice(i, 1);
    }

    updateHud();
  }

  function drawBg(sx, sy) {
    const g = ctx.createRadialGradient(sx + CX, sy + CY, 0, sx + CX, sy + CY, H * 0.7);
    g.addColorStop(0, "#0a1028");
    g.addColorStop(0.55, "#060814");
    g.addColorStop(1, "#020208");
    ctx.fillStyle = g;
    ctx.fillRect(sx, sy, W, H);

    ctx.strokeStyle = "rgba(0, 232, 255, 0.04)";
    const step = 40;
    const off = (performance.now() * 0.02) % step;
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

    for (const e of enemies) {
      const rg = ctx.createRadialGradient(sx + e.x, sy + e.y, 0, sx + e.x, sy + e.y, ENEMY_R * 2.5);
      rg.addColorStop(0, `hsla(${e.hue}, 85%, 58%, 0.95)`);
      rg.addColorStop(1, "transparent");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx + e.x, sy + e.y, ENEMY_R * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `hsla(${e.hue}, 90%, 70%, 1)`;
      ctx.beginPath();
      ctx.arc(sx + e.x, sy + e.y, ENEMY_R * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    if (pulseActive && pulseR > 0) {
      ctx.strokeStyle = `rgba(0, 232, 255, ${0.35 + (1 - pulseR / PULSE_MAX_R) * 0.45})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx + CX, sy + CY, pulseR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(180, 140, 255, ${0.15})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(sx + CX, sy + CY, pulseR * 0.92, 0, Math.PI * 2);
      ctx.stroke();
    }

    const pr = ctx.createRadialGradient(sx + CX, sy + CY, 0, sx + CX, sy + CY, 48);
    pr.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    pr.addColorStop(0.35, "rgba(0, 232, 255, 0.2)");
    pr.addColorStop(1, "transparent");
    ctx.fillStyle = pr;
    ctx.beginPath();
    ctx.arc(sx + CX, sy + CY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8ffff";
    ctx.beginPath();
    ctx.arc(sx + CX, sy + CY, PLAYER_CORE_R * 0.55, 0, Math.PI * 2);
    ctx.fill();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(sx + p.x, sy + p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(0, 232, 255, 0.25)";
    ctx.strokeRect(sx + 1, sy + 1, W - 2, H - 2);

    if (cooldownLeft > 0 && state === "play") {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "600 11px system-ui,sans-serif";
      ctx.textAlign = "center";
      const cd = (cooldownLeft / COOLDOWN_MS) * 100;
      ctx.fillText(cd > 15 ? `Puls ${Math.ceil(cd / 20)}` : "bereit", sx + CX, sy + CY + 42);
    }
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(40, ts - lastTs);
    lastTs = ts;

    if (state === "play") update(dt);

    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    draw(sx, sy);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("mousedown", () => {
    if (state === "play") tryPulse();
  });
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (state === "play") {
        tryPulse();
        e.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      if (state === "play") {
        e.preventDefault();
        tryPulse();
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
