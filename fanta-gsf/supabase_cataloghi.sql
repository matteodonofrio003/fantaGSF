-- =============================================================================
-- FANTA GSF — Script SQL per Supabase
-- Crea le tabelle di catalogo per serate/giochi e bonus/malus predefiniti.
-- Eseguire questo script nell'SQL Editor di Supabase.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) CATALOGO SERATE E GIOCHI
--    Ogni riga = un gioco assegnato a una serata specifica.
--    La colonna `ordine` determina l'ordine di visualizzazione nella UI.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalogo_serate_giochi (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  num_serata  INTEGER     NOT NULL,                         -- Numero progressivo (1, 2, 3...)
  nome_serata TEXT        NOT NULL,                         -- Es: "Serata 1 — Opening Night"
  emoji       TEXT        DEFAULT '🎮',                     -- Emoji decorativa per la UI
  nome_gioco  TEXT        NOT NULL,                         -- Nome del gioco
  ordine      INTEGER     NOT NULL DEFAULT 0,               -- Ordine di visualizzazione nella serata
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indice per ordinare rapidamente per serata + ordine
CREATE INDEX IF NOT EXISTS idx_catalogo_serate_ordine
  ON catalogo_serate_giochi (num_serata, ordine);

-- Dati di esempio
INSERT INTO catalogo_serate_giochi (num_serata, nome_serata, emoji, nome_gioco, ordine) VALUES
  -- Serata 1
  (1, 'Serata 1 — Opening Night', '🎬', 'Sorteggio tema',   1),
  (1, 'Serata 1 — Opening Night', '🎬', 'Tiro al segno',    2),
  (1, 'Serata 1 — Opening Night', '🎬', 'Tiro alla fune',   3),
  (1, 'Serata 1 — Opening Night', '🎬', 'I tre mattoni',    4),
  (1, 'Serata 1 — Opening Night', '🎬', 'Swap',             5),
  -- Serata 2
  (2, 'Serata 2 — La Sfida',      '🎯', 'Torta in faccia',       1),
  (2, 'Serata 2 — La Sfida',      '🎯', 'Palloncino express',    2),
  (2, 'Serata 2 — La Sfida',      '🎯', 'La befana',             3),
  -- Serata 3
  (3, 'Serata 3 — Acqua & Fuoco', '💦', 'Gemelli siamesi',  1),
  (3, 'Serata 3 — Acqua & Fuoco', '💦', 'La posa',          2),
  (3, 'Serata 3 — Acqua & Fuoco', '💦', 'Gavettoni',        3),
  (3, 'Serata 3 — Acqua & Fuoco', '💦', 'La spugna',        4),
  -- Serata 4
  (4, 'Serata 4 — Brain Games',   '🧠', 'Frase annacquata',      1),
  (4, 'Serata 4 — Brain Games',   '🧠', 'Indovina il motivo',    2),
  (4, 'Serata 4 — Brain Games',   '🧠', 'Mangia anguria',        3),
  -- Serata 5
  (5, 'Serata 5 — Gran Finale',   '🏆', 'Caccia al tesoro',      1),
  (5, 'Serata 5 — Gran Finale',   '🏆', 'Fatti capire',          2),
  (5, 'Serata 5 — Gran Finale',   '🏆', 'La rapina',             3),
  (5, 'Serata 5 — Gran Finale',   '🏆', 'Sfilata/Scenografia',   4);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) CATALOGO BONUS / MALUS PREDEFINITI
--    Ogni riga = un'azione che la regia mette a disposizione dei capitani.
--    Il campo `punti` è positivo per i bonus e negativo per i malus.
--    Il campo `tipo` è una label human-readable ('bonus' o 'malus').
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS catalogo_bonus_malus (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  descrizione     TEXT        NOT NULL,                     -- Testo dell'azione (es: "Si tuffa vestito")
  tipo            TEXT        NOT NULL DEFAULT 'bonus'      -- 'bonus' o 'malus'
                  CHECK (tipo IN ('bonus', 'malus')),
  punti           INTEGER     NOT NULL,                     -- Positivo = bonus, negativo = malus
  attivo          BOOLEAN     NOT NULL DEFAULT true,        -- Per disattivare senza cancellare
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dati di esempio
INSERT INTO catalogo_bonus_malus (descrizione, tipo, punti) VALUES
  ('Si tuffa in piscina vestito',                   'bonus',   15),
  ('Sbaglia a fischiare l''inizio del gioco',       'malus',  -10),
  ('Balla durante una pausa',                       'bonus',    5),
  ('Si presenta con un costume assurdo',            'bonus',   10),
  ('Dimentica le regole e si confonde',             'malus',   -5),
  ('Urla il nome della propria squadra del cuore',  'bonus',    8);
