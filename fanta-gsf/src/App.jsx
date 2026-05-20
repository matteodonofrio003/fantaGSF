import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  Trophy,
  Users,
  Zap,
  ChevronRight,
  CheckCircle2,
  Plus,
  Minus,
  Settings,
  Info,
  Loader2,
  Trash2
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

export default function App() {
  const [stepAttuale, setStepAttuale] = useState(1);
  const [budget, setBudget] = useState(100);

  // Stato del Salvataggio DB
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Dati Supabase
  const [giochiDb, setGiochiDb] = useState([]);
  const [giudiciDb, setGiudiciDb] = useState([]);
  const [squadreDisponibili, setSquadreDisponibili] = useState([]); // Squadre pre-inserite dal DB
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Stato Step 1 — ID della squadra selezionata dalla tendina
  const [selectedSquadra, setSelectedSquadra] = useState('');

  // Stato principale della squadra con i dati raccolti nei vari step
  const [squadra, setSquadra] = useState({
    giochiSelezionati: [],
    scommesse: []
  });

  // Stato locale form Scommessa (nuovo schema: azione generica + punti bonus/malus)
  const [nuovaScommessa, setNuovaScommessa] = useState({
    id_giudice: '',
    azione: '',
    punti: 0
  });

  // Fetch dei dati all'avvio: giochi, giudici e squadre pre-inserite
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingDb(true);
      try {
        // Fetch parallelo di tutte le tabelle necessarie
        const [resGiochi, resGiudici, resSquadre] = await Promise.all([
          supabase.from('giochi').select('*').eq('attivo', true),
          supabase.from('giudici').select('*'),
          supabase.from('squadre').select('*'),
        ]);

        if (resGiochi.error) throw resGiochi.error;
        if (resGiudici.error) throw resGiudici.error;
        if (resSquadre.error) throw resSquadre.error;

        // Proprietà visuali per le card dei giochi
        const visualProps = [
          { icon: <Users size={20} />, colore: 'bg-red-100 text-red-600 border-red-300' },
          { icon: <Trophy size={20} />, colore: 'bg-orange-100 text-orange-600 border-orange-300' },
          { icon: <Zap size={20} />, colore: 'bg-blue-100 text-blue-600 border-blue-300' },
          { icon: <Trophy size={20} />, colore: 'bg-purple-100 text-purple-600 border-purple-300' },
        ];

        const mappedGiochi = (resGiochi.data || []).map((g, i) => ({
          ...g,
          id: g.id_gioco,
          nome: g.nome,
          costo: g.costo_partecipazione_fp,
          icon: visualProps[i % visualProps.length].icon,
          colore: visualProps[i % visualProps.length].colore
        }));

        setGiochiDb(mappedGiochi);
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

  const toggleGioco = (gioco) => {
    const giaSelezionato = squadra.giochiSelezionati.find(g => g.id === gioco.id);
    if (giaSelezionato) {
      setSquadra({ 
        ...squadra, 
        giochiSelezionati: squadra.giochiSelezionati.filter(g => g.id !== gioco.id),
      });
      setBudget(b => b + gioco.costo);
    } else {
      if (budget >= gioco.costo) {
        setSquadra({ ...squadra, giochiSelezionati: [...squadra.giochiSelezionati, gioco] });
        setBudget(b => b - gioco.costo);
      } else {
        alert("Budget FantaPunti esaurito!");
      }
    }
  };

  // Aggiunge una scommessa generica (Bonus/Malus) con giudice, azione e punti
  const aggiungiScommessa = () => {
    if (!nuovaScommessa.id_giudice || !nuovaScommessa.azione || nuovaScommessa.punti === '') return;
    
    const giudice = giudiciDb.find(g => g.id_giudice === nuovaScommessa.id_giudice);

    const scommessaCompleta = {
      id: Date.now().toString(), // ID locale temporaneo
      giudice_id: nuovaScommessa.id_giudice,
      azione: nuovaScommessa.azione,
      punti: Number(nuovaScommessa.punti),
      nomeGiudice: giudice?.nome // per la UI
    };

    setSquadra({
      ...squadra,
      scommesse: [...squadra.scommesse, scommessaCompleta]
    });

    // Reset del form
    setNuovaScommessa({
      id_giudice: '',
      azione: '',
      punti: 0
    });
  };

  const rimuoviScommessa = (idScommessa) => {
    setSquadra({
      ...squadra,
      scommesse: squadra.scommesse.filter(s => s.id !== idScommessa)
    });
  };

  // --- FUNZIONE DI DEBUG: logga il payload completo prima di salvare su Supabase ---
  // Raccoglie tutti i dati dai 3 step: squadra, giochi selezionati e scommesse
  // Ricava l'oggetto completo della squadra selezionata per l'anteprima
  const squadraSelezionataObj = squadreDisponibili.find(s => String(s.id_squadra) === String(selectedSquadra));

  const handleFinalSubmit = () => {
    const payload = {
      // Dati Step 1 — ID della squadra pre-inserita selezionata
      id_squadra: selectedSquadra,
      // Dati Step 2 — Giochi acquistati con il budget
      giochiSelezionati: squadra.giochiSelezionati.map(g => ({
        id: g.id,
        nome: g.nome,
        costo: g.costo,
      })),
      // Dati Step 3 — Scommesse generiche Bonus/Malus sui giudici
      scommesse: squadra.scommesse.map(s => ({
        giudice_id: s.giudice_id,
        nomeGiudice: s.nomeGiudice,
        azione: s.azione,
        punti: s.punti,
      })),
      // Metadati
      budgetResiduo: budget,
      timestamp: new Date().toISOString(),
    };

    console.log('PAYLOAD PRONTO PER SUPABASE:', payload);
    // Una volta verificato il payload, si procede con il salvataggio effettivo
    salvaSquadraSuSupabase();
  };

  const salvaSquadraSuSupabase = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // 1. Inserisci Squadra (colore random per la grafica)
      const coloriMock = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7'];
      const coloreScelto = coloriMock[Math.floor(Math.random() * coloriMock.length)];
      
      const { data: squadraInserita, error: errSquadra } = await supabase
        .from('squadre')
        .insert({
          nome: squadra.nome,
          capitano: 'Capitano1',
          colore: coloreScelto,
          budget_iniziale_fp: 100
        })
        .select()
        .single();

      if (errSquadra) throw errSquadra;
      const idSquadraGenerato = squadraInserita.id_squadra;

      // 2. Inserisci Partecipazioni
      if (squadra.giochiSelezionati.length > 0) {
        const recordPartecipazioni = squadra.giochiSelezionati.map(g => ({
          id_squadra: idSquadraGenerato,
          id_gioco: g.id,
          costo_pagato_fp: g.costo
        }));

        const { data: partInserite, error: errPart } = await supabase
          .from('partecipazioni')
          .insert(recordPartecipazioni)
          .select();

        if (errPart) throw errPart;

        // 3. Inserisci Scommesse
        if (squadra.scommesse.length > 0) {
          const recordScommesse = squadra.scommesse.map(s => {
            const partecipazione = partInserite.find(p => p.id_gioco === s.id_gioco);
            return {
              id_partecipazione: partecipazione.id_partecipazione,
              id_giudice: s.id_giudice,
              azione_predetta: s.azione_predetta,
              bonus_potenziale_fp: s.bonus_potenziale_fp
            };
          });

          const { error: errScom } = await supabase
            .from('scommesse_del_capitano')
            .insert(recordScommesse);

          if (errScom) throw errScom;
        }
      }

      setSubmitSuccess(true);
      setStepAttuale(5);
    } catch (err) {
      console.error("Errore salvataggio:", err);
      setSubmitError("Errore durante il salvataggio. Riprova.");
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

          <div className="ml-auto flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
            <span className="font-bold text-blue-800 hidden md:inline">FantaPunti:</span>
            <span className="font-black text-2xl text-blue-600">{budget}</span>
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

              {stepAttuale === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
                  <div className="shrink-0">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">1</span>
                      Scelta Giochi
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Scegli i giochi su cui puntare. Attento al costo in FantaPunti!</p>
                  </div>

                  {isLoadingDb ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 flex-1">
                      <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
                      <p className="text-sm font-bold">Caricamento giochi...</p>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-2">
                      {giochiDb.map(gioco => {
                        const isSelected = squadra.giochiSelezionati.find(g => g.id === gioco.id);
                        return (
                          <div
                            key={gioco.id}
                            onClick={() => toggleGioco(gioco)}
                            className={`
                              p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between
                              ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.02]' : 'border-gray-100 bg-white hover:border-gray-300'}
                            `}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${gioco.colore}`}>
                                {gioco.icon}
                              </div>
                              <span className="font-bold text-gray-800">{gioco.nome}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-400">{gioco.costo} pt</span>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {isSelected ? <Minus size={14} /> : <Plus size={14} />}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  <button onClick={() => setStepAttuale(3)} className="w-full shrink-0 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-auto">
                    Prosegui alle Scommesse <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* === STEP 3 — Scommesse generiche Bonus/Malus sui giudici === */}
              {stepAttuale === 3 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
                  <div className="shrink-0">
                    <h4 className="font-bold text-gray-700 flex items-center gap-2">
                      <span className="bg-yellow-100 text-yellow-700 w-6 h-6 flex items-center justify-center rounded-full text-sm">2</span>
                      Scommesse Bonus / Malus
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">Crea pronostici sui giudici: assegna punti positivi (bonus) o negativi (malus).</p>
                  </div>

                  {isLoadingDb ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 flex-1">
                      <Loader2 className="animate-spin mb-2 text-yellow-500" size={32} />
                      <p className="text-sm font-bold">Caricamento giudici...</p>
                    </div>
                  ) : (
                    <>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shrink-0">
                        {/* Select del Giudice */}
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

                        {/* Input Azione Bonus/Malus */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Azione Bonus/Malus</label>
                          <input
                            type="text"
                            placeholder="Es: Si tuffa vestito, Cade dalla sedia..."
                            value={nuovaScommessa.azione}
                            onChange={e => setNuovaScommessa({...nuovaScommessa, azione: e.target.value})}
                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          />
                        </div>

                        {/* Input Punti (Bonus positivo / Malus negativo) */}
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Punti (Bonus/Malus)</label>
                          <input
                            type="number"
                            placeholder="Es: 5, -3, 10"
                            value={nuovaScommessa.punti}
                            onChange={e => setNuovaScommessa({...nuovaScommessa, punti: e.target.value})}
                            className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          />
                          <p className="text-xs text-gray-400 mt-1">Positivo = bonus, negativo = malus</p>
                        </div>

                        <button
                          onClick={aggiungiScommessa}
                          disabled={!nuovaScommessa.id_giudice || !nuovaScommessa.azione || nuovaScommessa.punti === ''}
                          className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                          Aggiungi Scommessa
                        </button>
                      </div>

                      {/* Lista scommesse aggiunte */}
                      <div className="flex-1 overflow-y-auto pr-2 mt-2">
                        {squadra.scommesse.length > 0 && (
                          <div className="space-y-2 pb-2">
                            <h5 className="font-bold text-xs uppercase text-gray-500 mt-2">Le tue scommesse:</h5>
                            {squadra.scommesse.map(s => (
                              <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-lg border shadow-sm relative overflow-hidden"
                                style={{ borderColor: s.punti >= 0 ? '#bbf7d0' : '#fecaca' }}
                              >
                                {/* Barra laterale colorata: verde bonus, rossa malus */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.punti >= 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                <div className="pl-2">
                                  <div className="text-xs font-bold text-gray-400 mb-1">{s.nomeGiudice}</div>
                                  <div className="text-sm font-bold text-gray-800">"{s.azione}"</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`font-bold text-xs px-2 py-1 rounded ${
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

                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold mt-2 shadow-sm">
                    Budget residuo: {budget} FP
                  </div>
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                  <div>
                    <h4 className="font-bold text-sm text-gray-400 uppercase mb-3 border-b border-gray-100 pb-1 sticky top-0 bg-white/95 z-10 py-1">Roster Giochi</h4>
                    {squadra.giochiSelezionati.length === 0 ? (
                      <div className="h-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        Nessun gioco selezionato
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {squadra.giochiSelezionati.map(g => (
                          <span key={g.id} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${g.colore} flex items-center gap-1`}>
                            {g.nome}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-gray-400 uppercase mb-3 border-b border-gray-100 pb-1 sticky top-0 bg-white/95 z-10 py-1">Pronostici</h4>
                    {squadra.scommesse.length === 0 ? (
                      <div className="h-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                        Nessun pronostico
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {squadra.scommesse.map(s => (
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
                    disabled={!selectedSquadra || squadra.giochiSelezionati.length === 0 || isSubmitting || submitSuccess || stepAttuale < 4}
                    className={`
                      w-full py-4 rounded-xl font-black text-lg transition-all shadow-md flex justify-center items-center gap-2
                      ${selectedSquadra && squadra.giochiSelezionati.length > 0 && !submitSuccess && !isSubmitting && stepAttuale >= 4
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