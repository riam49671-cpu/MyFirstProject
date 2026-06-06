/**
 * Simon Says — Kamera, Pose/Hände, englische Stimme, Mehrspieler
 */
import {
  PoseLandmarker,
  HandLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const POSE = {
  nose: 0,
  lEar: 7,
  rEar: 8,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
};

/** Commands — English only */
const COMMANDS = [
  { id: "nose", say: "touch your nose", emoji: "👃" },
  { id: "head", say: "touch your head", emoji: "🙂" },
  { id: "lEar", say: "touch your left ear", emoji: "👂" },
  { id: "rEar", say: "touch your right ear", emoji: "👂" },
  { id: "lShoulder", say: "touch your left shoulder", emoji: "💪" },
  { id: "rShoulder", say: "touch your right shoulder", emoji: "💪" },
  { id: "lKnee", say: "touch your left knee", emoji: "🦵" },
  { id: "rKnee", say: "touch your right knee", emoji: "🦵" },
  { id: "belly", say: "touch your belly", emoji: "🫃" },
];

const PLAYER_COLORS = ["#2dd4bf", "#f472b6", "#fbbf24", "#818cf8"];
const REACT_MS = 4500;
const TOUCH_THRESH = 0.11;
const FORBIDDEN_THRESH = 0.09;

const cam = document.getElementById("cam");
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d", { alpha: false });
const elSetup = document.getElementById("setup");
const elGame = document.getElementById("game");
const elBanner = document.getElementById("round-banner");
const elCommand = document.getElementById("command-text");
const elCommandDe = document.getElementById("command-de");
const elTrapBox = document.getElementById("trap-box");
const elTrapForbidden = document.getElementById("trap-forbidden");
const elForbiddenRules = document.getElementById("forbidden-rules");
const elStatus = document.getElementById("status");
const elPlayerList = document.getElementById("player-list");
const elWinner = document.getElementById("winner-box");
const elWinnerTitle = document.getElementById("winner-title");
const elWinnerMsg = document.getElementById("winner-msg");
const btnGo = document.getElementById("btn-go");
const btnRestart = document.getElementById("btn-restart");
const btnRepeat = document.getElementById("btn-repeat");
const btnRules = document.getElementById("btn-rules");
const nameFields = document.getElementById("name-fields");

let poseLandmarker = null;
let handLandmarker = null;
let stream = null;
let playerCount = 2;
let players = [];
let roundNum = 0;
let gameActive = false;
let phase = "idle";
let currentRound = null;
let reactUntil = 0;
let touchState = [];
let mirror = true;
let lastVideoTime = -1;
let animId = 0;
let evaluating = false;
let voiceEn = null;
let lastAnnounce = null;
let speechBusy = false;
let speechKeepAlive = null;

function resumeSpeech() {
  try {
    speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

function speakOne(text, rate = 0.88) {
  return new Promise((resolve) => {
    if (!text?.trim()) {
      resolve();
      return;
    }
    resumeSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    if (voiceEn) u.voice = voiceEn;
    const maxMs = Math.min(15000, Math.max(3500, text.length * 100));
    const timer = setTimeout(resolve, maxMs);
    u.onend = () => {
      clearTimeout(timer);
      resolve();
    };
    u.onerror = () => {
      clearTimeout(timer);
      resolve();
    };
    speechSynthesis.speak(u);
  });
}

/** One sentence at a time — Chrome speaks more reliably this way */
async function speakSteps(steps, cancelFirst = true) {
  if (cancelFirst) speechSynthesis.cancel();
  speechBusy = true;
  await wait(cancelFirst ? 120 : 50);
  for (const step of steps) {
    resumeSpeech();
    await speakOne(step.text, step.rate ?? 0.88);
    if (step.wait) await wait(step.wait);
  }
  speechBusy = false;
}

async function speakLines(lines) {
  const steps = [];
  for (const line of lines) {
    if (line.pause) {
      steps.push({ wait: line.pause });
    } else {
      steps.push({ text: line.text, rate: line.rate });
    }
  }
  await speakSteps(steps, true);
}

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  const prefer = [/google.*english/i, /zira/i, /aria/i, /en-us/i, /en-gb/i, /english/i];
  for (const re of prefer) {
    const v = voices.find((x) => re.test(`${x.name} ${x.lang}`));
    if (v) {
      voiceEn = v;
      break;
    }
  }
  if (!voiceEn) voiceEn = voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sayCmd(cmd) {
  return cmd.say.charAt(0).toUpperCase() + cmd.say.slice(1);
}

function showForbiddenRulesUi(visible) {
  if (!elForbiddenRules) return;
  elForbiddenRules.classList.toggle("hidden", !visible);
}

async function speakNeverTouchRules(cancelFirst = true) {
  showForbiddenRulesUi(true);
  await speakSteps(
    [
      { text: "Important! There are body parts you must NEVER touch!", rate: 0.86 },
      { wait: 500 },
      { text: "Do NOT touch your eyes!", rate: 0.84 },
      { wait: 500 },
      { text: "Do NOT touch your bottom!", rate: 0.84 },
      { wait: 500 },
      { text: "If you touch your eyes or your bottom, you are out!", rate: 0.82 },
    ],
    cancelFirst,
  );
}

async function speakNeverTouchReminder() {
  await speakSteps(
    [
      { text: "Never touch your eyes!", rate: 0.86 },
      { wait: 400 },
      { text: "Never touch your bottom!", rate: 0.86 },
    ],
    false,
  );
}

function setTrapUi(cmd, visible) {
  if (visible) {
    elTrapBox.classList.remove("hidden");
    elTrapForbidden.textContent = `You must NOT ${cmd.say}!`;
  } else {
    elTrapBox.classList.add("hidden");
    elTrapForbidden.textContent = "";
  }
}

async function announceTrap(cmd) {
  const action = sayCmd(cmd);
  setTrapUi(cmd, true);

  await speakSteps([
    { text: "Simon did NOT say!", rate: 0.84 },
    { wait: 450 },
    { text: "Do NOT move! Stay still!", rate: 0.82 },
    { wait: 500 },
    { text: `You are NOT allowed to ${cmd.say}!`, rate: 0.8 },
    { wait: 550 },
    { text: `${action}!`, rate: 0.9 },
    { wait: 600 },
    { text: `Stop! Do NOT ${cmd.say}!`, rate: 0.78 },
  ]);
}

async function announceRound(cmd, simonSays) {
  lastAnnounce = { cmd, simonSays };
  const action = sayCmd(cmd);

  if (simonSays) {
    setTrapUi(cmd, false);
    elCommand.className = "command-text simon";
    elCommand.innerHTML = `<span class="simon-tag">SIMON SAYS</span> ${cmd.emoji}`;
    elCommandDe.textContent = `${action}!`;
    elCommandDe.className = "command-de do-it";
    elStatus.textContent = "Do it now ↑";

    await speakSteps([
      { text: "Simon says!", rate: 0.85 },
      { wait: 400 },
      { text: `${action}!`, rate: 0.82 },
    ]);
  } else {
    elCommand.className = "command-text trap";
    elCommand.innerHTML = `⚠️ ${cmd.emoji} DO NOT DO IT`;
    elCommandDe.textContent = `DO NOT ${action}! Simon did NOT say!`;
    elCommandDe.className = "command-de dont";
    elStatus.textContent = "TRAP — you are NOT allowed to move!";
    await announceTrap(cmd);
  }
}

function vis(lm) {
  return lm && (lm.visibility == null || lm.visibility > 0.45);
}

function lmPoint(lm, w, h) {
  const x = mirror ? (1 - lm.x) * w : lm.x * w;
  return { x, y: lm.y * h };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normDist(a, b, w, h) {
  return dist(a, b) / Math.max(w, h);
}

async function repeatAnnounce() {
  if (!lastAnnounce || phase === "idle") return;
  await announceRound(lastAnnounce.cmd, lastAnnounce.simonSays);
}

async function loadModels() {
  elStatus.textContent = "Loading AI …";
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  );
  for (const delegate of ["GPU", "CPU"]) {
    try {
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate,
        },
        runningMode: "VIDEO",
        numPoses: 4,
      });
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate,
        },
        runningMode: "VIDEO",
        numHands: 8,
      });
      break;
    } catch (e) {
      if (delegate === "CPU") throw e;
    }
  }
}

