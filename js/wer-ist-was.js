(() => {
  /**
   * Wer ist was — Kopf-Spiel für 2–4 Personen am gleichen Gerät.
   * Einer rät (schaut weg), die anderen sehen das Wort und erklären mündlich.
   */
  const PLAYERS = [
    { label: "Spieler 1", color: "#22d3ee", bg: "rgba(34, 211, 238, 0.2)" },
    { label: "Spieler 2", color: "#f472b6", bg: "rgba(244, 114, 182, 0.2)" },
    { label: "Spieler 3", color: "#a3e635", bg: "rgba(163, 230, 53, 0.2)" },
    { label: "Spieler 4", color: "#fb923c", bg: "rgba(251, 146, 60, 0.2)" },
  ];

  /** clue = Anzeige für Erklärer, answer = erwartete Eingabe beim Raten */
  const POOL = [
    { clue: "Banane", answer: "Banane" },
    { clue: "Auto", answer: "Auto" },
    { clue: "Schule", answer: "Schule" },
    { clue: "🦁", answer: "Löwe" },
    { clue: "🐘", answer: "Elefant" },
    { clue: "🍕", answer: "Pizza" },
    { clue: "🚲", answer: "Fahrrad" },
    { clue: "❄️", answer: "Schnee" },
    { clue: "☀️", answer: "Sonne" },
    { clue: "🎂", answer: "Kuchen" },
    { clue: "📱", answer: "Handy" },
    { clue: "🏠", answer: "Haus" },
    { clue: "Meer", answer: "Meer" },
    { clue: "Berg", answer: "Berg" },
    { clue: "Lehrer", answer: "Lehrer" },
    { clue: "Arzt", answer: "Arzt" },
    { clue: "Bibliothek", answer: "Bibliothek" },
    { clue: "🎸", answer: "Gitarre" },
    { clue: "🎹", answer: "Klavier" },
    { clue: "⚽", answer: "Fußball" },
    { clue: "🦋", answer: "Schmetterling" },
    { clue: "🐧", answer: "Pinguin" },
    { clue: "🍎", answer: "Apfel" },
    { clue: "🥕", answer: "Karotte" },
    { clue: "Flugzeug", answer: "Flugzeug" },
    { clue: "Zug", answer: "Zug" },
    { clue: "Polizei", answer: "Polizei" },
    { clue: "Feuerwehr", answer: "Feuerwehr" },
    { clue: "Geburtstag", answer: "Geburtstag" },
    { clue: "Winter", answer: "Winter" },
    { clue: "🌙", answer: "Mond" },
    { clue: "⭐", answer: "Stern" },
    { clue: "🎁", answer: "Geschenk" },
    { clue: "Schlüssel", answer: "Schlüssel" },
    { clue: "Brille", answer: "Brille" },
    { clue: "🕐", answer: "Uhr" },
    { clue: "Buch", answer: "Buch" },
    { clue: "Film", answer: "Film" },
    { clue: "🍦", answer: "Eis" },
    { clue: "💧", answer: "Wasser" },
    { clue: "🔥", answer: "Feuer" },
    { clue: "Baum", answer: "Baum" },
    { clue: "Blume", answer: "Blume" },
    { clue: "Katze", answer: "Katze" },
    { clue: "Hund", answer: "Hund" },
  ];

  const lobby = document.getElementById("lobby");
  const play = document.getElementById("play");
  const numPlayers = document.getElementById("num-players");
  const btnBegin = document.getElementById("btn-begin");

  const elRoundNum = document.getElementById("round-num");
  const scoresLine = document.getElementById("scores-line");

  const phaseAway = document.getElementById("phase-away");
  const phaseShow = document.getElementById("phase-show");
  const phaseGuess = document.getElementById("phase-guess");
  const phaseResult = document.getElementById("phase-result");

  const awayText = document.getElementById("away-text");
  const secretBig = document.getElementById("secret-big");
  const btnAwayNext = document.getElementById("btn-away-next");
  const btnHideGuess = document.getElementById("btn-hide-guess");
  const guessTitle = document.getElementById("guess-title");
  const guessInput = document.getElementById("guess-input");
  const btnSubmitGuess = document.getElementById("btn-submit-guess");
  const resultMsg = document.getElementById("result-msg");
  const resultAnswer = document.getElementById("result-answer");
  const btnNextRound = document.getElementById("btn-next-round");

  let n = 3;
  let deck = [];
  let deckIdx = 0;
  let round = 1;
  let scores = [0, 0, 0, 0];
  let secret = null;
  let guesser = 0;

  function norm(s) {
    return s
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss");
  }

  /** Ohne Leerzeichen — Tippfehler und Abstände egal */
  function compact(s) {
    return norm(s).replace(/\s/g, "");
  }

  function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      }
    }
    return d[m][n];
  }

  /**
   * Zählt als richtig, wenn die Eingabe dem Lösungswort entspricht — auch mit Tippfehlern.
   */
  function guessMatches(guessRaw, answerRaw) {
    const g = compact(guessRaw);
    const a = compact(answerRaw);
    if (!g.length) return false;
    if (g === a) return true;
    const d = levenshtein(g, a);
    const len = Math.max(a.length, g.length);
    const maxTypo =
      len <= 3 ? 1 : len <= 7 ? 2 : Math.min(5, Math.max(2, Math.floor(len * 0.34)));
    return d <= maxTypo;
  }

  function shuffle(a) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [x[i], x[j]] = [x[j], x[i]];
    }
    return x;
  }

  function showOnly(el) {
    [phaseAway, phaseShow, phaseGuess, phaseResult].forEach((p) => {
      p.classList.toggle("hidden", p !== el);
    });
  }

  function renderScores() {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const p = PLAYERS[i];
      parts.push(`<span style="color:${p.color}">${p.label}</span>&nbsp;${scores[i]}`);
    }
    scoresLine.innerHTML = parts.join(" · ");
  }

  function pickSecret() {
    if (deckIdx >= deck.length) {
      deck = shuffle(POOL);
      deckIdx = 0;
    }
    secret = deck[deckIdx];
    deckIdx += 1;
  }

  function isEmojiOnly(clue) {
    const t = clue.trim();
    if (t.length <= 4 && [...t].length <= 2) return true;
    return /^[\p{Emoji}\uFE0F\s]+$/u.test(t);
  }

  function startRound() {
    pickSecret();
    guesser = (round - 1) % n;
    const g = PLAYERS[guesser];
    elRoundNum.textContent = String(round);

    awayText.innerHTML = `<span class="who" style="background:${g.bg};color:${g.color}">${g.label}</span> schaut jetzt <strong>weg</strong> oder dreht sich um — darf <strong>nichts</strong> vom Bildschirm sehen!`;

    secretBig.textContent = "";
    guessInput.value = "";
    renderScores();
    showOnly(phaseAway);
  }

  function beginGame() {
    n = parseInt(numPlayers.value, 10);
    scores = [0, 0, 0, 0];
    round = 1;
    deck = shuffle(POOL);
    deckIdx = 0;
    lobby.classList.add("hidden");
    play.classList.remove("hidden");
    startRound();
  }

  btnBegin.addEventListener("click", beginGame);

  btnAwayNext.addEventListener("click", () => {
    secretBig.textContent = secret.clue;
    secretBig.classList.toggle("emoji-only", isEmojiOnly(secret.clue));
    showOnly(phaseShow);
  });

  btnHideGuess.addEventListener("click", () => {
    const g = PLAYERS[guesser];
    guessTitle.innerHTML = `<span style="color:${g.color}">${g.label}</span> — was hast du „im Kopf“? Schreib das Wort.`;
    guessInput.value = "";
    showOnly(phaseGuess);
    guessInput.focus();
  });

  function evaluateGuess() {
    const hit = guessMatches(guessInput.value, secret.answer);

    if (hit) {
      scores[guesser] += 2;
      resultMsg.textContent = "Richtig geraten! +2 Punkte";
      resultMsg.className = "result-msg hit";
    } else {
      resultMsg.textContent = "Leider nicht.";
      resultMsg.className = "result-msg miss";
    }

    resultAnswer.textContent = secret.answer;
    renderScores();
    showOnly(phaseResult);
  }

  btnSubmitGuess.addEventListener("click", evaluateGuess);
  guessInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") evaluateGuess();
  });

  btnNextRound.addEventListener("click", () => {
    round += 1;
    startRound();
  });
})();
