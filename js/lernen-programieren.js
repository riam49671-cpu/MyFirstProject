(() => {
  const KEY = {
    name: "lp-name",
    xp: "lp-xp",
    stars: "lp-stars",
    levels: "lp-levels",
    quiz: "lp-quiz",
    avatar: "lp-avatar",
  };

  const DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
  const BLOCKS = {
    forward: { label: "→ vorwärts()", kind: "move" },
    left: { label: "↰ links()", kind: "turn" },
    right: { label: "↱ rechts()", kind: "turn" },
    rep2: { label: "🔁 2×", kind: "loop" },
    rep3: { label: "🔁 3×", kind: "loop" },
  };

  const RANKS = [
    [0, "Anfänger"],
    [50, "Coder"],
    [150, "Profi"],
    [300, "Meister"],
  ];

  const LEVELS = [
    {
      title: "Geradeaus",
      story: "Willkommen! Lege vorwärts()-Bausteine, bis der Roboter den Stern erreicht.",
      w: 5, h: 5, walls: [],
      start: { x: 0, y: 2, d: 1 }, goal: { x: 4, y: 2 }, gems: [],
      palette: ["forward"], par: 4,
      hint: "4× vorwärts() reichen.",
    },
    {
      title: "Kurve",
      story: "Manchmal musst du drehen: links() oder rechts(), dann vorwärts().",
      w: 5, h: 5, walls: [],
      start: { x: 0, y: 4, d: 3 }, goal: { x: 0, y: 0 }, gems: [{ x: 0, y: 2 }],
      palette: ["forward", "left", "right"], par: 5,
      hint: "vorwärts, vorwärts, links(), vorwärts, vorwärts",
    },
    {
      title: "Haken",
      story: "Kombiniere Drehen und Gehen wie ein echter Algorithmus.",
      w: 6, h: 5, walls: ["3,0", "3,1", "3,2"],
      start: { x: 0, y: 2, d: 1 }, goal: { x: 5, y: 4 }, gems: [],
      palette: ["forward", "left", "right"], par: 8,
      hint: "Geh bis zur Wand, dann rechts() und weiter.",
    },
    {
      title: "Schleife",
      story: "🔁 2× wiederholt den nächsten Baustein — spart Tipparbeit!",
      w: 6, h: 4, walls: [],
      start: { x: 0, y: 1, d: 1 }, goal: { x: 5, y: 1 }, gems: [],
      palette: ["forward", "rep2", "rep3"], par: 2,
      hint: "🔁 3× und direkt danach vorwärts().",
    },
    {
      title: "Zickzack",
      story: "Wiederhole ein Muster: vorwärts + rechts mehrmals.",
      w: 5, h: 5, walls: ["2,0", "2,2", "2,4"],
      start: { x: 0, y: 0, d: 2 }, goal: { x: 4, y: 4 }, gems: [{ x: 4, y: 0 }],
      palette: ["forward", "right", "rep2", "rep3"], par: 6,
      hint: "Nutze 🔁 2× mit vorwärts() und rechts() im Wechsel.",
    },
    {
      title: "Engpass",
      story: "Plane den Weg durch den Tunnel — Debuggen heißt: nachdenken!",
      w: 7, h: 5,
      walls: ["1,1", "2,1", "3,1", "4,1", "5,1", "1,3", "2,3", "3,3", "4,3", "5,3"],
      start: { x: 0, y: 2, d: 1 }, goal: { x: 6, y: 2 }, gems: [{ x: 3, y: 2 }],
      palette: ["forward", "left", "right"], par: 10,
      hint: "Oben rum oder unten rum — beides geht.",
    },
    {
      title: "Doppel-Schleife",
      story: "Schleifen sind der Motor fast jedes Spiels — probier 🔁 3×!",
      w: 7, h: 4, walls: [],
      start: { x: 0, y: 2, d: 1 }, goal: { x: 6, y: 2 }, gems: [],
      palette: ["forward", "rep2", "rep3"], par: 2,
      hint: "🔁 3× + vorwärts() = 6 Schritte.",
    },
    {
      title: "Labyrinth",
      story: "Finde den kürzesten Weg. Variablen im Kopf zählen auch!",
      w: 6, h: 6,
      walls: ["1,0", "1,1", "1,2", "3,2", "3,3", "3,4", "3,5", "5,1", "5,2"],
      start: { x: 0, y: 0, d: 2 }, goal: { x: 5, y: 5 }, gems: [{ x: 0, y: 5 }],
      palette: ["forward", "left", "right", "rep2"], par: 12,
      hint: "Geh am Rand entlang, drehe rechtzeitig.",
    },
    {
      title: "Sammeln",
      story: "Optional: Sammle die Diamanten für Extra-XP — dann zum Stern.",
      w: 6, h: 5, walls: ["2,1", "2,2", "2,3"],
      start: { x: 0, y: 2, d: 1 }, goal: { x: 5, y: 2 },
      gems: [{ x: 2, y: 0 }, { x: 2, y: 4 }],
      palette: ["forward", "left", "right", "rep2"], par: 9,
      hint: "Erst Diamant oben, zurück, unten, dann Ziel.",
    },
    {
      title: "Meister-Level",
      story: "Letzte Prüfung für Coder-Meister: alles zusammen!",
      w: 7, h: 6,
      walls: ["1,1", "2,1", "3,1", "4,1", "5,1", "1,4", "2,4", "3,4", "4,4", "5,4"],
      start: { x: 0, y: 0, d: 2 }, goal: { x: 6, y: 5 },
      gems: [{ x: 6, y: 0 }, { x: 0, y: 5 }],
      palette: ["forward", "left", "right", "rep2", "rep3"], par: 14,
      hint: "Kombiniere Schleifen für lange Geraden und Drehungen für Ecken.",
    },
  ];

  const QUIZ = [
    {
      title: "Variable",
      caption: "Eine Variable ist eine benannte Box für Werte.",
      question: "Was speichert name = \"Cool\"?",
      demo: "var",
      choices: [
        { t: "Den Text Cool in name", ok: true, h: "Richtig — name ist die Box, Cool der Inhalt." },
        { t: "Nur die Zahl 0", ok: false, h: "Text steht in Anführungszeichen." },
        { t: "Löscht den Computer", ok: false, h: "Variablen sind harmlos und nützlich!" },
      ],
    },
    {
      title: "Schleife",
      caption: "Schleifen wiederholen Code — ideal für Bewegung im Spiel.",
      question: "Was macht for (3) { spring(); }?",
      demo: "loop",
      choices: [
        { t: "Ruft spring() 3-mal auf", ok: true, h: "Genau — 3 Wiederholungen." },
        { t: "Springt nur wenn 3 > 0 einmal", ok: false, h: "Das wäre eher if, nicht for." },
        { t: "Löscht spring()", ok: false, h: "Schleifen führen Code aus, nicht löschen." },
      ],
    },
    {
      title: "Wenn-Dann",
      caption: "if entscheidet zur Laufzeit, welcher Zweig läuft.",
      question: "Wann gewinnst du bei if (punkte >= 10)?",
      demo: "if",
      choices: [
        { t: "Ab 10 Punkten", ok: true, h: "Ja — Bedingung muss wahr sein." },
        { t: "Immer sofort", ok: false, h: "if prüft erst die Bedingung." },
        { t: "Nur bei genau 5", ok: false, h: ">= heißt größer oder gleich 10." },
      ],
    },
    {
      title: "Funktion",
      caption: "Funktionen packen Schritte in ein wiederverwendbares Paket.",
      question: "Wie startest du gruessen()?",
      demo: "fn",
      choices: [
        { t: "gruessen();", ok: true, h: "Klammern = Funktion ausführen!" },
        { t: "function gruessen", ok: false, h: "Das definiert, ruft nicht auf." },
        { t: "stop gruessen", ok: false, h: "So stoppt man keine Funktion." },
      ],
    },
    {
      title: "Bug fixen",
      caption: "Debuggen = Fehler finden und den Code verbessern.",
      question: "Roboter läuft gegen Wand — was zuerst?",
      demo: "bug",
      choices: [
        { t: "Programm Schritt für Schritt prüfen", ok: true, h: "Super — so debuggen Profis!" },
        { t: "Computer ausschalten und weg", ok: false, h: "Der Bug bleibt dann im Code 😄" },
        { t: "Einfach mehr vorwärts()", ok: false, h: "Mehr vom Falschen hilft selten." },
      ],
    },
    {
      title: "HTML",
      caption: "HTML baut die Struktur einer Webseite.",
      question: "Was ist <button>?",
      demo: "html",
      choices: [
        { t: "Ein klickbarer Button", ok: true, h: "Genau — so wie „Start“ hier." },
        { t: "Ein Virus", ok: false, h: "HTML ist nur Markup, kein Virus." },
        { t: "Eine Schleife", ok: false, h: "Schleifen sind in JavaScript/Python." },
      ],
    },
    {
      title: "JavaScript",
      caption: "JavaScript macht Seiten lebendig — Logik, Klicks, Spiele.",
      question: "Was macht addEventListener(\"click\", …)?",
      demo: "js",
      choices: [
        { t: "Reagiert auf Mausklick", ok: true, h: "Richtig — Events verbinden Input und Code." },
        { t: "Druckt die Seite", ok: false, h: "Das wäre window.print()." },
        { t: "Löscht alle Dateien", ok: false, h: "Event-Listener sind harmlos." },
      ],
    },
    {
      title: "Spiel-Bau",
      caption: "Spiele = Eingabe + Update + Zeichnen in einer Schleife.",
      question: "Was passiert in jedem Frame eines Spiels?",
      demo: "game",
      choices: [
        { t: "Eingabe lesen, Logik, Bild neu zeichnen", ok: true, h: "Die Game-Loop — Herz jedes Spiels!" },
        { t: "Nur ein Foto anzeigen", ok: false, h: "Spiele bewegen sich und reagieren." },
        { t: "Gar nichts", ok: false, h: "Ohne Loop kein Spiel." },
      ],
    },
  ];

  const screens = {
    start: document.getElementById("screen-start"),
    menu: document.getElementById("screen-menu"),
    levels: document.getElementById("screen-levels"),
    adventure: document.getElementById("screen-adventure"),
    quiz: document.getElementById("screen-quiz"),
    camera: document.getElementById("screen-camera"),
  };

  const elNameInput = document.getElementById("input-name");
  const elNameLabel = document.getElementById("player-name-label");
  const hudGlobal = document.getElementById("hud-global");
  const elHudXp = document.getElementById("hud-xp");
  const elHudRank = document.getElementById("hud-rank");
  const elHudStars = document.getElementById("hud-stars");
  const elProgress = document.getElementById("progress-text");
  const elQuizProgress = document.getElementById("quiz-progress");
  const elWorldBar = document.getElementById("world-progress");
  const heroCanvas = document.getElementById("hero-canvas");
  const gameCanvas = document.getElementById("game-canvas");
  const quizCanvas = document.getElementById("quiz-demo");
  const elLevelMap = document.getElementById("level-map");
  const elLevelBadge = document.getElementById("level-badge");
  const elLevelStory = document.getElementById("level-story");
  const elBlockPalette = document.getElementById("block-palette");
  const elProgramStrip = document.getElementById("program-strip");
  const elGameMessage = document.getElementById("game-message");
  const elRunOverlay = document.getElementById("run-overlay");
  const elLevelComplete = document.getElementById("level-complete");
  const elStarRow = document.getElementById("star-row");
  const elCompleteText = document.getElementById("complete-text");

  let playerName = "Cool";
  let xp = 0;
  let totalStars = 0;
  let levelStars = {};
  let quizDone = new Set();
  let avatarImg = null;
  let currentLevel = 0;
  let program = [];
  let sim = null;
  let running = false;
  let cameraStream = null;
  let pendingPhoto = "";
  let quizIndex = 0;
  let quizAnswered = false;
  let audioCtx = null;

  function load() {
    try {
      playerName = localStorage.getItem(KEY.name) || "Cool";
      xp = parseInt(localStorage.getItem(KEY.xp) || "0", 10) || 0;
      totalStars = parseInt(localStorage.getItem(KEY.stars) || "0", 10) || 0;
      levelStars = JSON.parse(localStorage.getItem(KEY.levels) || "{}");
      quizDone = new Set(JSON.parse(localStorage.getItem(KEY.quiz) || "[]"));
      const av = localStorage.getItem(KEY.avatar);
      if (av) {
        avatarImg = new Image();
        avatarImg.src = av;
      }
    } catch (_) {}
    elNameInput.value = playerName;
    elNameLabel.textContent = playerName;
    updateHud();
  }

  function save() {
    try {
      localStorage.setItem(KEY.name, playerName);
      localStorage.setItem(KEY.xp, String(xp));
      localStorage.setItem(KEY.stars, String(totalStars));
      localStorage.setItem(KEY.levels, JSON.stringify(levelStars));
      localStorage.setItem(KEY.quiz, JSON.stringify([...quizDone]));
    } catch (_) {}
    updateHud();
  }

  function rankForXp(n) {
    let r = RANKS[0][1];
    for (const [need, name] of RANKS) {
      if (n >= need) r = name;
    }
    return r;
  }

  function updateHud() {
    elHudXp.textContent = String(xp);
    elHudRank.textContent = rankForXp(xp);
    elHudStars.textContent = String(totalStars);
    const doneLevels = Object.keys(levelStars).length;
    elProgress.textContent = `${doneLevels} / ${LEVELS.length}`;
    elQuizProgress.textContent = `${quizDone.size} / ${QUIZ.length}`;
    elWorldBar.style.width = `${(doneLevels / LEVELS.length) * 100}%`;
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
    hudGlobal.classList.toggle("hidden", name === "start");
  }

  function beep(freq, dur = 0.08, vol = 0.06) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur);
    } catch (_) {}
  }

  function wallSet(L) {
    return new Set(L.walls || []);
  }

  function isBlocked(L, x, y) {
    if (x < 0 || y < 0 || x >= L.w || y >= L.h) return true;
    return wallSet(L).has(`${x},${y}`);
  }

  function expandProgram(blocks) {
    const out = [];
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b === "rep2" || b === "rep3") {
        const next = blocks[i + 1];
        if (!next || next === "rep2" || next === "rep3") continue;
        const n = b === "rep2" ? 2 : 3;
        for (let k = 0; k < n; k++) out.push(next);
        i++;
      } else {
        out.push(b);
      }
    }
    return out;
  }

  function cloneSim(L) {
    return {
      x: L.start.x,
      y: L.start.y,
      d: L.start.d,
      gems: new Set((L.gems || []).map((g) => `${g.x},${g.y}`)),
      collected: 0,
    };
  }

  function stepSim(s, cmd, L) {
    if (cmd === "left") {
      s.d = (s.d + 3) % 4;
      return true;
    }
    if (cmd === "right") {
      s.d = (s.d + 1) % 4;
      return true;
    }
    if (cmd === "forward") {
      const nx = s.x + DIRS[s.d].x;
      const ny = s.y + DIRS[s.d].y;
      if (isBlocked(L, nx, ny)) return false;
      s.x = nx;
      s.y = ny;
      const key = `${s.x},${s.y}`;
      if (s.gems.has(key)) {
        s.gems.delete(key);
        s.collected++;
      }
      return true;
    }
    return true;
  }

  function drawGrid(ctx, L, s, cell, pulse = 0) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    ctx.fillStyle = "#0f1623";
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < L.h; y++) {
      for (let x = 0; x < L.w; x++) {
        const px = x * cell;
        const py = y * cell;
        ctx.fillStyle = (x + y) % 2 ? "#141c2e" : "#111827";
        ctx.fillRect(px, py, cell, cell);
        if (wallSet(L).has(`${x},${y}`)) {
          ctx.fillStyle = "#374151";
          ctx.fillRect(px + 2, py + 2, cell - 4, cell - 4);
          ctx.strokeStyle = "#6b7280";
          ctx.strokeRect(px + 4, py + 4, cell - 8, cell - 8);
        }
      }
    }

    (L.gems || []).forEach((g) => {
      const key = `${g.x},${g.y}`;
      if (s.gems.has(key)) {
        const cx = g.x * cell + cell / 2;
        const cy = g.y * cell + cell / 2;
        ctx.fillStyle = "#22d3ee";
        ctx.beginPath();
        ctx.moveTo(cx, cy - cell * 0.22);
        ctx.lineTo(cx + cell * 0.2, cy);
        ctx.lineTo(cx, cy + cell * 0.22);
        ctx.lineTo(cx - cell * 0.2, cy);
        ctx.closePath();
        ctx.fill();
      }
    });

    const gx = L.goal.x * cell + cell / 2;
    const gy = L.goal.y * cell + cell / 2;
    const gr = cell * 0.28 + pulse * 4;
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x = gx + Math.cos(a) * gr;
      const y = gy + Math.sin(a) * gr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const rx = s.x * cell + cell / 2;
    const ry = s.y * cell + cell / 2;
    const rr = cell * 0.32;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate((s.d * Math.PI) / 2);
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(0, 0, rr, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5eead4";
    ctx.fillRect(rr * 0.2, -rr * 0.15, rr * 0.9, rr * 0.3);
    if (avatarImg && avatarImg.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, -rr * 0.05, rr * 0.55, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, -rr * 0.55, -rr * 0.6, rr * 1.1, rr * 1.1);
      ctx.restore();
    } else {
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${cell * 0.28}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🤖", 0, -rr * 0.05);
    }
    ctx.restore();
  }

  let animPulse = 0;
  let animId = null;

  function startBoardAnim(L, s) {
    cancelAnimationFrame(animId);
    const ctx = gameCanvas.getContext("2d");
    const cell = gameCanvas.width / Math.max(L.w, L.h);
    const tick = (ts) => {
      animPulse = Math.sin(ts / 300) * 0.5 + 0.5;
      drawGrid(ctx, L, s, cell, animPulse);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
  }

  function renderProgram() {
    elProgramStrip.innerHTML = "";
    elProgramStrip.classList.toggle("empty", program.length === 0);
    if (!program.length) {
      const ph = document.createElement("span");
      ph.className = "program-placeholder";
      ph.textContent = "Bausteine hierher …";
      elProgramStrip.appendChild(ph);
      return;
    }
    program.forEach((id, idx) => {
      const b = BLOCKS[id];
      const el = document.createElement("button");
      el.type = "button";
      el.className = `prog-block${b.kind === "loop" ? " loop" : ""}`;
      el.textContent = b.label;
      el.addEventListener("click", () => {
        if (running) return;
        program.splice(idx, 1);
        renderProgram();
        beep(220, 0.05);
      });
      elProgramStrip.appendChild(el);
    });
  }

  function buildPalette(L) {
    elBlockPalette.innerHTML = "";
    L.palette.forEach((id) => {
      const b = BLOCKS[id];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "block-btn";
      btn.dataset.kind = b.kind;
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        if (running) return;
        program.push(id);
        renderProgram();
        beep(440, 0.04);
      });
      elBlockPalette.appendChild(btn);
    });
  }

  function starsForRun(blockCount, par) {
    if (blockCount <= par) return 3;
    if (blockCount <= par + 2) return 2;
    return 1;
  }

  function isLevelUnlocked(i) {
    if (i === 0) return true;
    return levelStars[i - 1] != null;
  }

  function renderLevelMap() {
    elLevelMap.innerHTML = "";
    LEVELS.forEach((L, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level-node";
      const stars = levelStars[i] || 0;
      if (stars > 0) btn.classList.add("done");
      if (!isLevelUnlocked(i)) btn.disabled = true;
      btn.innerHTML = `<span class="node-num">${i + 1}</span><span>${"★".repeat(stars) || "·"}</span>`;
      btn.title = L.title;
      btn.addEventListener("click", () => openLevel(i));
      elLevelMap.appendChild(btn);
    });
  }

  function openLevel(i) {
    currentLevel = i;
    const L = LEVELS[i];
    program = [];
    elLevelComplete.classList.add("hidden");
    elGameMessage.textContent = "";
    elGameMessage.classList.remove("err");
    elLevelBadge.textContent = `Level ${i + 1}: ${L.title}`;
    elLevelStory.textContent = L.story;
    buildPalette(L);
    renderProgram();
    sim = cloneSim(L);
    startBoardAnim(L, sim);
    showScreen("adventure");
  }

  async function runProgram() {
    if (running) return;
    const L = LEVELS[currentLevel];
    const expanded = expandProgram(program);
    if (!expanded.length) {
      elGameMessage.textContent = "Lege zuerst Bausteine ins Programm.";
      elGameMessage.classList.add("err");
      return;
    }
    running = true;
    elRunOverlay.classList.remove("hidden");
    elLevelComplete.classList.add("hidden");
    elGameMessage.textContent = "";
    elGameMessage.classList.remove("err");

    sim = cloneSim(L);
    const ctx = gameCanvas.getContext("2d");
    const cell = gameCanvas.width / Math.max(L.w, L.h);

    for (const cmd of expanded) {
      cancelAnimationFrame(animId);
      drawGrid(ctx, L, sim, cell, 0);
      await new Promise((r) => setTimeout(r, 380));
      const ok = stepSim(sim, cmd, L);
      beep(cmd === "forward" ? 520 : 340, 0.06);
      drawGrid(ctx, L, sim, cell, 0);
      if (!ok) {
        elGameMessage.textContent = "Autsch — Wand! Ändere dein Programm und probier nochmal.";
        elGameMessage.classList.add("err");
        beep(120, 0.2);
        running = false;
        elRunOverlay.classList.add("hidden");
        startBoardAnim(L, sim);
        return;
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    running = false;
    elRunOverlay.classList.add("hidden");

    if (sim.x === L.goal.x && sim.y === L.goal.y) {
      const stars = starsForRun(program.length, L.par);
      const prev = levelStars[currentLevel] || 0;
      if (stars > prev) {
        totalStars += stars - prev;
        levelStars[currentLevel] = stars;
      } else if (prev === 0) {
        levelStars[currentLevel] = stars;
        totalStars += stars;
      }
      const gain = stars * 10 + sim.collected * 15;
      xp += gain;
      save();
      beep(660, 0.1);
      setTimeout(() => beep(880, 0.12), 100);

      elStarRow.innerHTML = [1, 2, 3]
        .map((n) => `<span class="${n <= stars ? "lit" : ""}">${n <= stars ? "★" : "☆"}</span>`)
        .join("");
      elCompleteText.textContent = `${playerName} +${gain} XP! ${sim.collected ? `Diamanten: ${sim.collected}. ` : ""}${stars === 3 ? "Perfekt — wenig Bausteine!" : "Geschafft — probier weniger Bausteine für mehr Sterne."}`;
      elLevelComplete.classList.remove("hidden");
      startBoardAnim(L, sim);
    } else {
      elGameMessage.textContent = "Noch nicht am Stern — ergänze mehr Bausteine.";
      elGameMessage.classList.add("err");
      startBoardAnim(L, sim);
    }
  }

  function renderQuiz(i) {
    quizIndex = i;
    quizAnswered = false;
    const Q = QUIZ[i];
    document.getElementById("quiz-badge").textContent = `Karte ${i + 1} / ${QUIZ.length}`;
    document.getElementById("quiz-title").textContent = Q.title;
    document.getElementById("quiz-caption").textContent = Q.caption;
    document.getElementById("quiz-question").textContent = Q.question;
    const fb = document.getElementById("quiz-feedback");
    fb.className = "feedback hidden";
    document.getElementById("btn-quiz-next").classList.add("hidden");
    const ch = document.getElementById("quiz-choices");
    ch.innerHTML = "";
    Q.choices.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = c.t;
      btn.addEventListener("click", () => {
        if (quizAnswered) return;
        quizAnswered = true;
        ch.querySelectorAll(".choice-btn").forEach((b) => { b.disabled = true; });
        btn.classList.add(c.ok ? "ok" : "bad");
        fb.textContent = `${playerName}: ${c.h}`;
        fb.className = `feedback ${c.ok ? "ok" : "bad"}`;
        if (c.ok) {
          if (!quizDone.has(i)) {
            quizDone.add(i);
            xp += 12;
            save();
          }
          beep(740, 0.08);
        } else beep(160, 0.12);
        document.getElementById("btn-quiz-next").classList.remove("hidden");
        document.getElementById("btn-quiz-next").textContent =
          i < QUIZ.length - 1 ? "Nächste Karte" : "Zurück zum Menü";
      });
      ch.appendChild(btn);
    });
    runQuizDemo(Q.demo);
  }

  let demoAnim = null;
  function runQuizDemo(type) {
    cancelAnimationFrame(demoAnim);
    const ctx = quizCanvas.getContext("2d");
    let f = 0;
    const loop = () => {
      f++;
      const w = quizCanvas.width;
      const h = quizCanvas.height;
      ctx.fillStyle = "#0f1623";
      ctx.fillRect(0, 0, w, h);

      if (type === "var") {
        ctx.fillStyle = "#374151";
        ctx.fillRect(40, 60, 100, 80);
        ctx.fillStyle = "#5eead4";
        ctx.font = "bold 14px monospace";
        ctx.fillText("name", 55, 55);
        const t = Math.min(1, f / 60);
        ctx.fillStyle = "#818cf8";
        ctx.fillRect(50, 90, 80 * t, 30);
        ctx.fillStyle = "#fff";
        ctx.fillText("Cool", 60, 110);
      } else if (type === "loop") {
        for (let i = 0; i < 3; i++) {
          const on = Math.floor(f / 25) % 3 === i;
          ctx.fillStyle = on ? "#fbbf24" : "#4b5563";
          ctx.beginPath();
          ctx.arc(80 + i * 70, 100, 22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.fillText("spring()", 95, 160);
      } else if (type === "if") {
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(30, 50, 220, 40);
        ctx.fillStyle = "#fff";
        ctx.font = "13px monospace";
        ctx.fillText("punkte >= 10 ?", 45, 75);
        ctx.fillStyle = f % 60 < 30 ? "#4ade80" : "#374151";
        ctx.fillRect(30, 110, 90, 50);
        ctx.fillStyle = "#fff";
        ctx.fillText("Gewonnen", 40, 140);
        ctx.fillStyle = f % 60 >= 30 ? "#fb7185" : "#374151";
        ctx.fillRect(160, 110, 90, 50);
        ctx.fillText("Weiter", 175, 140);
      } else if (type === "fn") {
        ctx.strokeStyle = "#5eead4";
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 40, 120, 60);
        ctx.fillStyle = "#fff";
        ctx.font = "13px monospace";
        ctx.fillText("gruessen()", 45, 75);
        if (f > 40) {
          ctx.fillStyle = "#fbbf24";
          ctx.fillText("→ Hallo!", 170, 75);
        }
      } else if (type === "bug") {
        ctx.fillStyle = "#6366f1";
        ctx.fillRect(40 + (f % 100), 90, 24, 24);
        ctx.fillStyle = "#374151";
        ctx.fillRect(130, 85, 20, 90);
        ctx.fillStyle = "#fb7185";
        ctx.font = "12px sans-serif";
        ctx.fillText("Wand!", 155, 80);
      } else if (type === "html") {
        ctx.fillStyle = "#818cf8";
        ctx.fillRect(60, 70, 160, 44);
        ctx.fillStyle = "#fff";
        ctx.font = "14px monospace";
        ctx.fillText("<button>Start</button>", 68, 98);
      } else if (type === "js") {
        const click = f > 50 && f < 65;
        ctx.fillStyle = click ? "#4ade80" : "#6366f1";
        ctx.fillRect(80, 80, 120, 40);
        ctx.fillStyle = "#fff";
        ctx.fillText("Klick!", 115, 105);
      } else if (type === "game") {
        const px = 40 + (f * 2) % 200;
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(px, 100, 20, 20);
        ctx.fillStyle = "#fff";
        ctx.font = "11px sans-serif";
        ctx.fillText("Input → Logik → Draw", 50, 60);
      }

      demoAnim = requestAnimationFrame(loop);
    };
    demoAnim = requestAnimationFrame(loop);
  }

  function drawHero(ts) {
    const ctx = heroCanvas.getContext("2d");
    const w = heroCanvas.width;
    const h = heroCanvas.height;
    ctx.fillStyle = "#0f1623";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const x = (i * 97 + ts * 0.02) % w;
      const y = 30 + (i * 53) % (h - 40);
      ctx.fillStyle = `rgba(94,234,212,${0.15 + (i % 5) * 0.05})`;
      ctx.fillRect(x, y, 3, 3);
    }
    const bob = Math.sin(ts / 400) * 6;
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(w * 0.35, h / 2 + bob, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5eead4";
    ctx.fillRect(w * 0.35 + 20, h / 2 + bob - 8, 40, 16);
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(w * 0.72, h / 2 + Math.sin(ts / 500) * 4, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText("Lernen Programieren", w * 0.48, h - 24);
    requestAnimationFrame(drawHero);
  }

  async function openCamera() {
    stopCamera();
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      const v = document.getElementById("camera-video");
      v.srcObject = cameraStream;
      v.classList.remove("hidden");
      document.getElementById("camera-placeholder").classList.add("hidden");
      document.getElementById("btn-camera-snap").classList.remove("hidden");
      document.getElementById("btn-camera-open").textContent = "Stop";
    } catch {
      elGameMessage.textContent = "Kamera nicht verfügbar — Bild hochladen.";
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      cameraStream = null;
    }
    document.getElementById("camera-video").classList.add("hidden");
    document.getElementById("btn-camera-snap").classList.add("hidden");
    document.getElementById("btn-camera-open").textContent = "Kamera";
  }

  document.getElementById("btn-start").addEventListener("click", () => {
    playerName = (elNameInput.value || "Cool").trim().slice(0, 24) || "Cool";
    elNameLabel.textContent = playerName;
    save();
    showScreen("menu");
  });

  document.querySelectorAll(".menu-card").forEach((card) => {
    card.addEventListener("click", () => {
      const mode = card.dataset.mode;
      if (mode === "adventure") {
        renderLevelMap();
        showScreen("levels");
      } else if (mode === "quiz") {
        renderQuiz(quizDone.size < QUIZ.length ? quizDone.size : 0);
        showScreen("quiz");
      } else if (mode === "camera") {
        showScreen("camera");
      }
    });
  });

  document.getElementById("btn-levels-back").addEventListener("click", () => showScreen("menu"));
  document.getElementById("btn-adv-back").addEventListener("click", () => {
    renderLevelMap();
    showScreen("levels");
  });
  document.getElementById("btn-quiz-back").addEventListener("click", () => showScreen("menu"));
  document.getElementById("btn-camera-back").addEventListener("click", () => {
    stopCamera();
    showScreen("menu");
  });

  document.getElementById("btn-run").addEventListener("click", runProgram);
  document.getElementById("btn-reset-prog").addEventListener("click", () => {
    if (running) return;
    program = [];
    renderProgram();
    elGameMessage.textContent = "";
  });
  document.getElementById("btn-hint").addEventListener("click", () => {
    const L = LEVELS[currentLevel];
    elGameMessage.textContent = `💡 ${L.hint}`;
    elGameMessage.classList.remove("err");
  });

  document.getElementById("btn-next-level").addEventListener("click", () => {
    const next = currentLevel + 1;
    if (next < LEVELS.length && isLevelUnlocked(next)) openLevel(next);
    else {
      renderLevelMap();
      showScreen("levels");
    }
  });
  document.getElementById("btn-retry").addEventListener("click", () => openLevel(currentLevel));

  document.getElementById("btn-quiz-next").addEventListener("click", () => {
    if (quizIndex < QUIZ.length - 1) renderQuiz(quizIndex + 1);
    else showScreen("menu");
  });

  document.getElementById("btn-camera-open").addEventListener("click", () => {
    if (cameraStream) stopCamera();
    else openCamera();
  });
  document.getElementById("btn-camera-snap").addEventListener("click", () => {
    const v = document.getElementById("camera-video");
    const c = document.getElementById("camera-canvas");
    const ctx = c.getContext("2d");
    c.width = v.videoWidth || 320;
    c.height = v.videoHeight || 240;
    ctx.drawImage(v, 0, 0);
    pendingPhoto = c.toDataURL("image/jpeg", 0.85);
    const img = document.getElementById("camera-preview");
    img.src = pendingPhoto;
    img.classList.remove("hidden");
    document.getElementById("btn-camera-use").classList.remove("hidden");
    stopCamera();
  });
  document.getElementById("btn-camera-use").addEventListener("click", () => {
    const data = pendingPhoto || document.getElementById("camera-preview").src;
    if (!data) return;
    try { localStorage.setItem(KEY.avatar, data); } catch (_) {}
    avatarImg = new Image();
    avatarImg.src = data;
    avatarImg.onload = () => {
      if (sim) startBoardAnim(LEVELS[currentLevel], sim);
    };
    document.getElementById("camera-placeholder").classList.add("hidden");
    showScreen("menu");
  });
  document.getElementById("input-file").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      pendingPhoto = reader.result;
      const img = document.getElementById("camera-preview");
      img.src = pendingPhoto;
      img.classList.remove("hidden");
      document.getElementById("camera-placeholder").classList.add("hidden");
      document.getElementById("btn-camera-use").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  });

  load();
  requestAnimationFrame(drawHero);
})();
