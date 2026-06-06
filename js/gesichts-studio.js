/**
 * Gesichts-Studio – Kamera, Gesichtsfilter, Foto/Video, Spiel-Galerie
 */
import {
  FaceLandmarker,
  FilesetResolver,
  ImageSegmenter,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const LS_SESSION = "gesichts-studio-spiel";
const DB_NAME = "gesichts-studio-v1";
const DB_VER = 1;

/** Abstand zwischen Canvas-Frames beim Video-Fallback (≈30 fps) */
const VIDEO_FRAME_MS = 1000 / 30;

const EMOJIS = [
  "😀", "😂", "😍", "🤩", "😎", "🥳", "🤪", "😜", "🦄", "👑",
  "⭐", "💖", "🔥", "🐱", "🐶", "🦋", "👽", "🎭",
  "👀", "👃", "🎀", "🍕", "🍦", "⚽", "🎸", "🚀", "💎",
];

const STICKER_PRESETS = ["🎩", "👓", "🥽", "🎧", "🌸", "🍀", "🦴", "🎪"];

const LANDMARK_IDX = {
  forehead: 10,
  nose: 1,
  leftCheek: 234,
  rightCheek: 454,
  chin: 152,
  leftEye: 33,
  rightEye: 263,
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
  lowerLip: 14,
};

/** Mundkontur MediaPipe – für echte Lippenform */
const MOUTH_OUTER_IDX = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291];
const MOUTH_INNER_IDX = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308];

/** Tiermasken – bedecken das ganze Gesicht */
const FACE_MASKS = [
  { id: "cat", emoji: "🐱", label: "Katze" },
  { id: "dog", emoji: "🐶", label: "Hund" },
  { id: "bear", emoji: "🐻", label: "Bär" },
  { id: "fox", emoji: "🦊", label: "Fuchs" },
  { id: "rabbit", emoji: "🐰", label: "Hase" },
  { id: "pig", emoji: "🐷", label: "Schwein" },
  { id: "lion", emoji: "🦁", label: "Löwe" },
  { id: "monkey", emoji: "🐵", label: "Affe" },
];

/** Alles waagerecht – dreht nicht mit Kopfneigung */
const OVERLAY_ANGLE = 0;

/** Aufsetzen – kleben auf Mund, Stirn, Augen */
const ACCESSORIES = [
  { id: "lips", emoji: "", label: "Lippen" },
  { id: "hat", emoji: "🎩", label: "Hut" },
  { id: "glasses", emoji: "👓", label: "Brille" },
  { id: "crown", emoji: "👑", label: "Krone" },
  { id: "bow", emoji: "🎀", label: "Schleife" },
  { id: "clown-nose", emoji: "🔴", label: "Clown-Nase" },
];

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#000000", "#ffffff",
];

const AVATAR_COLORS = ["#7c3aed", "#db2777", "#2563eb", "#059669", "#d97706", "#dc2626"];

/** @type {FaceLandmarker | null} */
let faceLandmarker = null;
/** @type {ImageSegmenter | null} */
let imageSegmenter = null;
let segmenterReady = false;
/** @type {Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null} */
let visionResolver = null;

/** @type {string} */
let activeBackgroundId = "none";
/** @type {HTMLImageElement | null} */
let customBgImage = null;

/** Kamera + viele fertige Hintergründe (Zimmer, Wasser, Natur …) */
const BG_PRESETS = [
  { id: "none", label: "Kamera", style: "none" },
  { id: "bg01", label: "Himmel", style: "gradient", colors: ["#38bdf8", "#e0f2fe"], preview: "linear-gradient(180deg,#38bdf8,#e0f2fe)" },
  { id: "bg02", label: "Sonnenuntergang", style: "gradient", colors: ["#fb923c", "#7c3aed"], preview: "linear-gradient(180deg,#fb923c,#7c3aed)" },
  { id: "bg03", label: "Regenbogen", style: "scene", scene: "rainbow", preview: "linear-gradient(90deg,red,orange,yellow,green,blue,violet)" },
  { id: "bg04", label: "Strand", style: "gradient", colors: ["#fde68a", "#0ea5e9"], preview: "linear-gradient(180deg,#fde68a,#0ea5e9)" },
  { id: "bg05", label: "Meer", style: "scene", scene: "ocean", preview: "linear-gradient(180deg,#7dd3fc,#1d4ed8)" },
  { id: "bg06", label: "Wiese", style: "gradient", colors: ["#bbf7d0", "#15803d"], preview: "linear-gradient(180deg,#bbf7d0,#15803d)" },
  { id: "bg07", label: "Wald", style: "scene", scene: "forest", preview: "linear-gradient(180deg,#86efac,#14532d)" },
  { id: "bg08", label: "Schnee", style: "scene", scene: "snow", preview: "linear-gradient(180deg,#f8fafc,#93c5fd)" },
  { id: "bg09", label: "Weltraum", style: "scene", scene: "space", preview: "linear-gradient(180deg,#0f172a,#312e81)" },
  { id: "bg10", label: "Unter Wasser", style: "scene", scene: "underwater", preview: "linear-gradient(180deg,#22d3ee,#1e3a8a)" },
  { id: "bg11", label: "Wüste", style: "scene", scene: "desert", preview: "linear-gradient(180deg,#fdba74,#b45309)" },
  { id: "bg12", label: "Zimmer", style: "scene", scene: "room", preview: "linear-gradient(180deg,#fef3c7,#d6d3d1)" },
  { id: "bg13", label: "Schwimmbad", style: "scene", scene: "pool", preview: "linear-gradient(180deg,#38bdf8,#0369a1)" },
  { id: "bg14", label: "Disco", style: "scene", scene: "disco", preview: "linear-gradient(135deg,#f472b6,#818cf8)" },
  { id: "bg15", label: "Kirmes", style: "scene", scene: "fair", preview: "repeating-linear-gradient(90deg,#ef4444,#ef4444 8px,#fbbf24 8px,#fbbf24 16px)" },
  { id: "bg16", label: "Zuckerwatte", style: "gradient", colors: ["#f9a8d4", "#c4b5fd"], preview: "linear-gradient(180deg,#f9a8d4,#c4b5fd)" },
  { id: "bg17", label: "Vulkan", style: "scene", scene: "volcano", preview: "linear-gradient(180deg,#450a0a,#ef4444)" },
  { id: "bg18", label: "Nachtstadt", style: "scene", scene: "city", preview: "linear-gradient(180deg,#1e1b4b,#0f172a)" },
  { id: "bg19", label: "Burg", style: "scene", scene: "castle", preview: "linear-gradient(180deg,#a8a29e,#57534e)" },
  { id: "bg20", label: "Frühling", style: "scene", scene: "spring", preview: "linear-gradient(180deg,#bbf7d0,#fce7f3)" },
  { id: "bg21", label: "Tiefsee", style: "scene", scene: "deepSea", preview: "linear-gradient(180deg,#020617,#1e3a8a)" },
  { id: "bg22", label: "Aquarium", style: "scene", scene: "aquarium", preview: "linear-gradient(180deg,#164e63,#0f766e)" },
  { id: "bg23", label: "Klasse", style: "scene", scene: "classroom", preview: "linear-gradient(180deg,#ecfccb,#78716c)" },
  { id: "bg24", label: "Rosa", style: "color", color: "#fbcfe8", preview: "#fbcfe8" },
  { id: "bg25", label: "Lila", style: "color", color: "#ddd6fe", preview: "#ddd6fe" },
  { id: "bg26", label: "Häuser", style: "scene", scene: "housesStreet", preview: "linear-gradient(180deg,#6366f1,#1c1917)" },
  { id: "bg27", label: "Landhaus", style: "scene", scene: "cottage", preview: "linear-gradient(180deg,#7dd3fc,#4ade80)" },
  { id: "bg28", label: "Loft", style: "scene", scene: "loft", preview: "linear-gradient(90deg,#57534e,#78350f)" },
  { id: "bg29", label: "Gaming", style: "scene", scene: "gaming", preview: "linear-gradient(135deg,#312e81,#0f172a)" },
  { id: "bg30", label: "Schlafzimmer", style: "scene", scene: "bedroom", preview: "linear-gradient(180deg,#fce7f3,#fda4af)" },
  { id: "bg31", label: "Küche", style: "scene", scene: "kitchen", preview: "linear-gradient(180deg,#f1f5f9,#e2e8f0)" },
  { id: "bg32", label: "Villa", style: "scene", scene: "mansion", preview: "linear-gradient(180deg,#fefce8,#d6d3d1)" },
];

const personCanvas = document.createElement("canvas");
const personCtx = personCanvas.getContext("2d");
const maskCanvas = document.createElement("canvas");
const maskCtx = maskCanvas.getContext("2d");
/** @type {MediaStream | null} */
let camStream = null;
const video = document.createElement("video");
video.playsInline = true;
video.muted = true;

const preview = /** @type {HTMLCanvasElement} */ (document.getElementById("preview"));
const ctx = preview.getContext("2d");
const paintCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById("paint-canvas"));
const paintCtx = paintCanvas.getContext("2d");

let raf = 0;
let lastTick = 0;
/** @type {"stop"|"slow"|"normal"|"fast"} */
let motionMode = "normal";
const MOTION_FPS = { stop: 0, slow: 10, normal: 30, fast: 55 };
let faceFound = false;
let faceAngle = 0;
/** @type {{ x: number, y: number } | null} */
let faceCenter = null;
/** @type {Record<string, { x: number, y: number }>} */
let landmarks = {};

/** @type {{ id: string, type: string, content: string | HTMLImageElement, anchor: string, scale: number }[]} */
let stickers = [];

/** @type {string | null} */
let activeMaskId = null;
/** @type {Set<string>} */
let activeAccessories = new Set();

