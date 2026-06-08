import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  Lock,
  Eye,
  Trophy,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Users,
  CalendarDays,
  Crown,
  Flame,
} from 'lucide-react';

/**
 * @typedef {Object} ScommessaSvelata
 * @property {number}      id_scommessa
 * @property {number}      squadra_id
 * @property {string}      nome_squadra
 * @property {string|null} colore
 * @property {number}      num_serata
 * @property {string}      giudice_id
 * @property {string}      nome_giudice
 * @property {string}      azione_scelta
 * @property {number}      punti          // bonus (+) / malus (-)
 * @property {boolean|null} indovinata    // null = in attesa, true = indovinata, false = fallita
 */

const fmtPunti = (n) => `${n > 0 ? '+' : ''}${n}`;

// Badge esito (indovinata / fallita / in attesa) con icona e colori "drammatici"
const EsitoBadge = ({ indovinata }) => {
  if (indovinata === true) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
        <CheckCircle2 size={13} /> Indovinata
      </span>
    );
  }
  if (indovinata === false) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/40">
        <XCircle size={13} /> Fallita
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-500/20 text-slate-300 border border-slate-400/30">
      <Clock size={13} /> In attesa
    </span>
  );
};

// Singola carta scommessa: rilievo, bordo marcato, hover che la "solleva"
const ScommessaCard = ({ s, mostraSquadra }) => {
  const isWin = s.indovinata === true;
  const isLose = s.indovinata === false;

  // Bordo/aura che cambia col destino della scommessa
  const aura = isWin
    ? 'border-emerald-400/40 hover:border-emerald-300/70 hover:shadow-emerald-500/20'
    : isLose
      ? 'border-rose-400/40 hover:border-rose-300/70 hover:shadow-rose-500/20'
      : 'border-white/10 hover:border-amber-300/50 hover:shadow-amber-500/10';

  return (
    <div
      className={`group relative rounded-2xl border-2 ${aura} bg-gradient-to-br from-white/10 to-white/[0.03] backdrop-blur-sm p-4 shadow-lg transition-all duration-300 hover:-translate-y-1`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
            Serata {s.num_serata}
          </span>
          {mostraSquadra && (
            <span className="flex items-center gap-1.5 min-w-0">
              {s.colore && (
                <span
                  className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                  style={{ backgroundColor: s.colore }}
                />
              )}
              <span className="font-black text-white truncate">{s.nome_squadra}</span>
            </span>
          )}
        </div>
        <EsitoBadge indovinata={s.indovinata} />
      </div>

      <p className="text-sm text-slate-300 leading-snug">
        <span className="text-amber-300/80 font-bold">{s.nome_giudice}</span>
        <span className="text-slate-500"> — </span>
        <span className="italic text-slate-100">"{s.azione_scelta}"</span>
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 text-base font-black px-3 py-1 rounded-xl ${
            s.punti >= 0
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          <Flame size={14} className="opacity-70" />
          {fmtPunti(s.punti)} <span className="text-xs font-bold opacity-70">pt</span>
        </span>
        {isWin && (
          <Sparkles className="text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
        )}
      </div>
    </div>
  );
};

const SvelamentoFinale = () => {
  /** @type {[ScommessaSvelata[], Function]} */
  const [scommesse, setScommesse] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erroreRete, setErroreRete] = useState(false);
  const [raggruppamento, setRaggruppamento] = useState('squadra'); // 'squadra' | 'serata'

  const fetchSvelamento = useCallback(async () => {
    setIsLoading(true);
    setErroreRete(false);
    try {
      // La RPC fa da cancello: se la regia non ha sbloccato, torna [] (array vuoto).
      const { data, error } = await supabase.rpc('get_scommesse_svelamento');
      if (error) throw error;
      setScommesse(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Errore svelamento finale:', err);
      setErroreRete(true);
      setScommesse([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSvelamento();
  }, [fetchSvelamento]);

  // Svelamento "attivo" = la regia ha sbloccato e ci sono dati da mostrare.
  const attivo = scommesse.length > 0;

  // Raggruppamento per Squadra: { id, nome, colore, totale, vinte, bets[] }
  const gruppiSquadra = useMemo(() => {
    const mappa = new Map();
    for (const s of scommesse) {
      if (!mappa.has(s.squadra_id)) {
        mappa.set(s.squadra_id, {
          id: s.squadra_id,
          nome: s.nome_squadra,
          colore: s.colore,
          totale: 0,
          vinte: 0,
          bets: [],
        });
      }
      const g = mappa.get(s.squadra_id);
      g.bets.push(s);
      if (s.indovinata === true) {
        g.totale += s.punti;
        g.vinte += 1;
      }
    }
    // Ordina le squadre per punteggio totale (gran finale → leaderboard drammatica)
    return Array.from(mappa.values())
      .map((g) => ({ ...g, bets: g.bets.slice().sort((a, b) => a.num_serata - b.num_serata) }))
      .sort((a, b) => b.totale - a.totale || a.nome.localeCompare(b.nome));
  }, [scommesse]);

  // Raggruppamento per Serata: { serata, bets[] }
  const gruppiSerata = useMemo(() => {
    const mappa = new Map();
    for (const s of scommesse) {
      if (!mappa.has(s.num_serata)) mappa.set(s.num_serata, { serata: s.num_serata, bets: [] });
      mappa.get(s.num_serata).bets.push(s);
    }
    return Array.from(mappa.values())
      .map((g) => ({ ...g, bets: g.bets.slice().sort((a, b) => a.nome_squadra.localeCompare(b.nome_squadra)) }))
      .sort((a, b) => a.serata - b.serata);
  }, [scommesse]);

  // ─────────────────────────── STATO: CARICAMENTO ───────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4 text-amber-400" size={48} />
        <p className="font-black uppercase tracking-[0.3em] text-sm">Caricamento…</p>
      </div>
    );
  }

  // ─────────────────────────── STATO: ATTESA (sigillato) ───────────────────────────
  if (!attivo) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex items-center justify-center px-4">
        {/* Blob luminosi di sfondo */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl bg-indigo-600/20 animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl bg-purple-600/20 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center max-w-lg">
          {/* Lucchetto gigante con aura pulsante */}
          <div className="relative mx-auto mb-10 w-40 h-40 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-amber-500/10 animate-pulse" />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/40 flex items-center justify-center shadow-2xl shadow-amber-900/40">
              <Lock className="text-amber-400" size={56} />
            </div>
          </div>

          {/* Finto terminale */}
          <div className="inline-block text-left bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm shadow-xl backdrop-blur-sm">
            <p className="text-emerald-400">&gt; status: <span className="text-rose-400">SEALED</span></p>
            <p className="text-slate-400">
              &gt; La regia non ha ancora sbloccato i segreti
              <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
            </p>
          </div>

          <h1 className="mt-8 text-3xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Svelamento Finale
          </h1>
          <p className="mt-3 text-slate-400 font-medium">
            Quando la regia darà il via, qui appariranno <span className="text-amber-300 font-bold">tutte</span> le scommesse di
            <span className="text-amber-300 font-bold"> tutte</span> le squadre. Tieniti pronto. 🍿
          </p>

          {erroreRete && (
            <p className="mt-4 text-xs text-rose-400/80 font-bold">
              Connessione instabile — riprova tra poco.
            </p>
          )}

          <div className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={fetchSvelamento}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-900/40 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <RefreshCw size={16} /> Ricontrolla
            </button>
            <a
              href="#/"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-sm transition-all border border-white/10"
            >
              <ArrowLeft size={16} /> Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────── STATO: ATTIVO (gran finale) ───────────────────────────
  const totaleScommesse = scommesse.length;
  const totaleIndovinate = scommesse.filter((s) => s.indovinata === true).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-purple-950 text-white">
      {/* Sfondo: blob jewel-tone */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl bg-fuchsia-600/20" />
        <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full blur-3xl bg-amber-500/15" />
        <div className="absolute bottom-0 left-1/3 w-[28rem] h-[28rem] rounded-full blur-3xl bg-indigo-600/20" />
      </div>

      {/* HEADER EPICO */}
      <header className="relative z-10 sticky top-0 backdrop-blur-md bg-slate-950/60 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-900/50 shrink-0">
            <Eye className="text-white" size={26} />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight truncate"
              style={{
                backgroundImage: 'linear-gradient(to right, #fbbf24, #f472b6, #a855f7)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              SVELAMENTO FINALE
            </h1>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-slate-400 mt-1">
              GSF Summer — Gran Finale
            </span>
          </div>
          <a
            href="#/"
            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 font-bold text-sm transition-all"
            title="Torna alla Home"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Home</span>
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Riepilogo + toggle raggruppamento */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scommesse svelate</p>
              <p className="text-2xl font-black text-white leading-none mt-1">{totaleScommesse}</p>
            </div>
            <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Indovinate</p>
              <p className="text-2xl font-black text-emerald-300 leading-none mt-1">{totaleIndovinate}</p>
            </div>
          </div>

          {/* Switch raggruppamento */}
          <div className="sm:ml-auto inline-flex p-1 rounded-2xl bg-white/5 border border-white/10">
            {[
              { key: 'squadra', label: 'Per Squadra', icon: Users },
              { key: 'serata', label: 'Per Serata', icon: CalendarDays },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setRaggruppamento(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all ${
                  raggruppamento === key
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-md'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== RAGGRUPPATO PER SQUADRA ===== */}
        {raggruppamento === 'squadra' && (
          <div className="space-y-6">
            {gruppiSquadra.map((g, idx) => (
              <section
                key={g.id}
                className="rounded-3xl border-2 border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden shadow-xl"
              >
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-white/10 to-transparent border-b border-white/10">
                  {idx === 0 ? (
                    <Crown className="text-amber-400 shrink-0" size={24} />
                  ) : (
                    <span className="w-7 text-center font-black text-slate-400 text-lg shrink-0">{idx + 1}</span>
                  )}
                  {g.colore && (
                    <span
                      className="w-5 h-5 rounded-full shrink-0 border-2 border-white/40 shadow"
                      style={{ backgroundColor: g.colore }}
                    />
                  )}
                  <h2 className="font-black text-lg sm:text-xl text-white truncate">{g.nome}</h2>
                  <div className="ml-auto flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-slate-400">{g.vinte}✅ / {g.bets.length}</span>
                    <span
                      className={`inline-flex items-center gap-1 text-base font-black px-3 py-1.5 rounded-xl ${
                        g.totale >= 0 ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      <Trophy size={15} /> {fmtPunti(g.totale)} pt
                    </span>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.bets.map((s) => (
                    <ScommessaCard key={s.id_scommessa} s={s} mostraSquadra={false} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ===== RAGGRUPPATO PER SERATA ===== */}
        {raggruppamento === 'serata' && (
          <div className="space-y-6">
            {gruppiSerata.map((g) => (
              <section
                key={g.serata}
                className="rounded-3xl border-2 border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden shadow-xl"
              >
                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-indigo-500/20 to-transparent border-b border-white/10">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white shadow-md shrink-0">
                    {g.serata}
                  </div>
                  <h2 className="font-black text-lg sm:text-xl text-white">Serata {g.serata}</h2>
                  <span className="ml-auto text-xs font-bold text-slate-400 shrink-0">
                    {g.bets.length} scommesse
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {g.bets.map((s) => (
                    <ScommessaCard key={s.id_scommessa} s={s} mostraSquadra={true} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pb-4">
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 font-bold transition-all border border-white/10"
          >
            <ArrowLeft size={18} /> Torna alla Home
          </a>
        </div>
      </main>
    </div>
  );
};

export default SvelamentoFinale;
