import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
  Shield,
  ShieldCheck,
  Loader2,
  RefreshCw,
  LogOut,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  CalendarClock,
  Save,
  Sparkles,
  ListChecks,
  Calculator,
  Users,
} from 'lucide-react';

const AreaStaff = () => {
  // --- STATI DI AUTENTICAZIONE ---
  const [pin, setPin] = useState('');
  const [pinSalvato, setPinSalvato] = useState('');
  const [isAutenticato, setIsAutenticato] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [mostraPin, setMostraPin] = useState(false);

  // --- STATI DATI ---
  const [scommesse, setScommesse] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // --- FILTRO ---
  const [filtroStato, setFiltroStato] = useState('tutti');

  // --- CONTROLLO SERATA (modello ibrido: data + override) ---
  const [serataConfig, setSerataConfig] = useState(null);   // risultato di get_serata_corrente
  const [dataInizioInput, setDataInizioInput] = useState(''); // YYYY-MM-DD
  const [overrideInput, setOverrideInput] = useState('');     // '' = automatica, '1'..'5' = forzata
  const [savingConfig, setSavingConfig] = useState(false);

  // --- SVELAMENTO FINALE (master switch pubblico) ---
  const [svelamentoAttivo, setSvelamentoAttivo] = useState(false);
  const [svelamentoLoading, setSvelamentoLoading] = useState(false);

  // --- CLASSIFICA PUBBLICA (master switch pubblico) ---
  const [classificaPubblica, setClassificaPubblica] = useState(false);
  const [classificaPubblicaLoading, setClassificaPubblicaLoading] = useState(false);

  // --- CONFIGURAZIONE AZIONI SERATA (10 azioni per serata) ---
  const [azioniInputs, setAzioniInputs] = useState(Array(10).fill(''));
  const [azioniLoading, setAzioniLoading] = useState(false);

  // --- CONFIGURAZIONE MALUS SERATA (5 malus per serata) ---
  const [malusInputs, setMalusInputs] = useState(Array(5).fill(''));
  const [malusLoading, setMalusLoading] = useState(false);

  // --- CALCOLO RISULTATI GIUDICI ---
  const [giudiciList, setGiudiciList] = useState([]);
  const [bonusGiudici, setBonusGiudici] = useState({});
  const [malusGiudici, setMalusGiudici] = useState({});
  const [calcoloLoading, setCalcoloLoading] = useState(false);

  const fetchGiudici = async () => {
    try {
      const { data, error } = await supabase.from('giudici').select('*').order('nome');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Errore fetch giudici:', err);
      return [];
    }
  };

  const fetchAzioniSerata = useCallback(async (serata) => {
    if (!serata) return;
    try {
      const { data, error } = await supabase.rpc('get_azioni_serata', { p_serata: serata });
      if (error) throw error;
      if (data && data.length > 0) {
        setAzioniInputs(data.map(a => a.descrizione).concat(Array(10 - data.length).fill('')));
      } else {
        setAzioniInputs(Array(10).fill(''));
      }
    } catch (err) {
      console.error('Errore fetch azioni serata:', err);
    }
  }, []);

  const salvaAzioni = async () => {
    const serata = serataConfig?.serata;
    if (!serata) {
      setFeedback({ type: 'error', text: 'Nessuna serata in corso. Impossibile salvare le azioni.' });
      return;
    }
    setAzioniLoading(true);
    setFeedback(null);
    try {
      const azioniValide = azioniInputs.filter(a => a.trim() !== '');
      if (azioniValide.length !== 10) {
        setFeedback({ type: 'error', text: 'Devi inserire esattamente 10 azioni.' });
        return;
      }
      const { data, error } = await supabase.rpc('salva_azioni_serata', {
        p_pin: pinSalvato,
        p_serata: serata,
        p_azioni: azioniValide,
      });
      if (error) throw error;
      if (data?.success) {
        setFeedback({ type: 'success', text: `10 azioni salvate per la Serata ${serata}.` });
      } else {
        setFeedback({ type: 'error', text: data?.error || 'Errore nel salvataggio.' });
      }
    } catch (err) {
      console.error('Errore salvataggio azioni:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il salvataggio.' });
    } finally {
      setAzioniLoading(false);
    }
  };

  const fetchMalusSerata = useCallback(async (serata) => {
    if (!serata) return;
    try {
      const { data, error } = await supabase.rpc('get_malus_serata', { p_serata: serata });
      if (error) throw error;
      if (data && data.length > 0) {
        setMalusInputs(data.map(m => m.descrizione).concat(Array(5 - data.length).fill('')));
      } else {
        setMalusInputs(Array(5).fill(''));
      }
    } catch (err) {
      console.error('Errore fetch malus serata:', err);
    }
  }, []);

  const salvaMalus = async () => {
    const serata = serataConfig?.serata;
    if (!serata) {
      setFeedback({ type: 'error', text: 'Nessuna serata in corso. Impossibile salvare i malus.' });
      return;
    }
    setMalusLoading(true);
    setFeedback(null);
    try {
      const malusValidi = malusInputs.filter(m => m.trim() !== '');
      if (malusValidi.length !== 5) {
        setFeedback({ type: 'error', text: 'Devi inserire esattamente 5 malus.' });
        return;
      }
      const { data, error } = await supabase.rpc('salva_malus_serata', {
        p_pin: pinSalvato,
        p_serata: serata,
        p_malus: malusValidi,
      });
      if (error) throw error;
      if (data?.success) {
        setFeedback({ type: 'success', text: `5 malus salvati per la Serata ${serata}.` });
      } else {
        setFeedback({ type: 'error', text: data?.error || 'Errore nel salvataggio.' });
      }
    } catch (err) {
      console.error('Errore salvataggio malus:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il salvataggio.' });
    } finally {
      setMalusLoading(false);
    }
  };

  const calcolaPunteggi = async () => {
    const serata = serataConfig?.serata;
    if (!serata) {
      setFeedback({ type: 'error', text: 'Nessuna serata in corso.' });
      return;
    }
    setCalcoloLoading(true);
    setFeedback(null);
    try {
      // Filtra le scommesse della serata corrente
      const scommesseSerata = scommesse.filter(s => s.num_serata === serata);
      if (scommesseSerata.length === 0) {
        setFeedback({ type: 'error', text: 'Nessuna scommessa trovata per questa serata.' });
        return;
      }

      let count = 0;
      for (const s of scommesseSerata) {
        // Calcola punteggio per i 3 giudici scelti
        let punteggio = 0;
        for (const n of [1, 2, 3]) {
          const gid = s[`giudice_${n}_id`];
          if (gid == null) continue;
          const bonus = Number(bonusGiudici[gid]) || 0;
          const malus = Number(malusGiudici[gid]) || 0;
          const giudice = giudiciList.find(g => g.id_giudice === gid);
          const base = giudice?.punteggio_base || 0;
          punteggio += (bonus - malus) * base;
        }

        // Aggiorna nel DB
        const { data, error } = await supabase.rpc('set_punteggio_scommessa', {
          p_pin: pinSalvato,
          p_scommessa_id: s.id_scommessa,
          p_punteggio: punteggio,
        });
        if (error) throw error;
        if (!data?.success) {
          if (data?.error?.includes('PIN')) {
            setIsAutenticato(false);
            setPinSalvato('');
          }
          throw new Error(data?.error || 'Errore salvataggio punteggio');
        }
        count++;
      }

      // Aggiorna lo stato locale per mostrare subito i punteggi
      setScommesse(prev => prev.map(s => {
        if (s.num_serata !== serata) return s;
        let punteggio = 0;
        for (const n of [1, 2, 3]) {
          const gid = s[`giudice_${n}_id`];
          if (gid == null) continue;
          const bonus = Number(bonusGiudici[gid]) || 0;
          const malus = Number(malusGiudici[gid]) || 0;
          const giudice = giudiciList.find(g => g.id_giudice === gid);
          const base = giudice?.punteggio_base || 0;
          punteggio += (bonus - malus) * base;
        }
        return { ...s, punteggio_ottenuto: punteggio };
      }));

      setFeedback({
        type: 'success',
        text: `Punteggi calcolati! ${count} scommesse aggiornate per la Serata ${serata}.`,
      });
    } catch (err) {
      console.error('Errore calcolo punteggi:', err);
      setFeedback({ type: 'error', text: err.message || 'Errore di rete durante il calcolo.' });
    } finally {
      setCalcoloLoading(false);
    }
  };

  const fetchSerataConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_serata_corrente');
      if (error) throw error;
      setSerataConfig(data);
      setDataInizioInput(data?.data_inizio || '');
      setOverrideInput(data?.override != null ? String(data.override) : '');
    } catch (err) {
      console.error('Errore lettura config serata:', err);
    }
  }, []);

  const salvaConfigSerata = async () => {
    setSavingConfig(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.rpc('set_config_serata', {
        p_pin: pinSalvato,
        p_data_inizio: dataInizioInput || null,
        p_serata_override: overrideInput === '' ? null : Number(overrideInput),
      });

      if (error) throw error;

      if (data?.success) {
        setFeedback({ type: 'success', text: 'Configurazione serata aggiornata.' });
        await fetchSerataConfig();
      } else {
        if (data?.error?.includes('PIN')) {
          setIsAutenticato(false);
          setPinSalvato('');
        }
        setFeedback({ type: 'error', text: data?.error || 'Errore nel salvataggio.' });
      }
    } catch (err) {
      console.error('Errore salvataggio config serata:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il salvataggio.' });
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchStatoSvelamento = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_stato_svelamento');
      if (error) throw error;
      setSvelamentoAttivo(Boolean(data?.attivo));
    } catch (err) {
      console.error('Errore lettura stato svelamento:', err);
    }
  }, []);

  const toggleSvelamento = async () => {
    const nuovoStato = !svelamentoAttivo;
    setSvelamentoLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.rpc('toggle_svelamento', {
        p_pin: pinSalvato,
        p_stato: nuovoStato,
      });

      if (error) throw error;

      if (data?.success) {
        setSvelamentoAttivo(Boolean(data.svelamento_attivo));
        setFeedback({
          type: 'success',
          text: nuovoStato
            ? '🎉 Svelamento Finale ATTIVATO: lo storico è ora pubblico!'
            : 'Svelamento Finale disattivato: i segreti sono di nuovo sigillati.',
        });
      } else {
        if (data?.error?.includes('PIN')) {
          setIsAutenticato(false);
          setPinSalvato('');
        }
        setFeedback({ type: 'error', text: data?.error || 'Errore nel cambio di stato.' });
      }
    } catch (err) {
      console.error('Errore toggle svelamento:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il cambio di stato.' });
    } finally {
      setSvelamentoLoading(false);
    }
  };

  const fetchScommesse = useCallback(async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      // Lettura BLINDATA: solo via RPC SECURITY DEFINER con PIN (zero-trust).
      // La SELECT diretta sulla tabella è ora negata dalla RLS.
      const { data, error } = await supabase.rpc('get_scommesse_staff', {
        p_pin: pinSalvato,
      });

      if (error) throw error;

      // La RPC restituisce già una struttura PIATTA (nome_squadra/nome_giudice inclusi).
      const scommesseFlatten = (data || []).map(s => ({
        ...s,
        nome_squadra: s.nome_squadra || '—',
        nome_giudice: s.nome_giudice || '—',
      }));

      setScommesse(scommesseFlatten);
    } catch (err) {
      console.error('Errore fetch scommesse staff:', err);
      setFeedback({ type: 'error', text: 'Errore nel caricamento delle scommesse.' });
    } finally {
      setIsLoading(false);
    }
  }, [pinSalvato]);

  const fetchStatoClassificaPubblica = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_stato_classifica_pubblica');
      if (error) throw error;
      setClassificaPubblica(Boolean(data?.attivo));
    } catch (err) {
      console.error('Errore lettura stato classifica pubblica:', err);
    }
  }, []);

  const toggleClassificaPubblica = async () => {
    const nuovoStato = !classificaPubblica;
    setClassificaPubblicaLoading(true);
    setFeedback(null);
    try {
      const { data, error } = await supabase.rpc('toggle_classifica_pubblica', {
        p_pin: pinSalvato,
        p_stato: nuovoStato,
      });

      if (error) throw error;

      if (data?.success) {
        setClassificaPubblica(Boolean(data.classifica_pubblica));
        setFeedback({
          type: 'success',
          text: nuovoStato
            ? 'Classifica Pubblica ATTIVATA: la classifica e visibile a tutti!'
            : 'Classifica Pubblica disattivata: la classifica e di nuovo nascosta.',
        });
      } else {
        if (data?.error?.includes('PIN')) {
          setIsAutenticato(false);
          setPinSalvato('');
        }
        setFeedback({ type: 'error', text: data?.error || 'Errore nel cambio di stato.' });
      }
    } catch (err) {
      console.error('Errore toggle classifica pubblica:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il cambio di stato.' });
    } finally {
      setClassificaPubblicaLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.rpc('verifica_pin_staff', { p_pin: pin });

      if (error) throw error;

      if (data?.success) {
        setPinSalvato(pin);
        setIsAutenticato(true);
      } else {
        setLoginError(data?.error || 'PIN non valido.');
      }
    } catch (err) {
      console.error('Errore verifica PIN:', err);
      setLoginError('Errore di connessione al server.');
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isAutenticato) {
      fetchScommesse();
      fetchSerataConfig();
      fetchStatoSvelamento();
      fetchStatoClassificaPubblica();
    }
  }, [isAutenticato, fetchScommesse, fetchSerataConfig, fetchStatoSvelamento, fetchStatoClassificaPubblica]);

  useEffect(() => {
    if (serataConfig?.serata) {
      fetchAzioniSerata(serataConfig.serata);
      fetchMalusSerata(serataConfig.serata);
    }
  }, [serataConfig, fetchAzioniSerata, fetchMalusSerata]);

  useEffect(() => {
    if (isAutenticato) {
      fetchGiudici().then(giudici => {
        setGiudiciList(giudici);
        const bInit = {};
        const mInit = {};
        giudici.forEach(g => { bInit[g.id_giudice] = ''; mInit[g.id_giudice] = ''; });
        setBonusGiudici(bInit);
        setMalusGiudici(mInit);
      });
    }
  }, [isAutenticato]);

  const handleLogout = () => {
    setIsAutenticato(false);
    setPinSalvato('');
    setPin('');
    setScommesse([]);
    setFeedback(null);
    setSerataConfig(null);
  };

  const scommesseFiltrate = scommesse.filter(s => {
    if (filtroStato === 'in_attesa') return (s.punteggio_ottenuto || 0) === 0;
    if (filtroStato === 'calcolate') return (s.punteggio_ottenuto || 0) > 0;
    return true;
  });

  const conteggi = {
    tutti: scommesse.length,
    in_attesa: scommesse.filter(s => (s.punteggio_ottenuto || 0) === 0).length,
    calcolate: scommesse.filter(s => (s.punteggio_ottenuto || 0) > 0).length,
  };

  if (!isAutenticato) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
              <Shield className="text-amber-400" size={40} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider">Area Staff</h1>
            <p className="text-slate-400 text-sm mt-1">Pannello Regia — Fanta GSF</p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl">
            <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
              <Lock size={12} className="inline mr-1" />
              PIN di Accesso
            </label>

            <div className="relative mb-4">
              <input
                type={mostraPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Inserisci il PIN"
                className="w-full p-3.5 pr-12 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold text-lg tracking-widest focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all placeholder:text-slate-600 placeholder:text-sm placeholder:tracking-normal"
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

            {loginError && (
              <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-bold text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading || !pin.trim()}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <><Loader2 className="animate-spin" size={18} /> Verifica...</>
              ) : (
                <><ShieldCheck size={18} /> Accedi</>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-slate-600 text-xs">
            <a href="#/" className="hover:text-slate-400 transition-colors">← Torna all'app</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <header className="bg-slate-800 border-b-2 border-amber-500/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-amber-400" size={24} />
            <div>
              <h1 className="text-lg font-black text-white uppercase tracking-wider leading-tight">Area Staff</h1>
              <p className="text-xs text-slate-400 leading-tight">Pannello Regia</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchScommesse}
              disabled={isLoading}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
              title="Aggiorna dati"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-red-600/80 rounded-lg text-slate-300 hover:text-white text-xs font-bold transition-all"
            >
              <LogOut size={14} />
              Esci
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {feedback && (
          <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-bold border flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {feedback.text}
          </div>
        )}

        {/* CONTROLLO SERATA (modello ibrido: data + override staff) */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="text-amber-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Controllo Serata</h2>
            {serataConfig && (
              <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-600">
                {serataConfig.serata != null ? (
                  <span className="text-amber-400">
                    Serata in corso: <span className="text-white">{serataConfig.serata}</span>
                    <span className="text-slate-500"> ({serataConfig.fonte === 'override' ? 'forzata' : 'da data'})</span>
                  </span>
                ) : (
                  <span className="text-slate-400">Nessuna serata aperta</span>
                )}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Data di inizio (Serata 1) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Data Serata 1
              </label>
              <input
                type="date"
                value={dataInizioInput}
                onChange={(e) => setDataInizioInput(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 mt-1">Le 5 serate sono giorni consecutivi.</p>
            </div>

            {/* Override manuale */}
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                Serata attiva
              </label>
              <select
                value={overrideInput}
                onChange={(e) => setOverrideInput(e.target.value)}
                className="w-full p-2.5 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all"
              >
                <option value="">Automatica (per data)</option>
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>Forza Serata {n}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">Override per ritardi/rinvii.</p>
            </div>

            {/* Salva */}
            <button
              onClick={salvaConfigSerata}
              disabled={savingConfig}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingConfig ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salva
            </button>
          </div>
        </div>

        {/* SVELAMENTO FINALE — Master Switch pubblico (gran finale) */}
        <div className={`mb-6 rounded-2xl p-5 border transition-all ${
          svelamentoAttivo
            ? 'bg-gradient-to-br from-emerald-900/40 to-teal-900/20 border-emerald-500/50 shadow-lg shadow-emerald-900/30'
            : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            {svelamentoAttivo
              ? <Unlock className="text-emerald-400" size={20} />
              : <Lock className="text-amber-400" size={20} />}
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Svelamento Finale</h2>
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${
              svelamentoAttivo
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                : 'bg-slate-900 text-slate-400 border-slate-600'
            }`}>
              {svelamentoAttivo ? <><Sparkles size={11} /> ATTIVO — PUBBLICO</> : 'SIGILLATO'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-snug max-w-2xl">
            Sblocca la schermata pubblica che mostra a tutti lo storico completo delle scommesse di ogni squadra.
            Attivalo solo a fine evento per il gran finale.
          </p>

          <div className="mt-4 flex items-center justify-between gap-4">
            <a
              href="#/svelamento"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              title="Apri l'anteprima dello svelamento in una nuova scheda"
            >
              <Eye size={15} /> Anteprima schermata
            </a>

            {/* Toggle prominente */}
            <button
              onClick={toggleSvelamento}
              disabled={svelamentoLoading}
              role="switch"
              aria-checked={svelamentoAttivo}
              className={`group relative flex items-center gap-3 pl-4 pr-2 py-2 rounded-full font-black uppercase tracking-wider text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                svelamentoAttivo
                  ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {svelamentoLoading
                ? <Loader2 className="animate-spin" size={16} />
                : <span>{svelamentoAttivo ? 'Attivo' : 'Disattivo'}</span>}
              <span className={`flex items-center w-12 h-7 rounded-full p-1 transition-all ${
                svelamentoAttivo ? 'bg-emerald-900/50 justify-end' : 'bg-slate-900 justify-start'
              }`}>
                <span className="w-5 h-5 rounded-full bg-white shadow" />
              </span>
            </button>
          </div>
        </div>

        {/* CLASSIFICA PUBBLICA — Master Switch (visibile a tutti, anche prima della Serata 5) */}
        <div className={`mb-6 rounded-2xl p-5 border transition-all ${
          classificaPubblica
            ? 'bg-gradient-to-br from-blue-900/40 to-violet-900/20 border-blue-500/50 shadow-lg shadow-blue-900/30'
            : 'bg-slate-800 border-slate-700'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            {classificaPubblica
              ? <Unlock className="text-blue-400" size={20} />
              : <Lock className="text-amber-400" size={20} />}
            <h2 className="text-sm font-black text-white uppercase tracking-wider">Classifica Pubblica</h2>
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full border ${
              classificaPubblica
                ? 'bg-blue-500/20 text-blue-300 border-blue-400/40'
                : 'bg-slate-900 text-slate-400 border-slate-600'
            }`}>
              {classificaPubblica ? <><Sparkles size={11} /> VISIBILE</> : 'NASCOSTA'}
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-snug max-w-2xl">
            Rende la classifica generale visibile a tutti in qualsiasi momento, anche prima della Serata 5.
            Disattivalo per nascondere nuovamente la classifica.
          </p>

          <div className="mt-4 flex items-center justify-between gap-4">
            <a
              href="#/classifica"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              title="Apri la classifica in una nuova scheda"
            >
              <Eye size={15} /> Anteprima classifica
            </a>

            <button
              onClick={toggleClassificaPubblica}
              disabled={classificaPubblicaLoading}
              role="switch"
              aria-checked={classificaPubblica}
              className={`group relative flex items-center gap-3 pl-4 pr-2 py-2 rounded-full font-black uppercase tracking-wider text-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                classificaPubblica
                  ? 'bg-blue-500 text-slate-900 shadow-lg shadow-blue-500/30 hover:bg-blue-400'
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              {classificaPubblicaLoading
                ? <Loader2 className="animate-spin" size={16} />
                : <span>{classificaPubblica ? 'Attivo' : 'Disattivo'}</span>}
              <span className={`flex items-center w-12 h-7 rounded-full p-1 transition-all ${
                classificaPubblica ? 'bg-blue-900/50 justify-end' : 'bg-slate-900 justify-start'
              }`}>
                <span className="w-5 h-5 rounded-full bg-white shadow" />
              </span>
            </button>
          </div>
        </div>

        {/* CONFIGURA 10 AZIONI DELLA SERATA */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="text-amber-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Configura 10 Azioni — Serata {serataConfig?.serata || '?'}
            </h2>
            <span className="ml-auto text-[10px] font-bold text-slate-500 uppercase">
              {azioniInputs.filter(a => a.trim() !== '').length}/10
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Inserisci esattamente 10 azioni che i giudici potranno compiere durante la serata.
            I capitani le vedranno in sola lettura.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {azioniInputs.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-600 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const next = [...azioniInputs];
                    next[idx] = e.target.value;
                    setAzioniInputs(next);
                  }}
                  placeholder={`Azione ${idx + 1}...`}
                  className="flex-1 p-2.5 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            ))}
          </div>
          <button
            onClick={salvaAzioni}
            disabled={azioniLoading || !serataConfig?.serata}
            className="mt-4 w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {azioniLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Salva 10 Azioni
          </button>
        </div>

        {/* CONFIGURA 5 MALUS DELLA SERATA */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="text-red-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Configura 5 Malus — Serata {serataConfig?.serata || '?'}
            </h2>
            <span className="ml-auto text-[10px] font-bold text-slate-500 uppercase">
              {malusInputs.filter(m => m.trim() !== '').length}/5
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Inserisci esattamente 5 malus. Se un giudice compie un malus, il punteggio viene ridotto: (bonus - malus) x punteggio base.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {malusInputs.map((val, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-red-900/30 border border-red-800/40 flex items-center justify-center text-xs font-black text-red-400 shrink-0">
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => {
                    const next = [...malusInputs];
                    next[idx] = e.target.value;
                    setMalusInputs(next);
                  }}
                  placeholder={`Malus ${idx + 1}...`}
                  className="flex-1 p-2.5 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold text-sm focus:border-red-400 focus:ring-2 focus:ring-red-400/30 outline-none transition-all placeholder:text-slate-600"
                />
              </div>
            ))}
          </div>
          <button
            onClick={salvaMalus}
            disabled={malusLoading || !serataConfig?.serata}
            className="mt-4 w-full py-2.5 bg-red-500 hover:bg-red-400 text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {malusLoading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Salva 5 Malus
          </button>
        </div>

        {/* PUNTEGGI BASE GIUDICI */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="text-amber-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Punteggi Base Giudici
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Imposta il punteggio base di ogni giudice (moltiplicatore per le azioni compiute). Es: +5 = ogni azione del giudice vale 5 pt per la squadra.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {giudiciList.map(g => (
              <div key={g.id_giudice} className="flex items-center gap-2 bg-slate-900/50 rounded-xl px-3 py-2.5 border border-slate-700">
                <span className="text-sm font-bold text-slate-200 truncate flex-1">{g.nome}</span>
                <input
                  type="number"
                  defaultValue={g.punteggio_base || 0}
                  onBlur={async (e) => {
                    const val = Number(e.target.value);
                    if (isNaN(val)) return;
                    try {
                      const { data, error } = await supabase.rpc('salva_punteggio_giudice', {
                        p_pin: pinSalvato,
                        p_giudice_id: g.id_giudice,
                        p_punteggio: val,
                      });
                      if (error) throw error;
                      if (data?.success) {
                        setGiudiciList(prev =>
                          prev.map(x => x.id_giudice === g.id_giudice ? { ...x, punteggio_base: val } : x)
                        );
                        setFeedback({ type: 'success', text: `${data.nome}: punteggio base = ${val > 0 ? '+' : ''}${val}` });
                      }
                    } catch (err) {
                      console.error('Errore salvataggio punteggio:', err);
                    }
                  }}
                  className="w-20 p-2 bg-slate-900 border-2 border-slate-600 rounded-xl text-white font-bold text-center focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 outline-none transition-all"
                />
                <span className="text-[10px] font-bold text-slate-500">pt/az</span>
              </div>
            ))}
          </div>
        </div>

        {/* CALCOLO RISULTATI GIUDICI */}
        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-amber-400" size={20} />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Calcolo Risultati — Serata {serataConfig?.serata || '?'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Per ogni giudice, indica <span className="text-green-400 font-bold">quanti bonus</span> e <span className="text-red-400 font-bold">quanti malus</span> ha compiuto.
            Formula: <span className="text-amber-300 font-bold">(bonus - malus) x punteggio base</span>.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {Object.keys(bonusGiudici).map(gid => {
              const giudice = giudiciList.find(g => String(g.id_giudice) === String(gid));
              const nomeGiudice = giudice?.nome || gid;
              const puntiBase = giudice?.punteggio_base || 0;
              return (
              <div key={gid} className="flex items-center gap-3 bg-slate-900/50 rounded-xl px-4 py-3 border border-slate-700">
                <Users size={16} className="text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-slate-200 truncate flex-1 min-w-[100px]">
                  {nomeGiudice}
                  {puntiBase !== 0 && (
                    <span className="text-slate-500 text-[10px] ml-1">({puntiBase > 0 ? '+' : ''}{puntiBase} pt)</span>
                  )}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-green-400 uppercase">Bonus</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={bonusGiudici[gid]}
                    onChange={(e) =>
                      setBonusGiudici(prev => ({ ...prev, [gid]: e.target.value }))
                    }
                    className="w-14 p-2 bg-slate-900 border-2 border-green-700 rounded-xl text-green-300 font-bold text-center focus:border-green-400 focus:ring-2 focus:ring-green-400/30 outline-none transition-all"
                  />
                  <span className="text-[10px] font-bold text-slate-500">/10</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-red-400 uppercase">Malus</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={malusGiudici[gid]}
                    onChange={(e) =>
                      setMalusGiudici(prev => ({ ...prev, [gid]: e.target.value }))
                    }
                    className="w-14 p-2 bg-slate-900 border-2 border-red-700 rounded-xl text-red-300 font-bold text-center focus:border-red-400 focus:ring-2 focus:ring-red-400/30 outline-none transition-all"
                  />
                  <span className="text-[10px] font-bold text-slate-500">/5</span>
                </div>
              </div>
              );
            })}
          </div>
          <button
            onClick={calcolaPunteggi}
            disabled={calcoloLoading || !serataConfig?.serata}
            className="mt-4 w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-900 font-black rounded-xl text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {calcoloLoading ? <Loader2 className="animate-spin" size={20} /> : <Calculator size={20} />}
            Calcola e Assegna Punteggi
          </button>
        </div>

        {/* SCOMMESSE DEI CAPITANI */}
        <div className="border-t-2 border-slate-700 pt-5 mb-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2 mb-1">
            <Users size={18} className="text-amber-400" />
            Scommesse dei Capitani
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Stato delle scommesse piazzate. Il punteggio viene calcolato dalla regia con il pannello "Calcolo Risultati" qui sopra.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'tutti', label: 'Tutte', color: 'bg-slate-700 text-slate-300' },
            { key: 'in_attesa', label: '⏳ In attesa calcolo', color: 'bg-gray-700 text-gray-300' },
            { key: 'calcolate', label: '📊 Calcolate', color: 'bg-green-900/50 text-green-400' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroStato(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                filtroStato === f.key
                  ? `${f.color} border-amber-500 ring-1 ring-amber-500/50`
                  : `${f.color} border-transparent hover:border-slate-500 opacity-60 hover:opacity-100`
              }`}
            >
              {f.label} ({conteggi[f.key]})
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="animate-spin mb-3 text-amber-400" size={40} />
            <p className="font-bold text-sm">Caricamento scommesse...</p>
          </div>
        ) : scommesseFiltrate.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p className="font-bold text-lg">Nessuna scommessa trovata</p>
            <p className="text-sm mt-1">Prova a cambiare il filtro o aggiorna i dati.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-left">
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Squadra</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Giudici scelti</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Punteggio</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Serata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {scommesseFiltrate.map(s => (
                  <tr key={s.id_scommessa} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{s.nome_squadra}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3].map(n => {
                          const nome = s[`giudice_${n}_nome`];
                          const punti = s[`giudice_${n}_punti`];
                          if (!nome || nome === '—') return null;
                          return (
                            <span key={n} className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                              {nome}
                              <span className="text-blue-500 text-[10px]">({punti > 0 ? '+' : ''}{punti || 0})</span>
                            </span>
                          );
                        })}
                        {(!s.giudice_1_nome || s.giudice_1_nome === '—') && (
                          <span className="text-xs text-slate-500 italic">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-black text-sm px-2 py-1 rounded-lg ${
                        (s.punteggio_ottenuto || 0) > 0
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-gray-700/30 text-gray-500'
                      }`}>
                        {(s.punteggio_ottenuto || 0) > 0 ? '+' : ''}{s.punteggio_ottenuto || 0} pt
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 border border-slate-600 text-white font-black text-sm">
                        {s.num_serata}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center text-slate-600 text-xs">
          {scommesse.length > 0 && (
            <p>Totale: {conteggi.tutti} scommesse — {conteggi.in_attesa} in attesa di calcolo, {conteggi.calcolate} calcolate</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default AreaStaff;