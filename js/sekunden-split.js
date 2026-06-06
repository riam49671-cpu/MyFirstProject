(() => {
  /**
   * Sekunden-Split — erfundenes Timing-Spiel:
   * Die Nadel läuft im Kreis; triff genau die grüne „12-Uhr“-Zone mit Leertaste / Klick.
   */
  const W = 400;
  const H = 400;
  const CX = W / 2;
  const CY = H / 2;
  const R = 148;

  const canvas = document.getElementById("feld");
  const ctx = canvas.getContext("2d", { alpha: false });
  canvas.width = W;
  canvas.height = H;

  const elScore = document.getElementById("score");
  const elRound = document.getElementById("round");
  const elCombo = document.getElementById("combo");
  const layerMenu = document.getElementById("layer-menu");
  const layerOver = document.getElementById("layer-over");
  const elFinal = document.getElementById("final-score");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");

  const KEY = "sekunden-split-best";

  let state = "menu";
  let angle = 0;
  let speed = 1.35;
  let score = 0;
  let roundNum = 0;
  let combo = 0;
  let zoneHalf = 0.22;
  let pulse = 0;

  function best() {
    try {
      return parseInt(localStorage.getItem(KEY) || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(n) {
    try {
      localStorage.setItem(KEY, String(n));
    } catch (_) {}
  }

  function hud() {
    elScore.textContent = String(score);
    elRound.textContent = String(roundNum);
    elCombo.textContent = combo > 1 ? `×${combo}` : "—";
  }

  function resetRun() {
    score = 0;
    roundNum = 0;
    combo = 0;
    speed = 1.35;
    zoneHalf = 0.22;
    angle = Math.random() * Math.PI * 2;
    hud();
  }

  function hit() {
    const target = -Math.PI / 2;
    let d = angle - target;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    const dist = Math.abs(d);
    if (dist <= zoneHalf) {
      const perfect = dist < zoneHalf * 0.35;
      combo += 1;
      const add = (perfect ? 25 : 12) * combo;
      score += add;
      roundNum += 1;
      speed = Math.min(3.8, speed + 0.06 + roundNum * 0.008);
      zoneHalf = Math.max(0.09, zoneHalf - 0.004);
      pulse = 1;
      saveBest(Math.max(best(), score));
    } else {
      combo = 0;
      state = "over";
      elFinal.textContent = String(score);
      layerOver.classList.remove("hidden");
      saveBest(Math.max(best(), score));
    }
    hud();
  }

  function loop(ts) {
    const t = ts * 0.001;
    if (state === "play") {
      angle += speed * 0.035;
      if (angle > Math.PI * 2) angle -= Math.PI * 2;
    }
    pulse *= 0.92;

    ctx.fillStyle = "#06060d";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(80, 80, 120, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.stroke();

    const target = -Math.PI / 2;
    ctx.fillStyle = "rgba(61, 255, 156, 0.22)";
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, R - 4, target - zoneHalf, target + zoneHalf);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(61, 255, 156, 0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX + Math.cos(angle) * (R - 8), CY + Math.sin(angle) * (R - 8));
    ctx.stroke();

    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(
      CX + Math.cos(angle) * (R - 8),
      CY + Math.sin(angle) * (R - 8),
      9,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#a78bfa";
    ctx.font = "bold 13px system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("12", CX, CY - R - 10);

    if (pulse > 0.05) {
      ctx.strokeStyle = `rgba(61, 255, 156, ${pulse * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(CX, CY, R + 8 + pulse * 12, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.font = "11px system-ui,sans-serif";
    ctx.fillText(`Tempo ${speed.toFixed(2)}`, CX, H - 14);

    requestAnimationFrame(loop);
  }

  function start() {
    resetRun();
    state = "play";
    layerMenu.classList.add("hidden");
    layerOver.classList.add("hidden");
    canvas.focus();
  }

  btnStart.addEventListener("click", start);
  btnAgain.addEventListener("click", start);

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (state === "menu" || state === "over") start();
      else if (state === "play") hit();
    }
  });

  canvas.addEventListener("click", () => {
    if (state === "play") hit();
    else start();
  });

  document.getElementById("best").textContent = String(best());
  hud();
  requestAnimationFrame(loop);
})();
