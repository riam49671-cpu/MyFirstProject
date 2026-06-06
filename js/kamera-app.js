/**
 * Kamera-App — Foto, Video, QR, Stop-Motion, Zeitraffer, Zeitlupe
 */

const MODES = {
  foto: {
    hint: "Tippe auf Foto machen — ein Bild landet in der Galerie.",
    btn: "📷 Foto machen",
  },
  video: {
    hint: "Start drücken zum Aufnehmen, nochmal drücken zum Stoppen. Mikrofon optional.",
    btn: "● Video starten",
    btnStop: "■ Video stoppen",
  },
  qr: {
    hint: "QR in den grünen Rahmen halten. Tipp: 🔄 Rückkamera oft besser. Scan läuft automatisch.",
    btn: "🔄 Nochmal scannen",
  },
  stopmotion: {
    hint: "Beweg dich ein Stück → Bild aufnehmen → wieder → so oft du willst. Am Ende Video bauen.",
    btn: "➕ Bild aufnehmen",
    btnFinish: "🎬 Video aus Bildern",
  },
  speed: {
    hint: "Zeitraffer: Kamera nimmt alle 0,3 s ein Bild. Stoppen → schnelles Video.",
    btn: "⚡ Zeitraffer starten",
    btnStop: "■ Zeitraffer stoppen",
  },
  slow: {
    hint: "Zeitlupe: Viele Bilder aufnehmen, Video wird langsam abgespielt.",
    btn: "🐌 Zeitlupe starten",
    btnStop: "■ Zeitlupe stoppen",
  },
};

const cam = document.getElementById("cam");
const preview = document.getElementById("preview");
const ctx = preview.getContext("2d", { alpha: false });
const elStatus = document.getElementById("status");
const elHint = document.getElementById("mode-hint");
const elRec = document.getElementById("rec-dot");
const elQrOverlay = document.getElementById("qr-overlay");
const elQrResult = document.getElementById("qr-result");
const elQrText = document.getElementById("qr-text");
const elQrLink = document.getElementById("qr-link");
const elStopBar = document.getElementById("stopmotion-bar");
const elFrameCount = document.getElementById("frame-count");
const btnMain = document.getElementById("btn-main");
const btnFlip = document.getElementById("btn-flip");
const btnMic = document.getElementById("btn-mic");
const btnQrCopy = document.getElementById("btn-qr-copy");
const btnPlayFrames = document.getElementById("btn-play-frames");
const btnClearFrames = document.getElementById("btn-clear-frames");
const btnCameraAllow = document.getElementById("btn-camera-allow");
const elCameraBlock = document.getElementById("camera-block");
const galleryGrid = document.getElementById("gallery-grid");
const galleryEmpty = document.getElementById("gallery-empty");

let stream = null;
let mode = "foto";
let mirror = true;
let micOn = true;
let animId = 0;
let recording = false;
/** @type {MediaRecorder | null} */
let mediaRecorder = null;
/** @type {Blob[]} */
let recordChunks = [];
/** @type {HTMLCanvasElement[]} */
let stopFrames = [];
/** @type {Blob[]} */
let timelapseFrames = [];
/** @type {Blob[]} */
let slowFrames = [];
let timelapseTimer = 0;
let slowTimer = 0;
let videoFrameTimer = 0;
/** @type {Blob[]} */
let videoFrames = [];
let cameraReady = false;
/** @type {BarcodeDetector | null} */
let barcodeDetector = null;
/** @type {Function | null} */
let jsQR = null;
let lastQr = "";
let gallery = [];
let qrScanBusy = false;
let lastQrScanAt = 0;
const qrScanCanvas = document.createElement("canvas");
const QR_SCAN_INTERVAL = 120;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function setStatus(msg) {
  elStatus.textContent = msg;
}

function setupMediaPolyfill() {
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (!navigator.mediaDevices.getUserMedia) {
    const legacy =
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.getUserMedia;
    if (legacy) {
      navigator.mediaDevices.getUserMedia = (constraints) =>
        new Promise((ok, err) => legacy.call(navigator, constraints, ok, err));
    }
  }
}

function supportsMediaRecorder() {
  return typeof MediaRecorder !== "undefined" && typeof preview.captureStream === "function";
}

function pickRecorderMime() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "video/webm";
}

function showCameraPrompt(show) {
  elCameraBlock?.classList.toggle("hidden", !show);
  btnMain.disabled = show && !cameraReady;
}