let recording = false;
/** Reihenfolge: viele Fotos/Videos nacheinander speichern ohne IndexedDB-Kollision */
let mediaSaveChain = Promise.resolve();
/** @type {MediaRecorder | null} */
let recorder = null;
/** @type {Blob[]} */
let recChunks = [];
/** @type {MediaStream | null} */
let recordStream = null;
/** @type {CanvasCaptureMediaStreamTrack | null} */
let captureTrack = null;
/** @type {Blob[]} */
let recFrameBlobs = [];
let recFrameTimer = 0;
let recUseFrames = false;
let recMime = "video/webm";
let micEnabled = true;
let cameraFacing = "user";
/** Kamera aus – kein Gesicht, kein Video bis ▶ Start */
let cameraPaused = false;

/** @type {{ id: string, name: string, color: string } | null} */
let currentGame = null;

/** @type {IDBDatabase | null} */
let db = null;

// ── DOM refs ──────────────────────────────────────────────
const tabs = document.querySelectorAll(".tab");
const panels = {
  studio: document.getElementById("panel-studio"),
  gallery: document.getElementById("panel-gallery"),
};

const DEFAULT_GAME_ID = "gesichts-studio-default";
const DEFAULT_GAME_NAME = "Mein Studio";

const galleryGrid = document.getElementById("gallery-grid");
const galleryHint = document.getElementById("gallery-hint");
const galleryEmpty = document.getElementById("gallery-empty");

const studioMain = document.getElementById("studio-main");
const recIndicator = document.getElementById("rec-indicator");
const cameraStatus = document.getElementById("camera-status");
const faceHint = document.getElementById("face-hint");
const emojiGrid = document.getElementById("emoji-grid");
const faceMaskGrid = document.getElementById("face-mask-grid");
const accessoryGrid = document.getElementById("accessory-grid");
const btnMaskOff = document.getElementById("btn-mask-off");
const bgGrid = document.getElementById("bg-grid");
const bgUpload = /** @type {HTMLInputElement} */ (document.getElementById("bg-upload"));
const colorRow = document.getElementById("color-row");
const brushSize = /** @type {HTMLInputElement} */ (document.getElementById("brush-size"));
const btnPaintClear = document.getElementById("btn-paint-clear");
const btnPaintApply = document.getElementById("btn-paint-apply");
const stickerPresets = document.getElementById("sticker-presets");
const stickerUpload = /** @type {HTMLInputElement} */ (document.getElementById("sticker-upload"));
const btnPhoto = document.getElementById("btn-photo");
const btnVideo = document.getElementById("btn-video");
const btnMic = document.getElementById("btn-mic");
const btnFlipCam = document.getElementById("btn-flip-cam");
const btnClear = document.getElementById("btn-clear");
const stageWrap = document.querySelector(".stage-wrap");
const speedBtns = document.querySelectorAll(".speed-btn");

const lightbox = /** @type {HTMLDialogElement} */ (document.getElementById("lightbox"));
const lbContent = document.getElementById("lb-content");
const lbDownload = /** @type {HTMLAnchorElement} */ (document.getElementById("lb-download"));
const lbDelete = document.getElementById("lb-delete");
const lbClose = document.getElementById("lb-close");

let paintColor = COLORS[0];
let painting = false;
/** @type {string | null} */
let lightboxMediaId = null;

// ── IndexedDB ─────────────────────────────────────────────
function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("accounts")) {
        d.createObjectStore("accounts", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("media")) {
        const s = d.createObjectStore("media", { keyPath: "id" });
        s.createIndex("accountId", "accountId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @param {string} accountId */
function getMediaForAccount(accountId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readonly");
    const idx = tx.objectStore("media").index("accountId");
    const req = idx.getAll(accountId);
    req.onsuccess = () => {
      const items = req.result.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

function getAllAccounts() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readonly");
    const req = tx.objectStore("accounts").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** @param {{ id: string, name: string, color: string, createdAt: number }} acc */
function saveAccount(acc) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("accounts", "readwrite");
    tx.objectStore("accounts").put(acc);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {{ id: string, accountId: string, type: string, blob: Blob, thumbBlob: Blob, createdAt: number }} item */
function saveMedia(item) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** @param {string} id */
function deleteMedia(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("media", "readwrite");
    tx.objectStore("media").delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Spiel ─────────────────────────────────────────────────
function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function persistSession() {
  if (currentGame) {
    localStorage.setItem(LS_SESSION, JSON.stringify(currentGame));
  } else {
    localStorage.removeItem(LS_SESSION);
  }
}

async function ensureDefaultGame() {
  const games = await getAllAccounts();
  let game = games.find((g) => g.id === DEFAULT_GAME_ID);
  if (!game) {
    game = {
      id: DEFAULT_GAME_ID,
      name: DEFAULT_GAME_NAME,
      color: AVATAR_COLORS[0],
      createdAt: Date.now(),
    };
    await saveAccount(game);
  }
  currentGame = game;
  persistSession();
}

async function startPlaying() {
  await ensureDefaultGame();
  await ensureCamera();
  syncSpeedBarUI();
  updateCaptureButtons();
  await refreshGallery();
}

// ── Tabs ──────────────────────────────────────────────────
function getActiveTab() {
  const t = document.querySelector(".tab.active");
  return t ? /** @type {HTMLElement} */ (t).dataset.tab : "studio";
}

/** @param {string} name */
function switchTab(name) {
  tabs.forEach((t) => {
    const el = /** @type {HTMLElement} */ (t);
    const on = el.dataset.tab === name;
    el.classList.toggle("active", on);
    el.setAttribute("aria-selected", on ? "true" : "false");
  });
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });
  if (name === "studio") startPlaying();
  if (name === "gallery") refreshGallery();
  /* Kamera läuft weiter – stoppt nur mit Stop Motion oder Schließen */
}

tabs.forEach((t) => {
  t.addEventListener("click", () => switchTab(/** @type {HTMLElement} */ (t).dataset.tab || "studio"));
});

document.querySelectorAll("[data-goto]").forEach((el) => {
  el.addEventListener("click", () => switchTab(/** @type {HTMLElement} */ (el).dataset.goto || "studio"));
});

// ── Face tracking ─────────────────────────────────────────
async function initVisionModels() {
  try {
    visionResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(visionResolver, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
    });
    cameraStatus.textContent = "Kamera bereit – zeig dein Gesicht!";
  } catch {
    faceLandmarker = null;
    cameraStatus.textContent = "Gesichtserkennung offline – Filter in der Mitte.";
    faceHint.textContent = "Ohne Internet kleben die Sticker in der Bildmitte.";
  }

  segmenterReady = false;
  imageSegmenter = null;
  if (!visionResolver) return;

  const modelPath =
    "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.task";

  for (const delegate of ["CPU", "GPU"]) {
    try {
      imageSegmenter = await ImageSegmenter.createFromOptions(visionResolver, {
        baseOptions: { modelAssetPath: modelPath, delegate },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: true,
      });
      segmenterReady = true;
      break;
    } catch {
      imageSegmenter = null;
    }
  }
}

function coverDrawImage(targetCtx, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw;
  let sh;
  let sx;
  let sy;
  if (ir > cr) {
    sh = h;
    sw = h * ir;
    sx = (w - sw) / 2;
    sy = 0;
  } else {
    sw = w;
    sh = w / ir;
    sx = 0;
    sy = (h - sh) / 2;
  }
  targetCtx.drawImage(img, sx, sy, sw, sh);
}

function drawSpaceScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#312e81");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 55; i++) {
    c.beginPath();
    c.arc((i * 97) % w, (i * 53) % h, (i % 3) + 0.5, 0, Math.PI * 2);
    c.fill();
  }
}

function drawRainbowScene(c, w, h) {
  const bands = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];
  const bh = h / bands.length;
  bands.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(0, i * bh, w, bh + 1);
  });
}

function drawOceanScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#7dd3fc");
  g.addColorStop(0.45, "#38bdf8");
  g.addColorStop(1, "#1d4ed8");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(255,255,255,0.35)";
  c.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const y = h * (0.55 + i * 0.12);
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= w; x += 24) {
      c.quadraticCurveTo(x + 12, y + (i % 2 ? 10 : -10), x + 24, y);
    }
    c.stroke();
  }
}

function drawForestScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#86efac");
  g.addColorStop(1, "#14532d");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const base = h * 0.72;
  for (let i = 0; i < 9; i++) {
    const x = (w / 8) * i + 8;
    c.fillStyle = "#166534";
    c.beginPath();
    c.moveTo(x, base);
    c.lineTo(x + 22, base);
    c.lineTo(x + 11, base - 50 - (i % 3) * 12);
    c.closePath();
    c.fill();
  }
}

function drawSnowScene(c, w, h) {
  c.fillStyle = "#e0f2fe";
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#f8fafc";
  c.fillRect(0, h * 0.55, w, h * 0.45);
  c.fillStyle = "#ffffff";
  for (let i = 0; i < 70; i++) {
    c.beginPath();
    c.arc((i * 73) % w, (i * 41) % h, 1 + (i % 3), 0, Math.PI * 2);
    c.fill();
  }
}

function drawUnderwaterScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#67e8f9");
  g.addColorStop(0.55, "#22d3ee");
  g.addColorStop(1, "#1e40af");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(255,255,255,0.12)";
  c.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const x0 = (i * w) / 8;
    c.beginPath();
    c.moveTo(x0, 0);
    c.bezierCurveTo(x0 + 40, h * 0.4, x0 - 30, h * 0.7, x0 + 20, h);
    c.stroke();
  }
  c.fillStyle = "rgba(255,255,255,0.35)";
  for (let i = 0; i < 40; i++) {
    c.beginPath();
    c.arc((i * 61) % w, (i * 37) % h, 2 + (i % 4), 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "rgba(251,191,36,0.5)";
  for (let i = 0; i < 5; i++) {
    const fx = (w / 6) * (i + 0.5);
    const fy = h * (0.25 + (i % 3) * 0.15);
    c.beginPath();
    c.ellipse(fx, fy, 14, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(fx - 14, fy);
    c.lineTo(fx - 22, fy - 3);
    c.lineTo(fx - 22, fy + 3);
    c.closePath();
    c.fill();
  }
}

function drawRoomScene(c, w, h) {
  const wall = c.createLinearGradient(0, 0, 0, h * 0.68);
  wall.addColorStop(0, "#fef9c3");
  wall.addColorStop(1, "#fde68a");
  c.fillStyle = wall;
  c.fillRect(0, 0, w, h * 0.68);
  c.fillStyle = "#a8a29e";
  c.fillRect(0, h * 0.68, w, h * 0.32);
  const wx = w * 0.1;
  const wy = h * 0.1;
  const ww = w * 0.38;
  const wh = h * 0.36;
  const winG = c.createLinearGradient(wx, wy, wx, wy + wh);
  winG.addColorStop(0, "#bae6fd");
  winG.addColorStop(1, "#38bdf8");
  c.fillStyle = winG;
  c.fillRect(wx, wy, ww, wh);
  c.strokeStyle = "#78716c";
  c.lineWidth = 5;
  c.strokeRect(wx, wy, ww, wh);
  c.strokeStyle = "rgba(120,113,108,0.6)";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(wx + ww / 2, wy);
  c.lineTo(wx + ww / 2, wy + wh);
  c.moveTo(wx, wy + wh / 2);
  c.lineTo(wx + ww, wy + wh / 2);
  c.stroke();
  c.fillStyle = "#e7e5e4";
  c.fillRect(w * 0.55, h * 0.15, w * 0.32, h * 0.22);
  c.strokeStyle = "#78716c";
  c.lineWidth = 3;
  c.strokeRect(w * 0.55, h * 0.15, w * 0.32, h * 0.22);
  c.fillStyle = "#fca5a5";
  c.beginPath();
  c.arc(w * 0.71, h * 0.26, 18, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#d97706";
  c.fillRect(w * 0.25, h * 0.72, w * 0.5, h * 0.08);
}

function drawPoolScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#7dd3fc");
  g.addColorStop(0.4, "#0ea5e9");
  g.addColorStop(1, "#075985");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(255,255,255,0.25)";
  c.lineWidth = 2;
  for (let row = 0; row < 5; row++) {
    const y = h * 0.15 + row * (h * 0.18);
    c.beginPath();
    for (let x = 0; x <= w; x += 40) {
      c.moveTo(x, y);
      c.lineTo(x + 20, y + 8);
    }
    c.stroke();
  }
  c.fillStyle = "rgba(255,255,255,0.15)";
  c.fillRect(0, 0, w, h * 0.12);
  c.strokeStyle = "#e2e8f0";
  c.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(w * (0.15 + i * 0.22), h * 0.88);
    c.lineTo(w * (0.15 + i * 0.22), h * 0.98);
    c.stroke();
  }
}

function drawDeepSeaScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#020617");
  g.addColorStop(0.5, "#0f172a");
  g.addColorStop(1, "#1e3a8a");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(148,163,184,0.15)";
  for (let i = 0; i < 5; i++) {
    const x = w * (0.15 + i * 0.18);
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x + w * 0.08, h);
    c.lineTo(x - w * 0.02, h);
    c.closePath();
    c.fill();
  }
  c.fillStyle = "rgba(255,255,255,0.2)";
  for (let i = 0; i < 35; i++) {
    c.beginPath();
    c.arc((i * 67) % w, (i * 41) % h, 1 + (i % 2), 0, Math.PI * 2);
    c.fill();
  }
}

function drawAquariumScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#164e63");
  g.addColorStop(1, "#042f2e");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(94,234,212,0.25)";
  c.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    c.strokeRect(w * 0.05 + i * 3, h * 0.05 + i * 2, w * 0.9 - i * 6, h * 0.9 - i * 4);
  }
  c.fillStyle = "rgba(45,212,191,0.35)";
  for (let i = 0; i < 8; i++) {
    c.fillRect(w * (0.1 + (i % 4) * 0.22), h * (0.2 + (i * 0.11) % 0.5), w * 0.06, h * 0.12);
  }
  c.fillStyle = "rgba(253,224,71,0.4)";
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.ellipse(w * (0.15 + (i * 0.14) % 0.75), h * (0.35 + (i % 3) * 0.18), 12, 7, 0, 0, Math.PI * 2);
    c.fill();
  }
}

function drawClassroomScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h * 0.55);
  g.addColorStop(0, "#ecfccb");
  g.addColorStop(1, "#d9f99d");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h * 0.55);
  c.fillStyle = "#78716c";
  c.fillRect(0, h * 0.55, w, h * 0.45);
  c.fillStyle = "#166534";
  c.fillRect(w * 0.08, h * 0.1, w * 0.84, h * 0.28);
  c.strokeStyle = "#fef08a";
  c.lineWidth = 3;
  c.strokeRect(w * 0.08, h * 0.1, w * 0.84, h * 0.28);
  c.fillStyle = "#fefce8";
  c.font = `bold ${Math.max(14, w * 0.04)}px system-ui,sans-serif`;
  c.textAlign = "center";
  c.fillText("1 + 1 = 2", w * 0.5, h * 0.24);
  for (let i = 0; i < 5; i++) {
    c.fillStyle = "#57534e";
    c.fillRect(w * (0.08 + i * 0.18), h * 0.62, w * 0.14, h * 0.28);
  }
}

function drawDesertScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#fdba74");
  g.addColorStop(1, "#b45309");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#fde047";
  c.beginPath();
  c.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.12, 0, Math.PI * 2);
  c.fill();
}

function drawDiscoScene(c, w, h) {
  c.fillStyle = "#0f0f14";
  c.fillRect(0, 0, w, h);
  const cols = ["#f472b6", "#818cf8", "#34d399", "#fbbf24", "#38bdf8"];
  for (let i = 0; i < 30; i++) {
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.arc((i * 89) % w, (i * 67) % h, 6 + (i % 8), 0, Math.PI * 2);
    c.fill();
  }
}

function drawFairScene(c, w, h) {
  const cols = ["#ef4444", "#fbbf24", "#22c55e", "#3b82f6", "#a855f7"];
  const sw = w / 10;
  for (let i = 0; i < 10; i++) {
    c.fillStyle = cols[i % cols.length];
    c.fillRect(i * sw, 0, sw + 1, h);
  }
}

function drawVolcanoScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#450a0a");
  g.addColorStop(0.55, "#7f1d1d");
  g.addColorStop(1, "#ef4444");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#1c1917";
  c.beginPath();
  c.moveTo(w * 0.18, h);
  c.lineTo(w * 0.5, h * 0.38);
  c.lineTo(w * 0.82, h);
  c.closePath();
  c.fill();
  c.fillStyle = "#fbbf24";
  c.beginPath();
  c.arc(w * 0.5, h * 0.36, 16, 0, Math.PI * 2);
  c.fill();
}

function drawCityScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#312e81");
  g.addColorStop(1, "#0f172a");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const base = h * 0.62;
  for (let i = 0; i < 8; i++) {
    const bw = w / 9;
    const x = i * bw + 6;
    const bh = h * (0.18 + (i % 4) * 0.1);
    c.fillStyle = "#1e293b";
    c.fillRect(x, base - bh, bw - 10, bh);
    c.fillStyle = "#fde047";
    for (let win = 0; win < 4; win++) {
      if ((i + win) % 2 === 0) c.fillRect(x + 6, base - bh + 10 + win * 14, 6, 8);
    }
  }
}

function drawCastleScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#a8a29e");
  g.addColorStop(1, "#57534e");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#78716c";
  const base = h * 0.58;
  c.fillRect(w * 0.2, base, w * 0.6, h - base);
  for (const x of [w * 0.18, w * 0.36, w * 0.54, w * 0.72]) {
    c.fillRect(x, base - 40, 28, 40);
    c.fillRect(x, base - 52, 12, 12);
    c.fillRect(x + 16, base - 52, 12, 12);
  }
}

function drawSpringScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#bbf7d0");
  g.addColorStop(1, "#fce7f3");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const flowerCols = ["#f472b6", "#fbbf24", "#a78bfa", "#38bdf8"];
  for (let i = 0; i < 28; i++) {
    const x = (i * 83) % w;
    const y = h * 0.55 + (i * 29) % (h * 0.4);
    c.fillStyle = flowerCols[i % flowerCols.length];
    c.beginPath();
    c.arc(x, y, 5 + (i % 3), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#22c55e";
    c.fillRect(x - 1, y, 2, 14);
  }
}

/** Reihe von Häusern – Straße am Abend */
function drawHousesStreetScene(c, w, h) {
  const sky = c.createLinearGradient(0, 0, 0, h * 0.55);
  sky.addColorStop(0, "#6366f1");
  sky.addColorStop(0.5, "#f472b6");
  sky.addColorStop(1, "#fb923c");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h * 0.55);
  c.fillStyle = "#1c1917";
  c.fillRect(0, h * 0.55, w, h * 0.45);
  const roofY = h * 0.42;
  const baseY = h * 0.92;
  const count = 5;
  for (let i = 0; i < count; i++) {
    const x0 = (w / count) * i + 4;
    const bw = w / count - 8;
    const rh = h * (0.12 + (i % 3) * 0.04);
    c.fillStyle = "#292524";
    c.beginPath();
    c.moveTo(x0, roofY + rh * 0.3);
    c.lineTo(x0 + bw / 2, roofY - rh);
    c.lineTo(x0 + bw, roofY + rh * 0.3);
    c.lineTo(x0 + bw, baseY);
    c.lineTo(x0, baseY);
    c.closePath();
    c.fill();
    c.fillStyle = "#fbbf24";
    for (let j = 0; j < 3; j++) {
      c.fillRect(x0 + 8 + j * 14, roofY + 20 + j * 8, 8, 10);
    }
  }
}

