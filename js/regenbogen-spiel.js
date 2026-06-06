(() => {
  const W = 800;
  const H = 380;

  /**
   * Echte Stimmen aus MP3-Dateien — Reihenfolge beim Drücken:
   * 1 MATADORA, 2 No Batidão, 3 Soda Pop, dann wieder von vorn (nie dasselbe zweimal hintereinander).
   * Dateien liegen unter audio/regenbogen/ — siehe LESE_MICH.txt dort.
   */
  const VOCAL_TRACKS = [
    { src: "audio/regenbogen/matadora.mp3", label: "MATADORA" },
    { src: "audio/regenbogen/no-batidao.mp3", label: "No Batidão" },
    { src: "audio/regenbogen/soda-pop.mp3", label: "Soda Pop" },
  ];

  /** Nach so vielen Sekunden wird der Ausschnitt gestoppt (ganze MP3 wäre oft zu lang). */
  const SNIPPET_MAX_SEC = 22;

  let vocalRound = 0;
  let playingAudio = null;
  let snippetStopTimer = null;
  const elMusik = document.getElementById("musik-hinweis");

  let audioCtx = null;
  function getAudioContext() {
    if (audioCtx) return audioCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  }

  /** Drei leicht unterschiedliche Töne (Pass 1 / 2 / 3) — ertönt immer beim Druck. */
  const KLANG_HZ = [523.25, 587.33, 659.25];

  function playSanfterKlang(slot) {
    const a = getAudioContext();
    if (!a) return;
    if (a.state === "suspended") a.resume();
    const f = KLANG_HZ[slot % KLANG_HZ.length];
    const t = a.currentTime;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    osc.connect(g);
    g.connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.42);
  }

  function stopVocal() {
    if (snippetStopTimer) {
      clearTimeout(snippetStopTimer);
      snippetStopTimer = null;
    }
    if (playingAudio) {
      playingAudio.pause();
      try {
        playingAudio.currentTime = 0;
      } catch (_) {
        /* ignore */
      }
      playingAudio = null;
    }
  }

  async function playNextVocalTrack() {
    stopVocal();
    const tr = VOCAL_TRACKS[vocalRound % VOCAL_TRACKS.length];
    vocalRound += 1;
    const slot = (vocalRound - 1) % VOCAL_TRACKS.length;

    playSanfterKlang(slot);

    const audio = new Audio(tr.src);
    audio.volume = 0.82;
    playingAudio = audio;

    let mp3Ok = false;

    audio.addEventListener(
      "error",
      () => {
        if (elMusik && !mp3Ok) {
          elMusik.textContent =
            `Sanfter Klang ertönt — MP3 fehlt oder kaputt: ${tr.src}`;
        }
      },
      { once: true }
    );

    try {
      await audio.play();
      mp3Ok = true;
      if (elMusik) {
        elMusik.textContent = `Klang + ▶ ${tr.label} (MP3)`;
      }
      snippetStopTimer = setTimeout(() => {
        audio.pause();
      }, SNIPPET_MAX_SEC * 1000);
    } catch (_) {
      if (elMusik) {
        elMusik.textContent =
          "Sanfter Klang ertönt — MP3 konnte nicht starten (Datei fehlt oder blockiert).";
      }
    }
  }

  function resetMelodie() {
    vocalRound = 0;
    stopVocal();
    if (elMusik) {
      elMusik.textContent = "Rotation zurück: nächster Druck startet mit MATADORA";
    }
  }

  const COLORS = [
    { key: "1", label: "Rot", hex: "#ff6b6b" },
    { key: "2", label: "Orange", hex: "#ffa94d" },
    { key: "3", label: "Gelb", hex: "#ffd93d" },
    { key: "4", label: "Grün", hex: "#6bcb77" },
    { key: "5", label: "Blau", hex: "#4d96ff" },
    { key: "6", label: "Indigo", hex: "#6c5ce7" },
    { key: "7", label: "Violett", hex: "#b565d8" },
  ];

  const canvas = document.getElementById("feld");
  const ctx = canvas.getContext("2d", { alpha: false });
  const elDruecke = document.getElementById("druecke-zahl");

  const arcs = [];
  let lastTs = 0;

  function burst(cx, cy, hex) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const sp = 1.2 + Math.random() * 2.2;
      arcs.push({
        kind: "spark",
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        hex,
        r: 2 + Math.random() * 3,
      });
    }
  }

  function addRainbowArc(hex, worldX, worldY) {
    const cx = worldX ?? W / 2 + (Math.random() - 0.5) * 120;
    const cy = worldY ?? H - 40;
    const r0 = 55 + Math.random() * 35;
    const spread = 0.35 + Math.random() * 0.25;
    arcs.push({
      kind: "arc",
      cx,
      cy,
      r: r0,
      w: 14 + Math.random() * 10,
      start: Math.PI + 0.2 - spread,
      end: Math.PI * 2 - 0.2 + spread,
      life: 1,
      hex,
    });
    burst(cx, cy, hex);
  }

  async function triggerColor(index, px, py) {
    const c = COLORS[index];
    if (!c) return;
    await playNextVocalTrack();
    addRainbowArc(c.hex, px, py);
    if (elDruecke) elDruecke.textContent = `${index + 1} · ${c.label}`;
  }

  function loop(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(40, ts - lastTs);
    lastTs = ts;

    ctx.fillStyle = "#06060c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0d1028");
    g.addColorStop(1, "#080812");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let i = arcs.length - 1; i >= 0; i--) {
      const a = arcs[i];
      a.life -= dt * 0.00035;
      if (a.life <= 0) {
        arcs.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, a.life) * 0.85;

      if (a.kind === "arc") {
        ctx.strokeStyle = a.hex;
        ctx.lineWidth = a.w;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(a.cx, a.cy, a.r, a.start, a.end);
        ctx.stroke();
      } else {
        ctx.fillStyle = a.hex;
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r * a.life, 0, Math.PI * 2);
        ctx.fill();
        a.x += a.vx * (dt / 16);
        a.y += a.vy * (dt / 16);
        a.vy += 0.04 * (dt / 16);
      }
    }
    ctx.globalAlpha = 1;

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.strokeRect(1, 1, W - 2, H - 2);

    requestAnimationFrame(loop);
  }

  function screenToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = W / r.width;
    const sy = H / r.height;
    return {
      x: (clientX - r.left) * sx,
      y: (clientY - r.top) * sy,
    };
  }

  canvas.addEventListener("click", (e) => {
    const p = screenToWorld(e.clientX, e.clientY);
    const idx = Math.floor((p.x / W) * 7);
    triggerColor(Math.max(0, Math.min(6, idx)), p.x, p.y);
  });

  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches[0]) {
        const p = screenToWorld(e.touches[0].clientX, e.touches[0].clientY);
        const idx = Math.floor((p.x / W) * 7);
        triggerColor(Math.max(0, Math.min(6, idx)), p.x, p.y);
      }
    },
    { passive: true }
  );

  window.addEventListener("keydown", (e) => {
    const k = e.key;
    const num = "1234567".indexOf(k);
    if (num >= 0) {
      e.preventDefault();
      triggerColor(num, W / 2 + (num - 3) * 45, H - 35 - Math.random() * 25);
    }
    if (k === " " || k === "Escape") {
      e.preventDefault();
      arcs.length = 0;
      resetMelodie();
      if (elDruecke) {
        elDruecke.textContent =
          k === " " ? "Leer — welche Farbe als Nächstes?" : "Alles weich weg — neu drücken";
      }
    }
  });

  document.querySelectorAll("[data-farbe]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.getAttribute("data-farbe"), 10);
      if (i >= 0 && i < 7) triggerColor(i);
    });
  });

  requestAnimationFrame(loop);
})();
