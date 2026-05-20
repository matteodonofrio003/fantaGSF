import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Trophy,
  ChevronRight,
  CheckCircle2,
  Settings,
  Loader2,
  Trash2,
  Calendar,
  Star
} from 'lucide-react';

// --- COMPONENTE LOGO RICREATO ---
// Ricrea l'atmosfera del logo con i pallini colorati
const LogoGSF = () => {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
  return (
    <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md border-2 border-gray-100 shrink-0">
      {/* Cerchio di "persone" astratte */}
      <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ animationDuration: '20s' }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${colors[i % colors.length]}`}
            style={{
              top: '50%', left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-26px)`
            }}
          />
        ))}
      </div>
      <span className="font-black text-2xl tracking-tighter text-gray-800 z-10" style={{ fontFamily: 'impact, sans-serif' }}>
        GSF
      </span>
    </div>
  );
};

// --- CALENDARIO SERATE (hardcoded — in futuro verrà dal backend Admin) ---
// Struttura read-only: il capitano vede i giochi programmati per ogni serata
const calendarioSerate = [
  {
    serata: 1,
    titolo: 'Serata 1 — Opening Night',
    emoji: '🎬',
    giochi: ['Sorteggio tema', 'Tiro al segno', 'Tiro alla fune', 'I tre mattoni', 'Swap'],
  },
  {
    serata: 2,
    titolo: 'Serata 2 — La Sfida',
    emoji: '🎯',
    giochi: ['Torta in faccia', 'Palloncino express', 'La befana'],
  },
  {
    serata: 3,
    titolo: 'Serata 3 — Acqua & Fuoco',
    emoji: '💦',
    giochi: ['Gemelli siamesi', 'La posa', 'Gavettoni', 'La spugna'],
  },
  {
    serata: 4,
    titolo: 'Serata 4 — Brain Games',
    emoji: '🧠',
    giochi: ['Frase annacquata', 'Indovina il motivo', 'Mangia anguria'],
  },
  {
    serata: 5,
    titolo: 'Serata 5 — Gran Finale',
    emoji: '🏆',
    giochi: ['Caccia al tesoro', 'Fatti capire', 'La rapina', 'Sfilata/Scenografia'],
  },
];

// --- BONUS / MALUS PREDEFINITI (hardcoded — TODO: in futuro fetch da Supabase tabella `bonus_malus`) ---
// La regia definisce queste regole, il capitano le abbina a un giudice
const bonusMalusPredefiniti = [
  { id: 1, desc: 'Si tuffa in piscina vestito', punti: 15 },
  { id: 2, desc: 'Sbaglia a fischiare l\'inizio del gioco', punti: -10 },
  { id: 3, desc: 'Balla durante una pausa', punti: 5 },
  { id: 4, desc: 'Si presenta con un costume assurdo', punti: 10 },
  { id: 5, desc: 'Dimentica le regole e si confonde', punti: -5 },
  { id: 6, desc: 'Urla il nome della propria squadra del cuore', punti: 8 },
];

// Colori per le card delle serate nella timeline
const serataColors = [
  'from-rose-500 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
];