/** Landhaus auf grünem Hügel */
function drawCottageScene(c, w, h) {
  const sky = c.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, "#7dd3fc");
  sky.addColorStop(1, "#bae6fd");
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h * 0.5);
  c.fillStyle = "#4ade80";
  c.beginPath();
  c.moveTo(0, h * 0.48);
  c.quadraticCurveTo(w * 0.5, h * 0.35, w, h * 0.48);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();
  const cx = w * 0.5;
  const base = h * 0.72;
  c.fillStyle = "#fef3c7";
  c.fillRect(cx - w * 0.18, h * 0.48, w * 0.36, base - h * 0.48);
  c.fillStyle = "#b91c1c";
  c.beginPath();
  c.moveTo(cx - w * 0.22, h * 0.48);
  c.lineTo(cx, h * 0.32);
  c.lineTo(cx + w * 0.22, h * 0.48);
  c.closePath();
  c.fill();
  c.fillStyle = "#44403c";
  c.fillRect(cx - 8, h * 0.42, 16, 22);
  c.fillStyle = "#38bdf8";
  c.fillRect(cx - w * 0.1, h * 0.55, 18, 16);
  c.fillRect(cx + w * 0.04, h * 0.55, 18, 16);
}

/** Loft – Backstein, großes Fenster, Holzboden */
function drawLoftScene(c, w, h) {
  c.fillStyle = "#57534e";
  c.fillRect(0, 0, w * 0.35, h * 0.72);
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 5; col++) {
      c.strokeStyle = "rgba(0,0,0,0.15)";
      c.strokeRect(4 + col * (w * 0.07), 4 + row * 22, w * 0.065, 20);
    }
  }
  const wx = w * 0.38;
  const wy = h * 0.08;
  const ww = w * 0.55;
  const wh = h * 0.58;
  const winG = c.createLinearGradient(wx, wy, wx, wy + wh);
  winG.addColorStop(0, "#0ea5e9");
  winG.addColorStop(1, "#1e3a8a");
  c.fillStyle = winG;
  c.fillRect(wx, wy, ww, wh);
  c.strokeStyle = "#1c1917";
  c.lineWidth = 6;
  c.strokeRect(wx, wy, ww, wh);
  c.fillStyle = "#78350f";
  c.fillRect(0, h * 0.72, w, h * 0.28);
  c.strokeStyle = "rgba(0,0,0,0.2)";
  for (let i = 0; i < 20; i++) {
    c.beginPath();
    c.moveTo(i * (w / 20), h * 0.72);
    c.lineTo((i + 0.5) * (w / 20), h * 0.72 + 8);
    c.lineTo((i + 1) * (w / 20), h * 0.72);
    c.stroke();
  }
}

/** Gaming-Zimmer – dunkel, Neon, Monitor-Licht */
function drawGamingRoomScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#1e1b4b");
  g.addColorStop(0.5, "#312e81");
  g.addColorStop(1, "#0f172a");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "#22d3ee";
  c.shadowColor = "#22d3ee";
  c.shadowBlur = 25;
  c.fillRect(w * 0.28, h * 0.22, w * 0.44, h * 0.32);
  c.shadowBlur = 0;
  c.fillStyle = "#020617";
  c.fillRect(w * 0.3, h * 0.24, w * 0.4, h * 0.28);
  c.fillStyle = "#a78bfa";
  c.fillRect(w * 0.08, h * 0.15, w * 0.04, h * 0.55);
  c.fillStyle = "#f472b6";
  c.fillRect(w * 0.88, h * 0.2, w * 0.04, h * 0.5);
  c.fillStyle = "#334155";
  c.fillRect(w * 0.2, h * 0.62, w * 0.6, h * 0.06);
}

/** Gemütliches Schlafzimmer */
function drawBedroomScene(c, w, h) {
  c.fillStyle = "#fce7f3";
  c.fillRect(0, 0, w, h * 0.65);
  c.fillStyle = "#fda4af";
  c.fillRect(0, h * 0.65, w, h * 0.35);
  c.fillStyle = "#fbcfe8";
  c.fillRect(w * 0.08, h * 0.38, w * 0.55, h * 0.22);
  c.fillStyle = "#fdf2f8";
  c.fillRect(w * 0.1, h * 0.4, w * 0.51, h * 0.16);
  c.fillStyle = "#f9a8d4";
  c.fillRect(w * 0.12, h * 0.42, w * 0.22, h * 0.12);
  c.fillStyle = "#fbcfe8";
  c.fillRect(w * 0.36, h * 0.42, w * 0.22, h * 0.12);
  c.fillStyle = "#fef3c7";
  c.beginPath();
  c.arc(w * 0.82, h * 0.22, 22, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fde68a";
  c.fillRect(w * 0.75, h * 0.32, w * 0.12, h * 0.28);
  c.fillStyle = "#1e293b";
  c.fillRect(w * 0.72, h * 0.12, w * 0.18, h * 0.22);
  c.fillStyle = "#fef9c3";
  c.beginPath();
  c.arc(w * 0.81, h * 0.2, 8, 0, Math.PI * 2);
  c.fill();
}

/** Moderne Küche */
function drawKitchenScene(c, w, h) {
  c.fillStyle = "#f1f5f9";
  c.fillRect(0, 0, w, h * 0.42);
  c.fillStyle = "#cbd5e1";
  for (let i = 0; i < 8; i++) {
    c.fillRect((w / 8) * i, h * 0.42, w / 8 - 2, 14);
  }
  c.fillStyle = "#e2e8f0";
  c.fillRect(0, h * 0.48, w, h * 0.52);
  c.fillStyle = "#64748b";
  c.fillRect(w * 0.08, h * 0.52, w * 0.84, h * 0.12);
  c.fillStyle = "#94a3b8";
  c.fillRect(w * 0.1, h * 0.54, w * 0.35, h * 0.08);
  c.fillStyle = "#fbbf24";
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.arc(w * (0.25 + i * 0.22), h * 0.28, 8, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "#ffffff";
  c.fillRect(w * 0.65, h * 0.18, w * 0.22, h * 0.28);
  c.strokeStyle = "#94a3b8";
  c.strokeRect(w * 0.65, h * 0.18, w * 0.22, h * 0.28);
}

/** Villa – hohe Fenster, Vorhänge, edler Boden */
function drawMansionScene(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h * 0.62);
  g.addColorStop(0, "#fefce8");
  g.addColorStop(1, "#e7e5e4");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h * 0.62);
  c.fillStyle = "#d6d3d1";
  c.fillRect(0, h * 0.62, w, h * 0.38);
  const winW = w * 0.22;
  for (let i = 0; i < 3; i++) {
    const x = w * (0.1 + i * 0.28);
    c.fillStyle = "#bae6fd";
    c.fillRect(x, h * 0.12, winW, h * 0.42);
    c.fillStyle = "#7c3aed";
    c.globalAlpha = 0.35;
    c.fillRect(x - 6, h * 0.12, 10, h * 0.42);
    c.fillRect(x + winW - 4, h * 0.12, 10, h * 0.42);
    c.globalAlpha = 1;
    c.strokeStyle = "#a8a29e";
    c.lineWidth = 4;
    c.strokeRect(x, h * 0.12, winW, h * 0.42);
  }
  c.fillStyle = "#fde047";
  for (let k = 0; k < 5; k++) {
    c.beginPath();
    c.arc(w * 0.5 + (k - 2) * 12, h * 0.08, 4, 0, Math.PI * 2);
    c.fill();
  }
}

const SCENE_DRAWERS = {
  space: drawSpaceScene,
  rainbow: drawRainbowScene,
  ocean: drawOceanScene,
  forest: drawForestScene,
  snow: drawSnowScene,
  underwater: drawUnderwaterScene,
  desert: drawDesertScene,
  disco: drawDiscoScene,
  fair: drawFairScene,
  volcano: drawVolcanoScene,
  city: drawCityScene,
  castle: drawCastleScene,
  spring: drawSpringScene,
  room: drawRoomScene,
  pool: drawPoolScene,
  deepSea: drawDeepSeaScene,
  aquarium: drawAquariumScene,
  classroom: drawClassroomScene,
  housesStreet: drawHousesStreetScene,
  cottage: drawCottageScene,
  loft: drawLoftScene,
  gaming: drawGamingRoomScene,
  bedroom: drawBedroomScene,
  kitchen: drawKitchenScene,
  mansion: drawMansionScene,
};

function getBackgroundPreset(id) {
  if (id === "custom") return { id: "custom", style: "image" };
  return BG_PRESETS.find((p) => p.id === id) || BG_PRESETS[0];
}

function drawBackgroundLayer() {
  if (!ctx) return;
  const w = preview.width;
  const h = preview.height;
  const preset = getBackgroundPreset(activeBackgroundId);

  if (preset.style === "none") return;

  if (preset.style === "color" && preset.color) {
    ctx.fillStyle = preset.color;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (preset.style === "gradient" && preset.colors) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, preset.colors[0]);
    g.addColorStop(1, preset.colors[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    return;
  }

  if (preset.style === "scene" && preset.scene) {
    const draw = SCENE_DRAWERS[preset.scene];
    if (draw) draw(ctx, w, h);
    return;
  }

  if (preset.style === "image" && customBgImage) {
    coverDrawImage(ctx, customBgImage, w, h);
  }
}

function drawPlainVideo() {
  ctx.save();
  applyCameraMirrorTransform();
  ctx.drawImage(video, 0, 0, preview.width, preview.height);
  ctx.restore();
}

/** Maske aus MediaPipe (CPU/GPU) in Canvas übertragen */
function buildMaskCanvas(mask, mw, mh) {
  if (!maskCtx) return false;

  maskCanvas.width = mw;
  maskCanvas.height = mh;
  maskCtx.clearRect(0, 0, mw, mh);

  if (typeof mask.copyToCanvas === "function") {
    mask.copyToCanvas(maskCanvas, 0, 0, mw, mh);
    return true;
  }

  const md = maskCtx.createImageData(mw, mh);
  let alpha = null;

  if (typeof mask.getAsUint8Array === "function") {
    const raw = mask.getAsUint8Array();
    alpha = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) alpha[i] = raw[i] > 0 ? 255 : 0;
  } else if (typeof mask.getAsFloat32Array === "function") {
    const raw = mask.getAsFloat32Array();
    alpha = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) alpha[i] = raw[i] > 0.35 ? 255 : 0;
  }

  if (!alpha) return false;

  for (let i = 0; i < alpha.length; i++) {
    const v = alpha[i];
    md.data[i * 4] = v;
    md.data[i * 4 + 1] = v;
    md.data[i * 4 + 2] = v;
    md.data[i * 4 + 3] = 255;
  }
  maskCtx.putImageData(md, 0, 0);
  return true;
}