function updateModeUi() {
  const m = MODES[mode];
  elHint.textContent = m.hint;
  elQrOverlay.classList.toggle("hidden", mode !== "qr");
  elStopBar.classList.toggle("hidden", mode !== "stopmotion");
  elQrResult.classList.toggle("hidden", mode !== "qr" || !lastQr);
  if (mode === "video" && recording) btnMain.textContent = m.btnStop;
  else if (mode === "speed" && recording) btnMain.textContent = m.btnStop;
  else if (mode === "slow" && recording) btnMain.textContent = m.btnStop;
  else if (mode === "stopmotion" && stopFrames.length >= 2) btnMain.textContent = m.btnFinish;
  else btnMain.textContent = m.btn;
  updateFrameCount();
}

function updateFrameCount() {
  elFrameCount.textContent = `${stopFrames.length} Bilder`;
}

async function tryGetStream() {
  const tries = [
    {
      video: {
        facingMode: mirror ? "user" : "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: micOn && mode === "video",
    },
    {
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    },
    { video: true, audio: false },
  ];
  let lastErr = null;
  for (const constraints of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Kamera nicht erlaubt");
}

function updateMirrorUi() {
  cam.classList.toggle("mirror", mirror);
}

function syncCaptureCanvas() {
  const w = cam.videoWidth || 640;
  const h = cam.videoHeight || 480;
  if (preview.width !== w) preview.width = w;
  if (preview.height !== h) preview.height = h;
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  if (!cam.videoWidth) return;
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(cam, 0, 0, w, h);
  ctx.restore();
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraPrompt(true);
    throw new Error("Kamera nicht verfügbar");
  }
  if (stream) stream.getTracks().forEach((t) => t.stop());

  stream = await tryGetStream();
  cam.srcObject = stream;
  cam.muted = true;
  cam.autoplay = true;
  cam.playsInline = true;

  await new Promise((resolve) => {
    const done = () => resolve();
    if (cam.readyState >= 1) {
      done();
      return;
    }
    const timer = setTimeout(done, 4000);
    cam.onloadedmetadata = () => {
      clearTimeout(timer);
      done();
    };
  });

  await cam.play().catch(() => {});

  updateMirrorUi();
  cameraReady = !!cam.videoWidth;
  showCameraPrompt(!cameraReady);
  if (!animId) loop();

  if (cameraReady) {
    syncCaptureCanvas();
    setStatus("Kamera läuft — du solltest dich sehen!");
  } else {
    setStatus("Kamera startet … tippe „Kamera erlauben“.");
    showCameraPrompt(true);
  }
}

function drawFrame() {
  syncCaptureCanvas();
}

function loop() {
  if (mode === "qr") scanQrTick();
  animId = requestAnimationFrame(loop);
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function canvasToBlob(c = preview) {
  return new Promise((resolve) => {
    const fallback = () => {
      try {
        resolve(dataUrlToBlob(c.toDataURL("image/jpeg", 0.92)));
      } catch {
        resolve(null);
      }
    };
    if (typeof c.toBlob === "function") {
      c.toBlob((b) => (b ? resolve(b) : fallback()), "image/jpeg", 0.92);
    } else {
      fallback();
    }
  });
}


function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function uploadPhoto(blob) {
  try {
    const fd = new FormData();
    fd.append("photo", blob, "foto.jpg");
    const res = await fetch("/api/save-photo", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
  } catch (e) {
    console.warn("uploadPhoto:", e);
  }
  return blobToDataUrl(blob);
}

async function uploadFrames(blobs, fps, label) {
  try {
    const fd = new FormData();
    fd.append("fps", String(fps || 10));
    fd.append("label", label || "video");
    blobs.forEach((b, i) => fd.append("frame", b, `f${i}.jpg`));
    const res = await fetch("/api/save-frames", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      return { urls: data.urls, base: data.base };
    }
  } catch (e) {
    console.warn("uploadFrames:", e);
  }
  const urls = await Promise.all(blobs.map((b) => blobToDataUrl(b)));
  return { urls, base: null };
}

function updateGalleryTabLabel() {
  const tab = document.querySelector('.tab[data-tab="gallery"]');
  if (tab) tab.textContent = gallery.length ? `Galerie (${gallery.length})` : "Galerie";
}

async function loadGalleryFromServer() {
  try {
    const res = await fetch("/api/gallery-list");
    if (!res.ok) return;
    const data = await res.json();
    gallery = (data.items || []).map((item, i) => ({
      ...item,
      id: item.id || `item-${i}`,
    }));
    updateGalleryTabLabel();
    renderGallery();
  } catch (e) {
    console.warn("loadGalleryFromServer:", e);
  }
}

async function openGalleryTab(showLatest = false) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === "gallery");
  });
  document.getElementById("panel-camera").classList.add("hidden");
  document.getElementById("panel-gallery").classList.remove("hidden");
  await loadGalleryFromServer();
  if (showLatest && gallery.length) openGalleryViewer(gallery[0]);
}

