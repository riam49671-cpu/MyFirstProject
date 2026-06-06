(() => {
  const W = 720;
  const H = 480;
  const BASKET_W = 88;
  const BASKET_H = 22;
  const BASKET_Y = H - 36;

  const canvas = document.getElementById("spielfeld");
  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = W;
  canvas.height = H;

  const elScore = document.getElementById("score");
  const elBest = document.getElementById("best");
  const elLives = document.getElementById("lives");
  const elCombo = document.getElementById("combo");
  const layerMenu = document.getElementById("layer-menu");
  const layerOver = document.getElementById("layer-over");
  const elFinal = document.getElementById("final-score");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");

  const BEST_KEY = "kometen-korb-best";

  let state = "menu";
  let basketX = W / 2;
  let basketTarget = W / 2;
  let score = 0;
  let lives = 3;
  let combo = 0;
  let lastCatchAt = 0;
  let entities = [];
  let particles = [];
  let spawnAcc = 0;
  let spawnEvery = 950;
  let bgStars = [];
  let lastTs = 0;

  const keys = {};

  function loadBest() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(n) {
    try {
      localStorage.setItem(BEST_KEY, String(n));
    } catch (_) {}
  }

  function initBgStars() {
    bgStars = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H * 0.55,
      r: 0.4 + Math.random() * 1.2,
      tw: Math.random() * Math.PI * 2,
    }));
  }

  function resetGame() {
    score = 0;
    lives = 3;
    combo = 0;
    lastCatchAt = 0;
    entities = [];
    particles = [];
    spawnAcc = 0;
    spawnEvery = 950;
    basketX = W / 2;
    basketTarget = W / 2;
    updateHud();
  }

  function updateHud() {
    elScore.textContent = String(score);
    elLives.textContent = lives > 0 ? "❤️".repeat(lives) : "—";
    elCombo.textContent = combo > 1 ? `×${combo} Combo` : "—";
    const b = loadBest();
    elBest.textContent = String(b);
  }

  function spawnOne() {
    const rockChance = Math.min(0.42, 0.18 + score * 0.0009);
    const isRock = Math.random() < rockChance;
    const r = isRock ? 10 + Math.random() * 6 : 7 + Math.random() * 5;
    entities.push({
      kind: isRock ? "rock" : "star",
      x: r + Math.random() * (W - 2 * r),
      y: -r - 4,
      vy: isRock ? 2.2 + Math.random() * 1.8 : 1.6 + Math.random() * 1.4,
      r,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
    });
  }

  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * (1.5 + Math.random() * 3),
        vy: Math.sin(a) * (1.5 + Math.random() * 3),
        life: 1,
        color,
      });
    }
  }

  function loop(ts) {
    const t = ts ?? 0;
    const dt = lastTs ? Math.min(40, t - lastTs) : 16;
    lastTs = t;

    if (state === "play") {
      basketX += (basketTarget - basketX) * 0.22;

      spawnAcc += dt;
      if (spawnAcc >= spawnEvery) {
        spawnAcc = 0;
        spawnOne();
        spawnEvery = Math.max(280, 950 - Math.min(600, score * 1.1));
      }

      for (let i = entities.length - 1; i >= 0; i--) {
        const e = entities[i];
        e.y += e.vy * (1 + Math.min(0.8, score * 0.0012));
        e.rot += e.vr;

        const bx = basketX;
        const by = BASKET_Y;
        const hitY = e.y >= by - BASKET_H - e.r * 0.3 && e.y <= by + e.r;
        const hitX = Math.abs(e.x - bx) < BASKET_W / 2 + e.r * 0.7;

        if (hitX && hitY) {
          if (e.kind === "star") {
            const now = performance.now();
            if (now - lastCatchAt < 2200) combo += 1;
            else combo = 1;
            lastCatchAt = now;
            const pts = 10 * combo;
            score += pts;
            burst(e.x, e.y, "#ffd84a", 16);
            saveBest(Math.max(loadBest(), score));
          } else {
            combo = 0;
            lives -= 1;
            burst(e.x, e.y, "#ff6666", 14);
            lastCatchAt = 0;
          }
          entities.splice(i, 1);
          updateHud();
          if (lives <= 0) endGame();
          continue;
        }

        if (e.y > H + e.r + 20) {
          if (e.kind === "star") {
            combo = 0;
            lastCatchAt = 0;
            updateHud();
          }
          entities.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.045;
        if (p.life <= 0) particles.splice(i, 1);
      }
    }

    draw(t);
    requestAnimationFrame(loop);
  }

  function draw(ts) {
    const t = ts ?? 0;
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, W, H);

    const tw = t * 0.002;
    for (const s of bgStars) {
      const a = 0.35 + Math.sin(tw + s.tw) * 0.35;
      ctx.fillStyle = `rgba(200, 220, 255, ${a * 0.7})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    const grd = ctx.createLinearGradient(0, H * 0.35, 0, H);
    grd.addColorStop(0, "rgba(30, 50, 90, 0)");
    grd.addColorStop(1, "rgba(20, 35, 70, 0.35)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    for (const e of entities) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rot);
      if (e.kind === "star") {
        ctx.fillStyle = "#fff6c8";
        ctx.shadowColor = "#ffd84a";
        ctx.shadowBlur = 12;
        for (let k = 0; k < 4; k++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, -e.r);
          ctx.lineTo(e.r * 0.35, 0);
          ctx.lineTo(0, e.r * 0.25);
          ctx.lineTo(-e.r * 0.35, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = "#6a7088";
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3d4258";
        ctx.beginPath();
        ctx.arc(-e.r * 0.25, -e.r * 0.15, e.r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    const bx = basketX;
    ctx.fillStyle = "rgba(40, 55, 95, 0.95)";
    ctx.fillRect(bx - BASKET_W / 2, BASKET_Y - BASKET_H / 2, BASKET_W, BASKET_H);
    ctx.strokeStyle = "rgba(108, 240, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (state !== "play") {
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function startGame() {
    resetGame();
    state = "play";
    layerMenu.classList.add("hidden");
    layerOver.classList.add("hidden");
    canvas.focus();
  }

  function endGame() {
    if (state !== "play") return;
    state = "over";
    entities = [];
    particles = [];
    elFinal.textContent = String(score);
    layerOver.classList.remove("hidden");
    saveBest(Math.max(loadBest(), score));
    updateHud();
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", startGame);

  window.addEventListener("keydown", (e) => {
    keys[e.code] = true;
    if (e.code === "Space" && (state === "menu" || state === "over")) {
      e.preventDefault();
      startGame();
    }
    if (state === "play") {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        basketTarget = Math.max(BASKET_W / 2 + 8, basketTarget - 38);
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        basketTarget = Math.min(W - BASKET_W / 2 - 8, basketTarget + 38);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.code] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    if (state !== "play") return;
    const r = canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    basketTarget = Math.max(BASKET_W / 2 + 4, Math.min(W - BASKET_W / 2 - 4, sx));
  });

  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (state !== "play") return;
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const sx = ((t.clientX - r.left) / r.width) * W;
      basketTarget = Math.max(BASKET_W / 2 + 4, Math.min(W - BASKET_W / 2 - 4, sx));
    },
    { passive: false }
  );

  initBgStars();
  elBest.textContent = String(loadBest());
  updateHud();
  requestAnimationFrame(loop);
})();