function blitPersonLayer() {
  const w = preview.width;
  const h = preview.height;
  ctx.save();
  applyCameraMirrorTransform();
  ctx.drawImage(personCanvas, 0, 0, w, h);
  ctx.restore();
}

/** Fallback: Körper-Oval aus Gesichtspunkten – Hintergrund immer sichtbar */
function drawPersonWithLandmarkMask() {
  const w = preview.width;
  const h = preview.height;
  if (!personCtx || video.readyState < 2) {
    drawPlainVideo();
    return;
  }

  const metrics = getFaceMetrics();
  const cx = metrics?.cx ?? w * 0.5;
  const cy = metrics?.cy ?? h * 0.45;
  const faceW = metrics?.faceW ?? w * 0.42;
  const faceH = metrics?.faceH ?? h * 0.52;

  personCanvas.width = w;
  personCanvas.height = h;
  personCtx.setTransform(1, 0, 0, 1, 0, 0);
  personCtx.globalCompositeOperation = "source-over";
  personCtx.clearRect(0, 0, w, h);
  personCtx.drawImage(video, 0, 0, w, h);
  personCtx.globalCompositeOperation = "destination-in";
  personCtx.fillStyle = "#fff";
  personCtx.beginPath();
  personCtx.ellipse(cx, cy + faceH * 0.12, faceW * 0.78, faceH * 1.05, 0, 0, Math.PI * 2);
  personCtx.fill();
  personCtx.globalCompositeOperation = "source-over";

  blitPersonLayer();
}

/** @returns {boolean} */
function drawSegmentedVideo() {
  if (!personCtx || !maskCtx || !imageSegmenter || !segmenterReady || video.readyState < 2) {
    return false;
  }

  let result;
  try {
    result = imageSegmenter.segmentForVideo(video, performance.now());
  } catch {
    return false;
  }

  const mask = result.categoryMask ?? result.confidenceMasks?.[0];
  if (!mask) return false;

  const w = preview.width;
  const h = preview.height;
  const mw = mask.width;
  const mh = mask.height;

  if (!buildMaskCanvas(mask, mw, mh)) return false;

  personCanvas.width = w;
  personCanvas.height = h;
  personCtx.setTransform(1, 0, 0, 1, 0, 0);
  personCtx.globalCompositeOperation = "source-over";
  personCtx.clearRect(0, 0, w, h);
  personCtx.drawImage(video, 0, 0, w, h);
  personCtx.globalCompositeOperation = "destination-in";
  personCtx.drawImage(maskCanvas, 0, 0, mw, mh, 0, 0, w, h);
  personCtx.globalCompositeOperation = "source-over";

  blitPersonLayer();
  return true;
}

function drawPersonOnBackground() {
  if (!drawSegmentedVideo()) drawPersonWithLandmarkMask();
}

function syncBgGridUI() {
  bgGrid?.querySelectorAll(".bg-btn").forEach((btn) => {
    const el = /** @type {HTMLElement} */ (btn);
    el.classList.toggle("active", el.dataset.bgId === activeBackgroundId);
  });
}

function setBackground(id) {
  activeBackgroundId = id;
  syncBgGridUI();
  if (id === "none") return;
  const name = getBackgroundPreset(id).label;
  if (segmenterReady) {
    faceHint.textContent = `Hintergrund: ${name} – du vorne, neuer Hintergrund dahinter!`;
  } else {
    faceHint.textContent = `Hintergrund: ${name} – lädt … zeig dein Gesicht in die Kamera.`;
  }
}

function initBackgroundUI() {
  if (!bgGrid) return;

  for (const preset of BG_PRESETS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bg-btn";
    b.dataset.bgId = preset.id;
    b.title = preset.label;
    b.setAttribute("aria-label", preset.label);

    const sw = document.createElement("span");
    sw.className = "bg-swatch";
    if (preset.style === "none") {
      sw.classList.add("bg-swatch-camera");
    } else if (preset.preview) {
      sw.style.background = preset.preview;
    } else if (preset.style === "color" && preset.color) {
      sw.style.background = preset.color;
    } else if (preset.style === "gradient" && preset.colors) {
      sw.style.background = `linear-gradient(180deg, ${preset.colors[0]}, ${preset.colors[1]})`;
    }
    b.appendChild(sw);
    const lbl = document.createElement("span");
    lbl.className = "bg-btn-label";
    lbl.textContent = preset.label;
    b.appendChild(lbl);

    b.addEventListener("click", () => setBackground(preset.id));
    bgGrid.appendChild(b);
  }

  syncBgGridUI();

  bgUpload?.addEventListener("change", () => {
    const file = bgUpload.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        customBgImage = img;
        setBackground("custom");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    bgUpload.value = "";
  });
}

async function ensureCamera() {
  if (camStream) return;
  try {
    const constraints = {
      video: {
        facingMode: cameraFacing,
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    };
    if (micEnabled) {
      constraints.audio = { echoCancellation: true, noiseSuppression: true };
    }
    camStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = camStream;
    await video.play();
    if (!faceLandmarker) await initFaceLandmarker();
    updateMicUI();
    updateCaptureButtons();
    cancelAnimationFrame(raf);
    lastTick = 0;
    loop(performance.now());
  } catch (err) {
    if (micEnabled) {
      try {
        camStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: cameraFacing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        video.srcObject = camStream;
        await video.play();
        micEnabled = false;
        updateMicUI();
        if (!faceLandmarker) await initFaceLandmarker();
        cancelAnimationFrame(raf);
        lastTick = 0;
        loop(performance.now());
        cameraStatus.textContent = "Kamera ok – Mikro nicht erlaubt, Video ohne Ton.";
        return;
      } catch {
        /* fall through */
      }
    }
    cameraStatus.textContent = "Kamera nicht erlaubt – bitte Zugriff erlauben.";
    faceHint.textContent = String(err);
  }
}

function hasMicTrack() {
  return !!camStream?.getAudioTracks().some((t) => t.readyState === "live");
}

function updateMicUI() {
  if (!btnMic) return;
  const on = micEnabled && hasMicTrack();
  btnMic.classList.toggle("active", on);
  btnMic.classList.toggle("mic-off", !on);
  btnMic.title = on ? "Mikrofon an – beim Video kannst du reden" : "Mikrofon aus";
  btnMic.textContent = on ? "🎤" : "🔇";
}

/** Video vom Canvas + Stimme vom Mikrofon */
function getRecordingStream() {
  const combined = new MediaStream();
  if (typeof preview.captureStream === "function") {
    const canvasStream = preview.captureStream(0);
    for (const t of canvasStream.getVideoTracks()) combined.addTrack(t);
  }
  if (camStream) {
    for (const t of camStream.getAudioTracks()) {
      if (t.readyState === "live") combined.addTrack(t);
    }
  }
  return combined;
}

async function ensureMicForRecording() {
  if (!micEnabled) return false;
  if (hasMicTrack()) return true;
  try {
    const audioOnly = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    if (!camStream) return false;
    for (const t of audioOnly.getAudioTracks()) camStream.addTrack(t);
    updateMicUI();
    return true;
  } catch {
    faceHint.textContent = "Mikro nicht erlaubt – Video ohne Ton.";
    return false;
  }
}

function stopCamera() {
  cancelAnimationFrame(raf);
  if (recording) stopVideoRecording();
  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
  video.srcObject = null;
  cameraPaused = false;
}

function updateCaptureButtons() {
  const blocked = cameraPaused;
  for (const btn of [btnPhoto, btnVideo]) {
    if (!btn) continue;
    btn.toggleAttribute("disabled", blocked);
    btn.classList.toggle("tool-off", blocked);
  }
}

function drawPausedScreen() {
  if (!ctx) return;
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, preview.width, preview.height);
  ctx.fillStyle = "#c4b5fd";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Gesicht aus", preview.width / 2, preview.height / 2 - 18);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("▶ Start drücken – dann wieder Video", preview.width / 2, preview.height / 2 + 16);
}

function syncSpeedBarUI() {
  speedBtns.forEach((btn) => {
    const el = /** @type {HTMLElement} */ (btn);
    const speed = el.dataset.speed;
    if (speed === "start") {
      el.classList.toggle("ready", cameraPaused);
      el.classList.remove("active");
    } else if (speed === "stop") {
      el.classList.toggle("active", cameraPaused);
    } else {
      el.classList.toggle("active", !cameraPaused && motionMode === speed);
    }
  });
  stageWrap?.classList.toggle("paused", cameraPaused);
}

function pauseCamera() {
  if (cameraPaused) return;
  if (recording) stopVideoRecording();
  cameraPaused = true;
  motionMode = "stop";
  cancelAnimationFrame(raf);
  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
  video.srcObject = null;
  faceFound = false;
  drawPausedScreen();
  syncSpeedBarUI();
  updateCaptureButtons();
  cameraStatus.textContent = "Gesicht aus – Kamera aus";
  faceHint.textContent = "Gesicht aus. ▶ Start drücken – dann kannst du wieder Video machen.";
}

async function resumeCamera() {
  if (!cameraPaused) return;
  cameraPaused = false;
  motionMode = "normal";
  lastTick = 0;
  await ensureCamera();
  syncSpeedBarUI();
  updateCaptureButtons();
  faceHint.textContent = "Kamera an – du kannst wieder Video machen! 🎬";
}