async function startCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  cam.srcObject = stream;
  cam.muted = true;
  await cam.play();
}

function buildNameFields() {
  nameFields.innerHTML = "";
  for (let i = 0; i < playerCount; i++) {
    const lab = document.createElement("label");
    lab.textContent = `Player ${i + 1} name (optional)`;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.dataset.idx = String(i);
    inp.placeholder = `Player ${i + 1}`;
    inp.maxLength = 16;
    nameFields.appendChild(lab);
    nameFields.appendChild(inp);
  }
}

function initPlayers() {
  const inputs = nameFields.querySelectorAll("input");
  players = [];
  for (let i = 0; i < playerCount; i++) {
    const name = inputs[i]?.value.trim() || `Player ${i + 1}`;
    players.push({
      id: i,
      name,
      color: PLAYER_COLORS[i],
      out: false,
      poseSlot: -1,
    });
  }
  renderPlayerList();
}

function renderPlayerList() {
  elPlayerList.innerHTML = "";
  players.forEach((p) => {
    const li = document.createElement("li");
    if (p.out) li.classList.add("out");
    li.innerHTML = `<span class="dot" style="background:${p.color}"></span><span>${p.name}${p.out ? " — OUT" : ""}</span>`;
    elPlayerList.appendChild(li);
  });
}