function addGalleryFilmUrls(frameUrls, fps, label, base, downloadUrl = null) {
  const item = {
    id: base ? `film-${base}.json` : `film-${Date.now()}`,
    type: "film",
    frames: frameUrls,
    fps: fps || 10,
    label,
    url: frameUrls[0],
    downloadUrl,
    date: new Date(),
  };
  gallery.unshift(item);
  updateGalleryTabLabel();
  renderGallery();
  openGalleryTab(true);
  return item;
}

function addGalleryPhotoUrl(url, label) {
  const name = url.includes("/") ? url.split("/").pop() : `foto-${Date.now()}.jpg`;
  const item = { id: name, url, type: "photo", label, date: new Date() };
  gallery.unshift(item);
  updateGalleryTabLabel();
  renderGallery();
  openGalleryTab(true);
  return item;
}

let filmPlayToken = 0;

function isFilmItem(item) {
  return item.type === "film" || (item.frames && item.frames.length > 0);
}

function appendFilmTile(item, wrap) {
  const img = document.createElement("img");
  img.src = item.frames[0];
  img.alt = item.label;
  img.className = "film-thumb";
  img.loading = "eager";
  wrap.appendChild(img);
  const play = document.createElement("button");
  play.type = "button";
  play.className = "film-play";
  play.textContent = "▶";
  play.title = "Video abspielen";
  play.addEventListener("click", (e) => {
    e.stopPropagation();
    playFilm(item, img);
  });
  wrap.appendChild(play);
  wrap.addEventListener("click", () => openGalleryViewer(item));
}

function renderGallery() {
  galleryGrid.innerHTML = "";
  galleryEmpty.classList.toggle("hidden", gallery.length > 0);
  updateGalleryTabLabel();

  gallery.forEach((item) => {
    const wrap = document.createElement("div");
    wrap.className = "gallery-item";

    const badge = document.createElement("span");
    badge.className = "gallery-badge";
    badge.textContent = item.type === "photo" ? "📷 Foto" : "🎬 Video";
    wrap.appendChild(badge);

    const cap = document.createElement("p");
    cap.className = "gallery-caption";
    cap.textContent = item.label || (item.type === "photo" ? "Foto" : "Video");
    wrap.appendChild(cap);

    if (item.type === "photo") {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.label;
      img.loading = "eager";
      wrap.appendChild(img);
      wrap.addEventListener("click", () => openGalleryViewer(item));
    } else if (isFilmItem(item)) {
      appendFilmTile(item, wrap);
    } else {
      const msg = document.createElement("p");
      msg.className = "gallery-miss";
      msg.textContent = "Video neu aufnehmen";
      wrap.appendChild(msg);
    }

    const actions = document.createElement("div");
    actions.className = "gallery-actions";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = "👁";
    openBtn.title = "Ansehen";
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openGalleryViewer(item);
    });

    const dl = document.createElement("button");
    dl.type = "button";
    dl.textContent = "↓";
    dl.title = "Speichern";
    dl.addEventListener("click", (e) => {
      e.stopPropagation();
      downloadItem(item);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "✕";
    del.title = "Löschen";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteGalleryItem(item);
    });

    actions.appendChild(openBtn);
    actions.appendChild(dl);
    actions.appendChild(del);
    wrap.appendChild(actions);
    galleryGrid.appendChild(wrap);
  });
}

async function playFilm(item, imgEl, loops = 5) {
  if (!item.frames?.length) return;
  const token = ++filmPlayToken;
  for (let r = 0; r < loops; r++) {
    for (const url of item.frames) {
      if (token !== filmPlayToken) return;
      imgEl.src = url;
      await wait(1000 / (item.fps || 10));
    }
  }
  if (token === filmPlayToken) imgEl.src = item.frames[0];
}

function stopFilmPlayback() {
  filmPlayToken++;
}