function detectFace() {
  if (cameraPaused) return;
  if (!faceLandmarker || video.readyState < 2) {
    faceFound = false;
    faceCenter = { x: preview.width * 0.5, y: preview.height * 0.42 };
    faceAngle = 0;
    return;
  }
  const result = faceLandmarker.detectForVideo(video, performance.now());
  if (!result.faceLandmarks?.length) {
    faceFound = false;
    faceCenter = { x: preview.width * 0.5, y: preview.height * 0.42 };
    faceAngle = 0;
    landmarks = {};
    return;
  }
  faceFound = true;
  const lm = result.faceLandmarks[0];
  landmarks = {};
  for (const [name, idx] of Object.entries(LANDMARK_IDX)) {
    const p = lm[idx];
    landmarks[name] = {
      x: p.x * preview.width,
      y: p.y * preview.height,
    };
  }
  if (landmarks.mouthLeft && landmarks.mouthRight) {
    landmarks.mouthCenter = {
      x: (landmarks.mouthLeft.x + landmarks.mouthRight.x) / 2,
      y: (landmarks.mouthLeft.y + landmarks.mouthRight.y) / 2,
    };
  }
  if (landmarks.upperLip && landmarks.lowerLip) {
    landmarks.lipCenter = {
      x: (landmarks.upperLip.x + landmarks.lowerLip.x) / 2,
      y: (landmarks.upperLip.y + landmarks.lowerLip.y) / 2,
    };
  }
  landmarks.mouthOuter = MOUTH_OUTER_IDX.map((idx) => ({
    x: lm[idx].x * preview.width,
    y: lm[idx].y * preview.height,
  }));
  landmarks.mouthInner = MOUTH_INNER_IDX.map((idx) => ({
    x: lm[idx].x * preview.width,
    y: lm[idx].y * preview.height,
  }));
  const le = lm[LANDMARK_IDX.leftEye];
  const re = lm[LANDMARK_IDX.rightEye];
  const lx = le.x * preview.width;
  const ly = le.y * preview.height;
  const rx = re.x * preview.width;
  const ry = re.y * preview.height;
  faceAngle = Math.atan2(ry - ly, rx - lx);
  const nose = landmarks.nose;
  faceCenter = nose ? { ...nose } : { x: preview.width * 0.5, y: preview.height * 0.42 };
}

function setMotionMode(mode) {
  if (cameraPaused) return;
  if (mode === "start") mode = "normal";
  motionMode = mode;
  syncSpeedBarUI();

  const labels = {
    slow: "Langsam – läuft weiter bis du Gesicht aus drückst",
    normal: "Live – Gesicht aus = Kamera aus, ▶ Start = wieder Video",
    fast: "Schnell – läuft weiter bis du Gesicht aus drückst",
  };
  const base = faceFound
    ? "Gesicht erkannt – Sticker folgen dir!"
    : "Zeig dein Gesicht in die Kamera …";

  lastTick = 0;
  renderFrame();
  if (motionMode === "normal" && !recording) {
    faceHint.textContent = labels.normal;
    setTimeout(() => {
      if (motionMode === "normal" && !recording && !cameraPaused) faceHint.textContent = base;
    }, 1500);
  } else if (motionMode !== "normal") {
    faceHint.textContent = `${labels[motionMode]} · ${base}`;
  }
}

function loop(now) {
  raf = requestAnimationFrame(loop);
  if (cameraPaused) return;
  if (!camStream) return;

  if (video.paused) video.play().catch(() => {});

  if (recording) {
    stageWrap?.classList.remove("paused");
    detectFace();
    drawFrame();
    if (captureTrack?.requestFrame) captureTrack.requestFrame();
    return;
  }

  const fps = MOTION_FPS[motionMode];
  const interval = 1000 / fps;
  if (now - lastTick < interval) return;
  lastTick = now;

  detectFace();
  drawFrame();
  if (motionMode === "normal" && !recording) {
    faceHint.textContent = faceFound
      ? "Gesicht erkannt – Sticker folgen dir!"
      : "Zeig dein Gesicht in die Kamera …";
  }
}

function applyCameraMirrorTransform() {
  if (cameraFacing !== "user") return;
  ctx.translate(preview.width, 0);
  ctx.scale(-1, 1);
}

/** Im Spiegel-Modus: Emoji/Bild nicht spiegelverkehrt aufs Gesicht malen */
function beginFaceOverlay(x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (cameraFacing === "user") ctx.scale(-1, 1);
}

function endFaceOverlay() {
  ctx.restore();
}

function drawFrame() {
  if (!ctx) return;
  const w = preview.width;
  const h = preview.height;
  const useBg = activeBackgroundId !== "none";

  ctx.save();
  ctx.clearRect(0, 0, w, h);

  if (useBg) {
    drawBackgroundLayer();
    drawPersonOnBackground();
  } else {
    drawPlainVideo();
  }

  const showOverlays = !recording || faceFound;
  if (showOverlays) {
    ctx.save();
    applyCameraMirrorTransform();
    if (activeMaskId) drawFaceMask(activeMaskId);
    for (const s of stickers) {
      if (activeAccessories.has("lips") && s.type === "emoji" && isMouthEmoji(/** @type {string} */ (s.content))) {
        continue;
      }
      drawSticker(s);
    }
    for (const id of activeAccessories) drawAccessory(id);
    ctx.restore();
  }

  ctx.restore();
}

function getFaceMetrics() {
  const lc = landmarks.leftCheek;
  const rc = landmarks.rightCheek;
  const fh = landmarks.forehead;
  const ch = landmarks.chin;
  if (!lc || !rc || !fh || !ch) return null;
  const faceW = Math.hypot(rc.x - lc.x, rc.y - lc.y);
  const faceH = Math.hypot(ch.x - fh.x, ch.y - fh.y);
  const cx = landmarks.nose?.x ?? (lc.x + rc.x) / 2;
  const cy = landmarks.nose?.y ?? (fh.y + ch.y) / 2;
  return { faceW, faceH, cx, cy };
}

/** @param {string} maskId */
function drawFaceMask(maskId) {
  const mask = FACE_MASKS.find((m) => m.id === maskId);
  const metrics = getFaceMetrics();
  if (!mask || !metrics || !ctx) return;

  const { faceW, faceH, cx, cy } = metrics;
  const size = Math.max(faceW, faceH) * 1.35;

  beginFaceOverlay(cx, cy, OVERLAY_ANGLE);
  ctx.fillStyle = "rgba(255, 248, 240, 0.92)";
  ctx.beginPath();
  ctx.ellipse(0, faceH * 0.02, faceW * 0.58, faceH * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mask.emoji, 0, faceH * 0.02);
  endFaceOverlay();
}

function traceMouthPath(points) {
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
}

/** Rote Lippen entlang des echten Mundes – eine Farbe, sieht aus wie Lippen */
function drawPlayLips() {
  const outer = landmarks.mouthOuter;
  const inner = landmarks.mouthInner;
  if (!outer?.length || !ctx) return;

  ctx.save();
  ctx.globalAlpha = 0.9;

  ctx.fillStyle = "#dc2626";
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  traceMouthPath(outer);
  ctx.fill();
  ctx.stroke();

  if (inner?.length >= 4) {
    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    traceMouthPath(inner);
    ctx.fill();
    ctx.strokeStyle = "#be123c";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  const ml = landmarks.mouthLeft;
  const mr = landmarks.mouthRight;
  if (ml && mr) {
    const mx = (ml.x + mr.x) / 2;
    const my = (ml.y + mr.y) / 2;
    const mw = Math.hypot(mr.x - ml.x, mr.y - ml.y);
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = Math.max(1, mw * 0.04);
    ctx.beginPath();
    ctx.moveTo(ml.x, ml.y - mw * 0.02);
    ctx.quadraticCurveTo(mx, my - mw * 0.12, mr.x, mr.y - mw * 0.02);
    ctx.stroke();
  }

  ctx.restore();
}

function isMouthEmoji(emoji) {
  return emoji === "🌈" || emoji === "💋" || emoji === "👄" || emoji === "👅" || emoji === "💄";
}

function removeMouthEmojisFromStickers() {
  stickers = stickers.filter((s) => s.type !== "emoji" || !isMouthEmoji(/** @type {string} */ (s.content)));
}

/** @param {string} accId */
function drawAccessory(accId) {
  if (!ctx) return;
  const acc = ACCESSORIES.find((a) => a.id === accId);
  const metrics = getFaceMetrics();
  if (!acc) return;

  if (accId === "lips") {
    drawPlayLips();
    return;
  }

  let pos = faceCenter;
  let size = (metrics?.faceW ?? preview.width * 0.35) * 0.35;

  switch (accId) {
    case "hat": {
      pos = landmarks.forehead;
      if (pos && metrics) {
        pos = { x: pos.x, y: pos.y - metrics.faceH * 0.42 };
        size = metrics.faceW * 0.55;
      }
      break;
    }
    case "crown": {
      pos = landmarks.forehead;
      if (pos && metrics) {
        pos = { x: pos.x, y: pos.y - metrics.faceH * 0.32 };
        size = metrics.faceW * 0.62;
      }
      break;
    }
    case "bow": {
      const fh = landmarks.forehead;
      const rc = landmarks.rightCheek;
      if (fh && rc) {
        pos = {
          x: fh.x + (rc.x - fh.x) * 0.45,
          y: fh.y - metrics.faceH * 0.08,
        };
        size = metrics.faceW * 0.38;
      }
      break;
    }
    case "glasses": {
      if (landmarks.leftEye && landmarks.rightEye) {
        pos = {
          x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2,
          y: (landmarks.leftEye.y + landmarks.rightEye.y) / 2,
        };
        size = Math.hypot(
          landmarks.rightEye.x - landmarks.leftEye.x,
          landmarks.rightEye.y - landmarks.leftEye.y,
        ) * 1.35;
      }
      break;
    }
    case "clown-nose": {
      pos = landmarks.nose;
      size = (metrics?.faceW ?? preview.width * 0.35) * 0.18;
      break;
    }
    default:
      break;
  }

  if (!pos) return;

  beginFaceOverlay(pos.x, pos.y, OVERLAY_ANGLE);
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(acc.emoji, 0, 0);
  endFaceOverlay();
}

function clearMasks() {
  activeMaskId = null;
  activeAccessories.clear();
  syncMaskGridUI();
}

function syncMaskGridUI() {
  faceMaskGrid?.querySelectorAll(".mask-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.maskId === activeMaskId);
  });
  accessoryGrid?.querySelectorAll(".mask-btn").forEach((btn) => {
    btn.classList.toggle("active", activeAccessories.has(btn.dataset.accId || ""));
  });
}

