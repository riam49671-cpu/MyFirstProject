(() => {
  /**
   * Bekannte Bücher + Stichworte für den „Roboter“ (nur lokal, kein Titel in den Hinweisen nötig).
   */
  const BOOKS = [
    {
      id: "hp",
      t: {
        de: "Harry Potter (Reihe)",
        en: "Harry Potter (series)",
        it: "Harry Potter (saga)",
        id: "Harry Potter (seri)",
        fr: "Harry Potter (série)",
        es: "Harry Potter (saga)",
        pt: "Harry Potter (série)",
      },
      k: {
        de: ["zauber", "zauberer", "hogwarts", "schule", "dumbledore", "snape", "quidditch", "geheimnis"],
        en: ["magic", "wizard", "hogwarts", "school", "sorcery", "quidditch", "wand", "witch"],
        it: ["magia", "mago", "hogwarts", "scuola", "bacchetta", "stregoneria", "quidditch", "incantesimo"],
        id: ["sihir", "penyihir", "hogwarts", "sekolah", "tongkat", "quidditch", "peri", "sulap"],
        fr: ["magie", "sorcier", "hogwarts", "ecole", "baguette", "poudlard", "sorcellerie", "quidditch"],
        es: ["magia", "mago", "hogwarts", "escuela", "varita", "hechicero", "quidditch", "bruja"],
        pt: ["magia", "feiticeiro", "hogwarts", "escola", "varinha", "bruxo", "quidditch", "feitico"],
      },
    },
    {
      id: "hobbit",
      t: {
        de: "Der Hobbit",
        en: "The Hobbit",
        it: "Lo Hobbit",
        id: "Si Hobbit",
        fr: "Le Hobbit",
        es: "El hobbit",
        pt: "O Hobbit",
      },
      k: {
        de: ["drache", "smaug", "zwerg", "gandalf", "schatz", "berg", "mittelerde", "hobbit"],
        en: ["dragon", "dwarf", "gandalf", "treasure", "hobbit", "mountain", "quest", "shire"],
        it: ["drago", "nano", "gandalf", "tesoro", "montagna", "anello", "avventura", "treno"],
        id: ["naga", "kurcaci", "gandalf", "harta", "gunung", "hobbit", "petualangan", "perahu"],
        fr: ["dragon", "nain", "gandalf", "tresor", "montagne", "anneau", "aventure", "gollum"],
        es: ["dragon", "enano", "gandalf", "tesoro", "montana", "anillo", "aventura", "comarca"],
        pt: ["dragao", "anao", "gandalf", "tesouro", "montanha", "anel", "aventura", "condado"],
      },
    },
    {
      id: "herr",
      t: {
        de: "Der Herr der Ringe",
        en: "The Lord of the Rings",
        it: "Il Signore degli Anelli",
        id: "Raja Segala Cincin",
        fr: "Le Seigneur des anneaux",
        es: "El señor de los anillos",
        pt: "O Senhor dos Anéis",
      },
      k: {
        de: ["ring", "frod", "gandalf", "gollum", "herr", "mittelerde", "orcs", "quest"],
        en: ["ring", "frodo", "gandalf", "gollum", "mordor", "middle", "sauron", "fellowship"],
        it: ["anello", "frodo", "gandalf", "gollum", "mordor", "compagnia", "sauron", "montagna"],
        id: ["cincin", "frodo", "gandalf", "gollum", "mordor", "persekutuan", "sauron", "perang"],
        fr: ["anneau", "frodon", "gandalf", "gollum", "mordor", "communaute", "sauron", "quete"],
        es: ["anillo", "frodo", "gandalf", "gollum", "mordor", "comunidad", "sauron", "montana"],
        pt: ["anel", "frodo", "gandalf", "gollum", "mordor", "sociedade", "sauron", "montanha"],
      },
    },
    {
      id: "narnia",
      t: {
        de: "Die Chroniken von Narnia",
        en: "The Chronicles of Narnia",
        it: "Le cronache di Narnia",
        id: "Kronik Narnia",
        fr: "Les Chroniques de Narnia",
        es: "Las crónicas de Narnia",
        pt: "As crônicas de Nárnia",
      },
      k: {
        de: ["narnia", "löwe", "aslan", "schrank", "kinder", "hexe", "winter", "tee"],
        en: ["narnia", "aslan", "lion", "wardrobe", "witch", "children", "fantasy", "winter"],
        it: ["narnia", "aslan", "leone", "armadio", "strega", "bambini", "fantasy", "neve"],
        id: ["narnia", "aslan", "singa", "lemari", "penyihir", "anak", "fantasi", "salju"],
        fr: ["narnia", "aslan", "lion", "armoire", "sorciere", "enfants", "fantasy", "neige"],
        es: ["narnia", "aslan", "leon", "armario", "bruja", "ninos", "fantasia", "nieve"],
        pt: ["narnia", "aslan", "leao", "guarda", "bruxa", "criancas", "fantasia", "neve"],
      },
    },
    {
      id: "pi",
      t: {
        de: "Schiffbruch mit Tiger (Life of Pi)",
        en: "Life of Pi",
        it: "La vita di Pi",
        id: "Life of Pi",
        fr: "L'histoire de Pi",
        es: "La vida de Pi",
        pt: "A vida de Pi",
      },
      k: {
        de: ["tiger", "boot", "ozean", "schiff", "überleben", "pazifik", "indien", "tier"],
        en: ["tiger", "boat", "ocean", "life", "pi", "survive", "pacific", "island"],
        it: ["tigre", "barca", "oceano", "sopravvivenza", "zattera", "indiano", "mare", "religione"],
        id: ["harimau", "perahu", "samudra", "bertahan", "kapal", "india", "hidup", "laut"],
        fr: ["tigre", "bateau", "ocean", "survie", "radeau", "inde", "pacifique", "mer"],
        es: ["tigre", "barco", "oceano", "supervivencia", "balsa", "india", "pacifico", "mar"],
        pt: ["tigre", "barco", "oceano", "sobrevivencia", "jangada", "india", "pacifico", "mar"],
      },
    },
    {
      id: "romeo",
      t: {
        de: "Romeo und Julia (Shakespeare)",
        en: "Romeo and Juliet",
        it: "Romeo e Giulietta",
        id: "Romeo dan Julia",
        fr: "Roméo et Juliette",
        es: "Romeo y Julieta",
        pt: "Romeu e Julieta",
      },
      k: {
        de: ["liebe", "verona", "familie", "tragoedie", "balkon", "julia", "romeo", "drama"],
        en: ["love", "verona", "families", "tragedy", "balcony", "romeo", "juliet", "shakespeare"],
        it: ["amore", "verona", "famiglia", "tragedia", "balcone", "giulietta", "montecchi", "teatro"],
        id: ["cinta", "verona", "keluarga", "tragedi", "balkon", "julia", "romeo", "drama"],
        fr: ["amour", "verona", "famille", "tragedie", "balcon", "juliette", "capulet", "theatre"],
        es: ["amor", "verona", "familia", "tragedia", "balcon", "julieta", "capuleto", "drama"],
        pt: ["amor", "verona", "familia", "tragedia", "sacada", "julieta", "capuleto", "teatro"],
      },
    },
    {
      id: "faust",
      t: {
        de: "Faust (Goethe)",
        en: "Faust",
        it: "Faust",
        id: "Faust",
        fr: "Faust",
        es: "Fausto",
        pt: "Fausto",
      },
      k: {
        de: ["teufel", "goethe", "mephisto", "gretchen", "wette", "wissen", "pakt", "faust"],
        en: ["devil", "goethe", "mephistopheles", "bargain", "soul", "gretchen", "scholar", "pact"],
        it: ["diavolo", "goethe", "mefistofele", "patto", "anima", "gretchen", "sapere", "dramma"],
        id: ["setan", "goethe", "mefistofelis", "janji", "jiwa", "gretchen", "ilmu", "perjanjian"],
        fr: ["diable", "goethe", "mephistopheles", "pacte", "ame", "gretchen", "savoir", "drame"],
        es: ["diablo", "goethe", "mefistofeles", "pacto", "alma", "gretchen", "saber", "drama"],
        pt: ["diabo", "goethe", "mefistofeles", "pacto", "alma", "gretchen", "saber", "drama"],
      },
    },
    {
      id: "alice",
      t: {
        de: "Alice im Wunderland",
        en: "Alice in Wonderland",
        it: "Alice nel Paese delle Meraviglie",
        id: "Alice di Negeri Ajaib",
        fr: "Alice au pays des merveilles",
        es: "Alicia en el país de las maravillas",
        pt: "Alice no País das Maravilhas",
      },
      k: {
        de: ["alice", "hase", "wunderland", "karten", "königin", "trinken", "loch", "verrückt"],
        en: ["alice", "wonderland", "rabbit", "queen", "tea", "curious", "hole", "mad"],
        it: ["alice", "meraviglie", "coniglio", "regina", "te", "buco", "cappellaio", "fantastico"],
        id: ["alice", "ajaib", "kelinci", "ratu", "teh", "lubang", "topi", "gila"],
        fr: ["alice", "merveilles", "lapin", "reine", "the", "trou", "chapelier", "folie"],
        es: ["alice", "maravillas", "conejo", "reina", "te", "agujero", "sombrerero", "locura"],
        pt: ["alice", "maravilhas", "coelho", "rainha", "cha", "buraco", "chapeleiro", "loucura"],
      },
    },
    {
      id: "odyssee",
      t: {
        de: "Odyssee (Homer)",
        en: "The Odyssey",
        it: "Odissea",
        id: "Odisi",
        fr: "Odyssée",
        es: "La Odisea",
        pt: "Odisseia",
      },
      k: {
        de: ["odysseus", "meer", "irena", "cyclops", "heimkehr", "griechisch", "troja", "held"],
        en: ["odyssey", "greece", "sea", "cyclops", "penelope", "homecoming", "trojan", "hero"],
        it: ["odisseo", "mare", "ciclope", "penelope", "ritorno", "troia", "eroe", "navigazione"],
        id: ["odyseus", "laut", "siklop", "pulang", "troia", "pahlawan", "perahu", "yunani"],
        fr: ["odyssee", "mer", "cyclope", "penelope", "retour", "troie", "heros", "gres"],
        es: ["odiseo", "mar", "ciclope", "penelope", "regreso", "troya", "heroe", "griego"],
        pt: ["odisseu", "mar", "ciclope", "penelope", "retorno", "troia", "heroi", "grego"],
      },
    },
    {
      id: "korallen",
      t: {
        de: "20.000 Meilen unter dem Meer",
        en: "Twenty Thousand Leagues Under the Sea",
        it: "Ventimila leghe sotto i mari",
        id: "Dua Puluh Ribu Mil di Bawah Laut",
        fr: "Vingt mille lieues sous les mers",
        es: "Veinte mil leguas de viaje submarino",
        pt: "Vinte Mil Léguas Submarinas",
      },
      k: {
        de: ["nemo", "boot", "unterwasser", "meer", "kapitän", "wal", "technik", "tauchen"],
        en: ["nemo", "submarine", "sea", "captain", "underwater", "voyage", "squid", "explore"],
        it: ["nemo", "sommergibile", "mare", "capitano", "polipo", "viaggio", "squale", "ocean"],
        id: ["nemo", "kapal", "selam", "laut", "naga", "petualangan", "bawah", "lautan"],
        fr: ["nemo", "sous", "mer", "capitaine", "calmar", "voyage", "exploration", "ocean"],
        es: ["nemo", "submarino", "mar", "capitan", "calamar", "viaje", "exploracion", "oceano"],
        pt: ["nemo", "submarino", "mar", "capitao", "lula", "viagem", "exploracao", "oceano"],
      },
    },
    {
      id: "karibik",
      t: {
        de: "Die Schatzinsel (Stevenson)",
        en: "Treasure Island",
        it: "L'isola del tesoro",
        id: "Pulau Harta Karun",
        fr: "L'île au trésor",
        es: "La isla del tesoro",
        pt: "A ilha do tesouro",
      },
      k: {
        de: ["schatz", "pirat", "insel", "karte", "silber", "jim", "schiff", "huk"],
        en: ["treasure", "pirate", "island", "map", "long", "ship", "adventure", "flint"],
        it: ["tesoro", "pirata", "isola", "mappa", "avventura", "john", "spiaggia", "cannone"],
        id: ["harta", "bajak", "pulau", "peta", "kapal", "petualangan", "perak", "laut"],
        fr: ["tresor", "pirate", "ile", "carte", "aventure", "bateau", "carte", "ile"],
        es: ["tesoro", "pirata", "isla", "mapa", "aventura", "barco", "plata", "flint"],
        pt: ["tesouro", "pirata", "ilha", "mapa", "aventura", "navio", "prata", "flint"],
      },
    },
    {
      id: "grimm",
      t: {
        de: "Grimms Märchen (Sammlung)",
        en: "Grimms' Fairy Tales",
        it: "Fiabe dei fratelli Grimm",
        id: "Dongeng Grimm",
        fr: "Contes des frères Grimm",
        es: "Cuentos de los hermanos Grimm",
        pt: "Contos dos irmãos Grimm",
      },
      k: {
        de: ["märchen", "rot", "wolf", "hexe", "prinz", "wald", "kinder", "sammel"],
        en: ["fairy", "tale", "wolf", "witch", "prince", "forest", "grimm", "folklore"],
        it: ["fiaba", "lupo", "strega", "castello", "biancaneve", "cappuccetto", "bosco", "grimm"],
        id: ["dongeng", "serigala", "penyihir", "putri", "hutan", "dongeng", "anak", "cerita"],
        fr: ["conte", "loup", "sorciere", "foret", "princesse", "blanche", "neige", "grimm"],
        es: ["cuento", "lobo", "bruja", "bosque", "princesa", "caperucita", "hansel", "grimm"],
        pt: ["conto", "lobo", "bruxa", "floresta", "princesa", "chapeuzinho", "grimm", "irmaos"],
      },
    },
    {
      id: "1984",
      t: {
        de: "1984 (Orwell)",
        en: "Nineteen Eighty-Four",
        it: "1984 (Orwell)",
        id: "1984 (Orwell)",
        fr: "1984 (Orwell)",
        es: "1984 (Orwell)",
        pt: "1984 (Orwell)",
      },
      k: {
        de: ["überwachung", "big", "diktatur", "gedanken", "orwell", "partei", "krieg", "zukunft"],
        en: ["orwell", "surveillance", "big", "brother", "dystopia", "thought", "party", "control"],
        it: ["orwell", "sorveglianza", "grande", "fratello", "dittatura", "pensiero", "partito", "totalitarismo"],
        id: ["orwell", "pengawasan", "besar", "kakak", "diktator", "pikiran", "partai", "kontrol"],
        fr: ["orwell", "surveillance", "grand", "frere", "dictature", "pensee", "parti", "controle"],
        es: ["orwell", "vigilancia", "gran", "hermano", "dictadura", "pensamiento", "partido", "control"],
        pt: ["orwell", "vigilancia", "grande", "irmao", "ditadura", "pensamento", "partido", "controle"],
      },
    },
    {
      id: "peter",
      t: {
        de: "Peter Pan",
        en: "Peter Pan",
        it: "Peter Pan",
        id: "Peter Pan",
        fr: "Peter Pan",
        es: "Peter Pan",
        pt: "Peter Pan",
      },
      k: {
        de: ["peter", "verloren", "kinder", "fliegen", "hook", "nimmerland", "fee", "krokodil"],
        en: ["peter", "pan", "neverland", "tinker", "hook", "fly", "lost", "fairy"],
        it: ["peter", "campanellino", "uncino", "volare", "isola", "bambini", "sirena", "capitan"],
        id: ["peter", "neverland", "kapten", "terbang", "anak", "peri", "buaya", "kapal"],
        fr: ["peter", "fee", "capitaine", "vol", "ile", "enfants", "crocodile", "garcon"],
        es: ["peter", "campanilla", "garfio", "volar", "isla", "ninos", "cocodrilo", "ninos"],
        pt: ["peter", "sininho", "gancho", "voar", "ilha", "criancas", "crocodilo", "crianca"],
      },
    },
    {
      id: "momo",
      t: {
        de: "Momo (Ende)",
        en: "Momo",
        it: "Momo",
        id: "Momo",
        fr: "Momo",
        es: "Momo",
        pt: "Momo",
      },
      k: {
        de: ["zeit", "ende", "grau", "men", "kind", "freunde", "ruine", "sparen"],
        en: ["momo", "ende", "time", "grey", "children", "friends", "fantasy", "theft"],
        it: ["momo", "tempo", "ende", "bambini", "amici", "grigi", "fantasia", "orologi"],
        id: ["momo", "waktu", "ende", "anak", "teman", "abu", "fantasi", "waktu"],
        fr: ["momo", "temps", "ende", "enfants", "amis", "gris", "fantasy", "voleurs"],
        es: ["momo", "tiempo", "ende", "ninos", "amigos", "gris", "fantasia", "ladrones"],
        pt: ["momo", "tempo", "ende", "criancas", "amigos", "cinza", "fantasia", "ladroes"],
      },
    },
    {
      id: "picnic",
      t: {
        de: "Emil und die Detektive",
        en: "Emil and the Detectives",
        it: "Emil e i detective",
        id: "Emil dan Detektif",
        fr: "Émile et les détectives",
        es: "Emilio y los detectives",
        pt: "Emil e os Detetives",
      },
      k: {
        de: ["berlin", "detektiv", "emil", "dieb", "kinder", "zug", "geld", "freunde"],
        en: ["emil", "detectives", "berlin", "thief", "children", "money", "friends", "train"],
        it: ["emil", "berlino", "ladro", "bambini", "treno", "inseguimento", "nonna", "amici"],
        id: ["emil", "berlin", "pencuri", "anak", "kereta", "uang", "teman", "detektif"],
        fr: ["emil", "berlin", "voleur", "enfants", "train", "argent", "amis", "chasse"],
        es: ["emil", "berlin", "ladron", "ninos", "tren", "dinero", "amigos", "persecucion"],
        pt: ["emil", "berlim", "ladrao", "criancas", "trem", "dinheiro", "amigos", "perseguicao"],
      },
    },
    {
      id: "tkam",
      t: {
        de: "Wer die Nachtigall stört",
        en: "To Kill a Mockingbird",
        it: "Il buio oltre la siepe",
        id: "Membunuh Seekor Mockingbird",
        fr: "Ne tirez pas sur l'oiseau moqueur",
        es: "Matar un ruiseñor",
        pt: "O Sol é Para Todos",
      },
      k: {
        de: ["gericht", "anwalt", "kind", "rassismus", "atticus", "south", "unschuld", "morale"],
        en: ["mockingbird", "lawyer", "court", "scout", "atticus", "justice", "south", "trial"],
        it: ["atticus", "scout", "tribunale", "razzismo", "innocenza", "avvocato", "sud", "giustizia"],
        id: ["atticus", "pengadilan", "hukum", "rasial", "selatan", "pembela", "anak", "keadilan"],
        fr: ["atticus", "justice", "tribunal", "racisme", "avocat", "sud", "scout", "innocence"],
        es: ["atticus", "justicia", "tribunal", "racismo", "abogado", "sur", "scout", "inocencia"],
        pt: ["atticus", "justica", "tribunal", "racismo", "advogado", "sul", "scout", "inocencia"],
      },
    },
    {
      id: "pride",
      t: {
        de: "Stolz und Vorurteil",
        en: "Pride and Prejudice",
        it: "Orgoglio e pregiudizio",
        id: "Kebanggaan dan Prasangka",
        fr: "Orgueil et préjugés",
        es: "Orgullo y prejuicio",
        pt: "Orgulho e Preconceito",
      },
      k: {
        de: ["liebe", "bennet", "darcy", "englisch", "gesellschaft", "hochzeit", "familie", "roman"],
        en: ["darcy", "elizabeth", "love", "marriage", "bennet", "prejudice", "england", "novel"],
        it: ["darcy", "elisabetta", "amore", "matrimonio", "orgoglio", "ballo", "famiglia", "regency"],
        id: ["darcy", "cinta", "pernikahan", "keluarga", "kesombongan", "inggris", "novel", "roman"],
        fr: ["darcy", "elizabeth", "amour", "mariage", "orgueil", "angleterre", "famille", "roman"],
        es: ["darcy", "elizabeth", "amor", "matrimonio", "orgullo", "inglaterra", "familia", "novela"],
        pt: ["darcy", "elizabeth", "amor", "casamento", "orgulho", "inglaterra", "familia", "romance"],
      },
    },
    {
      id: "don",
      t: {
        de: "Don Quijote",
        en: "Don Quixote",
        it: "Don Chisciotte",
        id: "Don Quijote",
        fr: "Don Quichotte",
        es: "Don Quijote",
        pt: "Dom Quixote",
      },
      k: {
        de: ["ritter", "windmühle", "sancho", "spanien", "abenteuer", "lanze", "romanze", "ideal"],
        en: ["quixote", "knight", "windmill", "sancho", "spain", "tilting", "chivalry", "dream"],
        it: ["cavaliere", "mulini", "sancho", "spagna", "avventura", "lancia", "romanzo", "ideale"],
        id: ["kesatria", "kincir", "sancho", "spanyol", "petualangan", "ideal", "novel", "angin"],
        fr: ["chevalier", "moulins", "sancho", "espagne", "aventure", "lance", "roman", "ideal"],
        es: ["caballero", "molinos", "sancho", "espana", "aventura", "lanza", "novela", "ideal"],
        pt: ["cavaleiro", "moinhos", "sancho", "espanha", "aventura", "lanca", "romance", "ideal"],
      },
    },
  ];
  const W = 520;
  const H = 280;
  const canvasReady = new WeakSet();

  let lang = "de";
  let mode = "solo";
  let selectedBookId = "";

  const el = (id) => document.getElementById(id);

  const STRINGS = {
    de: {
      labelWrittenSolo: "Dein Buch — Titel hinschreiben (Pflicht)",
      labelWrittenP1: "Spieler 1 — Buchtitel hinschreiben (Pflicht)",
      labelWrittenP2: "Spieler 2 — Buchtitel hinschreiben (Pflicht)",
      alertWriteBook: "Schreib bitte den Buchtitel ins erste Feld (hinschreiben).",
      hintOptionalLabel: "Optional: mehr zum Inhalt (ohne Buchtitel) — leer lassen reicht; der Roboter nutzt dann den Titel.",
      uiPen: "Stift",
      uiEraser: "Radierer",
      uiWidth: "Dicke",
      soloRobotTitle: "Der Roboter tippt: „{title}“",
      soloSecret: "Dein geheimes Buch war: „{title}“.",
      soloWeak:
        "(Ohne Eintrag hier nutzt der Roboter zum Schätzen vor allem deinen Buchtitel — die Zeichnung „sieht“ er nicht.)",
      soloWin: "Der Roboter hat ins Schwarze getroffen — du gewinnst!",
      soloLose: "Der Roboter lag daneben — du verlierst. Optional helfen beim nächsten Mal mehr Infotext oder eine kräftigere Zeichnung.",
    },
    en: {
      labelWrittenSolo: "Your book — type the title (required)",
      labelWrittenP1: "Player 1 — type the book title (required)",
      labelWrittenP2: "Player 2 — type the book title (required)",
      alertWriteBook: "Please type the book title in the first field.",
      hintOptionalLabel: "Optional: extra about the story (not the title) — leave empty is fine; your title is used instead.",
      uiPen: "Pen",
      uiEraser: "Eraser",
      uiWidth: "Width",
      soloRobotTitle: 'The robot guesses: "{title}"',
      soloSecret: 'Your secret book was: "{title}".',
      soloWeak:
        "(No extra hints: the robot mainly uses your book title for matching; it cannot “see” your drawing.)",
      soloWin: "The robot nailed it — you win!",
      soloLose: "Wrong guess — you lose. Next time, optional extra hints or a bolder drawing may help.",
    },
    it: {
      labelWrittenSolo: "Il tuo libro — scrivi il titolo (obbligatorio)",
      labelWrittenP1: "Giocatore 1 — scrivi il titolo del libro (obbligatorio)",
      labelWrittenP2: "Giocatore 2 — scrivi il titolo del libro (obbligatorio)",
      alertWriteBook: "Scrivi il titolo del libro nel primo campo.",
      hintOptionalLabel: "Facoltativo: altro sulla trama (senza titolo) — vuoto va bene; si usa il titolo.",
      uiPen: "Penna",
      uiEraser: "Gomma",
      uiWidth: "Spessore",
      soloRobotTitle: "Il robot indica: «{title}»",
      soloSecret: "Il tuo libro segreto era: «{title}».",
      soloWeak:
        "(Senza testo qui il robot usa soprattutto il titolo per confrontare; il disegno non lo “vede”.)",
      soloWin: "Il robot ha indovinato — hai vinto!",
      soloLose: "Il robot ha sbagliato — hai perso. La prossima volta puoi aggiungere indizi o disegnare più forte.",
    },
    id: {
      labelWrittenSolo: "Bukumu — tulis judulnya (wajib)",
      labelWrittenP1: "Pemain 1 — tulis judul buku (wajib)",
      labelWrittenP2: "Pemain 2 — tulis judul buku (wajib)",
      alertWriteBook: "Tulis judul buku di kolom pertama.",
      hintOptionalLabel: "Opsional: petunjuk isi (tanpa judul) — boleh kosong; pakai judul saja.",
      uiPen: "Pena",
      uiEraser: "Penghapus",
      uiWidth: "Tebal",
      soloRobotTitle: 'Robot menebak: "{title}"',
      soloSecret: 'Buku rahasiamu: "{title}".',
      soloWeak:
        "(Tanpa petunjuk tambahan robot memakai judul buku untuk cocokkan; gambar tidak terlihat.)",
      soloWin: "Robot benar — kamu menang!",
      soloLose: "Robot salah — kalah. Lain kali petunjuk tambahan atau gambar lebih tegas bisa membantu.",
    },
    fr: {
      labelWrittenSolo: "Ton livre — écris le titre (obligatoire)",
      labelWrittenP1: "Joueur 1 — écris le titre du livre (obligatoire)",
      labelWrittenP2: "Joueur 2 — écris le titre du livre (obligatoire)",
      alertWriteBook: "Écris le titre du livre dans le premier champ.",
      hintOptionalLabel: "Facultatif : indices sur l'histoire (sans le titre) — vide OK ; le titre suffit.",
      uiPen: "Crayon",
      uiEraser: "Gomme",
      uiWidth: "Épaisseur",
      soloRobotTitle: "Le robot propose : « {title} »",
      soloSecret: "Ton livre secret était : « {title} ».",
      soloWeak:
        "(Sans indices : le robot s’appuie surtout sur le titre ; il ne “voit” pas le dessin.)",
      soloWin: "Le robot a raison — tu gagnes !",
      soloLose: "Le robot se trompe — tu perds. La prochaine fois, des indices ou un dessin plus marqué peuvent aider.",
    },
    es: {
      labelWrittenSolo: "Tu libro — escribe el título (obligatorio)",
      labelWrittenP1: "Jugador 1 — escribe el título del libro (obligatorio)",
      labelWrittenP2: "Jugador 2 — escribe el título del libro (obligatorio)",
      alertWriteBook: "Escribe el título del libro en el primer campo.",
      hintOptionalLabel: "Opcional: más sobre la historia (sin el título) — vacío vale; se usa el título.",
      uiPen: "Lápiz",
      uiEraser: "Borrador",
      uiWidth: "Grosor",
      soloRobotTitle: 'El robot propone: «{title}»',
      soloSecret: 'Tu libro secreto era: «{title}».',
      soloWeak:
        "(Sin pistas extra: el robot usa sobre todo el título; no “ve” el dibujo.)",
      soloWin: "¡El robot acierta — ganas!",
      soloLose: "El robot falla — pierdes. La próxima vez, pistas extra o un dibujo más fuerte pueden ayudar.",
    },
    pt: {
      labelWrittenSolo: "O teu livro — escreve o título (obrigatório)",
      labelWrittenP1: "Jogador 1 — escreve o título do livro (obrigatório)",
      labelWrittenP2: "Jogador 2 — escreve o título do livro (obrigatório)",
      alertWriteBook: "Escreve o título do livro no primeiro campo.",
      hintOptionalLabel: "Opcional: mais sobre a história (sem o título) — vazio OK; usa-se o título.",
      uiPen: "Caneta",
      uiEraser: "Borracha",
      uiWidth: "Espessura",
      soloRobotTitle: 'O robot sugere: «{title}»',
      soloSecret: 'O teu livro secreto era: «{title}».',
      soloWeak:
        "(Sem pistas extra: o robot usa sobretudo o título; não “vê” o desenho.)",
      soloWin: "O robot acertou — ganhaste!",
      soloLose: "O robot errou — perdeste. Da próxima vez, mais pistas ou um desenho mais forte podem ajudar.",
    },
  };

  function tr(key, vars) {
    const v = vars || {};
    const pack = STRINGS[lang] || STRINGS.en;
    let s = (pack && pack[key]) || STRINGS.en[key] || STRINGS.de[key] || key;
    Object.keys(v).forEach((k) => {
      s = s.split(`{${k}}`).join(String(v[k]));
    });
    return s;
  }

  function bookTitle(b) {
    return (b.t && (b.t[lang] || b.t.en || b.t.de)) || "";
  }

  /** Leeres Kurz-Hinweisfeld: zum Vergleich werden die Wörter aus dem gewählten Buchtitel genutzt (keine Pflicht für extra Stichworte). */
  function effectiveHintFromBook(hintRaw, book) {
    const h = normalizeHint(hintRaw);
    if (h.trim().length >= 3) return h;
    if (!book) return h;
    const fromTitle = normalizeHint(bookTitle(book));
    return fromTitle.trim().length >= 2 ? fromTitle : h;
  }

  const CUSTOM_PREFIX = "custom:";

  /** Freier Titel: Stichworte aus dem geschriebenen Titel (für Roboter & Duell). */
  function makeCustomBook(rawWritten) {
    const display = rawWritten.trim();
    const hintNorm = normalizeHint(display);
    const words = hintNorm.split(/\s+/).filter((w) => w.length > 2);
    const kw =
      words.length > 0 ? words.slice(0, 24) : hintNorm.split(/\s+/).filter((w) => w.length > 0).slice(0, 8);
    const id = CUSTOM_PREFIX + encodeURIComponent(display);
    const k = {};
    for (const L of ["de", "en", "it", "id", "fr", "es", "pt"]) {
      k[L] = kw.slice();
    }
    return {
      id,
      custom: true,
      t: { de: display, en: display, it: display, id: display, fr: display, es: display, pt: display },
      k,
    };
  }

  function isCustomBookId(id) {
    return typeof id === "string" && id.startsWith(CUSTOM_PREFIX);
  }

  function getBook(id) {
    if (!id) return undefined;
    if (isCustomBookId(id)) {
      try {
        const raw = decodeURIComponent(id.slice(CUSTOM_PREFIX.length));
        return makeCustomBook(raw);
      } catch {
        return undefined;
      }
    }
    return BOOKS.find((b) => b.id === id);
  }

  function normalizeHint(text) {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Ordnet geschriebenen Titel einem Eintrag in BOOKS zu — oder einem freien Custom-Eintrag,
   * wenn nichts sicher passt (dann sind alle Bücher möglich).
   */
  function findBookIdFromWrittenTitle(raw) {
    const trimmed = raw.trim();
    const input = normalizeHint(trimmed);
    if (input.length < 2) return null;
    const scored = [];
    for (const b of BOOKS) {
      let best = 0;
      for (const tit of Object.values(b.t || {})) {
        if (typeof tit !== "string" || !tit) continue;
        const t = normalizeHint(tit);
        if (!t) continue;
        if (input === t) {
          best = 100000;
          break;
        }
        let s = 0;
        if (t.includes(input) || input.includes(t)) s += 120;
        for (const w of t.split(/\s+/).filter((x) => x.length > 1)) {
          if (w.length > 2 && input.includes(w)) s += 14;
          else if (input.includes(w)) s += 7;
        }
        for (const w of input.split(/\s+/).filter((x) => x.length > 1)) {
          if (w.length > 2 && t.includes(w)) s += 12;
        }
        if (s > best) best = s;
      }
      scored.push({ id: b.id, score: best });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    const second = scored[1];
    const ambiguous = Boolean(second && top.score < 90 && second.score >= top.score - 5);
    if (top && top.score >= 100000) return top.id;
    if (!top || top.score < 18 || ambiguous) return CUSTOM_PREFIX + encodeURIComponent(trimmed);
    return top.id;
  }

  function scoreHintForBook(hintNorm, book) {
    const words = new Set(hintNorm.split(/\s+/).filter((w) => w.length > 2));
    const kws = book.k[lang] || book.k.en || book.k.de;
    let hits = 0;
    for (const kw of kws) {
      const k = kw.toLowerCase();
      if (hintNorm.includes(k) || words.has(k)) hits += 2;
      else {
        for (const w of words) {
          if (w.length > 3 && (w.includes(k) || k.includes(w))) {
            hits += 1;
            break;
          }
        }
      }
    }
    return hits;
  }

  function randomBookFromLibrary() {
    return BOOKS[Math.floor(Math.random() * BOOKS.length)];
  }

  /**
   * Roboter: optionaler Hinweistext; wenn der leer/kurz ist, gelten die Wörter aus dem Buchtitel als Hinweis.
   * Gar kein brauchbarer Text → zufälliges Buch aus der Liste.
   */
  function robotGuessFromHint(hintText, chosenBook) {
    const userHintShort = normalizeHint(hintText).trim().length < 3;
    const hintNorm = effectiveHintFromBook(hintText, chosenBook);
    if (hintNorm.trim().length < 2) {
      return { book: randomBookFromLibrary(), score: 0, weak: true };
    }
    let best = BOOKS[0];
    let bestScore = -1;
    const seen = new Set();
    const candidates = [];
    for (const b of BOOKS) {
      if (!seen.has(b.id)) {
        seen.add(b.id);
        candidates.push(b);
      }
    }
    if (chosenBook && !seen.has(chosenBook.id)) {
      candidates.push(chosenBook);
    }
    for (const b of candidates) {
      const s = scoreHintForBook(hintNorm, b);
      if (s > bestScore) {
        bestScore = s;
        best = b;
      }
    }
    if (bestScore < 1) {
      return { book: randomBookFromLibrary(), score: 0, weak: userHintShort };
    }
    return { book: best, score: bestScore, weak: userHintShort };
  }

  function countInk(canvas) {
    const c = canvas.getContext("2d");
    const d = c.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const v = d[i] + d[i + 1] + d[i + 2];
      if (v < 760) n++;
    }
    return n;
  }

  function judgeTwoPlayers(hint1, hint2, id1, id2, canvas1, canvas2) {
    const b1 = getBook(id1);
    const b2 = getBook(id2);
    const h1 = effectiveHintFromBook(hint1, b1);
    const h2 = effectiveHintFromBook(hint2, b2);
    const s1Text = b1 ? scoreHintForBook(h1, b1) * 18 : 0;
    const s2Text = b2 ? scoreHintForBook(h2, b2) * 18 : 0;
    const ink1 = Math.min(countInk(canvas1) / 380, 48);
    const ink2 = Math.min(countInk(canvas2) / 380, 48);
    const spice = () => Math.random() * 14;
    const total1 = s1Text + ink1 + spice();
    const total2 = s2Text + ink2 + spice();
    return {
      p1: Math.round(total1 * 10) / 10,
      p2: Math.round(total2 * 10) / 10,
      detail: { s1Text, s2Text, ink1: Math.round(ink1), ink2: Math.round(ink2) },
    };
  }

  function bindDrawingToolbar(canvas, toolbar) {
    if (!toolbar) return;
    const ctx = canvas.getContext("2d");
    const widthRange = toolbar.querySelector(".width-range");
    const widthVal = toolbar.querySelector(".width-val");
    const colorPicker = toolbar.querySelector(".color-picker");
    const penBtn = toolbar.querySelector(".btn-pen");
    const eraseBtn = toolbar.querySelector(".btn-erase");
    let mode = "draw";
    let isDrawing = false;

    function syncWidthDisplay() {
      if (widthVal && widthRange) widthVal.textContent = widthRange.value;
    }
    if (widthRange) widthRange.addEventListener("input", syncWidthDisplay);
    syncWidthDisplay();

    function setMode(m) {
      mode = m;
      if (penBtn) penBtn.classList.toggle("active", m === "draw");
      if (eraseBtn) eraseBtn.classList.toggle("active", m === "erase");
    }

    toolbar.querySelectorAll(".color-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        if (colorPicker) colorPicker.value = dot.dataset.color;
        toolbar.querySelectorAll(".color-dot").forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
        setMode("draw");
      });
    });

    if (penBtn) penBtn.addEventListener("click", () => setMode("draw"));
    if (eraseBtn) eraseBtn.addEventListener("click", () => setMode("erase"));
    if (colorPicker) {
      colorPicker.addEventListener("input", () => setMode("draw"));
    }

    function applyStrokeStyle() {
      const w = widthRange ? parseFloat(widthRange.value, 10) : 5;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalCompositeOperation = "source-over";
      if (mode === "erase") {
        ctx.strokeStyle = "#fffef8";
      } else {
        ctx.strokeStyle = colorPicker ? colorPicker.value : "#2c2416";
      }
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const sx = canvas.width / r.width;
      const sy = canvas.height / r.height;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }

    function startDraw(e) {
      if (e.button != null && e.button > 0) return;
      isDrawing = true;
      applyStrokeStyle();
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function moveDraw(e) {
      if (!isDrawing) return;
      const p = pos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }

    function endDraw() {
      isDrawing = false;
    }

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      startDraw(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!isDrawing) return;
      moveDraw(e);
    });
    canvas.addEventListener("pointerup", endDraw);
    canvas.addEventListener("pointercancel", endDraw);
  }

  function setupCanvas(canvas, toolbar) {
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext("2d");
    c.fillStyle = "#fffef8";
    c.fillRect(0, 0, W, H);
    c.lineCap = "round";
    c.lineJoin = "round";
    if (canvasReady.has(canvas)) {
      return c;
    }
    canvasReady.add(canvas);
    bindDrawingToolbar(canvas, toolbar);
    return c;
  }

  function showStep(id) {
    ["step-setup", "step-solo", "step-p1", "step-p2", "step-result-solo", "step-result-duo"].forEach((sid) => {
      const n = el(sid);
      if (n) n.classList.toggle("hidden", sid !== id);
    });
  }

  function applyUiLabels() {
    const setLabel = (id, key) => {
      const n = el(id);
      if (n) n.textContent = tr(key);
    };
    setLabel("label-hint-solo", "hintOptionalLabel");
    setLabel("label-hint-p1", "hintOptionalLabel");
    setLabel("label-hint-p2", "hintOptionalLabel");
    setLabel("label-written-solo", "labelWrittenSolo");
    setLabel("label-written-p1", "labelWrittenP1");
    setLabel("label-written-p2", "labelWrittenP2");
    document.querySelectorAll(".draw-toolbar").forEach((tb) => {
      const pen = tb.querySelector(".btn-pen");
      const er = tb.querySelector(".btn-erase");
      const lw = tb.querySelector(".lbl-width");
      if (pen) pen.textContent = tr("uiPen");
      if (er) er.textContent = tr("uiEraser");
      if (lw) lw.textContent = tr("uiWidth");
    });
  }

  function init() {
    const ld = lang.toUpperCase();
    const badge = el("lang-display");
    if (badge) badge.textContent = ld;
    document.querySelectorAll(".lang-display-sync").forEach((n) => {
      n.textContent = ld;
    });
    applyUiLabels();
  }

  el("btn-go-setup").addEventListener("click", () => {
    lang = el("select-lang").value;
    mode = el("select-mode").value;
    init();
    if (mode === "solo") {
      showStep("step-solo");
      setupCanvas(el("draw-canvas-solo"), el("toolbar-solo"));
    } else {
      showStep("step-p1");
      setupCanvas(el("draw-canvas-p1"), el("toolbar-p1"));
    }
  });

  el("btn-clear-solo").addEventListener("click", () => {
    const cnv = el("draw-canvas-solo");
    const c = cnv.getContext("2d");
    c.fillStyle = "#fffef8";
    c.fillRect(0, 0, W, H);
  });

  el("btn-clear-p1").addEventListener("click", () => {
    const cnv = el("draw-canvas-p1");
    const c = cnv.getContext("2d");
    c.fillStyle = "#fffef8";
    c.fillRect(0, 0, W, H);
  });

  el("btn-clear-p2").addEventListener("click", () => {
    const cnv = el("draw-canvas-p2");
    const c = cnv.getContext("2d");
    c.fillStyle = "#fffef8";
    c.fillRect(0, 0, W, H);
  });

  el("btn-solo-guess").addEventListener("click", () => {
    const written = el("book-written-solo").value.trim();
    if (!written) {
      alert(tr("alertWriteBook"));
      return;
    }
    const matchedId = findBookIdFromWrittenTitle(written);
    if (!matchedId) {
      alert(tr("alertWriteBook"));
      return;
    }
    selectedBookId = matchedId;
    const hint = el("hint-solo").value;
    const chosen = getBook(selectedBookId);
    const guess = robotGuessFromHint(hint, chosen);
    const win = guess.book.id === selectedBookId;
    const titleGuess = bookTitle(guess.book);
    el("result-solo-title").textContent = tr("soloRobotTitle", { title: titleGuess });
    el("result-solo-detail").textContent =
      tr("soloSecret", { title: bookTitle(chosen) }) + (guess.weak ? " " + tr("soloWeak") : "");
    const box = el("result-solo-box");
    box.className = "result-box " + (win ? "win" : "lose");
    el("result-solo-msg").textContent = win ? tr("soloWin") : tr("soloLose");
    showStep("step-result-solo");
  });

  let p1Data = { hint: "", bookId: "" };

  el("btn-p1-next").addEventListener("click", () => {
    const w1 = el("book-written-p1").value.trim();
    if (!w1) {
      alert(tr("alertWriteBook"));
      return;
    }
    const id1 = findBookIdFromWrittenTitle(w1);
    if (!id1) {
      alert(tr("alertWriteBook"));
      return;
    }
    p1Data.bookId = id1;
    p1Data.hint = el("hint-p1").value;
    showStep("step-p2");
    setupCanvas(el("draw-canvas-p2"), el("toolbar-p2"));
  });

  el("btn-duo-judge").addEventListener("click", () => {
    const w2 = el("book-written-p2").value.trim();
    if (!w2) {
      alert(tr("alertWriteBook"));
      return;
    }
    const id2 = findBookIdFromWrittenTitle(w2);
    if (!id2) {
      alert(tr("alertWriteBook"));
      return;
    }
    const hint2 = el("hint-p2").value;
    judgeTwoPlayers(p1Data.hint, hint2, p1Data.bookId, id2, el("draw-canvas-p1"), el("draw-canvas-p2"));

    el("result-duo-img-p1").src = el("draw-canvas-p1").toDataURL("image/png");
    el("result-duo-img-p2").src = el("draw-canvas-p2").toDataURL("image/png");

    showStep("step-result-duo");
  });

  el("btn-restart").addEventListener("click", () => {
    showStep("step-setup");
    el("book-written-solo").value = "";
    el("book-written-p1").value = "";
    el("book-written-p2").value = "";
    el("hint-solo").value = "";
    el("hint-p1").value = "";
    el("hint-p2").value = "";
    p1Data = { hint: "", bookId: "" };
  });

  el("btn-restart-duo").addEventListener("click", () => {
    el("btn-restart").click();
  });

  init();
  showStep("step-setup");
})();