function activePlayers() {
  return players.filter((p) => !p.out);
}

/** Right on screen = Player 1, then left = Player 2, … */
function assignPoses(poseList) {
  const alive = activePlayers();
  const sorted = poseList
    .map((lm, idx) => {
      const nose = lm[POSE.nose];
      if (!vis(nose)) return null;
      return { idx, x: mirror ? 1 - nose.x : nose.x };
    })
    .filter(Boolean)
    .sort((a, b) => b.x - a.x);

  alive.forEach((p) => {
    p.poseSlot = -1;
  });
  sorted.forEach((s, i) => {
    if (i < alive.length) alive[i].poseSlot = s.idx;
  });
}

function getTargetPoint(poseLm, cmdId, w, h) {
  if (!poseLm) return null;
  if (cmdId === "head") {
    const n = poseLm[POSE.nose];
    const ls = poseLm[POSE.lShoulder];
    const rs = poseLm[POSE.rShoulder];
    if (!vis(n)) return null;
    let y = n.y - 0.12;
    if (vis(ls) && vis(rs)) y = (n.y + (ls.y + rs.y) / 2) / 2 - 0.08;
    return lmPoint({ x: n.x, y, z: n.z }, w, h);
  }
  if (cmdId === "belly") {
    const lh = poseLm[POSE.lHip];
    const rh = poseLm[POSE.rHip];
    if (!vis(lh) || !vis(rh)) return null;
    return lmPoint({ x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 + 0.03, z: 0 }, w, h);
  }
  const key = POSE[cmdId];
  const lm = poseLm[key];
  if (!vis(lm)) return null;
  return lmPoint(lm, w, h);
}

function getHandPoints(handLandmarks, w, h) {
  const pts = [];
  for (const hand of handLandmarks || []) {
    const wrist = hand[0];
    const tip = hand[8];
    if (wrist) pts.push(lmPoint(wrist, w, h));
    if (tip) pts.push(lmPoint(tip, w, h));
  }
  return pts;
}

