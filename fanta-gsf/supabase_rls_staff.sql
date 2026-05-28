-- =============================================================================
-- FANTA GSF — SICUREZZA & AREA STAFF
-- Script SQL per Supabase: RLS, colonne di validazione, RPC protette.
--
-- ARCHITETTURA DI SICUREZZA SCELTA: RPC con PIN + SECURITY DEFINER
-- ─────────────────────────────────────────────────────────────────
-- Perché non Supabase Auth? Per un'app evento one-shot, un sistema di login
-- completo è overkill. Usiamo invece una funzione Postgres con SECURITY DEFINER
-- che bypassa la RLS solo se il chiamante fornisce un PIN segreto.
-- Il PIN è memorizzato in una tabella blindata (staff_config) che la anon key
-- NON può leggere — solo le funzioni SECURITY DEFINER ci accedono.
--
-- MODELLO DI TRUST:
--   anon key → può INSERT + SELECT su scommesse_del_capitano
--   anon key → NON può UPDATE, DELETE, né leggere staff_config
--   RPC con PIN → può UPDATE (solo via funzione server-side)
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) NUOVE COLONNE sulla tabella scommesse_del_capitano
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE scommesse_del_capitano
  ADD COLUMN IF NOT EXISTS indovinata    BOOLEAN       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS validata_il   TIMESTAMPTZ   DEFAULT NULL;

COMMENT ON COLUMN scommesse_del_capitano.indovinata IS
  'NULL = non ancora valutata, TRUE = indovinata, FALSE = fallita';
COMMENT ON COLUMN scommesse_del_capitano.validata_il IS
  'Timestamp di quando la regia ha validato questa scommessa';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) TABELLA staff_config — memorizza il PIN della regia
--    RLS abilitata SENZA policy = invisibile da API (anon key bloccata).
--    Solo le funzioni SECURITY DEFINER possono leggerla.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_config (
  chiave   TEXT PRIMARY KEY,
  valore   TEXT NOT NULL
);

-- ⚠️ CAMBIA QUESTO PIN prima di andare in produzione!
INSERT INTO staff_config (chiave, valore)
VALUES ('pin_regia', 'GSF2026!')
ON CONFLICT (chiave) DO NOTHING;

-- Blindiamo la tabella: nessuno può leggerla via API
ALTER TABLE staff_config ENABLE ROW LEVEL SECURITY;
-- Nessuna policy = accesso zero per tutti i ruoli API (anon, authenticated)


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) ROW LEVEL SECURITY su scommesse_del_capitano
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE scommesse_del_capitano ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque (anon) può INSERIRE nuove scommesse (i capitani)
CREATE POLICY "anon_insert_scommesse"
  ON scommesse_del_capitano
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: chiunque (anon) può LEGGERE tutte le scommesse (per anteprima e dashboard)
CREATE POLICY "anon_select_scommesse"
  ON scommesse_del_capitano
  FOR SELECT
  TO anon
  USING (true);

-- NESSUNA policy per UPDATE o DELETE = BLOCCATI per anon.
-- L'unico modo per aggiornare una scommessa è via RPC con PIN.


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RPC: verifica_pin_staff — controlla se il PIN è corretto (login staff)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION verifica_pin_staff(p_pin TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER          -- Bypassa RLS per leggere staff_config
SET search_path = public  -- Best practice di sicurezza
AS $$
DECLARE
  pin_corretto TEXT;
BEGIN
  SELECT valore INTO pin_corretto
  FROM staff_config
  WHERE chiave = 'pin_regia';

  IF p_pin IS DISTINCT FROM pin_corretto THEN
    RETURN json_build_object('success', false, 'error', 'PIN non valido');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RPC: valida_scommessa — la regia segna una scommessa come ✅ o ❌
--    Richiede il PIN ad ogni chiamata (zero-trust, nessun token salvato)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION valida_scommessa(
  p_scommessa_id  BIGINT,
  p_indovinata     BOOLEAN,   -- true = indovinata, false = fallita
  p_pin            TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pin_corretto TEXT;
BEGIN
  -- 1. Verifica PIN
  SELECT valore INTO pin_corretto
  FROM staff_config
  WHERE chiave = 'pin_regia';

  IF p_pin IS DISTINCT FROM pin_corretto THEN
    RETURN json_build_object('success', false, 'error', 'PIN non valido');
  END IF;

  -- 2. Aggiorna la scommessa (bypassa RLS grazie a SECURITY DEFINER)
  UPDATE scommesse_del_capitano
  SET indovinata  = p_indovinata,
      validata_il = now()
  WHERE id = p_scommessa_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Scommessa non trovata');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) RPC: reset_scommessa — rimette una scommessa a "in attesa" (undo)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION reset_scommessa(
  p_scommessa_id  BIGINT,
  p_pin            TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pin_corretto TEXT;
BEGIN
  SELECT valore INTO pin_corretto
  FROM staff_config
  WHERE chiave = 'pin_regia';

  IF p_pin IS DISTINCT FROM pin_corretto THEN
    RETURN json_build_object('success', false, 'error', 'PIN non valido');
  END IF;

  UPDATE scommesse_del_capitano
  SET indovinata  = NULL,
      validata_il = NULL
  WHERE id = p_scommessa_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Scommessa non trovata');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