function openGalleryViewer(item) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.tab === "gallery");
  });
  document.getElementById("panel-camera").classList.add("hidden");
  document.getElementById("panel-gallery").classList.remove("hidden");
  const el = document.getElementById("gallery-viewer");
  const media = document.getElementById("gallery-viewer-media");
  el.classList.remove("hidden");
  media.innerHTML = "";
  stopFilmPlayback();

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.src = item.url;
    img.className = "viewer-img";
    media.appendChild(img);
    return;
  }

  if (isFilmItem(item)) {
    const img = document.createElement("img");
    img.src = item.frames[0];
    img.className = "viewer-img";
    media.appendChild(img);
    const hint = document.createElement("p");
    hint.className = "viewer-hint";
    hint.textContent = "Video läuft …";
    media.appendChild(hint);
    playFilm(item, img, 8);
    return;
  }

  const p = document.createElement("p");
  p.textContent = "Video nicht verfügbar — bitte neu aufnehmen.";
  media.appendChild(p);
}

async function deleteGalleryItem(item) {
  const name = item.id || "";
  if (name && !name.startsWith("data:")) {
    try {
      const fd = new FormData();
      fd.append("name", name);
      await fetch("/api/delete-media", { method: "POST", body: fd });
    } catch (e) {
      console.warn("delete:", e);
    }
  }
  gallery = gallery.filter((g) => g.id !== item.id);
  stopFilmPlayback();
  document.getElementById("gallery-viewer")?.classList.add("hidden");
  renderGallery();
}

function downloadItem(item) {
  const a = document.createElement("a");
  if (item.downloadUrl) {
    a.href = item.downloadUrl;
    a.download = `${item.label}-${item.id}.mp4`;
  } else if (item.type === "photo") {
    a.href = item.url;
    a.download = `${item.label}-${item.id}.jpg`;
  } else if (isFilmItem(item)) {
    a.href = item.frames[0];
    a.download = `${item.label}-${item.id}.jpg`;
  } else {
    setStatus("Download nicht möglich.");
    return;
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
  setStatus(item.downloadUrl ? "Video gespeichert!" : "Bild gespeichert!");
}

async function takePhoto() {
  if (!cameraReady) {
    setStatus("Erst „Kamera erlauben“ tippen!");
    return;
  }
  syncCaptureCanvas();
  const blob = await canvasToBlob();
  if (!blob) {
    setStatus("Foto fehlgeschlagen — nochmal versuchen.");
    return;
  }
  setStatus("Foto wird gespeichert …");
  try {
    const url = await uploadPhoto(blob);
    addGalleryPhotoUrl(url, "Foto");
    setStatus("Fertig — du siehst dein Foto in der Galerie!");
  } catch (e) {
    console.error(e);
    setStatus("Foto-Fehler — App neu starten.");
  }
}

async function saveVideoFromFrames(blobs, fps, label) {
  if (!blobs.length) {
    setStatus("Keine Video-Bilder — zu kurz?");
    return;
  }
  setStatus(`Video wird gespeichert (${blobs.length} Bilder) …`);
  btnMain.disabled = true;

  try {
    const { urls, base } = await uploadFrames(blobs, fps, label);
    const item = addGalleryFilmUrls(urls, fps, label, base);

    const fd = new FormData();
    fd.append("fps", String(fps));
    if (base) fd.append("film_base", base);
    blobs.forEach((b, i) => fd.append("frame", b, `f${i}.jpg`));
    const res = await fetch("/api/encode-video", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      item.downloadUrl = data.url;
      renderGallery();
    }
    setStatus("Fertig — du siehst dein Video in der Galerie!");
  } catch (e) {
    console.error(e);
    setStatus("Video-Fehler — App neu starten.");
  } finally {
    btnMain.disabled = false;
  }
}

async function startVideoRecord() {
  if (!cameraReady) {
    await startCamera().catch(() => {});
    if (!cameraReady) return;
  }
  videoFrames = [];
  recording = true;
  elRec.classList.remove("hidden");
  setStatus("Video läuft … nochmal drücken zum Stoppen.");
  updateModeUi();

  const snap = async () => {
    if (!recording) return;
    drawFrame();
    const blob = await canvasToBlob();
    if (blob) videoFrames.push(blob);
  };
  snap();
  videoFrameTimer = window.setInterval(snap, 33);
}

async function stopVideoRecord() {
  recording = false;
  clearInterval(videoFrameTimer);
  elRec.classList.add("hidden");
  updateModeUi();
  await saveVideoFromFrames(videoFrames, 30, "video");
  videoFrames = [];
}

async function loadQrLib() {
  if (barcodeDetector || jsQR) return;
  if ("BarcodeDetector" in window) {
    try {
      barcodeDetector = new BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      barcodeDetector = null;
    }
  }
  if (typeof window.jsQR === "function") {
    jsQR = window.jsQR;
    return;
  }
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "js/jsqr.js";
    s.onload = () => {
      jsQR = window.jsQR || null;
      resolve();
    };
    s.onerror = () => reject(new Error("QR-Bibliothek fehlt"));
    document.head.appendChild(s);
  });
}