function handsNear(poseLm, hands, target, w, h) {
  if (!target) return false;
  const pts = [];
  const lw = poseLm[POSE.lWrist];
  const rw = poseLm[POSE.rWrist];
  if (vis(lw)) pts.push(lmPoint(lw, w, h));
  if (vis(rw)) pts.push(lmPoint(rw, w, h));
  pts.push(...getHandPoints(hands, w, h));
  return pts.some((p) => normDist(p, target, w, h) < TOUCH_THRESH);
}

function touchedForbidden(poseLm, hands, w, h) {
  if (!poseLm) return null;
  const pts = getHandPoints(hands, w, h);
  const lw = poseLm[POSE.lWrist];
  const rw = poseLm[POSE.rWrist];
  if (vis(lw)) pts.push(lmPoint(lw, w, h));
  if (vis(rw)) pts.push(lmPoint(rw, w, h));
  if (!pts.length) return null;

  const nose = poseLm[POSE.nose];
  if (vis(nose)) {
    const n = lmPoint(nose, w, h);
    const eyeL = { x: n.x - w * 0.045, y: n.y - h * 0.035 };
    const eyeR = { x: n.x + w * 0.045, y: n.y - h * 0.035 };
    for (const p of pts) {
      if (normDist(p, eyeL, w, h) < FORBIDDEN_THRESH) return "eyes";
      if (normDist(p, eyeR, w, h) < FORBIDDEN_THRESH) return "eyes";
    }
  }

  for (const hipKey of ["lHip", "rHip"]) {
    const hip = poseLm[POSE[hipKey]];
    if (!vis(hip)) continue;
    const hp = lmPoint(hip, w, h);
    const butt = { x: hp.x, y: hp.y + h * 0.04 };
    for (const p of pts) {
      if (normDist(p, butt, w, h) < FORBIDDEN_THRESH * 1.2) return "bottom";
    }
  }
  return null;
}

function touchedCommand(poseLm, hands, cmdId, w, h) {
  const target = getTargetPoint(poseLm, cmdId, w, h);
  return handsNear(poseLm, hands, target, w, h);
}

