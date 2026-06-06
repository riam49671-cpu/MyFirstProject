(() => {
  /** Eigenes Mini-Spiel – angelehnt an Offline-Laufspiele, keine kopierten Grafiken */
  const W = 900;
  const H = 220;
  const GROUND_Y = H - 44;
  const GRAV = 3200;
  const JUMP_V = -720;
  const PLAYER_W = 44;
  const PLAYER_H = 48;
  const HIT_INSET = 6;
  const BASE_SPEED = 6.2;
  const MAX_SPEED = 16;
  const OB_MIN = 800;
  const OB_MAX = 1600;
  /** 0 = Boden (Kaktus), 1 = Vogel */
  const KIND_GROUND = 0;
  const KIND_BIRD = 1;
  const BIRD_AFTER = 320;
  /** Ein voller Tag↔Nacht-Zyklus in „Punkte“-Distanz (etwas schneller = Wechsel spürbar) */
  const DAYNIGHT_SCALE = 920;
  const LS_BEST = "krone-offline-dino-best";
  const LS_MUTE = "krone-offline-dino-muted";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const elScore = document.getElementById("score");
  const elBest = document.getElementById("best");
  const elHi = document.getElementById("hiscore");
  const menu = document.getElementById("menu");
  const over = document.getElementById("overlay");
  const overMsg = document.getElementById("over-msg");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnMute = document.getElementById("btn-mute");

  let muted = localStorage.getItem(LS_MUTE) === "1";
  let audioCtx = null;

  /** Einfacher Lauf-Loop (Web Audio), startet mit dem ersten Schritt */
  const MUSIC_BASS = [196, 220, 165, 174];
  const MUSIC_HI = [392, 440, 330, 349];
  let musicBeatAcc = 0;
  let musicStep = 0;

  /** @type {{ x: number; w: number; h: number; kind: number; variant: number; y?: number; wing?: number }[]} */
  let obstacles = [];
  /** Sterne (fix), nur nachts sichtbar */
  let stars = [];
  let obsSpawn = 900;
  let playerY = 0;
  let playerVy = 0;
  let grounded = true;
  let speed = BASE_SPEED;
  let distance = 0;
  let playing = false;
  let gameOver = false;
  let clouds = [];
  let prevNightBlend = 0.5;
  /** Nach Nacht→Tag mindestens ein Vogel, sobald es hell genug ist */
  let birdQueuedAfterNight = false;

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function beep(freq, t, vol = 0.04) {
    if (muted) return;
    const c = ensureAudio();
    if (!c) return;
    const now = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + t);
    o.connect(g);
    g.connect(c.destination);
    o.start(now);
    o.stop(now + t + 0.02);
  }

  function loadBest() {
    const v = parseInt(localStorage.getItem(LS_BEST) || "0", 10);
    elBest.textContent = String(isNaN(v) ? 0 : v);
    return isNaN(v) ? 0 : v;
  }

  let hiScore = loadBest();

  function resetClouds() {
    clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * W * 2,
        y: 20 + Math.random() * 55,
        s: 0.6 + Math.random() * 0.8,
      });
    }
  }

  function resetStars() {
    stars = [];
    for (let i = 0; i < 52; i++) {
      stars.push({
        x: Math.random() * W,
        y: 8 + Math.random() * (GROUND_Y - 48),
        s: 0.6 + Math.random() * 2.2,
        tw: Math.random() * Math.PI * 2,
      });
    }
  }

  /** 0 = Tag, 1 = Nacht (glatter Übergang) */
  function nightBlendAt(dist) {
    return (Math.sin(dist / DAYNIGHT_SCALE) + 1) / 2;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Abgerundetes Rechteck (Fallback ohne ctx.roundRect) */
  function fillRoundRect(x0, y0, bw, bh, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x0, y0, bw, bh, r);
    } else {
      const rr = Math.min(r, bw / 2, bh / 2);
      ctx.moveTo(x0 + rr, y0);
      ctx.arcTo(x0 + bw, y0, x0 + bw, y0 + bh, rr);
      ctx.arcTo(x0 + bw, y0 + bh, x0, y0 + bh, rr);
      ctx.arcTo(x0, y0 + bh, x0, y0, rr);
      ctx.arcTo(x0, y0, x0 + bw, y0, rr);
      ctx.closePath();
    }
    ctx.fill();
  }

  function musicTempo() {
    const t = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
    const u = Math.min(1, Math.max(0, t));
    return 0.27 - 0.1 * u;
  }

  function resetGame() {
    obstacles = [];
    obsSpawn = 420 + Math.random() * 400;
    scrollPos = 0;
    playerY = GROUND_Y - PLAYER_H;
    playerVy = 0;
    grounded = true;
    speed = BASE_SPEED;
    distance = 0;
    gameOver = false;
    musicBeatAcc = 0;
    musicStep = 0;
    resetClouds();
    resetStars();
    prevNightBlend = nightBlendAt(0);
    birdQueuedAfterNight = false;
  }

  function pushBird() {
    const lowBird = Math.random() < 0.42;
    const bw = 34 + Math.floor(Math.random() * 10);
    const bh = 20 + Math.floor(Math.random() * 8);
    const yTop = lowBird ? GROUND_Y - 46 - bh : GROUND_Y - 92 - bh;
    obstacles.push({
      x: W + 30,
      w: bw,
      h: bh,
      kind: KIND_BIRD,
      variant: lowBird ? 1 : 0,
      y: yTop,
      wing: Math.random() * 6.28,
    });
  }

  function spawnObstacle() {
    const dist = distance;
    const nb = nightBlendAt(dist);
    const dayish = nb < 0.46;
    const canBird = dist > BIRD_AFTER && dayish;

    if (canBird && birdQueuedAfterNight) {
      birdQueuedAfterNight = false;
      pushBird();
      obsSpawn = OB_MIN + Math.random() * (OB_MAX - OB_MIN);
      return;
    }
    if (canBird && Math.random() < 0.36) {
      pushBird();
      obsSpawn = OB_MIN + Math.random() * (OB_MAX - OB_MIN);
      return;
    }

    const variant = Math.floor(Math.random() * 3);
    let w = 24 + Math.floor(Math.random() * 16);
    let h = 38 + Math.floor(Math.random() * 28);
    if (variant === 1) {
      w = 26 + Math.floor(Math.random() * 8);
      h = 48 + Math.floor(Math.random() * 16);
    }
    if (variant === 2) {
      w = 36 + Math.floor(Math.random() * 24);
      h = 30 + Math.floor(Math.random() * 14);
    }
    obstacles.push({ x: W + 30, w, h, kind: KIND_GROUND, variant });
    obsSpawn = OB_MIN + Math.random() * (OB_MAX - OB_MIN);
  }


  function tick(dt) {
    if (!playing || gameOver) return;

    distance += speed * dt * 12;
    speed = Math.min(MAX_SPEED, BASE_SPEED + distance * 0.00008);

    playerVy += GRAV * dt;
    playerY += playerVy * dt;
    if (playerY >= GROUND_Y - PLAYER_H) {
      playerY = GROUND_Y - PLAYER_H;
      playerVy = 0;
      grounded = true;
    }

    const px = 72;
    const py = playerY;
    const pw = PLAYER_W - HIT_INSET * 2;
    const ph = PLAYER_H - HIT_INSET;

    for (const c of clouds) {
      c.x -= speed * 0.25 * dt * 60;
      if (c.x < -120) c.x = W + Math.random() * 200;
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.x -= speed * dt * 60;
      if (o.kind === KIND_BIRD) o.wing = (o.wing || 0) + dt * 16;
      const oy = o.kind === KIND_BIRD ? o.y : GROUND_Y - o.h;
      if (o.x + o.w < 0) {
        obstacles.splice(i, 1);
        continue;
      }
      const ax = px + HIT_INSET;
      const ay = py + HIT_INSET;
      if (ax < o.x + o.w && ax + pw > o.x && ay < oy + o.h && ay + ph > oy) {
        gameOver = true;
        playing = false;
        beep(120, 0.15, 0.06);
        const pts = Math.floor(distance);
        if (pts > hiScore) {
          hiScore = pts;
          localStorage.setItem(LS_BEST, String(hiScore));
          elBest.textContent = String(hiScore);
          elHi.textContent = "Neuer Rekord!";
        } else {
          elHi.textContent = "";
        }
        overMsg.textContent = `Punkte: ${pts}`;
        over.classList.remove("hidden");
        menu.classList.add("hidden");
        return;
      }
    }

    obsSpawn -= speed * dt * 60;
    if (obsSpawn <= 0) spawnObstacle();

    if (!muted) {
      const tempo = musicTempo();
      musicBeatAcc += dt;
      while (musicBeatAcc >= tempo) {
        musicBeatAcc -= tempo;
        const bi = musicStep % 4;
        beep(MUSIC_BASS[bi], 0.1, 0.024);
        if (musicStep % 2 === 0) beep(MUSIC_HI[(musicStep / 2) % 4], 0.07, 0.014);
        musicStep++;
      }
    }

    elScore.textContent = String(Math.floor(distance));

    const nbTrack = nightBlendAt(distance);
    if (prevNightBlend >= 0.52 && nbTrack < 0.44) {
      birdQueuedAfterNight = true;
    }
    prevNightBlend = nbTrack;
  }

  function drawSky(nb, t) {
    const r = lerp(250, 22, nb);
    const g = lerp(248, 28, nb);
    const b = lerp(240, 52, nb);
    ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
    ctx.fillRect(0, 0, W, H);

    if (nb < 0.62) {
      ctx.globalAlpha = Math.min(1, 1 - nb / 0.62) * 0.95;
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(W * 0.78, 40, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (nb > 0.38) {
      ctx.globalAlpha = ((nb - 0.38) / 0.62) * 0.95;
      ctx.fillStyle = "#e7e5e4";
      ctx.beginPath();
      ctx.arc(W * 0.2, 34, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (nb > 0.22) {
      const sa = ((nb - 0.22) / 0.78) ** 1.15;
      for (const s of stars) {
        const tw = 0.5 + 0.5 * Math.sin(t * 1.4 + s.tw);
        ctx.fillStyle = `rgba(255,255,255,${tw * sa})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }
    }
  }

  function drawGround(scroll, nb) {
    const gr = lerp(214, 62, nb);
    const gg = lerp(211, 58, nb);
    const gb = lerp(208, 48, nb);
    ctx.fillStyle = `rgb(${gr | 0},${gg | 0},${gb | 0})`;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    const sr = lerp(168, 52, nb);
    const sg = lerp(162, 50, nb);
    const sb = lerp(158, 46, nb);
    ctx.strokeStyle = `rgb(${sr | 0},${sg | 0},${sb | 0})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 0.5);
    ctx.lineTo(W, GROUND_Y + 0.5);
    ctx.stroke();

    const stripe = 28;
    const off = scroll % stripe;
    const tr = lerp(212, 58, nb);
    const tg = lerp(212, 56, nb);
    const tb = lerp(216, 62, nb);
    ctx.fillStyle = `rgb(${tr | 0},${tg | 0},${tb | 0})`;
    for (let x = -off; x < W + stripe; x += stripe) {
      ctx.fillRect(x, GROUND_Y + 8, 14, 4);
    }
  }

  function drawClouds(nb) {
    const a = lerp(0.34, 0.07, nb);
    for (const c of clouds) {
      ctx.fillStyle = `rgba(115, 108, 102, ${a})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 40 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.x + 25 * c.s, c.y + 4, 28 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Läufer: weiche Silhouette mit Verläufen und Schatten — gleiche 44×48-Box wie zuvor.
   */
  function drawPlayer(x, y, nb, legPhase) {
    const dim = 1 - nb * 0.22;
    const mul = (r, g, b, a = 1) =>
      `rgba(${Math.round(r * dim)}, ${Math.round(g * dim)}, ${Math.round(b * dim)}, ${a})`;
    const run = Math.sin(legPhase * 0.11);
    const legFront = run * 5;
    const legBack = -run * 5;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = mul(0, 0, 0, 0.14 + nb * 0.06);
    ctx.beginPath();
    ctx.ellipse(23, 47, 19, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyG = ctx.createLinearGradient(10, 18, 34, 38);
    bodyG.addColorStop(0, mul(52, 168, 96));
    bodyG.addColorStop(0.45, mul(22, 115, 62));
    bodyG.addColorStop(1, mul(15, 85, 48));
    ctx.fillStyle = bodyG;
    fillRoundRect(14, 22, 22, 15, 6);

    ctx.fillStyle = mul(34, 160, 92);
    ctx.beginPath();
    ctx.ellipse(25, 29, 10, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();

    const tailG = ctx.createLinearGradient(-4, 28, 14, 36);
    tailG.addColorStop(0, mul(15, 95, 52));
    tailG.addColorStop(1, mul(28, 130, 76));
    ctx.fillStyle = tailG;
    ctx.beginPath();
    ctx.moveTo(12, 30);
    ctx.quadraticCurveTo(-2, 34, -6, 38);
    ctx.quadraticCurveTo(4, 36, 14, 34);
    ctx.closePath();
    ctx.fill();

    const neckG = ctx.createLinearGradient(26, 12, 38, 26);
    neckG.addColorStop(0, mul(26, 125, 72));
    neckG.addColorStop(1, mul(18, 95, 54));
    ctx.fillStyle = neckG;
    fillRoundRect(26, 14, 10, 14, 4);

    const headG = ctx.createLinearGradient(30, 8, 44, 22);
    headG.addColorStop(0, mul(48, 175, 105));
    headG.addColorStop(1, mul(20, 105, 58));
    ctx.fillStyle = headG;
    fillRoundRect(30, 10, 14, 13, 5);

    ctx.fillStyle = mul(12, 58, 34);
    fillRoundRect(38, 18, 10, 7, 2);

    ctx.fillStyle = mul(250, 252, 250, 0.9 * dim);
    ctx.beginPath();
    ctx.arc(40.5, 14.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mul(15, 70, 38);
    ctx.beginPath();
    ctx.arc(41.2, 14.3, 1.1, 0, Math.PI * 2);
    ctx.fill();

    function thigh(oxBase, lift) {
      const ox = oxBase + lift * 0.08;
      const oy = 34 + lift;
      const g = ctx.createLinearGradient(ox, oy, ox + 6, oy + 14);
      g.addColorStop(0, mul(40, 155, 90));
      g.addColorStop(1, mul(14, 78, 44));
      ctx.fillStyle = g;
      fillRoundRect(ox, oy, 9, 13, 3);
      ctx.fillStyle = mul(10, 52, 30);
      fillRoundRect(ox + 1, oy + 11, 7, 5, 2);
    }

    thigh(11, legBack);
    thigh(22, legFront);

    ctx.strokeStyle = mul(255, 255, 255, 0.12);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 24);
    ctx.quadraticCurveTo(22, 21, 28, 23);
    ctx.stroke();

    ctx.restore();
  }

  /** Kakteen: gleicher Stil (Stamm, Krone, Lichtstreifen) für alle Varianten */
  function drawCactus(o) {
    const x = o.x;
    const y = GROUND_Y - o.h;
    const w = o.w;
    const h = o.h;
    const ground = y + h;

    function styledStem(cx, stemTop, stemW) {
      const sw = Math.max(stemW, 9);
      const sl = cx - sw * 0.5;
      const stemH = ground - stemTop;
      const hlH = Math.min(h * 0.42, Math.max(stemH - h * 0.14, h * 0.12));

      ctx.fillStyle = "#15803d";
      ctx.fillRect(sl, stemTop, sw, stemH);
      ctx.fillStyle = "#166534";
      ctx.fillRect(sl + sw * 0.07, stemTop + h * 0.06, sw * 0.86, ground - (stemTop + h * 0.06));
      ctx.fillStyle = "rgba(74, 222, 128, 0.18)";
      ctx.fillRect(sl + sw * 0.2, stemTop + h * 0.12, sw * 0.22, hlH);

      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.ellipse(cx, stemTop, sw * 0.52, h * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function sideArmsL() {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(x + w * 0.1, y + h * 0.4, w * 0.15, h * 0.1);
      ctx.fillRect(x + w * 0.07, y + h * 0.44, w * 0.1, h * 0.3);
    }

    function sideArmsR() {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(x + w * 0.72, y + h * 0.36, w * 0.15, h * 0.09);
      ctx.fillRect(x + w * 0.81, y + h * 0.38, w * 0.1, h * 0.28);
    }

    if (o.variant === 1) {
      styledStem(x + w * 0.21, y + h * 0.32, w * 0.26);
      styledStem(x + w * 0.77, y + h * 0.25, w * 0.22);
      styledStem(x + w * 0.51, y + h * 0.08, w * 0.22);
    } else if (o.variant === 2) {
      styledStem(x + w * 0.21, y + h * 0.38, w * 0.32);
      styledStem(x + w * 0.79, y + h * 0.4, w * 0.32);
      styledStem(x + w * 0.5, y + h * 0.22, w * 0.34);
    } else {
      styledStem(x + w * 0.5, y + h * 0.2, Math.max(w * 0.32, 11));
      sideArmsL();
      sideArmsR();
    }
  }

  function drawBird(o) {
    const x = o.x;
    const y = o.y;
    const w = o.w;
    const h = o.h;
    const flap = Math.sin(o.wing || 0) * 5;
    ctx.fillStyle = "#27272a";
    ctx.beginPath();
    ctx.ellipse(x + w * 0.48, y + h * 0.55, w * 0.34, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.32, y + h * 0.48);
    ctx.lineTo(x - 6, y + h * 0.42 + flap);
    ctx.lineTo(x + w * 0.22, y + h * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.68, y + h * 0.48);
    ctx.lineTo(x + w + 6, y + h * 0.42 + flap);
    ctx.lineTo(x + w * 0.78, y + h * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(x + w - 3, y + h * 0.46, 7, 4);
  }

  let scrollPos = 0;
  let skyClock = 0;

  function loop() {
    const dt = 1 / 60;
    skyClock += dt;
    if (playing && !gameOver) {
      tick(dt);
      scrollPos += speed * dt * 60;
    }

    const nb = playing || gameOver ? nightBlendAt(distance) : nightBlendAt(0);
    drawSky(nb, skyClock);
    drawClouds(nb);
    drawGround(scrollPos, nb);

    for (const o of obstacles) {
      if (o.kind === KIND_BIRD) drawBird(o);
      else drawCactus(o);
    }
    drawPlayer(72, playerY, nb, scrollPos);

    requestAnimationFrame(loop);
  }

  function jump() {
    if (!playing || gameOver) return;
    if (grounded) {
      playerVy = JUMP_V;
      grounded = false;
      beep(420, 0.05);
    }
  }

  function startRun() {
    resetGame();
    playing = true;
    menu.classList.add("hidden");
    over.classList.add("hidden");
    ensureAudio();
    if (!muted) {
      beep(MUSIC_BASS[0], 0.11, 0.028);
      if (MUSIC_HI.length) beep(MUSIC_HI[0], 0.08, 0.015);
      musicStep = 1;
      musicBeatAcc = 0;
    }
  }

  btnStart.addEventListener("click", startRun);
  btnAgain.addEventListener("click", startRun);

  btnMute.addEventListener("click", () => {
    muted = !muted;
    localStorage.setItem(LS_MUTE, muted ? "1" : "0");
    btnMute.textContent = muted ? "🔇" : "🔊";
    btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
    ensureAudio();
  });
  btnMute.textContent = muted ? "🔇" : "🔊";

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " " || k === "arrowup") {
      e.preventDefault();
      if (!playing && !gameOver && menu && !menu.classList.contains("hidden")) {
        startRun();
        return;
      }
      if (gameOver && (k === " " || k === "arrowup")) {
        startRun();
        return;
      }
      jump();
    }
  });

  document.body.addEventListener(
    "pointerdown",
    () => {
      ensureAudio();
    },
    { passive: true, once: true }
  );

  resetGame();
  loop();
})();