function initMaskUI() {
  if (!faceMaskGrid || !accessoryGrid) return;

  for (const m of FACE_MASKS) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mask-btn";
    b.dataset.maskId = m.id;
    b.title = m.label;
    b.textContent = m.emoji;
    b.addEventListener("click", () => {
      activeMaskId = activeMaskId === m.id ? null : m.id;
      syncMaskGridUI();
    });
    faceMaskGrid.appendChild(b);
  }

  for (const a of ACCESSORIES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mask-btn";
    b.dataset.accId = a.id;
    b.title = a.label;
    if (a.id === "lips") {
      b.classList.add("mask-btn-lips");
      b.textContent = "";
      b.setAttribute("aria-label", "Lippen");
    } else {
      b.textContent = a.emoji;
    }
    b.addEventListener("click", () => {
      if (activeAccessories.has(a.id)) {
        activeAccessories.delete(a.id);
      } else {
        if (a.id === "lips") removeMouthEmojisFromStickers();
        activeAccessories.add(a.id);
      }
      syncMaskGridUI();
    });
    accessoryGrid.appendChild(b);
  }

  btnMaskOff?.addEventListener("click", clearMasks);
}

/** @param {{ type: string, content: string | HTMLImageElement, anchor: string, scale: number }} s */
function drawSticker(s) {
  const pos = landmarks[s.anchor] || faceCenter;
  if (!pos || !ctx) return;

  const baseSize = s.type === "emoji" ? 52 : 72;
  const size = baseSize * s.scale;
  const faceW = landmarks.leftCheek && landmarks.rightCheek
    ? Math.hypot(landmarks.rightCheek.x - landmarks.leftCheek.x, landmarks.rightCheek.y - landmarks.leftCheek.y)
    : preview.width * 0.35;
  const scaleFactor = faceW / 180;
  const finalSize = size * scaleFactor;

  beginFaceOverlay(pos.x, pos.y, OVERLAY_ANGLE);
  if (s.type === "emoji") {
    ctx.font = `${finalSize}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(/** @type {string} */ (s.content), 0, 0);
  } else if (s.content instanceof HTMLImageElement) {
    ctx.drawImage(s.content, -finalSize / 2, -finalSize / 2, finalSize, finalSize);
  }
  endFaceOverlay();
}

// ── Stickers ──────────────────────────────────────────────
function addEmojiSticker(emoji) {
  if (isMouthEmoji(emoji)) return;
  const anchors = ["forehead", "nose", "leftCheek", "rightCheek", "chin"];
  const anchor = anchors[stickers.length % anchors.length];
  stickers.push({
    id: uid(),
    type: "emoji",
    content: emoji,
    anchor,
    scale: 1,
  });
}

/** @param {HTMLImageElement | string} src */
function addImageSticker(src) {
  if (typeof src === "string") {
    const img = new Image();
    img.onload = () => {
      stickers.push({
        id: uid(),
        type: "image",
        content: img,
        anchor: "forehead",
        scale: 1,
      });
    };
    img.src = src;
  } else {
    stickers.push({
      id: uid(),
      type: "image",
      content: src,
      anchor: "forehead",
      scale: 1,
    });
  }
}

function emojiToImage(emoji, size = 128) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const cctx = c.getContext("2d");
  if (!cctx) return "";
  cctx.font = `${size * 0.85}px serif`;
  cctx.textAlign = "center";
  cctx.textBaseline = "middle";
  cctx.fillText(emoji, size / 2, size / 2);
  return c.toDataURL("image/png");
}

// ── Paint ─────────────────────────────────────────────────
function initPaint() {
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);

  for (const c of COLORS) {
    const sw = document.createElement("button");
    sw.type = "button";
    sw.className = "color-swatch" + (c === paintColor ? " active" : "");
    sw.style.background = c;
    sw.addEventListener("click", () => {
      paintColor = c;
      colorRow.querySelectorAll(".color-swatch").forEach((el) => el.classList.remove("active"));
      sw.classList.add("active");
    });
    colorRow.appendChild(sw);
  }

  const drawAt = (x, y) => {
    paintCtx.strokeStyle = paintColor;
    paintCtx.lineWidth = Number(brushSize.value);
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";
    paintCtx.lineTo(x, y);
    paintCtx.stroke();
    paintCtx.beginPath();
    paintCtx.moveTo(x, y);
  };

  const pos = (e) => {
    const r = paintCanvas.getBoundingClientRect();
    const t = "touches" in e ? e.touches[0] : e;
    return {
      x: ((t.clientX - r.left) / r.width) * paintCanvas.width,
      y: ((t.clientY - r.top) / r.height) * paintCanvas.height,
    };
  };

  paintCanvas.addEventListener("pointerdown", (e) => {
    painting = true;
    paintCanvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    paintCtx.beginPath();
    paintCtx.moveTo(p.x, p.y);
  });
  paintCanvas.addEventListener("pointermove", (e) => {
    if (!painting) return;
    drawAt(pos(e).x, pos(e).y);
  });
  paintCanvas.addEventListener("pointerup", () => {
    painting = false;
  });
}

// ── Tools UI ──────────────────────────────────────────────
const subPanels = {
  emoji: document.getElementById("sub-emoji"),
  mask: document.getElementById("sub-mask"),
  background: document.getElementById("sub-background"),
  paint: document.getElementById("sub-paint"),
  sticker: document.getElementById("sub-sticker"),
};

document.querySelectorAll(".tool[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tool = /** @type {HTMLElement} */ (btn).dataset.tool;
    document.querySelectorAll(".tool[data-tool]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    Object.entries(subPanels).forEach(([k, panel]) => {
      panel?.classList.toggle("hidden", k !== tool);
    });
  });
});

for (const em of EMOJIS) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "emoji-btn";
  b.textContent = em;
  b.addEventListener("click", () => addEmojiSticker(em));
  emojiGrid.appendChild(b);
}

for (const em of STICKER_PRESETS) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "sticker-btn";
  b.textContent = em;
  b.addEventListener("click", () => addImageSticker(emojiToImage(em)));
  stickerPresets.appendChild(b);
}

btnPaintClear.addEventListener("click", () => {
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
});

btnPaintApply.addEventListener("click", () => {
  addImageSticker(paintCanvas.toDataURL("image/png"));
  paintCtx.fillStyle = "#ffffff";
  paintCtx.fillRect(0, 0, paintCanvas.width, paintCanvas.height);
});

stickerUpload.addEventListener("change", () => {
  const file = stickerUpload.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") addImageSticker(reader.result);
  };
  reader.readAsDataURL(file);
  stickerUpload.value = "";
});

btnClear.addEventListener("click", () => {
  stickers = [];
  clearMasks();
});

speedBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = /** @type {HTMLElement} */ (btn).dataset.speed;
    if (mode === "stop") pauseCamera();
    else if (mode === "start") resumeCamera();
    else if (!cameraPaused && (mode === "slow" || mode === "normal" || mode === "fast")) {
      setMotionMode(mode);
    }
  });
});

preview.addEventListener("click", () => {
  if (cameraPaused) resumeCamera();
});

// ── Capture (Foto & Video gleich: erst Canvas zeichnen, dann speichern) ──
/** Zeigt Kamera + Sticker auf dem Canvas – für Foto und Video gleich */
function renderFrame() {
  detectFace();
  drawFrame();
}

/** Ein Bild vom Canvas – genau wie beim Foto */
function snapshotFromCanvas() {
  return new Promise((resolve) => {
    preview.toBlob((b) => resolve(b), "image/jpeg", 0.92);
  });
}

async function makeThumb(blob, type) {
  if (type === "photo") {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = Math.round(200 * (bmp.height / bmp.width));
    const cctx = c.getContext("2d");
    cctx?.drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob((b) => res(b || blob), "image/jpeg", 0.8));
  }
  // Video-Vorschau: aktuelles Bild vom Canvas (schnell, hängt nicht)
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = 200;
    c.height = Math.round(200 * (preview.height / preview.width));
    const cctx = c.getContext("2d");
    cctx?.drawImage(preview, 0, 0, c.width, c.height);
    c.toBlob((b) => resolve(b || blob), "image/jpeg", 0.8);
  });
}

function pickVideoMime() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function stopRecAudioOnly() {
  /* legacy noop */
}

function resetRecordingUI() {
  recording = false;
  recIndicator.classList.add("hidden");
  btnVideo.classList.remove("recording");
  btnVideo.textContent = "🎬";
  recordStream = null;
  captureTrack = null;
  recorder = null;
  recChunks = [];
  recFrameBlobs = [];
  recUseFrames = false;
  if (recFrameTimer) {
    clearInterval(recFrameTimer);
    recFrameTimer = 0;
  }
}

/** Fallback: viele Fotos nacheinander → Video (+ Mikro wenn möglich) */
async function buildVideoFromSnapshots(frames) {
  if (frames.length < 2) return null;
  const mime = pickVideoMime();
  if (!mime || !preview.captureStream) return null;

  const stream = getRecordingStream();
  const track = /** @type {CanvasCaptureMediaStreamTrack | undefined} */ (
    stream.getVideoTracks()[0]
  );
  if (!track) return null;

  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data);
  };
  const done = new Promise((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: mime }));
  });
  rec.start();

  for (const frameBlob of frames) {
    const bmp = await createImageBitmap(frameBlob);
    if (!ctx) break;
    ctx.save();
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.drawImage(bmp, 0, 0, preview.width, preview.height);
    ctx.restore();
    bmp.close();
    if (track.requestFrame) track.requestFrame();
    await new Promise((r) => setTimeout(r, VIDEO_FRAME_MS));
  }

  rec.stop();
  return done;
}

async function finishVideoSave(blob) {
  if (!blob || blob.size < 80) {
    faceHint.textContent =
      blob && blob.size > 0
        ? "Video war zu kurz oder leer – etwas länger aufnehmen, dann ⏹."
        : "Video war leer – nochmal 🎬 und etwas länger aufnehmen.";
    return;
  }
  try {
    await saveCapture(blob, "video");
  } catch {
    faceHint.textContent = "Video speichern fehlgeschlagen.";
  }
}

function stopVideoRecording() {
  if (!recording) return;
  if (recFrameTimer) {
    clearInterval(recFrameTimer);
    recFrameTimer = 0;
  }
  if (recorder && recorder.state !== "inactive") {
    try {
      if (recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {
          /* optional */
        }
      }
      recorder.stop();
    } catch {
      resetRecordingUI();
    }
  } else {
    resetRecordingUI();
  }
}

async function startVideoRecording() {
  if (!currentGame || !camStream || recording) return;

  if (cameraPaused) {
    faceHint.textContent = "Erst ▶ Start drücken – dann Video machen.";
    return;
  }

  await ensureMicForRecording();
  renderFrame();
  recChunks = [];
  recFrameBlobs = [];
  recUseFrames = false;
  recMime = pickVideoMime();

  if (window.MediaRecorder && typeof preview.captureStream === "function" && recMime) {
    try {
      recordStream = getRecordingStream();
      captureTrack = /** @type {CanvasCaptureMediaStreamTrack | null} */ (
        recordStream.getVideoTracks()[0] || null
      );
      if (captureTrack?.requestFrame) captureTrack.requestFrame();

      const withAudio = recordStream.getAudioTracks().length > 0;
      recorder = new MediaRecorder(recordStream, {
        mimeType: recMime,
        videoBitsPerSecond: 2_000_000,
        audioBitsPerSecond: withAudio ? 128_000 : undefined,
      });
      recorder.ondataavailable = (e) => {
        if (e.data?.size) recChunks.push(e.data);
      };
      recorder.onerror = () => {
        resetRecordingUI();
        faceHint.textContent = "Video-Fehler – nochmal 🎬 drücken.";
      };
      recorder.onstop = async () => {
        const blob = new Blob(recChunks, { type: recMime });
        resetRecordingUI();
        await finishVideoSave(blob);
      };
      recorder.start(200);
      recording = true;
      recIndicator.classList.remove("hidden");
      btnVideo.classList.add("recording");
      btnVideo.textContent = "⏹";
      faceHint.textContent = withAudio
        ? "● Video läuft – nochmal ⏹ drücken zum Stoppen."
        : "● Video läuft (ohne Ton) – ⏹ = Stopp.";
      return;
    } catch {
      /* Fallback unten */
    }
  }

  startVideoRecordingFallback();
}

/** Fallback: Aufnahme mit Ton, Bilder per Hand auslösen */
function startVideoRecordingFallback() {
  if (recording) return;
  recMime = pickVideoMime();
  if (!recMime || !preview.captureStream) {
    faceHint.textContent = "Video geht hier nicht – bitte Chrome und http:// nutzen.";
    return;
  }

  try {
    recordStream = getRecordingStream();
    captureTrack = /** @type {CanvasCaptureMediaStreamTrack | null} */ (
      recordStream.getVideoTracks()[0] || null
    );
    const withAudio = recordStream.getAudioTracks().length > 0;
    recorder = new MediaRecorder(recordStream, {
      mimeType: recMime,
      videoBitsPerSecond: 2_000_000,
      audioBitsPerSecond: withAudio ? 128_000 : undefined,
    });
    recChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data?.size) recChunks.push(e.data);
    };
    recorder.onerror = () => {
      resetRecordingUI();
      faceHint.textContent = "Video-Fehler – nochmal 🎬 drücken.";
    };
    recorder.onstop = async () => {
      const blob = new Blob(recChunks, { type: recMime });
      resetRecordingUI();
      await finishVideoSave(blob);
    };
    recorder.start(200);
    recUseFrames = true;
    recording = true;
    recIndicator.classList.remove("hidden");
    btnVideo.classList.add("recording");
    btnVideo.textContent = "⏹";
    faceHint.textContent = withAudio
      ? "● Video läuft – nochmal ⏹ drücken zum Stoppen."
      : "● Video läuft (ohne Ton) – ⏹ = Stopp.";

    renderFrame();
    if (captureTrack?.requestFrame) captureTrack.requestFrame();

    recFrameTimer = window.setInterval(() => {
      if (!recording) return;
      renderFrame();
      if (captureTrack?.requestFrame) captureTrack.requestFrame();
    }, VIDEO_FRAME_MS);
  } catch {
    faceHint.textContent = "Video-Start fehlgeschlagen.";
  }
}

async function saveCapture(blob, type) {
  if (!currentGame || !blob || blob.size < 16) return;

  const run = async () => {
    let thumbBlob;
    try {
      thumbBlob = await makeThumb(blob, type);
    } catch {
      thumbBlob = blob;
    }
    const item = {
      id: uid(),
      accountId: currentGame.id,
      type,
      blob,
      thumbBlob,
      createdAt: Date.now(),
    };
    try {
      await saveMedia(item);
    } catch (err) {
      const name = err && /** @type {{ name?: string }} */ (err).name;
      if (name === "QuotaExceededError") {
        faceHint.textContent =
          "Speicher voll – in der Galerie alte Fotos/Videos löschen, dann geht es weiter.";
      } else {
        faceHint.textContent = "Speichern fehlgeschlagen – Seite neu laden oder Platz prüfen.";
      }
      throw err;
    }
    if (getActiveTab() === "gallery") await refreshGallery();
    flashSaved(type);
  };

  mediaSaveChain = mediaSaveChain.then(run).catch(() => {});
  await mediaSaveChain;
}

function flashSaved(type) {
  const msg = type === "photo" ? "📷 Foto gespeichert!" : "🎬 Video gespeichert!";
  const old = faceHint.textContent;
  faceHint.textContent = msg;
  setTimeout(() => {
    if (faceHint.textContent === msg) faceHint.textContent = old;
  }, 2000);
}

btnPhoto.addEventListener("click", async () => {
  if (cameraPaused || !currentGame || !camStream) return;
  renderFrame();
  const blob = await snapshotFromCanvas();
  if (blob) await saveCapture(blob, "photo");
});

btnVideo.addEventListener("click", async () => {
  if (cameraPaused) {
    faceHint.textContent = "Erst ▶ Start drücken – dann Video machen.";
    return;
  }
  if (!currentGame || !camStream) return;
  if (recording) {
    stopVideoRecording();
    return;
  }
  await startVideoRecording();
});

async function restartCamera() {
  cancelAnimationFrame(raf);
  if (recording) stopVideoRecording();
  if (camStream) {
    camStream.getTracks().forEach((t) => t.stop());
    camStream = null;
  }
  video.srcObject = null;
  await ensureCamera();
}

btnMic?.addEventListener("click", async () => {
  if (cameraPaused) return;
  micEnabled = !micEnabled;
  await restartCamera();
});

btnFlipCam?.addEventListener("click", async () => {
  if (cameraPaused) return;
  cameraFacing = cameraFacing === "user" ? "environment" : "user";
  await restartCamera();
});

// ── Gallery ───────────────────────────────────────────────
async function refreshGallery() {
  galleryGrid.innerHTML = "";
  if (!currentGame) {
    galleryEmpty.classList.remove("hidden");
    return;
  }
  const items = await getMediaForAccount(currentGame.id);
  galleryEmpty.classList.toggle("hidden", items.length > 0);
  for (const item of items) {
    const cell = document.createElement("div");
    cell.className = "gallery-item";
    cell.dataset.id = item.id;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.type === "photo" ? "FOTO" : "VIDEO";
    cell.appendChild(badge);

    const url = URL.createObjectURL(item.thumbBlob || item.blob);
    if (item.type === "photo") {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Gespeichertes Foto";
      cell.appendChild(img);
    } else {
      const vid = document.createElement("video");
      vid.src = url;
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = "metadata";
      cell.appendChild(vid);
    }

    cell.addEventListener("click", () => openLightbox(item));
    galleryGrid.appendChild(cell);
  }
}

/** @param {{ id: string, type: string, blob: Blob }} item */
function openLightbox(item) {
  lightboxMediaId = item.id;
  lbContent.innerHTML = "";
  const url = URL.createObjectURL(item.blob);
  if (item.type === "photo") {
    const img = document.createElement("img");
    img.src = url;
    lbContent.appendChild(img);
    lbDownload.download = `gesichts-studio-foto-${item.id}.jpg`;
  } else {
    const vid = document.createElement("video");
    vid.src = url;
    vid.controls = true;
    vid.autoplay = true;
    vid.playsInline = true;
    lbContent.appendChild(vid);
    lbDownload.download = `gesichts-studio-video-${item.id}.webm`;
  }
  lbDownload.href = url;
  lightbox.showModal();
}

lbClose.addEventListener("click", () => lightbox.close());
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.close();
});

lbDelete.addEventListener("click", async () => {
  if (!lightboxMediaId) return;
  await deleteMedia(lightboxMediaId);
  lightboxMediaId = null;
  lightbox.close();
  await refreshGallery();
});

// ── Init ──────────────────────────────────────────────────
async function init() {
  db = await openDb();
  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch {
      /* optional – mehr Speicher-Persistenz wenn der Browser es erlaubt */
    }
  }
  initPaint();
  initMaskUI();
  initBackgroundUI();
  await initVisionModels();
  await startPlaying();
}

init();
