import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Trophy,
  CheckCircle2,
  Settings,
  LayoutDashboard,
  Lock,
  Sparkles,
} from 'lucide-react';

// --- Componenti estratti ---
import Step1Squadra from './components/Step1Squadra';
import Step2Calendario from './components/Step2Calendario';
import Step3Scommesse from './components/Step3Scommesse';
import AnteprimaSidebar from './components/AnteprimaSidebar';
import AreaStaff from './components/AreaStaff';
import DashboardCapitano from './components/DashboardCapitano';
import Classifica from './components/Classifica';

// Palette ripresa dalle macchie del logo (rosso, arancio, giallo, verde, blu, viola)
const RAINBOW = 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #a855f7)';
// Un colore del logo per ciascuno dei 5 step (mappa a livelli)
const STEP_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7'];

// Funzione helper: raggruppa i record flat della tabella `catalogo_serate_giochi`
// in un array di oggetti { serata, titolo, emoji, giochi[] } per la UI dello Step 2
const raggruppaPerSerata = (righeDb) => {
  const mappa = {};
  (righeDb || []).forEach(r => {
    if (!mappa[r.num_serata]) {
      mappa[r.num_serata] = {
        serata: r.num_serata,
        titolo: r.nome_serata,
        emoji: r.emoji || '🎮',
        giochi: [],
      };
    }
    mappa[r.num_serata].giochi.push(r.nome_gioco);
  });
  return Object.values(mappa).sort((a, b) => a.serata - b.serata);
};