export default function App() {
  const [stepAttuale, setStepAttuale] = useState(1);

  // Stato del Salvataggio DB
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Dati Supabase (solo giudici e squadre — i giochi sono nel calendario statico)
  const [giudiciDb, setGiudiciDb] = useState([]);
  const [squadreDisponibili, setSquadreDisponibili] = useState([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Stato Step 1 — ID della squadra selezionata dalla tendina
  const [selectedSquadra, setSelectedSquadra] = useState('');

  // Stato principale: solo le scommesse (i giochi non si selezionano più)
  const [scommesse, setScommesse] = useState([]);

  // Stato locale form Scommessa Step 3 — giudice + bonus/malus predefinito
  const [nuovaScommessa, setNuovaScommessa] = useState({
    id_giudice: '',
    id_bonus: '',   // ID del bonus/malus predefinito selezionato
  });

  // Fetch dei dati all'avvio: solo giudici e squadre (i giochi sono nel calendario statico)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDb(true);
      try {
        const [resGiudici, resSquadre] = await Promise.all([
          supabase.from('giudici').select('*'),
          supabase.from('squadre').select('*'),
        ]);

        if (resGiudici.error) throw resGiudici.error;
        if (resSquadre.error) throw resSquadre.error;

        setGiudiciDb(resGiudici.data || []);
        setSquadreDisponibili(resSquadre.data || []);
      } catch (err) {
        console.error("Errore nel fetch dati Supabase:", err);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchData();
  }, []);

  // Aggiunge una scommessa abbinando un giudice a un bonus/malus predefinito
  const aggiungiScommessa = () => {
    if (!nuovaScommessa.id_giudice || !nuovaScommessa.id_bonus) return;

    const giudice = giudiciDb.find(g => g.id_giudice === nuovaScommessa.id_giudice);
    // Lookup del bonus/malus predefinito selezionato
    const bonusScelto = bonusMalusPredefiniti.find(b => b.id === Number(nuovaScommessa.id_bonus));
    if (!bonusScelto) return;

    const scommessaCompleta = {
      id: Date.now().toString(),       // ID locale temporaneo
      giudice_id: nuovaScommessa.id_giudice,
      id_bonus: bonusScelto.id,        // Riferimento al predefinito
      azione: bonusScelto.desc,        // Testo leggibile dell'azione
      punti: bonusScelto.punti,        // Punti bonus (+) o malus (-)
      nomeGiudice: giudice?.nome,      // Per la UI
    };

    setScommesse(prev => [...prev, scommessaCompleta]);

    // Reset del form
    setNuovaScommessa({ id_giudice: '', id_bonus: '' });
  };

  const rimuoviScommessa = (idScommessa) => {
    setScommesse(prev => prev.filter(s => s.id !== idScommessa));
  };

  // Ricava l'oggetto completo della squadra selezionata per l'anteprima
  const squadraSelezionataObj = squadreDisponibili.find(
    s => String(s.id_squadra) === String(selectedSquadra)
  );

  // --- FUNZIONE DI SUBMIT: logga il payload e salva ---
  // Il payload contiene SOLO la squadra selezionata e le scommesse (i giochi sono read-only)
  const handleFinalSubmit = () => {
    const payload = {
      // Dati Step 1 — Squadra selezionata
      id_squadra: selectedSquadra,
      // Dati Step 3 — Scommesse Bonus/Malus predefiniti abbinati ai giudici
      scommesse: scommesse.map(s => ({
        giudice_id: s.giudice_id,
        id_bonus: s.id_bonus,
        azione: s.azione,
        punti: s.punti,
      })),
      // Metadati
      timestamp: new Date().toISOString(),
    };

    console.log('PAYLOAD PRONTO PER SUPABASE:', payload);
    // TODO: collegare al salvataggio effettivo su Supabase
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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* PROGRESS BAR */}
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((num) => (
            <React.Fragment key={num}>
              <button
                onClick={() => !submitSuccess && setStepAttuale(num)}
                disabled={submitSuccess && num !== 5}
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

              {/* === STEP 1 — Selezione Squadra dalla tendina (pre-inserite nel DB) === */}
              {stepAttuale === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2 uppercase">Seleziona la tua Squadra</label>
                    {isLoadingDb ? (
                      <div className="flex items-center justify-center py-8 text-gray-400">
                        <Loader2 className="animate-spin mr-2 text-blue-500" size={24} />
                        <span className="text-sm font-bold">Caricamento squadre...</span>
                      </div>
                    ) : (
                      <select
                        value={selectedSquadra}
                        onChange={(e) => setSelectedSquadra(e.target.value)}
                        className="w-full text-lg p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none font-bold text-blue-900 appearance-none cursor-pointer"
                      >
                        <option value="">-- Scegli la tua squadra --</option>
                        {squadreDisponibili.map(sq => (
                          <option key={sq.id_squadra} value={sq.id_squadra}>
                            {sq.nome}{sq.capitano ? ` (Cap. ${sq.capitano})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Mostra dettagli della squadra selezionata */}
                  {squadraSelezionataObj && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                      {squadraSelezionataObj.colore && (
                        <div className="w-8 h-8 rounded-full shrink-0 border-2 border-white shadow" style={{ backgroundColor: squadraSelezionataObj.colore }} />
                      )}
                      <div>
                        <p className="font-bold text-blue-900">{squadraSelezionataObj.nome}</p>
                        {squadraSelezionataObj.capitano && (
                          <p className="text-sm text-blue-600">Capitano: {squadraSelezionataObj.capitano}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setStepAttuale(2)}
                    disabled={!selectedSquadra}
                    className="w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-black rounded-xl text-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Prosegui <ChevronRight size={20} />
                  </button>
                </div>
              )}

              {/* === STEP 2 — Calendario Serate (read-only, nessuna interazione) === */}
              {stepAttuale === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
                  <div className="shrink-0">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Calendar className="text-blue-500" size={20} />
                      Calendario Serate
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Ecco i giochi programmati per ogni serata. Solo visualizzazione.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-2">
                    {calendarioSerate.map((serata, idx) => (
                      <div key={serata.serata} className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                        {/* Header della serata con gradiente */}
                        <div className={`bg-gradient-to-r ${serataColors[idx % serataColors.length]} px-4 py-2.5 flex items-center gap-2`}>
                          <span className="text-lg">{serata.emoji}</span>
                          <span className="text-white font-bold text-sm tracking-wide">{serata.titolo}</span>
                        </div>
                        {/* Lista giochi della serata */}
                        <div className="p-3 flex flex-wrap gap-1.5">
                          {serata.giochi.map((gioco, gi) => (
                            <span
                              key={gi}
                              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                            >
                              {gioco}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => setStepAttuale(3)} className="w-full shrink-0 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-auto">
                    Prosegui alle Scommesse <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* === STEP 3 — Scommesse con Bonus/Malus predefiniti dalla regia === */}
              {stepAttuale === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
                  <div className="shrink-0">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <Star className="text-yellow-500" size={20} />
                      Scommesse Bonus / Malus
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Abbina un giudice a un bonus o malus predefinito dalla regia.</p>
                  </div>

                  {isLoadingDb ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 flex-1">
                      <Loader2 className="animate-spin mb-2 text-yellow-500" size={32} />
                      <p className="text-sm font-bold">Caricamento giudici...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shrink-0">
                        {/* Select del Giudice (da Supabase) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Giudice</label>
                          <select
                            value={nuovaScommessa.id_giudice}
                            onChange={e => setNuovaScommessa({...nuovaScommessa, id_giudice: e.target.value})}
                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value="">-- Seleziona un giudice --</option>
                            {giudiciDb.map(g => (
                              <option key={g.id_giudice} value={g.id_giudice}>{g.nome}</option>
                            ))}
                          </select>
                        </div>

                        {/* Select Bonus/Malus predefinito — TODO: in futuro fetch da Supabase tabella `bonus_malus` */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Bonus / Malus</label>
                          <select
                            value={nuovaScommessa.id_bonus}
                            onChange={e => setNuovaScommessa({...nuovaScommessa, id_bonus: e.target.value})}
                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          >
                            <option value="">-- Scegli un bonus/malus --</option>
                            {bonusMalusPredefiniti.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.desc} ({b.punti > 0 ? '+' : ''}{b.punti} pt)
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={aggiungiScommessa}
                          disabled={!nuovaScommessa.id_giudice || !nuovaScommessa.id_bonus}
                          className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                          Aggiungi Scommessa
                        </button>
                      </div>

                      {/* Lista scommesse aggiunte */}
                      <div className="flex-1 overflow-y-auto pr-2 mt-2">
                        {scommesse.length > 0 && (
                          <div className="space-y-2 pb-2">
                            <h5 className="font-bold text-xs uppercase text-gray-500 mt-2">Le tue scommesse:</h5>
                            {scommesse.map(s => (
                              <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm relative overflow-hidden"
                                style={{ borderColor: s.punti >= 0 ? '#bbf7d0' : '#fecaca' }}
                              >
                                {/* Barra laterale colorata: verde bonus, rossa malus */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.punti >= 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <div className="pl-2 min-w-0 flex-1">
                                  <div className="text-xs font-bold text-gray-400 mb-0.5">{s.nomeGiudice}</div>
                                  <div className="text-sm font-bold text-gray-800 truncate">"{s.azione}"</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className={`font-bold text-xs px-2 py-1 rounded whitespace-nowrap ${
                                    s.punti >= 0
                                      ? 'text-green-600 bg-green-50'
                                      : 'text-red-600 bg-red-50'
                                  }`}>
                                    {s.punti >= 0 ? '+' : ''}{s.punti} pt
                                  </span>
                                  <button onClick={() => rimuoviScommessa(s.id)} className="text-red-400 hover:text-red-600 p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors" title="Rimuovi scommessa">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <button onClick={() => setStepAttuale(4)} className="w-full shrink-0 mt-auto py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                    Vai al Riepilogo <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {stepAttuale === 4 && !submitSuccess && (
                <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6">
                    <Trophy size={40} />
                  </div>
                  <h3 className="font-black text-2xl text-gray-800 uppercase tracking-tight">Tutto pronto!</h3>
                  <p className="text-gray-500 mt-2 max-w-xs">Controlla l'anteprima sulla destra. Se sei soddisfatto della tua squadra, conferma per salvare e iscriverti.</p>
                  
                  <button onClick={() => setStepAttuale(3)} className="mt-8 text-sm text-blue-500 font-bold hover:underline">
                    &larr; Torna indietro a modificare
                  </button>
                </div>
              )}

              {submitSuccess && (
                 <div className="flex flex-col items-center justify-center h-full text-center animate-in zoom-in">
                  <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className="font-black text-3xl text-gray-800 uppercase tracking-tight">Squadra iscritta!</h3>
                  <p className="text-gray-500 mt-3 font-medium">In bocca al lupo per i GSF Summer!</p>
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

          {/* ANTEPRIMA CONFIGURAZIONE GIOCO (Destra) */}
          <div className="lg:col-span-5 h-[600px] lg:h-auto">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-2 rounded-[2rem] shadow-xl h-full flex flex-col transform transition-all hover:-translate-y-1 relative">
              <div className="bg-white/95 backdrop-blur-sm rounded-[1.75rem] h-full p-6 flex flex-col relative overflow-hidden flex-1">

                <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl"></div>

                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2 shrink-0">
                  <Trophy size={14} /> Anteprima Fanta-Team
                </h3>

                <div className="text-center mb-6 bg-indigo-50 py-5 rounded-2xl border border-indigo-100 shrink-0">
                  <h2 className="text-2xl font-black text-indigo-900 break-words px-4">
                    {squadraSelezionataObj?.nome || "Nessuna Squadra"}
                  </h2>
                  {squadraSelezionataObj?.capitano && (
                    <p className="text-sm font-bold text-indigo-400 mt-1">
                      Cap. {squadraSelezionataObj.capitano}
                    </p>
                  )}
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-1">

                  <div>
                    <h4 className="font-bold text-sm text-gray-400 uppercase mb-3 border-b border-gray-100 pb-1 sticky top-0 bg-white/95 z-10 py-1">Pronostici</h4>
                    {scommesse.length === 0 ? (
                      <div className="h-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        Nessun pronostico
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {scommesse.map(s => (
                          <li key={s.id} className="flex flex-col text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-gray-700">{s.nomeGiudice}</span>
                              <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                                s.punti >= 0
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-red-600 bg-red-50'
                              }`}>
                                {s.punti >= 0 ? '+' : ''}{s.punti} pt
                              </span>
                            </div>
                            <span className="text-gray-500 text-xs italic">"{s.azione}"</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="mt-4 shrink-0 pt-4 border-t border-gray-100 bg-white relative z-10">
                  {submitError && <p className="text-red-500 text-sm font-bold text-center mb-2">{submitError}</p>}
                  
                  <button
                    onClick={handleFinalSubmit}
                    disabled={!selectedSquadra || isSubmitting || submitSuccess || stepAttuale < 4}
                    className={`
                      w-full py-4 rounded-xl font-black text-lg transition-all shadow-md flex justify-center items-center gap-2
                      ${selectedSquadra && !submitSuccess && !isSubmitting && stepAttuale >= 4
                        ? 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:shadow-lg hover:-translate-y-0.5'
                        : submitSuccess
                          ? 'bg-green-500 text-white cursor-default'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={24} /> SALVATAGGIO...</>
                    ) : submitSuccess ? (
                      <><CheckCircle2 size={24} /> SQUADRA SALVATA!</>
                    ) : (
                      'CONFERMA SQUADRA'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}