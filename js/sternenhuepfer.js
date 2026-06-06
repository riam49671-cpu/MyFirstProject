(() => {
  const VIEW_W = 960;
  const VIEW_H = 540;
  const PW = 34;
  const PH = 42;
  const GRAVITY = 2480;
  const JUMP = -745;
  const STAR_GRAB = 40;
  const MOVE = 270;
  const MAX_RUN = 395;
  const ACCEL = 3000;
  const FRICTION = 0.87;
  const STAR_PTS = 120;
  const GOAL_PTS = 500;

  /**
   * Jedes Level: längere Strecken, engere/höhere Plattformen, mehr Blobs & Sterne, schnellere Blobs.
   * @type {{
   *   name: string;
   *   worldW: number;
   *   spawn: { x: number; y: number };
   *   portal: { x: number; y: number; w: number; h: number };
   *   platforms: { x: number; y: number; w: number; h: number }[];
   *   stars: { x: number; y: number }[];
   *   blobs: { x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number }[];
   * }[]}
   */
  const LEVELS = [
    {
      name: "Anfang",
      worldW: 2760,
      spawn: { x: 48, y: 380 },
      portal: { x: 2580, y: 318, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 460, h: 72 },
        { x: 560, y: 468, w: 2200, h: 72 },
        { x: 380, y: 360, w: 120, h: 20 },
        { x: 620, y: 300, w: 100, h: 20 },
        { x: 900, y: 340, w: 140, h: 20 },
        { x: 1180, y: 280, w: 110, h: 20 },
        { x: 1420, y: 380, w: 160, h: 20 },
        { x: 1780, y: 320, w: 130, h: 20 },
        { x: 2080, y: 260, w: 100, h: 20 },
        { x: 2280, y: 340, w: 180, h: 20 },
      ],
      stars: [
        { x: 440, y: 332 },
        { x: 980, y: 312 },
        { x: 1640, y: 348 },
        { x: 2320, y: 312 },
      ],
      blobs: [
        { x: 200, y: 436, w: 36, h: 32, vx: 58, minX: 40, maxX: 420 },
        { x: 1100, y: 436, w: 36, h: 32, vx: -55, minX: 600, maxX: 1350 },
        { x: 1900, y: 436, w: 36, h: 32, vx: 60, minX: 1680, maxX: 2350 },
      ],
    },
    {
      name: "Aufstieg",
      worldW: 2880,
      spawn: { x: 40, y: 380 },
      portal: { x: 2700, y: 318, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 430, h: 72 },
        { x: 540, y: 468, w: 2340, h: 72 },
        { x: 360, y: 368, w: 100, h: 20 },
        { x: 600, y: 292, w: 95, h: 20 },
        { x: 880, y: 332, w: 120, h: 20 },
        { x: 1160, y: 268, w: 95, h: 20 },
        { x: 1380, y: 372, w: 140, h: 20 },
        { x: 1740, y: 312, w: 110, h: 20 },
        { x: 2040, y: 252, w: 88, h: 20 },
        { x: 2240, y: 336, w: 160, h: 20 },
      ],
      stars: [
        { x: 420, y: 328 },
        { x: 940, y: 302 },
        { x: 1580, y: 338 },
        { x: 2440, y: 308 },
      ],
      blobs: [
        { x: 180, y: 436, w: 36, h: 32, vx: 68, minX: 30, maxX: 400 },
        { x: 1050, y: 436, w: 36, h: 32, vx: -65, minX: 560, maxX: 1280 },
        { x: 1850, y: 436, w: 36, h: 32, vx: 70, minX: 1620, maxX: 2420 },
      ],
    },
    {
      name: "Grube",
      worldW: 3000,
      spawn: { x: 36, y: 380 },
      portal: { x: 2820, y: 318, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 400, h: 72 },
        { x: 540, y: 468, w: 2460, h: 72 },
        { x: 340, y: 356, w: 95, h: 20 },
        { x: 580, y: 288, w: 85, h: 20 },
        { x: 860, y: 328, w: 110, h: 20 },
        { x: 1120, y: 264, w: 85, h: 20 },
        { x: 1340, y: 376, w: 130, h: 20 },
        { x: 1700, y: 308, w: 100, h: 20 },
        { x: 1980, y: 248, w: 78, h: 20 },
        { x: 2180, y: 332, w: 140, h: 20 },
      ],
      stars: [
        { x: 400, y: 325 },
        { x: 920, y: 298 },
        { x: 1500, y: 342 },
        { x: 2100, y: 282 },
        { x: 2540, y: 308 },
      ],
      blobs: [
        { x: 160, y: 436, w: 36, h: 32, vx: 74, minX: 30, maxX: 380 },
        { x: 980, y: 436, w: 36, h: 32, vx: -72, minX: 520, maxX: 1220 },
        { x: 1750, y: 436, w: 36, h: 32, vx: 76, minX: 1540, maxX: 2480 },
        { x: 2300, y: 436, w: 36, h: 32, vx: -70, minX: 2100, maxX: 2580 },
      ],
    },
    {
      name: "Klippe",
      worldW: 3180,
      spawn: { x: 32, y: 380 },
      portal: { x: 3000, y: 318, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 380, h: 72 },
        { x: 520, y: 468, w: 2660, h: 72 },
        { x: 320, y: 348, w: 88, h: 20 },
        { x: 560, y: 276, w: 78, h: 20 },
        { x: 820, y: 316, w: 100, h: 20 },
        { x: 1080, y: 248, w: 78, h: 20 },
        { x: 1280, y: 364, w: 120, h: 20 },
        { x: 1640, y: 296, w: 92, h: 20 },
        { x: 1920, y: 236, w: 72, h: 20 },
        { x: 2120, y: 324, w: 120, h: 20 },
        { x: 2420, y: 272, w: 95, h: 20 },
      ],
      stars: [
        { x: 380, y: 318 },
        { x: 900, y: 288 },
        { x: 1380, y: 334 },
        { x: 1880, y: 224 },
        { x: 2280, y: 300 },
      ],
      blobs: [
        { x: 140, y: 436, w: 36, h: 32, vx: 78, minX: 25, maxX: 350 },
        { x: 920, y: 436, w: 36, h: 32, vx: -76, minX: 500, maxX: 1180 },
        { x: 1680, y: 436, w: 36, h: 32, vx: 80, minX: 1480, maxX: 2280 },
        { x: 2380, y: 436, w: 36, h: 32, vx: -78, minX: 2160, maxX: 2780 },
      ],
    },
    {
      name: "Wind",
      worldW: 3320,
      spawn: { x: 28, y: 380 },
      portal: { x: 3140, y: 308, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 360, h: 72 },
        { x: 500, y: 468, w: 2820, h: 72 },
        { x: 300, y: 340, w: 80, h: 20 },
        { x: 520, y: 268, w: 72, h: 20 },
        { x: 780, y: 308, w: 95, h: 20 },
        { x: 1040, y: 232, w: 72, h: 20 },
        { x: 1220, y: 356, w: 110, h: 20 },
        { x: 1560, y: 284, w: 85, h: 20 },
        { x: 1840, y: 224, w: 68, h: 20 },
        { x: 2040, y: 312, w: 105, h: 20 },
        { x: 2340, y: 256, w: 82, h: 20 },
        { x: 2580, y: 328, w: 130, h: 20 },
      ],
      stars: [
        { x: 360, y: 312 },
        { x: 860, y: 278 },
        { x: 1300, y: 326 },
        { x: 1760, y: 258 },
        { x: 2180, y: 298 },
        { x: 2680, y: 308 },
      ],
      blobs: [
        { x: 120, y: 436, w: 36, h: 32, vx: 82, minX: 20, maxX: 330 },
        { x: 880, y: 436, w: 36, h: 32, vx: -80, minX: 480, maxX: 1140 },
        { x: 1580, y: 436, w: 36, h: 32, vx: 84, minX: 1360, maxX: 2180 },
        { x: 2280, y: 436, w: 36, h: 32, vx: -82, minX: 2060, maxX: 2680 },
        { x: 2780, y: 436, w: 36, h: 32, vx: 85, minX: 2560, maxX: 3120 },
      ],
    },
    {
      name: "Sturm",
      worldW: 3480,
      spawn: { x: 24, y: 380 },
      portal: { x: 3300, y: 308, w: 56, h: 160 },
      platforms: [
        { x: 0, y: 468, w: 340, h: 72 },
        { x: 480, y: 468, w: 3000, h: 72 },
        { x: 280, y: 332, w: 75, h: 20 },
        { x: 500, y: 256, w: 68, h: 20 },
        { x: 740, y: 296, w: 88, h: 20 },
        { x: 1000, y: 220, w: 68, h: 20 },
        { x: 1160, y: 348, w: 100, h: 20 },
        { x: 1500, y: 272, w: 78, h: 20 },
        { x: 1760, y: 212, w: 62, h: 20 },
        { x: 1960, y: 300, w: 95, h: 20 },
        { x: 2240, y: 244, w: 75, h: 20 },
        { x: 2480, y: 316, w: 115, h: 20 },
        { x: 2780, y: 268, w: 80, h: 20 },
      ],
      stars: [
        { x: 340, y: 305 },
        { x: 820, y: 268 },
        { x: 1240, y: 318 },
        { x: 1660, y: 242 },
        { x: 2060, y: 282 },
        { x: 2560, y: 298 },
      ],
      blobs: [
        { x: 100, y: 436, w: 36, h: 32, vx: 88, minX: 15, maxX: 310 },
        { x: 820, y: 436, w: 36, h: 32, vx: -86, minX: 450, maxX: 1100 },
        { x: 1520, y: 436, w: 36, h: 32, vx: 90, minX: 1300, maxX: 2100 },
        { x: 2220, y: 436, w: 36, h: 32, vx: -88, minX: 1980, maxX: 2620 },
        { x: 2720, y: 436, w: 36, h: 32, vx: 92, minX: 2480, maxX: 3180 },
      ],
    },
    {
      name: "Zorn",
      worldW: 3640,
      spawn: { x: 20, y: 380 },
      portal: { x: 3460, y: 298, w: 56, h: 170 },
      platforms: [
        { x: 0, y: 468, w: 320, h: 72 },
        { x: 460, y: 468, w: 3180, h: 72 },
        { x: 260, y: 324, w: 70, h: 20 },
        { x: 480, y: 244, w: 62, h: 20 },
        { x: 700, y: 284, w: 82, h: 20 },
        { x: 960, y: 208, w: 62, h: 20 },
        { x: 1100, y: 340, w: 92, h: 20 },
        { x: 1420, y: 260, w: 72, h: 20 },
        { x: 1680, y: 200, w: 58, h: 20 },
        { x: 1880, y: 288, w: 88, h: 20 },
        { x: 2140, y: 228, w: 68, h: 20 },
        { x: 2360, y: 304, w: 105, h: 20 },
        { x: 2660, y: 248, w: 72, h: 20 },
        { x: 2920, y: 312, w: 120, h: 20 },
      ],
      stars: [
        { x: 320, y: 298 },
        { x: 780, y: 258 },
        { x: 1180, y: 312 },
        { x: 1540, y: 232 },
        { x: 1940, y: 272 },
        { x: 2280, y: 288 },
        { x: 2740, y: 268 },
      ],
      blobs: [
        { x: 80, y: 436, w: 36, h: 32, vx: 92, minX: 15, maxX: 290 },
        { x: 760, y: 436, w: 36, h: 32, vx: -90, minX: 420, maxX: 1060 },
        { x: 1440, y: 436, w: 36, h: 32, vx: 94, minX: 1220, maxX: 2020 },
        { x: 2140, y: 436, w: 36, h: 32, vx: -92, minX: 1900, maxX: 2540 },
        { x: 2640, y: 436, w: 36, h: 32, vx: 96, minX: 2400, maxX: 3080 },
        { x: 3040, y: 436, w: 36, h: 32, vx: -94, minX: 2820, maxX: 3380 },
      ],
    },
    {
      name: "Abgrund",
      worldW: 3820,
      spawn: { x: 16, y: 380 },
      portal: { x: 3640, y: 298, w: 56, h: 170 },
      platforms: [
        { x: 0, y: 468, w: 300, h: 72 },
        { x: 440, y: 468, w: 3380, h: 72 },
        { x: 240, y: 316, w: 65, h: 20 },
        { x: 460, y: 232, w: 58, h: 20 },
        { x: 660, y: 272, w: 76, h: 20 },
        { x: 920, y: 196, h: 20, w: 58 },
        { x: 1040, y: 332, w: 85, h: 20 },
        { x: 1340, y: 248, w: 68, h: 20 },
        { x: 1600, y: 188, w: 54, h: 20 },
        { x: 1780, y: 276, w: 82, h: 20 },
        { x: 2040, y: 216, w: 62, h: 20 },
        { x: 2260, y: 292, w: 98, h: 20 },
        { x: 2540, y: 232, w: 65, h: 20 },
        { x: 2780, y: 308, w: 110, h: 20 },
        { x: 3080, y: 240, w: 70, h: 20 },
      ],
      stars: [
        { x: 300, y: 288 },
        { x: 740, y: 248 },
        { x: 1120, y: 302 },
        { x: 1480, y: 222 },
        { x: 1880, y: 262 },
        { x: 2220, y: 278 },
        { x: 2620, y: 258 },
        { x: 3240, y: 288 },
      ],
      blobs: [
        { x: 60, y: 436, w: 36, h: 32, vx: 96, minX: 12, maxX: 270 },
        { x: 700, y: 436, w: 36, h: 32, vx: -94, minX: 400, maxX: 1020 },
        { x: 1360, y: 436, w: 36, h: 32, vx: 98, minX: 1140, maxX: 1940 },
        { x: 2060, y: 436, w: 36, h: 32, vx: -96, minX: 1820, maxX: 2460 },
        { x: 2560, y: 436, w: 36, h: 32, vx: 100, minX: 2320, maxX: 3000 },
        { x: 2960, y: 436, w: 36, h: 32, vx: -98, minX: 2740, maxX: 3320 },
      ],
    },
    {
      name: "Inferno",
      worldW: 4000,
      spawn: { x: 12, y: 380 },
      portal: { x: 3820, y: 288, w: 56, h: 180 },
      platforms: [
        { x: 0, y: 468, w: 280, h: 72 },
        { x: 420, y: 468, w: 3580, h: 72 },
        { x: 220, y: 308, w: 60, h: 20 },
        { x: 440, y: 220, h: 20, w: 54 },
        { x: 620, y: 260, w: 72, h: 20 },
        { x: 880, y: 184, w: 54, h: 20 },
        { x: 980, y: 324, w: 78, h: 20 },
        { x: 1260, y: 236, w: 62, h: 20 },
        { x: 1520, y: 176, w: 50, h: 20 },
        { x: 1680, y: 264, w: 76, h: 20 },
        { x: 1940, y: 204, w: 58, h: 20 },
        { x: 2140, y: 280, w: 92, h: 20 },
        { x: 2420, y: 216, w: 60, h: 20 },
        { x: 2640, y: 300, w: 102, h: 20 },
        { x: 2940, y: 228, w: 65, h: 20 },
        { x: 3200, y: 296, w: 115, h: 20 },
      ],
      stars: [
        { x: 280, y: 282 },
        { x: 700, y: 238 },
        { x: 1080, y: 298 },
        { x: 1420, y: 210 },
        { x: 1820, y: 250 },
        { x: 2180, y: 268 },
        { x: 2580, y: 248 },
        { x: 3020, y: 278 },
        { x: 3420, y: 258 },
      ],
      blobs: [
        { x: 40, y: 436, w: 36, h: 32, vx: 100, minX: 10, maxX: 250 },
        { x: 660, y: 436, w: 36, h: 32, vx: -98, minX: 380, maxX: 980 },
        { x: 1280, y: 436, w: 36, h: 32, vx: 102, minX: 1060, maxX: 1860 },
        { x: 1980, y: 436, w: 36, h: 32, vx: -100, minX: 1740, maxX: 2380 },
        { x: 2480, y: 436, w: 36, h: 32, vx: 104, minX: 2240, maxX: 2920 },
        { x: 2880, y: 436, w: 36, h: 32, vx: -102, minX: 2660, maxX: 3240 },
        { x: 3280, y: 436, w: 36, h: 32, vx: 106, minX: 3060, maxX: 3580 },
      ],
    },
    {
      name: "Krone",
      worldW: 4200,
      spawn: { x: 8, y: 380 },
      portal: { x: 4020, y: 288, w: 56, h: 180 },
      platforms: [
        { x: 0, y: 468, w: 260, h: 72 },
        { x: 400, y: 468, w: 3800, h: 72 },
        { x: 200, y: 300, w: 56, h: 20 },
        { x: 420, y: 208, w: 50, h: 20 },
        { x: 580, y: 248, w: 68, h: 20 },
        { x: 840, y: 172, w: 50, h: 20 },
        { x: 920, y: 316, w: 72, h: 20 },
        { x: 1180, y: 224, w: 58, h: 20 },
        { x: 1440, y: 164, w: 46, h: 20 },
        { x: 1580, y: 252, w: 72, h: 20 },
        { x: 1840, y: 192, w: 54, h: 20 },
        { x: 2040, y: 268, w: 88, h: 20 },
        { x: 2300, y: 200, w: 56, h: 20 },
        { x: 2520, y: 292, w: 95, h: 20 },
        { x: 2820, y: 212, w: 58, h: 20 },
        { x: 3060, y: 284, w: 108, h: 20 },
        { x: 3360, y: 220, w: 60, h: 20 },
      ],
      stars: [
        { x: 260, y: 275 },
        { x: 660, y: 228 },
        { x: 1040, y: 292 },
        { x: 1380, y: 200 },
        { x: 1780, y: 242 },
        { x: 2140, y: 258 },
        { x: 2480, y: 238 },
        { x: 2880, y: 268 },
        { x: 3280, y: 248 },
        { x: 3640, y: 228 },
      ],
      blobs: [
        { x: 30, y: 436, w: 36, h: 32, vx: 105, minX: 8, maxX: 230 },
        { x: 620, y: 436, w: 36, h: 32, vx: -104, minX: 360, maxX: 940 },
        { x: 1200, y: 436, w: 36, h: 32, vx: 106, minX: 980, maxX: 1780 },
        { x: 1900, y: 436, w: 36, h: 32, vx: -105, minX: 1660, maxX: 2300 },
        { x: 2400, y: 436, w: 36, h: 32, vx: 108, minX: 2160, maxX: 2840 },
        { x: 2800, y: 436, w: 36, h: 32, vx: -106, minX: 2580, maxX: 3160 },
        { x: 3200, y: 436, w: 36, h: 32, vx: 110, minX: 2980, maxX: 3540 },
        { x: 3600, y: 436, w: 36, h: 32, vx: -108, minX: 3380, maxX: 3920 },
      ],
    },
  ];

  let WORLD_W = LEVELS[0].worldW;
  /** @type {{ x: number; y: number; w: number; h: number }[]} */
  let platforms = [];
  let PORTAL = { x: 0, y: 0, w: 56, h: 160 };
  /** @type {{ x: number; y: number; taken: boolean }[]} */
  let stars = [];
  let starsTotal = 0;
  /** @type {{ x: number; y: number; vx: number; vy: number; onG: boolean; face: number }} */
  let player = { x: 0, y: 0, vx: 0, vy: 0, onG: false, face: 1 };
  let SPAWN = { x: 48, y: 380 };
  /** @type {{ x: number; y: number; w: number; h: number; vx: number; minX: number; maxX: number; alive: boolean }[]} */
  let blobs = [];

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const btnStart = document.getElementById("btn-start");
  const btnAgain = document.getElementById("btn-again");
  const btnContinue = document.getElementById("btn-continue");
  const btnMute = document.getElementById("btn-mute");
  const scoreEl = document.getElementById("score");
  const starsEl = document.getElementById("stars-count");
  const levelEl = document.getElementById("level-num");
  const msgEl = document.getElementById("overlay-msg");

  const LS_MUTE = "krone-sternenhuepfer-muted";
  const MELODY = [
    392, 440, 523.25, 587.32, 523.25, 440, 349.23, 392,
    329.63, 392, 493.88, 523.25, 587.32, 523.25, 440, 392,
  ];
  let beat = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let musicId = null;
  let audioCtx = null;
  let muted = localStorage.getItem(LS_MUTE) === "1";

  let running = false;
  let done = false;
  let levelIndex = 0;
  let camX = 0;
  let score = 0;
  let starsGot = 0;
  let pitLock = false;
  const keys = new Set();

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!audioCtx && AC) audioCtx = new AC();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function tone(freq, dur, vol, type = "triangle") {
    if (muted) return;
    const c = ensureAudio();
    if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function musicTick() {
    if (muted || !running || done) return;
    tone(MELODY[beat % MELODY.length], 0.14, 0.036, beat % 4 === 0 ? "triangle" : "square");
    beat++;
  }

  function startMusic() {
    stopMusic();
    if (muted) return;
    ensureAudio();
    beat = 0;
    musicTick();
    musicId = setInterval(musicTick, 290);
  }

  function stopMusic() {
    if (musicId) {
      clearInterval(musicId);
      musicId = null;
    }
  }

  function ov(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function normKey(e) {
    const k = e.key;
    if (k === "Shift" || k === "ShiftLeft" || k === "ShiftRight") return "shift";
    if (k.length === 1) return k.toLowerCase();
    return k.toLowerCase();
  }

  function fast() {
    return keys.has("shift") || keys.has("x");
  }

  function hud() {
    scoreEl.textContent = String(Math.min(score, 999999)).padStart(5, "0");
    starsEl.textContent = `${starsGot}/${starsTotal}`;
    levelEl.textContent = `${levelIndex + 1}/${LEVELS.length}`;
  }

  function loadLevel(idx) {
    const L = LEVELS[idx];
    WORLD_W = L.worldW;
    platforms = L.platforms.map((p) => ({ ...p }));
    PORTAL = { ...L.portal };
    SPAWN = { ...L.spawn };
    stars = L.stars.map((s) => ({ ...s, taken: false }));
    starsTotal = stars.length;
    blobs = L.blobs.map((b) => ({ ...b, alive: true }));
    player = {
      x: SPAWN.x,
      y: SPAWN.y,
      vx: 0,
      vy: 0,
      onG: false,
      face: 1,
    };
    camX = 0;
    pitLock = false;
    starsGot = 0;
    hud();
  }

  function respawn() {
    pitLock = false;
    player.x = SPAWN.x;
    player.y = SPAWN.y;
    player.vx = 0;
    player.vy = 0;
    player.onG = false;
    tone(120, 0.12, 0.045, "sine");
  }

  function moveBlob(b, dt) {
    if (!b.alive) return;
    b.x += b.vx * dt;
    if (b.x < b.minX) {
      b.x = b.minX;
      b.vx = Math.abs(b.vx);
    }
    if (b.x + b.w > b.maxX) {
      b.x = b.maxX - b.w;
      b.vx = -Math.abs(b.vx);
    }
  }

  function physics(dt) {
    let input = 0;
    if (keys.has("a") || keys.has("arrowleft")) input -= 1;
    if (keys.has("d") || keys.has("arrowright")) input += 1;
    if (input) player.face = input;

    const cap = fast() ? MAX_RUN : MOVE;
    if (input) {
      const want = input * cap;
      const d = want - player.vx;
      player.vx += Math.sign(d) * Math.min(Math.abs(d), ACCEL * dt);
    } else {
      player.vx *= FRICTION;
      if (Math.abs(player.vx) < 15) player.vx = 0;
    }
    player.vx = Math.max(-cap, Math.min(cap, player.vx));

    const jh = keys.has(" ") || keys.has("w") || keys.has("arrowup");
    let g = GRAVITY;
    if (player.vy < 0 && jh) g *= 0.46;
    player.vy += g * dt;

    const px = player.x;
    player.x += player.vx * dt;
    player.x = Math.max(0, Math.min(WORLD_W - PW, player.x));

    for (const p of platforms) {
      if (!ov(player.x, player.y, PW, PH, p.x, p.y, p.w, p.h)) continue;
      if (px + PW <= p.x + 8 && player.vx >= 0) {
        player.x = p.x - PW;
        player.vx = 0;
      } else if (px >= p.x + p.w - 8 && player.vx <= 0) {
        player.x = p.x + p.w;
        player.vx = 0;
      }
    }

    const prevY = player.y;
    player.y += player.vy * dt;
    player.onG = false;

    for (const p of platforms) {
      if (!ov(player.x, player.y, PW, PH, p.x, p.y, p.w, p.h)) continue;
      if (player.vy >= 0 && prevY + PH <= p.y + 12) {
        player.y = p.y - PH;
        player.vy = 0;
        player.onG = true;
      } else if (player.vy < 0 && prevY >= p.y + p.h - 10) {
        player.y = p.y + p.h;
        player.vy = 0;
      }
    }

    for (const b of blobs) moveBlob(b, dt);

    if (player.y > VIEW_H + 120) {
      if (!pitLock) {
        pitLock = true;
        respawn();
      }
    } else pitLock = false;

    for (const b of blobs) {
      if (!b.alive) continue;
      if (!ov(player.x, player.y, PW, PH, b.x, b.y, b.w, b.h)) continue;
      const stomp =
        player.vy > 0 &&
        prevY + PH <= b.y + 12 &&
        player.x + PW > b.x + 2 &&
        player.x < b.x + b.w - 2;
      if (stomp) {
        b.alive = false;
        player.vy = -280;
        score += 80;
        tone(300, 0.06, 0.05, "square");
        hud();
      } else {
        respawn();
        break;
      }
    }

    for (const s of stars) {
      if (s.taken) continue;
      if (Math.hypot(player.x + PW / 2 - s.x, player.y + PH / 2 - s.y) < STAR_GRAB) {
        s.taken = true;
        starsGot += 1;
        score += STAR_PTS;
        tone(740, 0.05, 0.05, "square");
        setTimeout(() => {
          if (!muted) tone(988, 0.05, 0.04, "square");
        }, 50);
        hud();
      }
    }

    if (!done && ov(player.x, player.y, PW, PH, PORTAL.x, PORTAL.y, PORTAL.w, PORTAL.h)) {
      completeLevel();
    }
  }

  function completeLevel() {
    if (done) return;
    done = true;
    running = false;
    score += GOAL_PTS;
    hud();

    const last = levelIndex >= LEVELS.length - 1;
    if (!last) {
      overlayTitle.textContent = `Level „${LEVELS[levelIndex].name}“ geschafft!`;
      msgEl.textContent = `Als Nächstes: „${LEVELS[levelIndex + 1].name}“ (schwerer). Punkte: ${score}`;
      btnContinue.classList.remove("hidden");
      btnAgain.classList.remove("hidden");
      tone(659.25, 0.12, 0.06, "triangle");
      setTimeout(() => {
        if (!muted) tone(783.99, 0.1, 0.055, "triangle");
      }, 100);
    } else {
      overlayTitle.textContent = "Alle Level geschafft!";
      msgEl.textContent = `Du hast die Krone verdient. Punkte: ${score}`;
      btnContinue.classList.add("hidden");
      btnAgain.classList.remove("hidden");
      stopMusic();
      document.documentElement.classList.remove("sh-active");
      tone(523.25, 0.15, 0.065, "triangle");
      setTimeout(() => {
        if (!muted) tone(880, 0.2, 0.06, "triangle");
      }, 130);
    }
    overlay.classList.remove("hidden");
    menu.classList.add("hidden");
    if (!last) document.documentElement.classList.remove("sh-active");
  }

  function continueNextLevel() {
    levelIndex += 1;
    loadLevel(levelIndex);
    done = false;
    running = true;
    overlay.classList.add("hidden");
    menu.classList.add("hidden");
    btnAgain.classList.remove("hidden");
    document.documentElement.classList.add("sh-active");
    if (!muted) startMusic();
    else ensureAudio();
  }

  function loop() {
    if (running && !done) {
      physics(1 / 60);
      camX = player.x - VIEW_W * 0.36;
      camX = Math.max(0, Math.min(camX, WORLD_W - VIEW_W));
    }
    drawWorld();
    requestAnimationFrame(loop);
  }

  function drawBg() {
    const t = levelIndex / (LEVELS.length - 1 || 1);
    const gr = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gr.addColorStop(0, `rgb(${15 + t * 35}, ${23 + t * 20}, ${42 + t * 30})`);
    gr.addColorStop(0.55, `rgb(${30 + t * 40}, ${41 + t * 25}, ${59 + t * 20})`);
    gr.addColorStop(1, "#020617");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let i = 0; i < 80; i++) {
      const sx = ((i * 97 + camX * 0.08) % (VIEW_W + 40)) - 20;
      const sy = ((i * 53) % (VIEW_H - 40)) + 20;
      const sz = 1 + (i % 3) * 0.6;
      ctx.fillStyle = `rgba(255,255,255,${0.12 + (i % 5) * 0.07 + t * 0.05})`;
      ctx.fillRect(sx, sy, sz, sz);
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(${200 + t * 55}, ${60 + t * 40}, ${80 + t * 30}, ${0.06 + t * 0.06})`;
      ctx.beginPath();
      ctx.arc(((i * 200 + camX * 0.15) % (VIEW_W + 100)) - 50, 60 + (i % 4) * 30, 40 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlat(p) {
    const lg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
    lg.addColorStop(0, "#334155");
    lg.addColorStop(1, "#0f172a");
    ctx.fillStyle = lg;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = "rgba(251, 191, 36, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "rgba(148, 163, 184, 0.25)";
    ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, 4);
  }

  function drawPortal() {
    const px = PORTAL.x;
    const py = PORTAL.y;
    const ph = PORTAL.h;
    ctx.save();
    ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 220) * 0.2;
    const g = ctx.createRadialGradient(px + 28, py + 80, 8, px + 28, py + 80, 100);
    g.addColorStop(0, "#fcd34d");
    g.addColorStop(0.5, "#f59e0b");
    g.addColorStop(1, "rgba(245, 158, 11, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px + 28, py + 85, 48, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#64748b";
    ctx.fillRect(px + 22, py, 12, ph);
    ctx.restore();
  }

  function drawPlayer(x, y, face) {
    ctx.save();
    if (face < 0) {
      ctx.translate(x + PW / 2, y);
      ctx.scale(-1, 1);
      ctx.translate(-(x + PW / 2), -y);
    }
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 6, y + PH - 10, PW - 12, 10);
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(x + 5, y + 18, PW - 10, PH - 28);
    ctx.fillStyle = "#fcd34d";
    ctx.beginPath();
    ctx.moveTo(x + PW / 2, y + 4);
    ctx.lineTo(x + 8, y + 16);
    ctx.lineTo(x + PW - 8, y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#fecdd3";
    ctx.fillRect(x + 8, y + 10, 8, 9);
    ctx.fillRect(x + PW - 16, y + 10, 8, 9);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x + 10, y + 12, 3, 3);
    ctx.fillRect(x + PW - 13, y + 12, 3, 3);
    ctx.restore();
  }

  function drawWorld() {
    drawBg();
    ctx.save();
    ctx.translate(-camX, 0);

    for (const p of platforms) drawPlat(p);
    drawPortal();

    for (const s of stars) {
      if (s.taken) continue;
      ctx.fillStyle = "#fef08a";
      ctx.strokeStyle = "#ca8a04";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const r = 11;
      for (let i = 0; i < 5; i++) {
        const ang = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ix = s.x + Math.cos(ang) * r;
        const iy = s.y + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(ix, iy);
        else ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    for (const b of blobs) {
      if (!b.alive) continue;
      ctx.fillStyle = "#7c3aed";
      ctx.beginPath();
      ctx.ellipse(b.x + b.w / 2, b.y + b.h - 6, b.w / 2 + 2, 9, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#c4b5fd";
      ctx.fillRect(b.x + 3, b.y + 10, b.w - 6, b.h - 14);
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(b.x + 7, b.y + 16, 5, 6);
      ctx.fillRect(b.x + b.w - 12, b.y + 16, 5, 6);
    }

    drawPlayer(player.x, player.y, player.face);
    ctx.restore();
  }

  function startGame() {
    levelIndex = 0;
    score = 0;
    done = false;
    loadLevel(0);
    running = true;
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    btnContinue.classList.add("hidden");
    btnAgain.classList.remove("hidden");
    document.documentElement.classList.add("sh-active");
    const c = ensureAudio();
    const go = () => running && startMusic();
    if (c && c.state === "suspended") c.resume().then(go).catch(go);
    else go();
  }

  function restartFull() {
    stopMusic();
    startGame();
  }

  function setMute(on) {
    muted = on;
    localStorage.setItem(LS_MUTE, muted ? "1" : "0");
    btnMute.setAttribute("aria-pressed", muted ? "true" : "false");
    btnMute.textContent = muted ? "🔇" : "🔊";
    if (muted) stopMusic();
    else if (running && !done) startMusic();
  }

  btnStart.addEventListener("click", startGame);
  btnAgain.addEventListener("click", restartFull);
  btnContinue.addEventListener("click", continueNextLevel);
  btnMute.addEventListener("click", () => {
    setMute(!muted);
    ensureAudio();
  });
  setMute(muted);

  const block = [" ", "arrowup", "arrowdown", "arrowleft", "arrowright", "a", "w", "s", "d", "shift", "x"];
  window.addEventListener("keydown", (e) => {
    const k = normKey(e);
    keys.add(k);
    if (block.includes(k)) e.preventDefault();
    if (
      !e.repeat &&
      running &&
      !done &&
      (k === " " || k === "w" || k === "arrowup") &&
      player.onG
    ) {
      player.vy = JUMP;
      player.onG = false;
      tone(340, 0.05, 0.04, "square");
    }
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(normKey(e));
    const k = normKey(e);
    if (k === " " || k === "w" || k === "arrowup") {
      if (player.vy < -130) player.vy *= 0.45;
    }
  });

  loadLevel(0);
  hud();
  requestAnimationFrame(loop);
})();
