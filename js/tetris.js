(() => {
  const COLS = 10;
  const ROWS = 24;
  const HIDDEN = 4;
  const VISIBLE = ROWS - HIDDEN;
  const CELL = 28;
  const COLORS = {
    I: "#06b6d4",
    O: "#eab308",
    T: "#a855f7",
    S: "#22c55e",
    Z: "#ef4444",
    J: "#3b82f6",
    L: "#f97316",
    ghost: "rgba(255,255,255,0.12)",
    grid: "rgba(148,163,184,0.15)",
    empty: "#0f172a",
  };

  /** [rotation][cell] als [dx,dy] im 4×4-Block um Ursprung */
  const PIECES = {
    I: [
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    ],
    O: [
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
    ],
    T: [
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
    S: [
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
    Z: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
    ],
    J: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
    ],
    L: [
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    ],
  };

  const TYPES = Object.keys(PIECES);

  const canvas = document.getElementById("tetris-board");
  const ctx = canvas.getContext("2d");
  const cNext = document.getElementById("tetris-next");
  const ctxN = cNext.getContext("2d");
  const elScore = document.getElementById("tetris-score");
  const elLines = document.getElementById("tetris-lines");
  const elLevel = document.getElementById("tetris-level");
  const elBest = document.getElementById("tetris-best");
  const elMsg = document.getElementById("tetris-msg");
  const btnPause = document.getElementById("tetris-pause");
  const btnNew = document.getElementById("tetris-new");

  canvas.width = COLS * CELL;
  canvas.height = VISIBLE * CELL;
  cNext.width = 5 * CELL;
  cNext.height = 5 * CELL;

  const LS_BEST = "krone-tetris-best";

  let board = [];
  let bag = [];
  let piece = null;
  let nextType = "T";
  let score = 0;
  let linesTotal = 0;
  let level = 0;
  let gameOver = false;
  let paused = false;
  let dropMs = 800;
  let dropAcc = 0;
  let lastT = 0;
  let animating = false;

  function loadBest() {
    const v = parseInt(localStorage.getItem(LS_BEST) || "0", 10);
    elBest.textContent = String(isNaN(v) ? 0 : v);
  }

  function saveBest() {
    const cur = parseInt(localStorage.getItem(LS_BEST) || "0", 10);
    if (score > cur) {
      localStorage.setItem(LS_BEST, String(score));
      elBest.textContent = String(score);
    }
  }

  function emptyBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) board[r][c] = null;
    }
  }

  function refillBag() {
    bag = [...TYPES].sort(() => Math.random() - 0.5);
  }

  function nextFromBag() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  function spawnPiece() {
    const t = nextType;
    nextType = nextFromBag();
    piece = {
      type: t,
      rot: 0,
      x: 3,
      y: 0,
    };
    if (collides(piece)) {
      gameOver = true;
      saveBest();
      elMsg.textContent = "Game Over – Neues Spiel?";
      elMsg.hidden = false;
    }
  }

  function cells(p) {
    return PIECES[p.type][p.rot];
  }

  function collides(p, ox = 0, oy = 0, orot = null) {
    const r = orot != null ? orot : p.rot;
    const bl = PIECES[p.type][r];
    for (const [dx, dy] of bl) {
      const rr = p.y + dy + oy;
      const cc = p.x + dx + ox;
      if (cc < 0 || cc >= COLS || rr >= ROWS) return true;
      if (rr >= 0 && board[rr][cc]) return true;
    }
    return false;
  }

  function mergePiece() {
    const col = COLORS[piece.type];
    for (const [dx, dy] of cells(piece)) {
      const rr = piece.y + dy;
      const cc = piece.x + dx;
      if (rr >= 0) board[rr][cc] = col;
    }
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((x) => x)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        r++;
        cleared++;
      }
    }
    if (cleared > 0) {
      const mult = [0, 40, 100, 300, 1200];
      score += mult[cleared] * (level + 1);
      linesTotal += cleared;
      level = Math.floor(linesTotal / 10);
      dropMs = Math.max(80, 800 - level * 65);
      elScore.textContent = String(score);
      elLines.textContent = String(linesTotal);
      elLevel.textContent = String(level + 1);
      saveBest();
    }
  }

  function tryRotate(dir) {
    const nrot = (piece.rot + dir + 4) % 4;
    if (!collides(piece, 0, 0, nrot)) {
      piece.rot = nrot;
      return;
    }
    const kicks = [
      [-1, 0],
      [1, 0],
      [-2, 0],
      [2, 0],
      [0, -1],
      [-1, -1],
      [1, -1],
    ];
    for (const [kx, ky] of kicks) {
      if (!collides({ ...piece, rot: nrot }, kx, ky, nrot)) {
        piece.rot = nrot;
        piece.x += kx;
        piece.y += ky;
        return;
      }
    }
  }

  function hardDrop() {
    if (!piece || gameOver) return;
    while (!collides(piece, 0, 1)) piece.y++;
    mergePiece();
    clearLines();
    spawnPiece();
    dropAcc = 0;
  }

  function ghostY() {
    if (!piece) return 0;
    let gy = piece.y;
    while (!collides({ ...piece, y: gy + 1 })) gy++;
    return gy;
  }

  function drawCell(ctx2, px, py, color, border) {
    ctx2.fillStyle = color;
    ctx2.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    if (border) {
      ctx2.strokeStyle = "rgba(0,0,0,0.35)";
      ctx2.lineWidth = 2;
      ctx2.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    }
  }

  function drawBoard() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = HIDDEN; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const px = c * CELL;
        const py = (r - HIDDEN) * CELL;
        const co = board[r][c];
        ctx.strokeStyle = COLORS.grid;
        ctx.strokeRect(px, py, CELL, CELL);
        if (co) drawCell(ctx, px, py, co, true);
      }
    }

    if (piece && !gameOver) {
      const gy = ghostY();
      for (const [dx, dy] of cells(piece)) {
        const px = (piece.x + dx) * CELL;
        const py = (piece.y + dy - HIDDEN) * CELL;
        if (piece.y + dy >= HIDDEN)
          drawCell(ctx, px, py, COLORS[piece.type], true);
      }
      ctx.globalAlpha = 0.35;
      for (const [dx, dy] of cells(piece)) {
        const rr = gy + dy;
        if (rr < HIDDEN) continue;
        const px = (piece.x + dx) * CELL;
        const py = (rr - HIDDEN) * CELL;
        drawCell(ctx, px, py, COLORS[piece.type], false);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawNext() {
    ctxN.fillStyle = "#0f172a";
    ctxN.fillRect(0, 0, cNext.width, cNext.height);
    const bl = PIECES[nextType][0];
    const xs = bl.map((b) => b[0]);
    const ys = bl.map((b) => b[1]);
    const minx = Math.min(...xs);
    const maxx = Math.max(...xs);
    const miny = Math.min(...ys);
    const maxy = Math.max(...ys);
    const bw = maxx - minx + 1;
    const bh = maxy - miny + 1;
    const offx = ((5 - bw) * CELL) / 2 - minx * CELL;
    const offy = ((5 - bh) * CELL) / 2 - miny * CELL;
    for (const [dx, dy] of bl) {
      drawCell(ctxN, offx + dx * CELL, offy + dy * CELL, COLORS[nextType], true);
    }
  }

  function tick(ts) {
    if (!lastT) lastT = ts;
    const dt = ts - lastT;
    lastT = ts;

    if (!gameOver && !paused && piece) {
      dropAcc += dt;
      if (dropAcc >= dropMs) {
        dropAcc = 0;
        if (!collides(piece, 0, 1)) {
          piece.y++;
        } else {
          mergePiece();
          clearLines();
          spawnPiece();
        }
      }
    }

    drawBoard();
    drawNext();
    requestAnimationFrame(tick);
  }

  function startGame() {
    emptyBoard();
    refillBag();
    nextType = nextFromBag();
    score = 0;
    linesTotal = 0;
    level = 0;
    dropMs = 800;
    dropAcc = 0;
    gameOver = false;
    paused = false;
    elScore.textContent = "0";
    elLines.textContent = "0";
    elLevel.textContent = "1";
    elMsg.hidden = true;
    btnPause.textContent = "Pause";
    spawnPiece();
  }

  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
    if (gameOver && e.key === "Enter") {
      startGame();
      return;
    }
    if (e.key === "p" || e.key === "P") {
      if (!gameOver) {
        paused = !paused;
        btnPause.textContent = paused ? "Weiter" : "Pause";
      }
      e.preventDefault();
      return;
    }
    if (paused || gameOver || !piece) return;

    const k = e.key;
    if (k === "ArrowLeft") {
      if (!collides(piece, -1, 0)) piece.x--;
    } else if (k === "ArrowRight") {
      if (!collides(piece, 1, 0)) piece.x++;
    } else if (k === "ArrowDown") {
      if (!collides(piece, 0, 1)) {
        piece.y++;
        score += 1;
        elScore.textContent = String(score);
      }
    } else if (k === "ArrowUp" || k === "x" || k === "X") {
      tryRotate(1);
    } else if (k === "z" || k === "Z") {
      tryRotate(-1);
    } else if (k === " ") {
      e.preventDefault();
      hardDrop();
    }
  });

  btnPause.addEventListener("click", () => {
    if (gameOver) return;
    paused = !paused;
    btnPause.textContent = paused ? "Weiter" : "Pause";
  });

  btnNew.addEventListener("click", () => startGame());

  loadBest();
  startGame();
  requestAnimationFrame(tick);
})();
