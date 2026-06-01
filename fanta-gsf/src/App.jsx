import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Trophy,
  CheckCircle2,
  Settings,
  LayoutDashboard,
  Lock,
} from 'lucide-react';

// --- Componenti estratti ---
import LogoGSF from './components/LogoGSF';
import Step1Squadra from './components/Step1Squadra';
import Step2Calendario from './components/Step2Calendario';
import Step3Scommesse from './components/Step3Scommesse';
import AnteprimaSidebar from './components/AnteprimaSidebar';
import AreaStaff from './components/AreaStaff';
import DashboardCapitano from './components/DashboardCapitano';
import Classifica from './components/Classifica';

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

      const { data, error } = await supabase
        .from('scommesse_del_capitano')
        .insert(payloadArray)
        .select();

      console.log('RISPOSTA SUPABASE:', { data, error });

      if (error) throw error;

      // Aggiorna lo storico per la dashboard con la/e scommessa/e appena inserita/e
      const nuoveDashboard = scommesse.map((s, i) => ({
        id_scommessa: data?.[i]?.id_scommessa ?? data?.[i]?.id ?? `tmp-${i}`,
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-yellow-200">

      {/* HEADER */}
      <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center gap-4">
          <LogoGSF />
          <div className="flex flex-col border-l-2 border-gray-200 pl-4">
            <h1 className="text-3xl font-black tracking-tight text-blue-600 leading-none">FANTA</h1>
            <h2 className="text-xl font-bold text-slate-500 leading-none">GSF SUMMER</h2>
          </div>
          {/* Azioni header — allineate a destra */}
          <div className="ml-auto flex items-center gap-2">
            {/* Coppa → Classifica pubblica (molto visibile, hover dorato) */}
            <a
              href="#/classifica"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-yellow-400 text-yellow-900 font-bold hover:bg-yellow-500 hover:shadow-md hover:shadow-yellow-200 transition-all active:scale-95"
              title="Classifica Generale"
            >
              <Trophy size={18} />
              <span className="hidden sm:inline text-sm">Classifica</span>
            </a>
            {/* Icona accesso Area Staff */}
            <a
              href="#/staff"
              className="p-2.5 rounded-xl text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-all"
              title="Area Staff"
            >
              <Lock size={20} />
            </a>
          </div>
        </div>
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
            {/* PROGRESS BAR */}
            <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              {[1, 2, 3, 4, 5].map((num) => (
                <React.Fragment key={num}>
                  <button
                    onClick={() => !submitSuccess && !isSubmitting && setStepAttuale(num)}
                    disabled={(submitSuccess && num !== 5) || isSubmitting || (!isCapitanoAutenticato && num > 1)}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-full font-black text-lg transition-all shrink-0
                      ${stepAttuale === num
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                        : stepAttuale > num || submitSuccess
                          ? 'bg-green-100 text-green-600 border-2 border-green-200'
                          : 'bg-gray-100 text-gray-400 border-2 border-gray-200 hover:bg-gray-200'}
                    `}
                  >
                    {stepAttuale > num || submitSuccess ? <CheckCircle2 size={24} /> : num}
                  </button>
                  {num < 5 && (
                    <div className={`h-1 flex-1 mx-2 rounded ${stepAttuale > num || submitSuccess ? 'bg-green-200' : 'bg-gray-100 min-w-[30px]'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">

              {/* PANNELLO DI CONFIGURAZIONE (Sinistra) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex flex-col" style={{ minHeight: '520px' }}>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 shrink-0">
                    <Settings className="text-blue-500" />
                    <h3 className="font-bold text-xl uppercase tracking-wider text-gray-800">Pannello Config.</h3>
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
                      <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                        <Trophy size={40} />
                      </div>
                      <h3 className="font-black text-2xl text-gray-800 uppercase tracking-tight">Tutto pronto!</h3>
                      <p className="text-gray-500 mt-2 max-w-xs">Controlla l'anteprima sulla destra. Se sei soddisfatto della tua scommessa per la Serata {serataCorrente}, conferma per salvarla.</p>

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
                      <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <CheckCircle2 size={48} />
                      </div>
                      <h3 className="font-black text-3xl text-gray-800 uppercase tracking-tight">Scommessa salvata!</h3>
                      <p className="text-gray-500 mt-3 font-medium">In bocca al lupo per la Serata {serataCorrente} dei GSF Summer!</p>

                      <button
                        onClick={vaiAllaDashboard}
                        className="mt-8 inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                      >
                        <LayoutDashboard size={18} /> Vai alla mia Dashboard
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* FRECCIA INDICATRICE */}
              <div className="hidden lg:flex col-span-2 items-center justify-center">
                <div className="flex flex-col items-center text-gray-400 animate-pulse">
                  <svg width="100" height="40" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" className="text-gray-300">
                    <path d="M0,20 C30,20 70,20 90,20" />
                    <path d="M80,10 L95,20 L80,30" strokeDasharray="0" />
                  </svg>
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-center text-gray-400">
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
