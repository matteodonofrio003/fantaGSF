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
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  CalendarClock,
  Save,
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
  const [actionLoading, setActionLoading] = useState({});
  const [feedback, setFeedback] = useState(null);

  // --- FILTRO ---
  const [filtroStato, setFiltroStato] = useState('tutti');

  // --- CONTROLLO SERATA (modello ibrido: data + override) ---
  const [serataConfig, setSerataConfig] = useState(null);   // risultato di get_serata_corrente
  const [dataInizioInput, setDataInizioInput] = useState(''); // YYYY-MM-DD
  const [overrideInput, setOverrideInput] = useState('');     // '' = automatica, '1'..'5' = forzata
  const [savingConfig, setSavingConfig] = useState(false);

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
    }
  }, [isAutenticato, fetchScommesse, fetchSerataConfig]);

  const validaScommessa = async (idScommessa, indovinata) => {
    setActionLoading(prev => ({ ...prev, [idScommessa]: true }));
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc('valida_scommessa', {
        p_scommessa_id: idScommessa,
        p_indovinata: indovinata,
        p_pin: pinSalvato,
      });

      if (error) throw error;

      if (data?.success) {
        setScommesse(prev => prev.map(s =>
          s.id_scommessa === idScommessa
            ? { ...s, indovinata, validata_il: new Date().toISOString() }
            : s
        ));
        setFeedback({
          type: 'success',
          text: `Scommessa #${idScommessa} segnata come ${indovinata ? '✅ indovinata' : '❌ fallita'}.`,
        });
      } else {
        if (data?.error?.includes('PIN')) {
          setIsAutenticato(false);
          setPinSalvato('');
        }
        setFeedback({ type: 'error', text: data?.error || 'Errore sconosciuto.' });
      }
    } catch (err) {
      console.error('Errore validazione:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante la validazione.' });
    } finally {
      setActionLoading(prev => ({ ...prev, [idScommessa]: false }));
    }
  };

  const resetScommessa = async (idScommessa) => {
    setActionLoading(prev => ({ ...prev, [idScommessa]: true }));
    setFeedback(null);

    try {
      const { data, error } = await supabase.rpc('reset_scommessa', {
        p_scommessa_id: idScommessa,
        p_pin: pinSalvato,
      });

      if (error) throw error;

      if (data?.success) {
        setScommesse(prev => prev.map(s =>
          s.id_scommessa === idScommessa
            ? { ...s, indovinata: null, validata_il: null }
            : s
        ));
        setFeedback({ type: 'success', text: `Scommessa #${idScommessa} rimessa in attesa.` });
      } else {
        setFeedback({ type: 'error', text: data?.error || 'Errore nel reset.' });
      }
    } catch (err) {
      console.error('Errore reset:', err);
      setFeedback({ type: 'error', text: 'Errore di rete durante il reset.' });
    } finally {
      setActionLoading(prev => ({ ...prev, [idScommessa]: false }));
    }
  };

  const handleLogout = () => {
    setIsAutenticato(false);
    setPinSalvato('');
    setPin('');
    setScommesse([]);
    setFeedback(null);
    setSerataConfig(null);
  };

  const scommesseFiltrate = scommesse.filter(s => {
    if (filtroStato === 'in_attesa') return s.indovinata === null;
    if (filtroStato === 'indovinata') return s.indovinata === true;
    if (filtroStato === 'fallita') return s.indovinata === false;
    return true;
  });

  const conteggi = {
    tutti: scommesse.length,
    in_attesa: scommesse.filter(s => s.indovinata === null).length,
    indovinata: scommesse.filter(s => s.indovinata === true).length,
    fallita: scommesse.filter(s => s.indovinata === false).length,
  };

  const renderStatoBadge = (indovinata) => {
    if (indovinata === null) {
      return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">⏳ In attesa</span>;
    }
    if (indovinata === true) {
      return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">✅ Indovinata</span>;
    }
    return <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">❌ Fallita</span>;
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

        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'tutti', label: 'Tutte', color: 'bg-slate-700 text-slate-300' },
            { key: 'in_attesa', label: '⏳ In attesa', color: 'bg-gray-700 text-gray-300' },
            { key: 'indovinata', label: '✅ Indovinate', color: 'bg-green-900/50 text-green-400' },
            { key: 'fallita', label: '❌ Fallite', color: 'bg-red-900/50 text-red-400' },
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
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Giudice</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Azione</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Punti</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Stato</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {scommesseFiltrate.map(s => (
                  <tr key={s.id_scommessa} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-white">{s.nome_squadra}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{s.nome_giudice}</td>
                    <td className="px-4 py-3 max-w-[250px]">
                      <span className="text-slate-300 italic truncate block">"{s.azione_scelta}"</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${s.punti >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {s.punti >= 0 ? '+' : ''}{s.punti}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {renderStatoBadge(s.indovinata)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {actionLoading[s.id_scommessa] ? (
                        <Loader2 className="animate-spin text-amber-400 mx-auto" size={20} />
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => validaScommessa(s.id_scommessa, true)}
                            disabled={s.indovinata === true}
                            className="p-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/40 text-green-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                            title="Segna come indovinata"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => validaScommessa(s.id_scommessa, false)}
                            disabled={s.indovinata === false}
                            className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                            title="Segna come fallita"
                          >
                            <XCircle size={16} />
                          </button>
                          {s.indovinata !== null && (
                            <button
                              onClick={() => resetScommessa(s.id_scommessa)}
                              className="p-1.5 rounded-lg bg-slate-600/30 hover:bg-slate-600/60 text-slate-400 hover:text-white transition-colors"
                              title="Rimetti in attesa"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-center text-slate-600 text-xs">
          {scommesse.length > 0 && (
            <p>Totale: {conteggi.tutti} scommesse — {conteggi.in_attesa} in attesa, {conteggi.indovinata} indovinate, {conteggi.fallita} fallite</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default AreaStaff;