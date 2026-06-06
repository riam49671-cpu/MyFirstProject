(() => {
  const GRID = 16;
  const CELL = 40;
  const PAD = 0;
  const MAX_LAYER = 8;
  const SAVE_KEY = "lego-bauplatz-save";

  const COLORS = {
    red: { fill: "#e11d48", dark: "#9f1239", light: "#fb7185" },
    blue: { fill: "#2563eb", dark: "#1e40af", light: "#60a5fa" },
    yellow: { fill: "#eab308", dark: "#a16207", light: "#fde047" },
    green: { fill: "#16a34a", dark: "#15803d", light: "#4ade80" },
    white: { fill: "#f1f5f9", dark: "#cbd5e1", light: "#ffffff" },
    orange: { fill: "#ea580c", dark: "#c2410c", light: "#fb923c" },
    black: { fill: "#334155", dark: "#1e293b", light: "#64748b" },
  };

  const BRICK_TYPES = [
    { id: "1x1", w: 1, d: 1, label: "1×1" },
    { id: "1x2", w: 1, d: 2, label: "1×2" },
    { id: "2x2", w: 2, d: 2, label: "2×2" },
    { id: "2x3", w: 2, d: 3, label: "2×3" },
    { id: "2x4", w: 2, d: 4, label: "2×4" },
    { id: "1x4", w: 1, d: 4, label: "1×4" },
  ];

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const brickPick = document.getElementById("brick-pick");
  const colorPick = document.getElementById("color-pick");
  const statusEl = document.getElementById("status");
  const countEl = document.getElementById("brick-count");
  const layerNumEl = document.getElementById("layer-num");
  const btnRotate = document.getElementById("btn-rotate");
  const btnErase = document.getElementById("btn-erase");
  const btnUndo = document.getElementById("btn-undo");
  const btnClear = document.getElementById("btn-clear");
  const btnLayerUp = document.getElementById("btn-layer-up");
  const btnLayerDown = document.getElementById("btn-layer-down");

  let placed = [];
  let history = [];
  let selectedType = BRICK_TYPES[2];
  let selectedColor = "red";
  let rotation = 0;
  let layer = 0;
  let eraseMode = false;
  let hover = null;

  function sizeOf(type, rot) {
    if (rot % 2 === 1) return { w: type.d, d: type.w };
    return { w: type.w, d: type.d };
  }

  function overlaps(ax, ay, aw, ad, bx, by, bw, bd) {
    return ax < bx + bw && ax + aw > bx && ay < by + bd && ay + ad > by;
  }

  function brickAt(gx, gy, z) {
    return placed.find((b) => {
      if (b.layer !== z) return false;
      const { w, d } = sizeOf(b.type, b.rot);
      return gx >= b.x && gx < b.x + w && gy >= b.y && gy < b.y + d;
    });
  }

  function hasSupport(x, y, w, d, z) {
    if (z === 0) return true;
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < d; dy++) {
        if (!brickAt(x + dx, y + dy, z - 1)) return false;
      }
    }
    return true;
  }

  function canPlace(x, y, type, rot, z) {
    const { w, d } = sizeOf(type, rot);
    if (x < 0 || y < 0 || x + w > GRID || y + d > GRID) return false;
    for (const b of placed) {
      if (b.layer !== z) continue;
      const s = sizeOf(b.type, b.rot);
      if (overlaps(b.x, b.y, s.w, s.d, x, y, w, d)) return false;
    }
    return hasSupport(x, y, w, d, z);
  }

  function pushHistory() {
    history.push(JSON.stringify(placed));
    if (history.length > 40) history.shift();
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(placed));
    } catch {
      /* ignore */
    }
    countEl.textContent = String(placed.length);
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          placed = data.map((b) => ({
            ...b,
            type: BRICK_TYPES.find((t) => t.id === b.type?.id || t.id === b.typeId) || BRICK_TYPES[0],
          }));
        }
      }
    } catch {
      placed = [];
    }
    countEl.textContent = String(placed.length);
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function drawStud(cx, cy, r, light) {
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  function drawBrickAt(px, py, w, d, colorName, alpha = 1, lift = 0) {
    const c = COLORS[colorName] || COLORS.red;
    const bw = w * CELL - 2;
    const bd = d * CELL - 2;
    const x = px + 1;
    const y = py + 1 - lift;

    ctx.globalAlpha = alpha;

    ctx.fillStyle = c.dark;
    ctx.fillRect(x + 3, y + bd - 2, bw, 4);

    ctx.fillStyle = c.fill;
    ctx.fillRect(x, y, bw, bd);

    ctx.fillStyle = c.light;
    ctx.fillRect(x + 2, y + 2, bw - 4, 5);
    ctx.fillRect(x + 2, y + 2, 4, bd - 4);

    const studR = Math.min(CELL * 0.16, 5);
    for (let sx = 0; sx < w; sx++) {
      for (let sy = 0; sy < d; sy++) {
        drawStud(
          px + sx * CELL + CELL / 2,
          py + sy * CELL + CELL / 2 - lift,
          studR,
          c.light
        );
      }
    }

    ctx.strokeStyle = "rgba(0,0,0,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bd - 1);
    ctx.globalAlpha = 1;
  }

  function gridToPx(gx, gy) {
    return { px: PAD + gx * CELL, py: PAD + gy * CELL };
  }

  function pxToGrid(px, py) {
    return {
      gx: Math.floor((px - PAD) / CELL),
      gy: Math.floor((py - PAD) / CELL),
    };
  }

  function drawPlate() {
    ctx.fillStyle = "#2d6a4f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const { px, py } = gridToPx(x, y);
        ctx.fillStyle = (x + y) % 2 === 0 ? "#40916c" : "#52b788";
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);
      }
    }
  }

  function drawAll() {
    drawPlate();

    const sorted = [...placed].sort((a, b) => a.layer - b.layer);
    for (const b of sorted) {
      const { w, d } = sizeOf(b.type, b.rot);
      const { px, py } = gridToPx(b.x, b.y);
      const lift = b.layer * 5;
      const dim = b.layer < layer ? 0.55 : 1;
      drawBrickAt(px, py, w, d, b.color, dim, lift);
    }

    if (hover && !eraseMode) {
      const { w, d } = sizeOf(selectedType, rotation);
      const { px, py } = gridToPx(hover.gx, hover.gy);
      const ok = canPlace(hover.gx, hover.gy, selectedType, rotation, layer);
      drawBrickAt(px, py, w, d, selectedColor, ok ? 0.45 : 0.25, layer * 5);
      if (!ok) {
        ctx.fillStyle = "rgba(239,68,68,0.35)";
        ctx.fillRect(px, py, w * CELL, d * CELL);
      }
    }

    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - 28, canvas.width, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(`Etage ${layer + 1} von ${MAX_LAYER + 1}`, 10, canvas.height - 9);
  }

  function placeBrick(gx, gy) {
    if (!canPlace(gx, gy, selectedType, rotation, layer)) {
      setStatus("Hier geht nicht — andere Etage oder drehen!");
      return;
    }
    pushHistory();
    placed.push({
      id: `${Date.now()}-${Math.random()}`,
      x: gx,
      y: gy,
      type: selectedType,
      rot: rotation,
      color: selectedColor,
      layer,
    });
    save();
    setStatus(`Stein gesetzt! (${placed.length} insgesamt)`);
    drawAll();
  }

  function hasBricksAbove(hit) {
    const { w, d } = sizeOf(hit.type, hit.rot);
    for (const b of placed) {
      if (b.layer <= hit.layer) continue;
      const s = sizeOf(b.type, b.rot);
      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < d; dy++) {
          const gx = hit.x + dx;
          const gy = hit.y + dy;
          if (gx >= b.x && gx < b.x + s.w && gy >= b.y && gy < b.y + s.d) return true;
        }
      }
    }
    return false;
  }

  function removeAt(gx, gy) {
    for (let z = MAX_LAYER; z >= 0; z--) {
      const hit = brickAt(gx, gy, z);
      if (hit) {
        if (hasBricksAbove(hit)) {
          setStatus("Erst die Steine oben drauf wegnehmen!");
          return;
        }
        pushHistory();
        placed = placed.filter((b) => b.id !== hit.id);
        save();
        setStatus("Stein weg.");
        drawAll();
        return;
      }
    }
  }

  function buildPicker() {
    brickPick.innerHTML = "";
    BRICK_TYPES.forEach((type) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pick-btn" + (type.id === selectedType.id ? " active" : "");
      btn.dataset.id = type.id;
      const mini = document.createElement("canvas");
      mini.width = 40;
      mini.height = 40;
      const mc = mini.getContext("2d");
      mc.fillStyle = "#1e293b";
      mc.fillRect(0, 0, 40, 40);
      const { w, d } = sizeOf(type, 0);
      const scale = 14;
      const ox = (40 - w * scale) / 2;
      const oy = (40 - d * scale) / 2;
      const c = COLORS[selectedColor];
      for (let sy = 0; sy < d; sy++) {
        for (let sx = 0; sx < w; sx++) {
          mc.fillStyle = c.fill;
          mc.fillRect(ox + sx * scale, oy + sy * scale, scale - 1, scale - 1);
        }
      }
      btn.appendChild(mini);
      const lbl = document.createElement("span");
      lbl.textContent = type.label;
      btn.appendChild(lbl);
      btn.addEventListener("click", () => {
        selectedType = type;
        eraseMode = false;
        btnErase.classList.remove("active");
        buildPicker();
        setStatus(`${type.label} gewählt — klicke auf die Platte.`);
        drawAll();
      });
      brickPick.appendChild(btn);
    });
  }

  function buildColors() {
    colorPick.innerHTML = "";
    Object.keys(COLORS).forEach((name) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "color-btn" + (name === selectedColor ? " active" : "");
      btn.style.background = COLORS[name].fill;
      btn.title = name;
      btn.addEventListener("click", () => {
        selectedColor = name;
        buildColors();
        buildPicker();
        drawAll();
      });
      colorPick.appendChild(btn);
    });
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    return {
      px: (e.clientX - r.left) * sx,
      py: (e.clientY - r.top) * sy,
    };
  }

  canvas.addEventListener("mousemove", (e) => {
    const { px, py } = pointerPos(e);
    const { gx, gy } = pxToGrid(px, py);
    if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
      hover = { gx, gy };
    } else {
      hover = null;
    }
    drawAll();
  });

  canvas.addEventListener("mouseleave", () => {
    hover = null;
    drawAll();
  });

  canvas.addEventListener("click", (e) => {
    const { px, py } = pointerPos(e);
    const { gx, gy } = pxToGrid(px, py);
    if (gx < 0 || gy < 0 || gx >= GRID || gy >= GRID) return;
    if (eraseMode) removeAt(gx, gy);
    else placeBrick(gx, gy);
  });

  btnRotate.addEventListener("click", () => {
    rotation = (rotation + 1) % 2;
    setStatus("Stein gedreht.");
    drawAll();
  });

  btnErase.addEventListener("click", () => {
    eraseMode = !eraseMode;
    btnErase.classList.toggle("active", eraseMode);
    setStatus(eraseMode ? "Löschen: auf Stein klicken." : "Bauen: Stein setzen.");
  });

  btnUndo.addEventListener("click", () => {
    if (!history.length) {
      setStatus("Nichts zum Rückgängig.");
      return;
    }
    placed = JSON.parse(history.pop());
    placed = placed.map((b) => ({
      ...b,
      type: BRICK_TYPES.find((t) => t.id === (b.type?.id || b.typeId)) || BRICK_TYPES[0],
    }));
    save();
    setStatus("Rückgängig.");
    drawAll();
  });

  btnClear.addEventListener("click", () => {
    if (!placed.length) return;
    if (!confirm("Alles löschen und neu anfangen?")) return;
    pushHistory();
    placed = [];
    save();
    setStatus("Platte ist leer — leg los!");
    drawAll();
  });

  btnLayerUp.addEventListener("click", () => {
    if (layer < MAX_LAYER) {
      layer++;
      layerNumEl.textContent = String(layer + 1);
      setStatus(`Etage ${layer + 1} — baue höher!`);
      drawAll();
    }
  });

  btnLayerDown.addEventListener("click", () => {
    if (layer > 0) {
      layer--;
      layerNumEl.textContent = String(layer + 1);
      setStatus(`Etage ${layer + 1}.`);
      drawAll();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
      rotation = (rotation + 1) % 2;
      drawAll();
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      eraseMode = !eraseMode;
      btnErase.classList.toggle("active", eraseMode);
    }
    if (e.key === "ArrowUp") btnLayerUp.click();
    if (e.key === "ArrowDown") btnLayerDown.click();
  });

  load();
  buildColors();
  buildPicker();
  layerNumEl.textContent = "1";
  drawAll();
})();
