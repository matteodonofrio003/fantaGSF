import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Trophy,
  Crown,
  Loader2,
  ArrowLeft,
  Frown,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Unlock,
} from 'lucide-react';
import LogoGSF from './LogoGSF';

// Stili dei tre gradini del podio (oro / argento / bronzo)
const podio = {
  1: {
    medaglia: '🥇',
    card: 'from-yellow-400 via-amber-400 to-yellow-500 shadow-amber-200',
    badge: 'bg-yellow-900/20 text-yellow-900',
    testo: 'text-yellow-900',
  },
  2: {
    medaglia: '🥈',
    card: 'from-slate-300 via-gray-300 to-slate-400 shadow-slate-200',
    badge: 'bg-slate-700/15 text-slate-700',
    testo: 'text-slate-700',
  },
  3: {
    medaglia: '🥉',
    card: 'from-orange-300 via-amber-500 to-orange-500 shadow-orange-200',
    badge: 'bg-orange-900/20 text-orange-900',
    testo: 'text-orange-900',
  },
};

const fmtPunti = (n) => `${n > 0 ? '+' : ''}${n}`;

const CardPodio = ({ squadra, posizione, grande }) => {
  const stile = podio[posizione];
  return (
    <div
      className={`relative bg-gradient-to-br ${stile.card} rounded-3xl shadow-xl overflow-hidden ${grande ? 'p-6 sm:p-7' : 'p-5'}`}
    >
      {posizione === 1 && (
        <Crown
          className="absolute top-4 right-4 text-yellow-900/40"
          size={grande ? 40 : 32}
        />
      )}
      <div className={`flex items-center gap-3 ${grande ? 'mb-3' : 'mb-2'}`}>
        <span className={grande ? 'text-5xl' : 'text-4xl'}>
          {stile.medaglia}
        </span>
        <span
          className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${stile.badge}`}
        >
          {posizione}° posto
        </span>
      </div>

      <div className="flex items-center gap-3">
        {squadra.colore && (
          <div
            className="w-7 h-7 rounded-full shrink-0 border-2 border-white/70 shadow"
            style={{ backgroundColor: squadra.colore }}
          />
        )}
        <h3
          className={`font-black leading-tight break-words ${stile.testo} ${grande ? 'text-2xl sm:text-3xl' : 'text-xl'}`}
        >
          {squadra.nome}
        </h3>
      </div>
      {squadra.capitano && (
        <p className={`text-sm font-bold mt-1 ${stile.testo} opacity-70`}>
          Cap. {squadra.capitano}
        </p>
      )}

      <div className="flex items-end justify-between mt-4">
        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-widest ${stile.testo} opacity-60`}
          >
            Punti
          </p>
          <p
            className={`font-black leading-none ${stile.testo} ${grande ? 'text-5xl' : 'text-4xl'}`}
          >
            {fmtPunti(squadra.punti_totali)}
          </p>
        </div>
        <p className={`text-xs font-bold ${stile.testo} opacity-70`}>
          {squadra.scommesse_indovinate}✅ / {squadra.scommesse_giocate} giocate
        </p>
      </div>
    </div>
  );
};