function getQrImageData() {
  if (!cam.videoWidth) return null;
  const w = cam.videoWidth;
  const h = cam.videoHeight;
  qrScanCanvas.width = w;
  qrScanCanvas.height = h;
  const sctx = qrScanCanvas.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(cam, 0, 0, w, h);
  return { sctx, w, h };
}

function decodeWithJsQR(sctx, w, h) {
  if (!jsQR) return null;
  const opts = { inversionAttempts: "attemptBoth" };
  const full = sctx.getImageData(0, 0, w, h);
  let code = jsQR(full.data, w, h, opts);
  if (code?.data) return code.data;

  const cw = Math.floor(w * 0.75);
  const ch = Math.floor(h * 0.75);
  const cx = Math.floor((w - cw) / 2);
  const cy = Math.floor((h - ch) / 2);
  const crop = sctx.getImageData(cx, cy, cw, ch);
  code = jsQR(crop.data, cw, ch, opts);
  return code?.data || null;
}

async function scanQrTick() {
  const now = performance.now();
  if (qrScanBusy || now - lastQrScanAt < QR_SCAN_INTERVAL) return;
  if (!cam.videoWidth) return;

  qrScanBusy = true;
  lastQrScanAt = now;
  try {
    if (!barcodeDetector && !jsQR) await loadQrLib();

    const shot = getQrImageData();
    if (!shot) return;
    const { sctx, w, h } = shot;

    if (barcodeDetector) {
      try {
        const codes = await barcodeDetector.detect(qrScanCanvas);
        if (codes.length) {
          showQrResult(codes[0].rawValue);
          return;
        }
      } catch {
        /* jsQR fallback */
      }
    }

    const text = decodeWithJsQR(sctx, w, h);
    if (text) showQrResult(text);
    else if (!lastQr) setStatus("Suche QR-Code … halte ihn ruhig in den Rahmen.");
  } catch (e) {
    console.error(e);
    setStatus("QR-Scan Fehler — Seite neu laden?");
  } finally {
    qrScanBusy = false;
  }
}

async function startQrMode() {
  lastQr = "";
  elQrResult.classList.add("hidden");
  setStatus("QR-Scan startet …");
  try {
    await loadQrLib();
    setStatus("Suche QR-Code … halte ihn ruhig in den Rahmen.");
  } catch (e) {
    setStatus(e.message || "QR-Bibliothek konnte nicht geladen werden.");
  }
}

function showQrResult(text) {
  if (text === lastQr) return;
  lastQr = text;
  elQrText.textContent = text;
  elQrResult.classList.remove("hidden");
  const isUrl = /^https?:\/\//i.test(text);
  elQrLink.classList.toggle("hidden", !isUrl);
  if (isUrl) {
    elQrLink.href = text;
    elQrLink.textContent = "Link öffnen";
  }
  setStatus("QR-Code erkannt!");
}

function addStopFrame() {
  drawFrame();
  const c = document.createElement("canvas");
  c.width = preview.width;
  c.height = preview.height;
  c.getContext("2d").drawImage(preview, 0, 0);
  stopFrames.push(c);
  updateFrameCount();
  setStatus(`Bild ${stopFrames.length} aufgenommen.`);
  updateModeUi();
}

async function playStopPreview() {
  if (!stopFrames.length) return;
  setStatus("Vorschau …");
  const fps = 8;
  for (let i = 0; i < stopFrames.length; i++) {
    ctx.drawImage(stopFrames[i], 0, 0);
    await wait(1000 / fps);
  }
  setStatus(`${stopFrames.length} Bilder — Vorschau fertig.`);
}

async function buildVideoFromBlobs(blobs, outFps, label) {
  await saveVideoFromFrames(blobs, outFps, label);
}