export default function App() {
  // --- ROUTING BASATO SU HASH ---
  // #/staff → pannello regia, qualsiasi altro hash → app capitano
  const [currentRoute, setCurrentRoute] = useState(window.location.hash);

  useEffect(() => {
    const onHashChange = () => setCurrentRoute(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const [stepAttuale, setStepAttuale] = useState(1);

  // Stato del Salvataggio DB
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  // Dati Supabase — tutte e 4 le tabelle vengono scaricate al mount
  const [giudiciDb, setGiudiciDb] = useState([]);
  const [squadreDisponibili, setSquadreDisponibili] = useState([]);
  const [calendarioSerate, setCalendarioSerate] = useState([]);
  const [bonusMalusList, setBonusMalusList] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Stato Step 1 — ID della squadra selezionata dalla tendina
  const [selectedSquadra, setSelectedSquadra] = useState('');

  // Stato di autenticazione capitano (validato via RPC login_capitano)
  const [isCapitanoAutenticato, setIsCapitanoAutenticato] = useState(false);

  // Stato principale: la scommessa che il capitano sta piazzando (array di 1)
  const [scommesse, setScommesse] = useState([]);

  // --- SERATA IN CORSO + DASHBOARD ---
  // serataCorrente: numero serata aperta (1-5) o null se nessuna.
  const [serataCorrente, setSerataCorrente] = useState(null);
  // mostraDashboard: true → renderizza la Dashboard al posto del wizard.
  const [mostraDashboard, setMostraDashboard] = useState(false);
  // scommesseGiaEffettuate: tutte le scommesse della squadra, lette dal DB.
  const [scommesseGiaEffettuate, setScommesseGiaEffettuate] = useState([]);

  // Fetch di tutti i dati all'avvio: giudici, squadre, calendario serate e bonus/malus
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDb(true);
      try {
        const [resGiudici, resSquadre, resSerate, resBonusMalus] = await Promise.all([
          supabase.from('giudici').select('*'),
          supabase.from('squadre').select('*'),
          supabase.from('catalogo_serate_giochi').select('*').order('num_serata').order('ordine'),
          supabase.from('catalogo_bonus_malus').select('*').eq('attivo', true).order('id'),
        ]);

        if (resGiudici.error) throw resGiudici.error;
        if (resSquadre.error) throw resSquadre.error;
        if (resSerate.error) throw resSerate.error;
        if (resBonusMalus.error) throw resBonusMalus.error;

        setGiudiciDb(resGiudici.data || []);
        setSquadreDisponibili(resSquadre.data || []);
        setCalendarioSerate(raggruppaPerSerata(resSerate.data));
        setBonusMalusList(resBonusMalus.data || []);
      } catch (err) {
        console.error("Errore nel fetch dati Supabase:", err);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Early return DOPO tutti gli hook (useState, useEffect)
  // Se siamo nella route staff, rendiamo SOLO il pannello protetto
  if (currentRoute === '#/staff') {
    return <AreaStaff />;
  }

  // Rotta pubblica: classifica generale (nessun login richiesto)
  if (currentRoute === '#/classifica') {
    return <Classifica />;
  }

  // Ricava l'oggetto completo della squadra selezionata per l'anteprima
  const squadraSelezionataObj = squadreDisponibili.find(
    s => String(s.id_squadra) === String(selectedSquadra)
  );

  // Shortcut: il salvataggio è andato a buon fine?
  const submitSuccess = submitMessage?.type === 'success';

  // Siamo nella vista Dashboard (capitano bloccato dal piazzare scommesse ora)?
  const isDashboard = stepAttuale === 6 && mostraDashboard;

  // Reset totale: logout capitano e ritorno alla Home (Step 1)
  const handleCambiaSquadra = () => {
    setStepAttuale(1);
    setIsCapitanoAutenticato(false);
    setMostraDashboard(false);
    setSerataCorrente(null);
    setScommesseGiaEffettuate([]);
    setSelectedSquadra('');
    setScommesse([]);
    setSubmitMessage(null);
  };

  // Dopo il salvataggio: vai alla Dashboard (che ora include la scommessa appena fatta)
  const vaiAllaDashboard = () => {
    setMostraDashboard(true);
    setStepAttuale(6);
  };

  // --- FUNZIONE DI SUBMIT FINALE ---
  // Inserisce LA scommessa della serata in corso su `scommesse_del_capitano`.
  // Il vincolo UNIQUE(squadra_id, num_serata) garantisce 1 scommessa/serata.
  const handleFinalSubmit = async () => {
    // Guard: niente scommessa compilata → non inviare un payload vuoto
    if (scommesse.length === 0) {
      setSubmitMessage({ type: 'error', text: 'Completa prima la scommessa della serata.' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const payloadArray = scommesse.map(s => ({
        squadra_id: Number(selectedSquadra), // forziamo a numero per coerenza con la FK BIGINT
        giudice_id: s.giudice_id,
        azione_scelta: s.azione,
        punti: s.punti,
        num_serata: s.num_serata,             // serata in corso (1-5)
      }));

      console.log('PAYLOAD PER SUPABASE:', payloadArray);

      // NB: nessun .select() dopo l'insert. Con la lettura blindata (niente policy
      // SELECT) un INSERT ... RETURNING verrebbe negato dalla RLS. L'insert "puro"
      // richiede solo la policy anon_insert_scommesse.
      const { error } = await supabase
        .from('scommesse_del_capitano')
        .insert(payloadArray);

      console.log('RISPOSTA SUPABASE:', { error });

      if (error) throw error;

      // Aggiorna lo storico per la dashboard dai dati locali (non rileggiamo dal DB).
      const nuoveDashboard = scommesse.map((s) => ({
        id_scommessa: `nuova-${s.num_serata}`,
        num_serata: s.num_serata,
        azione_scelta: s.azione,
        punti: s.punti,
        indovinata: null,
        nome_giudice: s.nomeGiudice,
      }));
      setScommesseGiaEffettuate(prev =>
        [...prev, ...nuoveDashboard].sort((a, b) => a.num_serata - b.num_serata)
      );

      setSubmitMessage({
        type: 'success',
        text: `Scommessa della Serata ${serataCorrente} salvata con successo!`,
      });
      setStepAttuale(5);
    } catch (err) {
      console.error('Errore salvataggio su Supabase:', err);
      // 23505 = violazione del vincolo UNIQUE (scommessa già presente per la serata)
      const messaggio = err.code === '23505'
        ? 'Hai già piazzato la scommessa per questa serata. Ricarica la pagina.'
        : (err.message || 'Errore durante il salvataggio. Riprova.');
      setSubmitMessage({ type: 'error', text: messaggio });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-800 selection:bg-amber-200">

      {/* Sfondo decorativo: base calda + blob arcobaleno del logo */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-b from-amber-50 via-white to-sky-50 pointer-events-none"
      >
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(244,63,94,0.22)' }} />
        <div className="absolute top-24 -right-24 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(59,130,246,0.20)' }} />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(34,197,94,0.18)' }} />
        <div className="absolute top-1/3 right-1/3 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(168,85,247,0.16)' }} />
      </div>

      {/* HEADER LUMINOSO */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center gap-3 sm:gap-4">
          {/* Logo tondo con anello arcobaleno */}
          <div className="rounded-full p-[3px] shrink-0" style={{ background: RAINBOW }}>
            <img
              src="/logo.jpg"
              alt="Logo Fanta GSF"
              className="rounded-full object-cover border-2 border-white block"
              style={{ width: '3.25rem', height: '3.25rem' }}
            />
          </div>
          {/* Titolo con gradiente arcobaleno */}
          <div className="flex flex-col leading-none">
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{
                backgroundImage: RAINBOW,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              FANTA GSF
            </h1>
            <span className="text-[11px] sm:text-sm font-black uppercase tracking-[0.25em] text-slate-400 mt-0.5">
              Summer Games
            </span>
          </div>

          {/* Azioni header — pulsanti giocosi a destra */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Coppa → Classifica pubblica */}
            <a
              href="#/classifica"
              className="group flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-400 text-amber-900 font-black shadow-lg shadow-amber-300/50 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all"
              title="Classifica Generale"
            >
              <Trophy size={18} className="group-hover:rotate-12 transition-transform" />
              <span className="hidden sm:inline text-sm">Classifica</span>
            </a>
            {/* Icona accesso Area Staff */}
            <a
              href="#/staff"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-violet-100 text-violet-500 shadow-sm hover:bg-violet-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 transition-all"
              title="Area Staff"
            >
              <Lock size={20} />
            </a>
          </div>
        </div>
        {/* Striscia arcobaleno sotto l'header */}
        <div className="h-2 w-full" style={{ background: RAINBOW }} />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {isDashboard ? (
          /* ===== DASHBOARD CAPITANO (read-only) ===== */
          <DashboardCapitano
            scommesse={scommesseGiaEffettuate}
            squadra={squadraSelezionataObj}
            serataCorrente={serataCorrente}
            onCambiaSquadra={handleCambiaSquadra}
          />
        ) : (
          <>
            {/* PROGRESS BAR — Mappa a livelli, ogni step un colore del logo */}
            <div className="flex justify-between items-center mb-8 bg-white/80 backdrop-blur p-4 rounded-3xl shadow-lg shadow-slate-200/50 border border-white overflow-x-auto">
              {[1, 2, 3, 4, 5].map((num) => {
                const done = stepAttuale > num || submitSuccess;
                const active = stepAttuale === num;
                const colored = done || active;
                const c = STEP_COLORS[num - 1];
                return (
                  <React.Fragment key={num}>
                    <button
                      onClick={() => !submitSuccess && !isSubmitting && setStepAttuale(num)}
                      disabled={(submitSuccess && num !== 5) || isSubmitting || (!isCapitanoAutenticato && num > 1)}
                      className={`relative flex items-center justify-center w-12 h-12 rounded-full font-black text-xl transition-all shrink-0 ${active ? 'scale-110' : ''} ${colored ? 'text-white' : 'bg-white text-slate-300 border-2 border-slate-200 hover:border-slate-300'}`}
                      style={colored ? {
                        background: `linear-gradient(135deg, ${c}, ${c}cc)`,
                        boxShadow: `0 10px 22px -8px ${c}`,
                        outline: active ? `4px solid ${c}33` : 'none',
                      } : undefined}
                    >
                      {done ? <CheckCircle2 size={24} /> : num}
                    </button>
                    {num < 5 && (
                      <div
                        className="h-2 flex-1 mx-1.5 rounded-full min-w-[24px] transition-all"
                        style={{ background: done ? `linear-gradient(to right, ${STEP_COLORS[num - 1]}, ${STEP_COLORS[num]})` : '#e2e8f0' }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">

              {/* PANNELLO DI CONFIGURAZIONE (Sinistra) — scheda di gioco */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 border-4 border-white ring-1 ring-slate-100 p-6 flex flex-col" style={{ minHeight: '520px' }}>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-dashed border-slate-100 shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-300/50">
                      <Settings className="text-white" size={22} />
                    </div>
                    <h3 className="font-black text-xl uppercase tracking-wide bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent bg-clip-text">Pannello Config.</h3>
                  </div>

                  {/* STEP 1 */}
                  {stepAttuale === 1 && (
                    <Step1Squadra
                      squadreDisponibili={squadreDisponibili}
                      selectedSquadra={selectedSquadra}
                      setSelectedSquadra={setSelectedSquadra}
                      squadraSelezionataObj={squadraSelezionataObj}
                      isLoadingDb={isLoadingDb}
                      setStepAttuale={setStepAttuale}
                      setIsCapitanoAutenticato={setIsCapitanoAutenticato}
                      setSerataCorrente={setSerataCorrente}
                      setMostraDashboard={setMostraDashboard}
                      setScommesseGiaEffettuate={setScommesseGiaEffettuate}
                    />
                  )}

                  {/* STEP 2 */}
                  {stepAttuale === 2 && (
                    <Step2Calendario
                      calendarioSerate={calendarioSerate}
                      serataCorrente={serataCorrente}
                      isLoadingDb={isLoadingDb}
                      setStepAttuale={setStepAttuale}
                    />
                  )}

                  {/* STEP 3 */}
                  {stepAttuale === 3 && (
                    <Step3Scommesse
                      giudiciDb={giudiciDb}
                      bonusMalusList={bonusMalusList}
                      calendarioSerate={calendarioSerate}
                      serataCorrente={serataCorrente}
                      isLoadingDb={isLoadingDb}
                      scommesse={scommesse}
                      setScommesse={setScommesse}
                      setStepAttuale={setStepAttuale}
                    />
                  )}

                  {/* STEP 4 — Conferma finale */}
                  {stepAttuale === 4 && !submitSuccess && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                      <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-300/50 animate-bounce">
                        <Trophy size={44} />
                      </div>
                      <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tight">Tutto pronto!</h3>
                      <p className="text-slate-500 mt-2 max-w-xs font-medium">Controlla l'anteprima sulla destra. Se sei soddisfatto della tua scommessa per la Serata {serataCorrente}, conferma per salvarla.</p>

                      <button
                        onClick={handleCambiaSquadra}
                        disabled={isSubmitting}
                        className="mt-8 text-sm text-blue-500 font-bold hover:underline disabled:opacity-50"
                      >
                        &larr; Torna alla Home e cambia Squadra
                      </button>
                    </div>
                  )}

                  {/* STEP 5 — Successo */}
                  {stepAttuale === 5 && submitSuccess && (
                    <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                      <div className="relative mb-6">
                        <div className="w-28 h-28 bg-gradient-to-tr from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-300/50">
                          <CheckCircle2 size={56} />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 text-amber-400 animate-pulse" size={28} />
                      </div>
                      <h3 className="font-black text-3xl text-slate-800 uppercase tracking-tight">Scommessa salvata!</h3>
                      <p className="text-slate-500 mt-3 font-medium">In bocca al lupo per la Serata {serataCorrente} dei GSF Summer!</p>

                      <button
                        onClick={vaiAllaDashboard}
                        className="group mt-8 inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-blue-300/50 hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all"
                      >
                        <LayoutDashboard size={18} className="group-hover:rotate-6 transition-transform" /> Vai alla mia Dashboard
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* FRECCIA INDICATRICE */}
              <div className="hidden lg:flex col-span-2 items-center justify-center">
                <div className="flex flex-col items-center text-amber-400 animate-pulse">
                  <svg width="100" height="40" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 4" className="text-amber-300">
                    <path d="M0,20 C30,20 70,20 90,20" />
                    <path d="M80,10 L95,20 L80,30" strokeDasharray="0" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-widest mt-2 text-center text-amber-500">
                    Aggiorna<br />Anteprima
                  </span>
                </div>
              </div>

              {/* ANTEPRIMA SIDEBAR (Destra) */}
              <AnteprimaSidebar
                squadraSelezionataObj={squadraSelezionataObj}
                scommesse={scommesse}
                handleFinalSubmit={handleFinalSubmit}
                isSubmitting={isSubmitting}
                submitMessage={submitMessage}
                submitSuccess={submitSuccess}
                stepAttuale={stepAttuale}
                selectedSquadra={selectedSquadra}
              />
            </div>
          </>
        )}

      </main>
    </div>
  );
}