const Classifica = () => {
  const [righe, setRighe] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [errore, setErrore] = useState(null);

  // ── Staff PIN unlock ──
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [mostraPin, setMostraPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  const fetchClassifica = useCallback(async (pinValue = null) => {
    setIsLoading(true);
    setErrore(null);
    setIsLocked(false);
    try {
      const { data, error } = await supabase.rpc('get_classifica_sicura', {
        p_pin: pinValue || null,
      });

      if (error) {
        if (
          error.message?.includes('CLASSIFICA_BLOCCATA') ||
          error.code === 'P0001'
        ) {
          setIsLocked(true);
          return;
        }
        throw error;
      }

      setRighe(data || []);
    } catch (err) {
      console.error('Errore nel fetch della classifica:', err);
      setErrore('Impossibile caricare la classifica. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClassifica();
  }, [fetchClassifica]);

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setPinLoading(true);
    setPinError('');

    try {
      const { data, error } = await supabase.rpc('get_classifica_sicura', {
        p_pin: pin,
      });

      if (error) {
        if (
          error.message?.includes('CLASSIFICA_BLOCCATA') ||
          error.code === 'P0001'
        ) {
          setPinError('PIN non valido.');
          return;
        }
        throw error;
      }

      setIsLocked(false);
      setRighe(data || []);
      setPin('');
    } catch (err) {
      console.error('Errore verifica PIN:', err);
      setPinError('Errore di connessione. Riprova.');
    } finally {
      setPinLoading(false);
    }
  };

  // Posizione 1-based
  const top3 = righe.slice(0, 3);
  const resto = righe.slice(3);

  // ─────────────────────────── STATO: CARICAMENTO ───────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-yellow-200">
        <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
            <LogoGSF />
            <div className="flex flex-col border-l-2 border-gray-200 pl-4">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 leading-none flex items-center gap-2">
                <Trophy className="text-yellow-500" size={26} /> CLASSIFICA
              </h1>
              <h2 className="text-base sm:text-xl font-bold text-slate-500 leading-none">
                GSF SUMMER
              </h2>
            </div>
            <a
              href="#/"
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-sm transition-all"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Home</span>
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-3 text-blue-500" size={44} />
            <p className="font-bold">Caricamento classifica...</p>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────── STATO: BLOCKED ───────────────────────────
  if (isLocked) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 font-sans text-white selection:bg-amber-200">
        {/* Blob luminosi di sfondo */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-0">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-3xl bg-indigo-600/10 animate-pulse" />
          <div className="absolute top-1/2 -right-20 w-96 h-96 rounded-full blur-3xl bg-purple-600/10 animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute -bottom-20 left-1/3 w-80 h-80 rounded-full blur-3xl bg-amber-500/10 animate-pulse" style={{ animationDelay: '3s' }} />
        </div>

        {/* HEADER compatto */}
        <header className="relative z-10 bg-slate-900/60 backdrop-blur-md border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
            <LogoGSF />
            <div className="flex flex-col border-l-2 border-white/10 pl-4">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-200 leading-none flex items-center gap-2">
                <Trophy className="text-amber-400/60" size={26} /> CLASSIFICA
              </h1>
              <h2 className="text-base sm:text-xl font-bold text-slate-500 leading-none">
                GSF SUMMER
              </h2>
            </div>
            <a
              href="#/"
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 font-bold text-sm transition-all"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Home</span>
            </a>
          </div>
        </header>

        <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center text-center min-h-[70vh]">
            {/* Lucchetto gigante con aura */}
            <div className="relative mb-10">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-amber-500/10 animate-pulse" />
              <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-900/40">
                <Lock className="text-amber-400" size={64} />
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-4">
              <span
                className="bg-gradient-to-r from-slate-300 via-slate-100 to-slate-400 text-transparent bg-clip-text"
              >
                Classifica Sigillata
              </span>
            </h2>

            <p className="text-slate-400 font-medium max-w-md leading-relaxed">
              La classifica è segreta. Verrà svelata solo durante la{' '}
              <span className="text-amber-300 font-black">Serata 5 — Gran Finale</span>
              , quando tutte le scommesse saranno state giocate.
            </p>

            {/* Finto terminale decorativo */}
            <div className="mt-8 inline-block text-left bg-black/30 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm shadow-xl backdrop-blur-sm">
              <p className="text-emerald-400">
                &gt; status:{' '}
                <span className="text-rose-400">LOCKED</span>
              </p>
              <p className="text-slate-500">
                &gt; awaiting Gran Finale...
                <span className="inline-block w-2 h-4 ml-1 bg-amber-400 animate-pulse align-middle" />
              </p>
            </div>

            {/* ── SEZIONE SBLOCCO STAFF (nascosta) ── */}
            <div className="mt-12 w-full max-w-sm">
              {!showPinInput ? (
                <button
                  onClick={() => setShowPinInput(true)}
                  className="group flex items-center gap-1.5 mx-auto text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-amber-400 transition-colors"
                  title="Accesso Regia"
                >
                  <Eye size={13} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                    Accesso Regia
                  </span>
                </button>
              ) : (
                <form
                  onSubmit={handlePinSubmit}
                  className="animate-in fade-in slide-in-from-bottom-2 bg-slate-800/80 border border-slate-700 rounded-2xl p-5 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={16} className="text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                      Sblocco Regia
                    </span>
                  </div>

                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    PIN Staff
                  </label>
                  <div className="relative">
                    <input
                      type={mostraPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value);
                        setPinError('');
                      }}
                      placeholder="Inserisci il PIN"
                      className="w-full p-3 pr-12 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold text-lg tracking-widest focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setMostraPin(!mostraPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {mostraPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {pinError && (
                    <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold text-center">
                      {pinError}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinInput(false);
                        setPin('');
                        setPinError('');
                      }}
                      className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold rounded-xl text-sm transition-colors"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={!pin.trim() || pinLoading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-900 font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {pinLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Unlock size={16} />
                      )}
                      Sblocca
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────── STATO: ERRORE ───────────────────────────
  if (errore) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-yellow-200">
        <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
            <LogoGSF />
            <div className="flex flex-col border-l-2 border-gray-200 pl-4">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 leading-none flex items-center gap-2">
                <Trophy className="text-yellow-500" size={26} /> CLASSIFICA
              </h1>
              <h2 className="text-base sm:text-xl font-bold text-slate-500 leading-none">
                GSF SUMMER
              </h2>
            </div>
            <a
              href="#/"
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-sm transition-all"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Home</span>
            </a>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-24">
            <Frown className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="font-bold text-gray-500">{errore}</p>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────── STATO: CLASSIFICA VISIBILE ───────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-yellow-200">
      <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
          <LogoGSF />
          <div className="flex flex-col border-l-2 border-gray-200 pl-4">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 leading-none flex items-center gap-2">
              <Trophy className="text-yellow-500" size={26} /> CLASSIFICA
            </h1>
            <h2 className="text-base sm:text-xl font-bold text-slate-500 leading-none">
              GSF SUMMER
            </h2>
          </div>
          <a
            href="#/"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-sm transition-all"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Home</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {righe.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="font-bold text-gray-500">
              Ancora nessuna squadra in classifica.
            </p>
            <p className="text-sm text-gray-400 mt-1">
              I punti compariranno appena le scommesse verranno validate.
            </p>
          </div>
        ) : (
          <>
            {/* PODIO — Top 3 */}
            <section className="mb-8">
              {top3[0] && (
                <div className="mb-4">
                  <CardPodio squadra={top3[0]} posizione={1} grande />
                </div>
              )}
              {(top3[1] || top3[2]) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {top3[1] && <CardPodio squadra={top3[1]} posizione={2} />}
                  {top3[2] && <CardPodio squadra={top3[2]} posizione={3} />}
                </div>
              )}
            </section>

            {/* RESTO DELLA CLASSIFICA — dal 4° in giù */}
            {resto.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  Resto della classifica
                </h3>
                <ul className="divide-y divide-gray-100">
                  {resto.map((sq, idx) => {
                    const posizione = idx + 4;
                    return (
                      <li
                        key={sq.id_squadra}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        <span className="w-8 text-center font-black text-gray-400 text-lg shrink-0">
                          {posizione}
                        </span>
                        {sq.colore && (
                          <div
                            className="w-6 h-6 rounded-full shrink-0 border-2 border-white shadow"
                            style={{ backgroundColor: sq.colore }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 truncate">
                            {sq.nome}
                          </p>
                          {sq.capitano && (
                            <p className="text-xs text-gray-400 truncate">
                              Cap. {sq.capitano}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`font-black text-lg ${sq.punti_totali > 0 ? 'text-blue-600' : 'text-gray-400'}`}
                          >
                            {fmtPunti(sq.punti_totali)}{' '}
                            <span className="text-xs font-bold">pt</span>
                          </span>
                          <p className="text-[10px] font-bold text-gray-400">
                            {sq.scommesse_indovinate}✅ /{' '}
                            {sq.scommesse_giocate}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Torna alla Home */}
            <div className="text-center mt-10">
              <a
                href="#/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <ArrowLeft size={18} /> Torna alla Home
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Classifica;
