/**
 * Hintergrundmusik + Sound bei Krone-Wechsel (ohne externe Audiodateien).
 * Browser brauchen oft einen Klick — Resume läuft beim „Spiel starten“.
 */
const GameAudio = (function () {
  let ctx = null;
  let musicId = null;
  let beat = 0;
  let muted = localStorage.getItem("krone-muted") === "1";
  /** Verhindert viele Töne hintereinander beim Knüppeln / mehreren Krone-Wechseln */
  let lastTagSoundMs = 0;
  const TAG_SOUND_COOLDOWN_MS = 280;
  const TAG_BLIP_DURATION_S = 0.038;

  /** Neue Loop-Melodie (Wiese / Party), etwas länger als vorher */
  const melodyHz = [
    523.25, 587.33, 659.25, 783.99, 880, 783.99, 659.25, 587.33, 523.25, 493.88, 523.25, 659.25,
  ];
  const MELODY_STEP_MS = 275;

  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  }

  function resume() {
    const c = ensureCtx();
    if (c && c.state === "suspended") {
      const p = c.resume();
      if (p && typeof p.then === "function") p.catch(() => {});
    }
  }

  function playTone(freq, duration, vol, type) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, t + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + duration + 0.04);
  }

  /** Minimal kurzer Klick + Pause bis zum nächsten (kein „lang gezogenes“ Geräusch) */
  function playTag() {
    if (muted) return;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - lastTagSoundMs < TAG_SOUND_COOLDOWN_MS) return;
    lastTagSoundMs = now;

    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1760, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0008, t + TAG_BLIP_DURATION_S);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t);
    osc.stop(t + TAG_BLIP_DURATION_S + 0.012);
  }

  function musicStep() {
    if (muted || !musicId) return;
    const f = melodyHz[beat % melodyHz.length];
    playTone(f, 0.14, 0.036, "triangle");
    beat++;
  }

  function startMusic() {
    stopMusic();
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const go = () => {
      if (muted) return;
      beat = 0;
      musicStep();
      musicId = setInterval(musicStep, 320);
    };
    if (c.state === "running") {
      go();
    } else {
      const p = c.resume();
      if (p && typeof p.then === "function") {
        p.then(go).catch(go);
      } else {
        go();
      }
    }
  }

  function stopMusic() {
    if (musicId) {
      clearInterval(musicId);
      musicId = null;
    }
  }

  function setMuted(m) {
    muted = !!m;
    localStorage.setItem("krone-muted", muted ? "1" : "0");
    if (muted) stopMusic();
  }

  function isMuted() {
    return muted;
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  /** Chrome: ersten Klick/Tastendruck nutzen, um Audio schon freizuschalten (schneller Ton beim Start). */
  if (typeof window !== "undefined") {
    let primed = false;
    function primeFromGesture() {
      if (primed) return;
      primed = true;
      resume();
    }
    window.addEventListener("pointerdown", primeFromGesture, { capture: true, passive: true });
    window.addEventListener("keydown", primeFromGesture, { capture: true, passive: true });
  }

  return {
    resume,
    playTag,
    startMusic,
    stopMusic,
    setMuted,
    toggleMute,
    isMuted,
  };
})();