function startTimelapse() {
  timelapseFrames = [];
  recording = true;
  elRec.classList.remove("hidden");
  setStatus("Zeitraffer läuft …");
  updateModeUi();
  const snap = async () => {
    if (!recording) return;
    drawFrame();
    const blob = await canvasToBlob();
    if (blob) timelapseFrames.push(blob);
    setStatus(`Zeitraffer: ${timelapseFrames.length} Bilder`);
  };
  snap();
  timelapseTimer = window.setInterval(snap, 300);
}

async function stopTimelapse() {
  recording = false;
  clearInterval(timelapseTimer);
  elRec.classList.add("hidden");
  updateModeUi();
  await saveVideoFromFrames(timelapseFrames, 30, "schnell");
  timelapseFrames = [];
}

function startSlowCapture() {
  slowFrames = [];
  recording = true;
  elRec.classList.remove("hidden");
  setStatus("Zeitlupe nimmt auf …");
  updateModeUi();
  const snap = async () => {
    if (!recording) return;
    drawFrame();
    const blob = await canvasToBlob();
    if (blob) slowFrames.push(blob);
  };
  slowTimer = window.setInterval(snap, 33);
}

async function stopSlowCapture() {
  recording = false;
  clearInterval(slowTimer);
  elRec.classList.add("hidden");
  updateModeUi();
  await saveVideoFromFrames(slowFrames, 8, "langsam");
  slowFrames = [];
}

async function onMainClick() {
  if (mode === "foto") {
    await takePhoto();
  } else if (mode === "video") {
    if (!recording) await startVideoRecord();
    else await stopVideoRecord();
  } else if (mode === "qr") {
    await startQrMode();
  } else if (mode === "stopmotion") {
    if (stopFrames.length >= 2 && btnMain.textContent.includes("Video")) {
      setStatus("Stop-Motion Video wird gebaut …");
      const blobs = await Promise.all(
        stopFrames.map(
          (c) =>
            new Promise((resolve) => {
              c.toBlob((b) => resolve(b), "image/jpeg", 0.92);
            }),
        ),
      );
      await saveVideoFromFrames(blobs.filter(Boolean), 10, "stopmotion");
    } else {
      addStopFrame();
    }
  } else if (mode === "speed") {
    if (!recording) startTimelapse();
    else await stopTimelapse();
  } else if (mode === "slow") {
    if (!recording) startSlowCapture();
    else await stopSlowCapture();
  }
}

document.querySelectorAll(".mode").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (recording) return;
    document.querySelectorAll(".mode").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    mode = btn.dataset.mode;
    lastQr = "";
    if (mode !== "qr") elQrResult.classList.add("hidden");
    updateModeUi();
    if (mode === "qr") startQrMode().catch(console.error);
  });
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.tab === "gallery") {
      openGalleryTab(false).catch(console.error);
      return;
    }
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-camera").classList.remove("hidden");
    document.getElementById("panel-gallery").classList.add("hidden");
  });
});

document.getElementById("gallery-viewer-close")?.addEventListener("click", () => {
  stopFilmPlayback();
  document.getElementById("gallery-viewer")?.classList.add("hidden");
  document.getElementById("gallery-viewer-media").innerHTML = "";
});

btnMain.addEventListener("click", () => onMainClick().catch(console.error));
btnFlip.addEventListener("click", () => {
  mirror = !mirror;
  updateMirrorUi();
  startCamera().catch((e) => setStatus(e.message));
});
btnMic.addEventListener("click", () => {
  micOn = !micOn;
  btnMic.classList.toggle("active", micOn);
  if (mode === "video" && !recording) startCamera().catch(console.error);
});
btnQrCopy?.addEventListener("click", () => {
  if (lastQr) navigator.clipboard.writeText(lastQr).then(() => setStatus("Kopiert!"));
});
btnPlayFrames?.addEventListener("click", () => playStopPreview().catch(console.error));
btnClearFrames?.addEventListener("click", () => {
  stopFrames = [];
  updateFrameCount();
  updateModeUi();
  setStatus("Stop-Motion Bilder gelöscht.");
});

async function init() {
  setupMediaPolyfill();
  updateModeUi();
  showCameraPrompt(true);
  setStatus("Tippe „Kamera erlauben“ — dann siehst du dich.");
  if (location.protocol !== "file:") {
    await loadGalleryFromServer();
  }
}

btnCameraAllow?.addEventListener("click", () => {
  startCamera()
    .then(() => {
      if (cameraReady) showCameraPrompt(false);
    })
    .catch((e) => setStatus(e.message || "Kamera nicht erlaubt — nochmal versuchen."));
});

init();