function drawFrame(poseList, handLandmarks) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  if (cam.videoWidth) {
    ctx.save();
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(cam, 0, 0, w, h);
    } else {
      ctx.drawImage(cam, 0, 0, w, h);
    }
    ctx.restore();
  }

  assignPoses(poseList);

  poseList.forEach((poseLm, pi) => {
    const pl = players.find((p) => p.poseSlot === pi && !p.out);
    if (!pl) return;
    const nose = poseLm[POSE.nose];
    if (!vis(nose)) return;
    const p = lmPoint(nose, w, h);
    ctx.fillStyle = pl.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 40, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pl.name.slice(0, 8), p.x, p.y - 36);
    ctx.textAlign = "left";

    if (phase === "react" && currentRound) {
      const tgt = getTargetPoint(poseLm, currentRound.cmd.id, w, h);
      if (tgt && currentRound.simonSays) {
        ctx.strokeStyle = "rgba(45, 212, 191, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tgt.x, tgt.y, 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Player 1 →", w - 52, h - 10);
  ctx.fillText("← Player 2", 52, h - 10);
  ctx.textAlign = "left";
  ctx.restore();
}

function detectFrame() {
  if (!poseLandmarker || !cam.videoWidth) return { poses: [], hands: [] };
  const ts = performance.now();
  const poseRes = poseLandmarker.detectForVideo(cam, ts);
  const handRes = handLandmarker?.detectForVideo(cam, ts);
  return {
    poses: poseRes.landmarks || [],
    hands: handRes?.landmarks || [],
  };
}

function sampleTouches(poses, hands) {
  const w = canvas.width;
  const h = canvas.height;
  touchState.forEach((ts, i) => {
    const p = players[i];
    if (!p || p.out || p.poseSlot < 0) return;
    const poseLm = poses[p.poseSlot];
    if (!poseLm) return;
    const forbiddenPart = touchedForbidden(poseLm, hands, w, h);
    if (forbiddenPart) {
      ts.forbidden = true;
      ts.forbiddenPart = forbiddenPart;
    }
    if (currentRound && touchedCommand(poseLm, hands, currentRound.cmd.id, w, h)) {
      ts.touched = true;
    }
    if (currentRound && touchedCommand(poseLm, hands, currentRound.cmd.id, w, h)) {
      ts.anyTouch = true;
    }
    const anyMove = getHandPoints(hands, w, h).some((pt) => {
      const n = poseLm[POSE.nose];
      if (!vis(n)) return false;
      return normDist(pt, lmPoint(n, w, h), w, h) < 0.35;
    });
    if (anyMove || ts.touched) ts.moved = true;
  });
}

async function eliminatePlayer(p, reason) {
  if (p.out) return;
  p.out = true;
  renderPlayerList();
  const cmd = currentRound?.cmd;
  const simon = currentRound?.simonSays;
  let text = `${p.name} is out. ${reason}`;

  if (reason === "eyes") {
    text = `${p.name} is out! You touched your eyes! You must NEVER touch your eyes!`;
    await speakSteps([
      { text: `${p.name} is out!`, rate: 0.88 },
      { wait: 400 },
      { text: "You touched your eyes!", rate: 0.84 },
      { wait: 450 },
      { text: "You must NEVER touch your eyes or your bottom!", rate: 0.82 },
    ]);
  } else if (reason === "bottom") {
    text = `${p.name} is out! You touched your bottom! You must NEVER touch your bottom!`;
    await speakSteps([
      { text: `${p.name} is out!`, rate: 0.88 },
      { wait: 400 },
      { text: "You touched your bottom!", rate: 0.84 },
      { wait: 450 },
      { text: "You must NEVER touch your eyes or your bottom!", rate: 0.82 },
    ]);
  } else if (!simon && cmd && /Simon did not say/i.test(reason)) {
    text = `${p.name} is out! Simon did not say! You were NOT allowed to ${cmd.say}!`;
    await speakLines([{ text, rate: 0.88 }]);
  } else {
    await speakLines([{ text, rate: 0.88 }]);
  }
  elStatus.textContent = text;
}

async function evaluateRound() {
  if (evaluating || phase !== "react") return;
  evaluating = true;
  phase = "check";
  const cmd = currentRound.cmd;
  const simon = currentRound.simonSays;
  const outs = [];

  players.forEach((p, i) => {
    if (p.out || p.poseSlot < 0) return;
    const ts = touchState[i];

    if (ts.forbidden) {
      outs.push({ p, reason: ts.forbiddenPart || "forbidden" });
      return;
    }

    if (simon) {
      if (!ts.touched) {
        outs.push({ p, reason: `You did not ${cmd.say}.` });
      }
    } else if (ts.touched) {
      outs.push({ p, reason: "Simon did not say!" });
    }
  });

  for (const { p, reason } of outs) {
    if (!p.out) await eliminatePlayer(p, reason);
    await wait(400);
  }

  const left = activePlayers();
  if (left.length <= 1) {
    evaluating = false;
    endGame(left[0] || null);
    return;
  }

  elStatus.textContent = "Round over …";
  gameActive = false;
  await wait(1200);
  evaluating = false;
  if (phase !== "end") await startRound();
}

function endGame(winner) {
  gameActive = false;
  phase = "end";
  if (winner) {
    elWinner.classList.remove("hidden");
    elWinnerTitle.textContent = `${winner.name} wins!`;
    elWinnerMsg.textContent = "The computer will say it …";
    speakLines([{ text: `${winner.name} wins! Congratulations!`, rate: 0.9 }]).catch(() => {});
  } else {
    elWinner.classList.remove("hidden");
    elWinnerTitle.textContent = "Everybody is out!";
    speakLines([{ text: "Everybody is out. Game over.", rate: 0.9 }]).catch(() => {});
  }
}

async function startRound() {
  const left = activePlayers();
  if (left.length <= 1) {
    endGame(left[0] || null);
    return;
  }

  roundNum++;
  elBanner.textContent = `Round ${roundNum}`;
  const cmd = COMMANDS[Math.floor(Math.random() * COMMANDS.length)];
  const simonSays = Math.random() < 0.5;
  currentRound = { cmd, simonSays };

  touchState = players.map(() => ({
    touched: false,
    forbidden: false,
    forbiddenPart: null,
    moved: false,
    anyTouch: false,
  }));

  phase = "speak";
  gameActive = true;

  elCommand.className = "command-text " + (simonSays ? "simon" : "trap");
  await speakNeverTouchReminder();
  await announceRound(cmd, simonSays);

  phase = "react";
  reactUntil = performance.now() + REACT_MS;
  if (simonSays) {
    elStatus.textContent = `Do it: ${sayCmd(cmd)}!`;
  } else {
    elStatus.textContent = "Do NOT do it — Simon did not say!";
    resumeSpeech();
    speakOne(`Remember! Do NOT ${cmd.say}!`, 0.78).catch(() => {});
  }
}

function loop() {
  if (cam.videoWidth && cam.currentTime !== lastVideoTime) {
    lastVideoTime = cam.currentTime;
    const { poses, hands } = detectFrame();
    if (phase === "react" && performance.now() < reactUntil) {
      sampleTouches(poses, hands);
    }
    if (phase === "react" && performance.now() >= reactUntil) {
      evaluateRound().catch(console.error);
    }
    drawFrame(poses, hands);
  } else {
    drawFrame([], []);
  }
  animId = requestAnimationFrame(loop);
}

async function startGame() {
  if (location.protocol === "file:") {
    alert("Please run ./sofort-simon-says.sh — camera needs http://");
    return;
  }
  resumeSpeech();
  if (speechKeepAlive) clearInterval(speechKeepAlive);
  speechKeepAlive = setInterval(resumeSpeech, 8000);
  initPlayers();
  elSetup.classList.add("hidden");
  elGame.classList.remove("hidden");
  elWinner.classList.add("hidden");
  roundNum = 0;

  try {
    if (!poseLandmarker) await loadModels();
    await startCamera();
    elStatus.textContent = "Stand side by side — Player 1 on the RIGHT →";
    loop();
    await wait(1200);
    await speakSteps([
      { text: "Welcome to Simon Says! I will tell you what to do.", rate: 0.88 },
      { wait: 450 },
      { text: "Only move when you hear Simon says.", rate: 0.88 },
      { wait: 450 },
      { text: "If Simon did not say, do NOT move! Do NOT touch anything!", rate: 0.84 },
    ]);
    await speakNeverTouchRules(false);
    await startRound();
  } catch (e) {
    console.error(e);
    elStatus.textContent = e.message || "Error — allow camera?";
  }
}

document.querySelectorAll(".pc-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pc-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    playerCount = Number(btn.dataset.n);
    buildNameFields();
  });
});

btnGo.addEventListener("click", startGame);
btnRepeat?.addEventListener("click", () => repeatAnnounce().catch(console.error));
btnRules?.addEventListener("click", () => speakNeverTouchRules(true).catch(console.error));
btnRestart.addEventListener("click", () => {
  cancelAnimationFrame(animId);
  if (stream) stream.getTracks().forEach((t) => t.stop());
  if (speechKeepAlive) clearInterval(speechKeepAlive);
  speechKeepAlive = null;
  speechSynthesis.cancel();
  setTrapUi(COMMANDS[0], false);
  showForbiddenRulesUi(false);
  elGame.classList.add("hidden");
  elSetup.classList.remove("hidden");
  elWinner.classList.add("hidden");
  gameActive = false;
  phase = "idle";
});

buildNameFields();

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => pickVoice();
}
pickVoice();

if (location.protocol === "file:") {
  elStatus.textContent = "Start with ./sofort-simon-says.sh";
}
