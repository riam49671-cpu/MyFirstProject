(() => {
  const N = 20;
  const N_HUN = 18;

  /** @type {'wait_farmer' | 'pick_fox' | 'playing'} */
  let phase = "wait_farmer";

  /** @type {('hun'|'fuchs'|'bauer')[]} */
  let roles = [];
  /** @type {boolean[]} */
  let sitting = [];
  let shotsUsed = 0;
  let foxIdx = -1;
  let farmerIdx = -1;

  let foxMode = false;
  let farmerMode = false;

  const panelWait = document.getElementById("panel-setup-wait");
  const panelPickFox = document.getElementById("panel-setup-fox");
  const btnFarmerOutside = document.getElementById("btn-farmer-outside");
  const inpPickFox = document.getElementById("inp-pick-fox");
  const btnPickFox = document.getElementById("btn-pick-fox");
  const pickFoxMsg = document.getElementById("pick-fox-msg");
  const panelMove = document.getElementById("panel-move");

  const panelFieldWrap = document.getElementById("panel-field-wrap");
  const panelRolesWrap = document.getElementById("panel-roles-wrap");
  const panelFoxWrap = document.getElementById("panel-fox-wrap");
  const panelFarmerWrap = document.getElementById("panel-farmer-wrap");

  const field = document.getElementById("field");
  const statSitting = document.getElementById("stat-sitting");
  const statShots = document.getElementById("stat-shots");
  const btnNew = document.getElementById("btn-new-game");
  const statusBar = document.getElementById("status-bar");

  const inpMyNum = document.getElementById("inp-my-num");
  const btnShowRole = document.getElementById("btn-show-role");
  const inpFoxNum = document.getElementById("inp-fox-num");
  const btnFoxLogin = document.getElementById("btn-fox-login");
  const foxMsg = document.getElementById("fox-msg");
  const inpFarmerNum = document.getElementById("inp-farmer-num");
  const btnFarmerLogin = document.getElementById("btn-farmer-login");
  const farmerMsg = document.getElementById("farmer-msg");

  const overlayRole = document.getElementById("overlay-role");
  const roleBody = document.getElementById("role-body");
  const btnCloseRole = document.getElementById("btn-close-role");
  const overlayEnd = document.getElementById("overlay-end");
  const endTitle = document.getElementById("end-title");
  const endMsg = document.getElementById("end-msg");
  const btnEndOk = document.getElementById("btn-end-ok");

  const slots = [];

  function syncPhaseUi() {
    const playing = phase === "playing";
    panelWait.classList.toggle("hidden", phase !== "wait_farmer");
    panelPickFox.classList.toggle("hidden", phase !== "pick_fox");
    panelMove.classList.toggle("hidden", !playing);
    statusBar.classList.toggle("hidden", !playing);
    panelFieldWrap.classList.toggle("hidden", !playing);
    panelRolesWrap.classList.toggle("hidden", !playing);
    panelFoxWrap.classList.toggle("hidden", !playing);
    panelFarmerWrap.classList.toggle("hidden", !playing);
  }

  function resetToSetup() {
    phase = "wait_farmer";
    roles = [];
    sitting = [];
    shotsUsed = 0;
    foxIdx = -1;
    farmerIdx = -1;
    foxMode = false;
    farmerMode = false;
    foxMsg.textContent = "";
    farmerMsg.textContent = "";
    pickFoxMsg.textContent = "";
    inpPickFox.value = "";
    inpFoxNum.value = "";
    inpFarmerNum.value = "";
    syncPhaseUi();
    renderField();
  }

  /**
   * Fuchs wird gewählt (ohne Bauer im Raum); Bauer zufällig unter den 19 übrigen.
   */
  function startGameWithChosenFox(foxIndex) {
    foxIdx = foxIndex;
    const pool = [];
    for (let i = 0; i < N; i++) {
      if (i !== foxIdx) pool.push(i);
    }
    farmerIdx = pool[(Math.random() * pool.length) | 0];

    roles = [];
    for (let i = 0; i < N; i++) {
      if (i === foxIdx) roles[i] = "fuchs";
      else if (i === farmerIdx) roles[i] = "bauer";
      else roles[i] = "hun";
    }
    sitting = Array(N).fill(false);
    shotsUsed = 0;
    foxMode = false;
    farmerMode = false;
    foxMsg.textContent = "";
    farmerMsg.textContent = "";
    inpFoxNum.value = "";
    inpFarmerNum.value = "";

    phase = "playing";
    syncPhaseUi();
    renderField();
  }

  function sittingCount() {
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (roles[i] === "hun" && sitting[i]) n++;
    }
    return n;
  }

  function checkFoxWin() {
    return sittingCount() >= N_HUN;
  }

  function endGame(title, msg) {
    overlayEnd.classList.remove("hidden");
    endTitle.textContent = title;
    endMsg.textContent = msg;
    foxMode = false;
    farmerMode = false;
    renderField();
  }

  /** Öffentlich: alle Nicht-Sitzer als Huhn — auch Fuchs/Bauer (Tarnung). „Alle bewegen sich“: Wackeln für alle stehenden. */
  function renderField() {
    if (phase !== "playing" || roles.length !== N) {
      for (let i = 0; i < N; i++) {
        const el = slots[i];
        el.className = "slot slot-idle";
        el.innerHTML = '<span class="emoji" aria-hidden="true">·</span><span class="num">' + (i + 1) + "</span>";
        el.title = "Platz " + (i + 1);
        el.onclick = null;
      }
      return;
    }

    statSitting.textContent = String(sittingCount());
    statShots.textContent = String(shotsUsed);

    for (let i = 0; i < N; i++) {
      const el = slots[i];
      el.className = "slot";
      el.dataset.idx = String(i);

      const isHun = roles[i] === "hun";
      const isSit = isHun && sitting[i];

      if (isSit) {
        el.innerHTML = '<span class="emoji" aria-hidden="true">🪑</span><span class="num">' + (i + 1) + "</span>";
        el.classList.add("sitting");
        el.title = "Huhn " + (i + 1) + " sitzt";
      } else {
        el.innerHTML = '<span class="emoji" aria-hidden="true">🐔</span><span class="num">' + (i + 1) + "</span>";
        el.title = "Spieler " + (i + 1) + " — weiterbewegen!";
        el.classList.add("walking");
      }

      if (foxMode && isHun && !sitting[i]) {
        el.classList.add("fox-target");
        el.onclick = () => foxTouch(i);
      } else if (farmerMode && shotsUsed < 3) {
        el.classList.add("farmer-target");
        el.onclick = () => farmerShoot(i);
      } else {
        el.onclick = null;
      }
    }
  }

  function foxTouch(idx) {
    if (!foxMode || roles[idx] !== "hun" || sitting[idx]) return;
    sitting[idx] = true;
    foxMsg.textContent = "Huhn " + (idx + 1) + " sitzt jetzt.";
    if (checkFoxWin()) {
      renderField();
      endGame("Fuchs gewinnt", "Alle 18 Hühner sitzen. Der Fuchs hat gewonnen.");
      return;
    }
    renderField();
  }

  function farmerShoot(idx) {
    if (!farmerMode || shotsUsed >= 3) return;
    if (idx === farmerIdx) {
      farmerMsg.textContent = "Du kannst nicht auf deine eigene Nummer schießen.";
      return;
    }
    shotsUsed++;
    if (roles[idx] === "fuchs") {
      renderField();
      endGame("Bauer gewinnt", "Treffer! Der Bauer hat den Fuchs erwischt.");
      return;
    }
    farmerMsg.textContent =
      shotsUsed >= 3
        ? "Daneben — das war dein letzter Schuss."
        : "Schuss " + shotsUsed + "/3: Nicht der Fuchs. Noch " + (3 - shotsUsed) + " Schuss(e).";
    if (shotsUsed >= 3 && !checkFoxWin()) {
      renderField();
      endGame(
        "Schüsse aufgebraucht",
        "Der Bauer hat dreimal daneben geschossen. Runde zu Ende — oder Hausregel / neues Spiel."
      );
      return;
    }
    renderField();
  }

  function parseNum(input) {
    const n = parseInt(String(input).trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > N) return -1;
    return n - 1;
  }

  const moveHint =
    "<p class=\"role-block\">Wichtig: <strong>Beweg dich im Raum</strong> (herumlaufen) — das tun <strong>alle</strong>, damit der Bauer nichts erraten kann.</p>";

  function showRoleModal(idx) {
    if (phase !== "playing" || roles.length !== N) {
      alert("Zuerst Bauer draußen warten lassen, dann den Fuchs wählen — danach kannst du die Rolle ansehen.");
      return;
    }
    const r = roles[idx];
    const num = idx + 1;
    let html = "";

    if (r === "hun") {
      html =
        '<p class="role-block">Du bist <span class="big">Huhn 🐔</span></p>' +
        moveHint +
        "<p class=\"role-block\">Du weißt: Der <strong>Fuchs</strong> ist <strong>Spieler " +
        (foxIdx + 1) +
        "</strong>, der <strong>Bauer</strong> ist <strong>Spieler " +
        (farmerIdx + 1) +
        "</strong>.</p>" +
        "<p class=\"role-block\">Deine Nummer: <strong>" +
        num +
        "</strong></p>";
    } else if (r === "fuchs") {
      html =
        '<p class="role-block">Du bist der <span class="big" style="color:var(--fuchs)">Fuchs 🦊</span></p>' +
        moveHint +
        "<p class=\"role-block\">Berühre die Hühner unten bei <strong>„Als Fuchs“</strong> mit deiner Nummer <strong>" +
        num +
        "</strong>. Wenn alle 18 Hühner sitzen, gewinnst du.</p>" +
        "<p class=\"role-block\">Der Bauer ist <strong>Spieler " +
        (farmerIdx + 1) +
        "</strong> — der darf dich nicht kennen.</p>";
    } else {
      html =
        '<p class="role-block">Du bist der <span class="big" style="color:var(--bauer)">Bauer 👨‍🌾</span></p>' +
        "<p class=\"role-block\">Du hast <strong>drei Schüsse</strong>. Unten bei <strong>„Als Bauer“</strong> mit deiner Nummer <strong>" +
        num +
        "</strong> anmelden, dann eine Nummer antippen.</p>" +
        "<p class=\"role-block\">Du darfst <strong>nicht</strong> wissen, wer Fuchs oder Hühner sind — nur raten!</p>";
    }

    roleBody.innerHTML = html;
    overlayRole.classList.remove("hidden");
  }

  function buildField() {
    field.innerHTML = "";
    slots.length = 0;
    for (let i = 0; i < N; i++) {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "slot";
      field.appendChild(d);
      slots.push(d);
    }
    renderField();
  }

  btnFarmerOutside.addEventListener("click", () => {
    phase = "pick_fox";
    pickFoxMsg.textContent = "";
    syncPhaseUi();
  });

  btnPickFox.addEventListener("click", () => {
    const idx = parseNum(inpPickFox.value);
    if (idx < 0) {
      pickFoxMsg.textContent = "Bitte eine gültige Fuchs-Nummer von 1 bis 20 eingeben.";
      return;
    }
    pickFoxMsg.textContent = "";
    startGameWithChosenFox(idx);
  });

  btnShowRole.addEventListener("click", () => {
    const idx = parseNum(inpMyNum.value);
    if (idx < 0) {
      alert("Bitte eine gültige Nummer von 1 bis 20 eingeben.");
      return;
    }
    showRoleModal(idx);
  });

  btnCloseRole.addEventListener("click", () => {
    overlayRole.classList.add("hidden");
    inpMyNum.value = "";
  });

  btnFoxLogin.addEventListener("click", () => {
    const idx = parseNum(inpFoxNum.value);
    if (idx < 0) {
      foxMsg.textContent = "Ungültige Nummer.";
      return;
    }
    if (roles[idx] !== "fuchs") {
      foxMsg.textContent = "Das ist nicht die Fuchs-Nummer.";
      foxMode = false;
      renderField();
      return;
    }
    foxMode = true;
    farmerMode = false;
    farmerMsg.textContent = "";
    foxMsg.textContent = "Fuchs-Modus: Tippe ein stehendes Huhn (🐔), bis es sitzt.";
    renderField();
  });

  btnFarmerLogin.addEventListener("click", () => {
    const idx = parseNum(inpFarmerNum.value);
    if (idx < 0) {
      farmerMsg.textContent = "Ungültige Nummer.";
      return;
    }
    if (roles[idx] !== "bauer") {
      farmerMsg.textContent = "Das ist nicht die Bauer-Nummer.";
      farmerMode = false;
      renderField();
      return;
    }
    farmerMode = true;
    foxMode = false;
    foxMsg.textContent = "";
    farmerMsg.textContent =
      shotsUsed >= 3
        ? "Keine Schüsse mehr."
        : "Bauer-Modus: Tippe eine Nummer (1–20). Schüsse: " + shotsUsed + "/3.";
    renderField();
  });

  btnNew.addEventListener("click", () => {
    if (!confirm("Neues Spiel? Bauer wieder draußen, Fuchs neu wählen.")) return;
    overlayEnd.classList.add("hidden");
    resetToSetup();
  });

  btnEndOk.addEventListener("click", () => {
    overlayEnd.classList.add("hidden");
    renderField();
  });

  resetToSetup();
  buildField();
})();
