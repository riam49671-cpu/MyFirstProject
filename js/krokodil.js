(() => {
  const W = 880;
  const H = 520;
  const N_TEETH = 11;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlayStart = document.getElementById("overlay-start");
  const overlayEnd = document.getElementById("overlay-end");
  const endTitle = document.getElementById("end-title");
  const endMsg = document.getElementById("end-msg");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const pillP1 = document.getElementById("pill-p1");
  const pillP2 = document.getElementById("pill-p2");

  /** @type {'idle' | 'play' | 'snap'} */
  let phase = "idle";
  let badIndex = -1;
  /** 1 | 2 */
  let currentPlayer = 1;
  /** @type {{ x: number; y: number; w: number; h: number; pressed: boolean }[]} */
  let teeth = [];
  let snapT = 0;
  let snapProgress = 0;
  let hoverIndex = -1;

  const mouthLeft = 90;
  const toothW = 42;
  const toothHLower = 52;
  const toothHUpper = 32;
  /** Obere Reihe nur Deko */
  const UPPER_Y = 238;
  /** Untere Reihe – nur hier Klicks */
  const LOWER_Y = 322;
  const gap = (W - mouthLeft * 2 - N_TEETH * toothW) / (N_TEETH - 1 || 1);

  function toothX(i) {
    return mouthLeft + i * (toothW + gap);
  }

  function buildTeeth() {
    teeth = [];
    for (let i = 0; i < N_TEETH; i++) {
      teeth.push({ x: toothX(i), y: LOWER_Y, w: toothW, h: toothHLower, pressed: false });
    }
    badIndex = Math.floor(Math.random() * N_TEETH);
  }

  function syncTurnPills() {
    const on = phase === "play";
    pillP1.classList.toggle("active", on && currentPlayer === 1);
    pillP2.classList.toggle("active", on && currentPlayer === 2);
  }

  function playClick() {
    playTone(660, 0.06, 0.05, "square");
  }

  function playSnap() {
    playTone(95, 0.35, 0.12, "sawtooth");
    setTimeout(() => playTone(55, 0.45, 0.1, "sawtooth"), 80);
  }

  let audioCtx = null;
  function playTone(freq, dur, vol, type) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function drawBackdrop() {
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#e0f2fe");
    sky.addColorStop(0.5, "#bae6fd");
    sky.addColorStop(1, "#a7f3d0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(680, 72, 58, 28, 0, 0, Math.PI * 2);
    ctx.ellipse(620, 68, 42, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(251, 191, 36, 0.35)";
    ctx.beginPath();
    ctx.arc(120, 95, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(253, 224, 71, 0.55)";
    ctx.beginPath();
    ctx.arc(112, 88, 18, 0, Math.PI * 2);
    ctx.fill();

    const grass = ctx.createLinearGradient(0, H - 120, 0, H);
    grass.addColorStop(0, "rgba(167, 243, 208, 0)");
    grass.addColorStop(0.35, "#6ee7b7");
    grass.addColorStop(1, "#34d399");
    ctx.fillStyle = grass;
    ctx.fillRect(0, H - 110, W, 110);

    for (let i = 0; i < 28; i++) {
      const gx = (i * 37 + 12) % W;
      ctx.strokeStyle = `rgba(5, 150, 105, ${0.08 + (i % 3) * 0.04})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, H);
      ctx.quadraticCurveTo(gx + 8, H - 14 - (i % 5) * 3, gx + 14, H);
      ctx.stroke();
    }
  }

  function drawCroc(snap) {
    const jawLift = snap * 98;
    const upperShift = jawLift * 0.52;
    const uy = UPPER_Y + upperShift;

    const tailGrad = ctx.createRadialGradient(95, 275, 20, 115, 285, 130);
    tailGrad.addColorStop(0, "rgba(17, 94, 89, 0.35)");
    tailGrad.addColorStop(1, "rgba(17, 94, 89, 0)");
    ctx.fillStyle = tailGrad;
    ctx.beginPath();
    ctx.ellipse(118, 278, 88, 125, -0.32, 0, Math.PI * 2);
    ctx.fill();

    const skin = ctx.createLinearGradient(40, 85, 840, 355);
    skin.addColorStop(0, "#134e4a");
    skin.addColorStop(0.28, "#14b8a6");
    skin.addColorStop(0.55, "#0f766e");
    skin.addColorStop(0.82, "#0d9488");
    skin.addColorStop(1, "#065f46");
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.roundRect(68, 112, 744, 238, 48);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(120, 132);
    ctx.quadraticCurveTo(380, 118, 680, 138);
    ctx.stroke();

    const belly = ctx.createRadialGradient(W / 2, 255, 40, W / 2, 275, 210);
    belly.addColorStop(0, "rgba(236, 253, 245, 0.55)");
    belly.addColorStop(0.45, "rgba(167, 243, 208, 0.28)");
    belly.addColorStop(1, "rgba(13, 148, 136, 0.04)");
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.roundRect(108, 148, 664, 162, 36);
    ctx.fill();

    const scaleAlpha = [0.07, 0.05, 0.06, 0.05, 0.07, 0.05];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const sx = 145 + col * 105 + row * 18;
        const sy = 168 + row * 42;
        ctx.fillStyle = `rgba(6, 51, 48, ${scaleAlpha[(row + col) % 6]})`;
        ctx.beginPath();
        ctx.ellipse(sx, sy, 11, 7, 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const snout = ctx.createLinearGradient(520, 215, 820, 295);
    snout.addColorStop(0, "#115e59");
    snout.addColorStop(0.45, "#0f766e");
    snout.addColorStop(1, "#064e3b");
    ctx.fillStyle = snout;
    ctx.beginPath();
    ctx.ellipse(698, 258, 102, 58, 0.06, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(6, 95, 70, 0.45)";
    ctx.beginPath();
    ctx.ellipse(668, 248, 42, 22, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#022c22";
    ctx.beginPath();
    ctx.moveTo(742, 268);
    ctx.lineTo(808, 248);
    ctx.lineTo(802, 296);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(638, 268);
    ctx.quadraticCurveTo(682, 248, 728, 258);
    ctx.stroke();

    const footXs = [260, 390, 530, 660];
    ctx.fillStyle = "rgba(6, 78, 59, 0.38)";
    for (let li = 0; li < footXs.length; li++) {
      const lx = footXs[li];
      ctx.beginPath();
      ctx.ellipse(lx, 422, 34, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#134e4a";
      ctx.beginPath();
      ctx.ellipse(lx + 10, 432, 9, 5, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(6, 78, 59, 0.38)";
    }

    const eyeYM = 198;
    const eyeRM = 24;
    const eyeSpread = 56;
    const eyeCX = W / 2;

    ctx.strokeStyle = "rgba(8, 72, 63, 0.5)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(eyeCX - eyeSpread - 34, eyeYM - 6);
    ctx.quadraticCurveTo(eyeCX - eyeSpread, eyeYM - 26, eyeCX - eyeSpread + 34, eyeYM - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(eyeCX + eyeSpread - 34, eyeYM - 6);
    ctx.quadraticCurveTo(eyeCX + eyeSpread, eyeYM - 26, eyeCX + eyeSpread + 34, eyeYM - 6);
    ctx.stroke();

    function drawCrocEye(cx, cy, r) {
      ctx.fillStyle = "rgba(2, 44, 34, 0.16)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + 4, r * 1.06, r * 0.96, 0, 0, Math.PI * 2);
      ctx.fill();

      const sclera = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.38, 1, cx, cy, r + 2);
      sclera.addColorStop(0, "#fffef8");
      sclera.addColorStop(0.55, "#ecfdf5");
      sclera.addColorStop(1, "#bbf7d0");
      ctx.fillStyle = sclera;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(13, 148, 136, 0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();

      const iris = ctx.createRadialGradient(cx - r * 0.12, cy - r * 0.1, 0, cx, cy, r * 0.58);
      iris.addColorStop(0, "#fde68a");
      iris.addColorStop(0.4, "#eab308");
      iris.addColorStop(0.78, "#a16207");
      iris.addColorStop(1, "#422006");
      ctx.fillStyle = iris;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.58, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#022c22";
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.12, r * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.36, cy - r * 0.36, r * 0.18, r * 0.1, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.26, cy + r * 0.2, r * 0.07, r * 0.055, 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    drawCrocEye(eyeCX - eyeSpread, eyeYM, eyeRM);
    drawCrocEye(eyeCX + eyeSpread, eyeYM, eyeRM);

    ctx.fillStyle = "rgba(6,78,59,0.5)";
    ctx.beginPath();
    ctx.ellipse(eyeCX - 22, 242, 10, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeCX + 18, 240, 9, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9f1239";
    ctx.beginPath();
    ctx.moveTo(96, 228 + upperShift * 0.3);
    ctx.quadraticCurveTo(W / 2, 212 + upperShift * 0.4, W - 96, 228 + upperShift * 0.3);
    ctx.lineTo(W - 96, 248 + upperShift * 0.35);
    ctx.quadraticCurveTo(W / 2, 268 + upperShift * 0.45, 96, 248 + upperShift * 0.35);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(251, 113, 133, 0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, 238 + upperShift * 0.32);
    ctx.quadraticCurveTo(W / 2, 222 + upperShift * 0.38, W - 96, 238 + upperShift * 0.32);
    ctx.stroke();

    for (let i = 0; i < N_TEETH; i++) {
      const tx = toothX(i);
      const th = toothHUpper;
      const toothGrad = ctx.createLinearGradient(tx, uy, tx + toothW, uy + th);
      toothGrad.addColorStop(0, "#fafaf9");
      toothGrad.addColorStop(1, "#d6d3d1");
      ctx.fillStyle = toothGrad;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "rgba(100,116,139,0.55)";
      ctx.beginPath();
      ctx.roundRect(tx, uy, toothW, th, 9);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx + 7, uy + 8);
      ctx.quadraticCurveTo(tx + toothW / 2, uy + 5, tx + toothW - 7, uy + 8);
      ctx.stroke();
    }

    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.ellipse(W / 2, 286 + jawLift * 0.12, 352, 102 - jawLift * 0.26, 0, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.fill();

    const gum = ctx.createLinearGradient(180, 278, 620, 328);
    gum.addColorStop(0, "#9f1239");
    gum.addColorStop(0.5, "#be123c");
    gum.addColorStop(1, "#881337");
    ctx.fillStyle = gum;
    ctx.beginPath();
    ctx.ellipse(W / 2, 302 + jawLift * 0.35, 332, 82 - jawLift * 0.22, 0, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.fill();

    const dark = ctx.createRadialGradient(W / 2, 308 + jawLift * 0.48, 15, W / 2, 318, 280);
    dark.addColorStop(0, "#312e81");
    dark.addColorStop(0.45, "#1e1b4b");
    dark.addColorStop(1, "#020617");
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.ellipse(W / 2, 312 + jawLift * 0.5, 312, 56 - jawLift * 0.16, 0, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "rgba(52, 211, 153, 0.55)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.roundRect(82, 298 - jawLift, 716, 138 + jawLift, 20);
    ctx.stroke();

    for (let i = 0; i < teeth.length; i++) {
      const t = teeth[i];
      const lift = t.pressed ? 14 : 0;
      ctx.save();
      ctx.translate(0, -lift);

      if (i === hoverIndex && phase === "play" && !t.pressed) {
        ctx.shadowColor = "rgba(251, 191, 36, 0.95)";
        ctx.shadowBlur = 22;
      }

      const tx = t.x;
      const ty = t.y - jawLift;
      const tw = t.w;
      const th = t.h;

      const toothGrad = ctx.createLinearGradient(tx, ty, tx + tw, ty + th);
      if (t.pressed) {
        toothGrad.addColorStop(0, "#e2e8f0");
        toothGrad.addColorStop(1, "#94a3b8");
      } else {
        toothGrad.addColorStop(0, "#ffffff");
        toothGrad.addColorStop(0.45, "#fefce8");
        toothGrad.addColorStop(1, "#e2e8f0");
      }
      ctx.fillStyle = toothGrad;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = t.pressed ? "#64748b" : "rgba(16, 185, 129, 0.65)";
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      if (!t.pressed) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tx + 8, ty + 12);
        ctx.quadraticCurveTo(tx + tw / 2, ty + 7, tx + tw - 8, ty + 12);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(15,23,42,0.08)";
      ctx.fillRect(tx + 6, ty + th - 12, tw - 12, 8);

      ctx.restore();
    }

    ctx.fillStyle = "rgba(71,85,105,0.95)";
    ctx.font = "700 11px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("↑ obere Reihe nur schauen · nur unten klicken ↓", W / 2, uy - 10);

    if (snap > 0.52) {
      const dim = Math.min(0.88, (snap - 0.52) * 2);
      ctx.fillStyle = `rgba(15,23,42,${dim})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Math.min(r, w / 2, h / 2);
      this.moveTo(x + rr, y);
      this.arcTo(x + w, y, x + w, y + h, rr);
      this.arcTo(x + w, y + h, x, y + h, rr);
      this.arcTo(x, y + h, x, y, rr);
      this.arcTo(x, y, x + w, y, rr);
      this.closePath();
      return this;
    };
  }

  function draw() {
    drawBackdrop();

    const snap = phase === "snap" ? snapProgress : 0;
    drawCroc(snap);

    ctx.save();
    ctx.font = "600 14px system-ui,Segoe UI,sans-serif";
    ctx.textAlign = "center";
    const hint = "Nur untere Zähne drücken";
    const tw = ctx.measureText(hint).width;
    const bx = W / 2;
    const by = 34;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.shadowColor = "rgba(13, 148, 136, 0.35)";
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2 - 18, by - 16, tw + 36, 32, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(13, 148, 136, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2 - 18, by - 16, tw + 36, 32, 16);
    ctx.stroke();
    ctx.fillStyle = "#134e4a";
    ctx.textBaseline = "middle";
    ctx.fillText(hint, bx, by + 1);
    ctx.restore();
  }

  function pickTooth(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = r.width / W;
    const sy = r.height / H;
    const mx = (clientX - r.left) / sx;
    const my = (clientY - r.top) / sy;
    const jawLift = phase === "snap" ? snapProgress * 95 : 0;

    for (let i = 0; i < teeth.length; i++) {
      const t = teeth[i];
      if (t.pressed) continue;
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y - jawLift && my <= t.y - jawLift + t.h) {
        return i;
      }
    }
    return -1;
  }

  function onPointer(clientX, clientY, isClick) {
    if (phase !== "play") return;
    const i = pickTooth(clientX, clientY);
    if (isClick && i >= 0) {
      if (i === badIndex) {
        teeth[i].pressed = true;
        playSnap();
        phase = "snap";
        snapT = performance.now();
        snapProgress = 0;
        requestAnimationFrame(animSnap);
        const loser = currentPlayer;
        const winner = loser === 1 ? 2 : 1;
        endTitle.textContent = "Das Maul zu!";
        endMsg.textContent = `Spieler ${loser} hat den falschen Zahn erwischt und verliert. Spieler ${winner} gewinnt.`;
        syncTurnPills();
        return;
      }
      teeth[i].pressed = true;
      playClick();
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      syncTurnPills();
    }
  }

  let rafLoop = 0;
  function animSnap(now) {
    const elapsed = (now - snapT) / 1000;
    snapProgress = Math.min(1, elapsed / 0.55);
    draw();
    if (snapProgress < 1) {
      rafLoop = requestAnimationFrame(animSnap);
    } else {
      overlayEnd.classList.remove("hidden");
    }
  }

  canvas.addEventListener("pointermove", (e) => {
    if (phase !== "play") {
      hoverIndex = -1;
      return;
    }
    hoverIndex = pickTooth(e.clientX, e.clientY);
    draw();
  });

  canvas.addEventListener("pointerdown", (e) => {
    if (phase === "idle") return;
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    onPointer(e.clientX, e.clientY, true);
    draw();
  });

  function startRound() {
    buildTeeth();
    currentPlayer = 1;
    phase = "play";
    snapProgress = 0;
    overlayStart.classList.add("hidden");
    overlayEnd.classList.add("hidden");
    syncTurnPills();
    draw();
  }

  btnStart.addEventListener("click", startRound);
  btnAgain.addEventListener("click", startRound);

  buildTeeth();
  syncTurnPills();
  draw();
})();
