import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

// --- STEP 1 — Login Capitano + Selezione Squadra ---
// Autenticazione a DUE FASI:
//   • FASE LOGIN  → input "PIN Staff o Password Personale" + RPC login_capitano.
//   • FASE SETUP  → se login_capitano risponde needs_setup:true (primo accesso),
//                   nascondiamo il login e mostriamo "Imposta la tua Password Personale".
//
// Dopo l'autenticazione (login con password OPPURE setup completato) determiniamo
// la serata in corso e decidiamo dove mandare l'utente:
//   • nessuna serata aperta            → Dashboard read-only (Step 6)
//   • serata aperta già giocata        → Dashboard read-only (Step 6)
//   • serata aperta NON ancora giocata → Wizard per piazzare quella scommessa (Step 2)
const Step1Squadra = ({
  squadreDisponibili,
  selectedSquadra,
  setSelectedSquadra,
  squadraSelezionataObj,
  isLoadingDb,
  setStepAttuale,
  setIsCapitanoAutenticato,    // stato globale di auth
  setSerataCorrente,           // numero serata in corso (o null)
  setMostraDashboard,          // true → mostra la Dashboard invece del wizard
  setScommesseGiaEffettuate,   // tutte le scommesse della squadra (per la dashboard)
  setCredenziale,              // salva il segreto (PIN/OTP o password) per submit RPC
}) => {
  // --- Stato del flusso: 'login' (default) | 'setup' (primo accesso) ---
  const [fase, setFase] = useState('login');

  // --- Stati del form di LOGIN ---
  const [secret, setSecret] = useState('');          // PIN/OTP oppure password personale
  const [mostraSecret, setMostraSecret] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // --- Stati del form di SETUP (primo accesso) ---
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [mostraNuovaPassword, setMostraNuovaPassword] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Riporta tutto allo stato iniziale (es. al cambio squadra)
  const resetForm = () => {
    setFase('login');
    setSecret('');
    setLoginError('');
    setNuovaPassword('');
    setConfermaPassword('');
    setSetupError('');
  };

  // Logica condivisa post-autenticazione: serata in corso, scommesse, biforcazione.
  // `credenziale` è il segreto valido da passare alle RPC blindate
  // (la password personale appena usata/impostata, oppure il PIN per squadre legacy).
  const proseguiNellApp = async (credenziale) => {
    // Login/setup riuscito → segna come autenticato e salva la credenziale
    setIsCapitanoAutenticato(true);
    setCredenziale(credenziale);

    // 1) Qual è la serata in corso? (modello ibrido: data + override staff)
    const { data: serataData, error: serataErr } = await supabase.rpc('get_serata_corrente');
    if (serataErr) throw serataErr;
    const serata = serataData?.serata ?? null;
    setSerataCorrente(serata);

    // 2) Carica TUTTE le scommesse della squadra (servono comunque alla dashboard).
    //    Lettura BLINDATA: solo via RPC SECURITY DEFINER con la credenziale (zero-trust).
    //    La RPC valida indifferentemente PIN-OTP o password e restituisce dati piatti
    //    (nome_giudice già incluso).
    const { data: scommesseDb, error: scommesseErr } = await supabase
      .rpc('get_scommesse_squadra', {
        p_squadra_id: Number(selectedSquadra),
        p_secret: credenziale,
      });

    if (scommesseErr) throw scommesseErr;

    const flatten = (scommesseDb || []).map(s => ({
      ...s,
      nome_giudice: s.nome_giudice || '—',
    }));
    setScommesseGiaEffettuate(flatten);

    // 3) Biforcazione
    const haGiocatoStasera = serata != null && flatten.some(s => s.num_serata === serata);

    if (serata == null || haGiocatoStasera) {
      // Nessuna serata aperta, oppure già scommesso per quella in corso → Dashboard
      setMostraDashboard(true);
      setStepAttuale(6);
    } else {
      // Può piazzare la scommessa per la serata in corso → wizard
      setMostraDashboard(false);
      setStepAttuale(2);
    }
  };

  // FASE 1 — Login: verifica il segreto e biforca tra "prosegui" e "imposta password"
  const handleLoginCapitano = async () => {
    if (!selectedSquadra || !secret.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.rpc('login_capitano', {
        p_squadra_id: Number(selectedSquadra),
        p_secret: secret,
      });

      if (error) throw error;

      if (!data?.success) {
        setLoginError('Credenziali errate.');
        return;
      }

      if (data.needs_setup) {
        // Primo accesso: l'OTP è corretto → passa alla fase di impostazione password.
        // Conserviamo `secret` (il PIN appena digitato) come p_old_pin per la RPC di setup.
        setSetupError('');
        setNuovaPassword('');
        setConfermaPassword('');
        setFase('setup');
        return;
      }

      // Password già impostata e corretta → autentica e prosegui.
      await proseguiNellApp(secret);
    } catch (err) {
      console.error('Errore login capitano:', err);
      setLoginError('Errore di connessione. Riprova.');
    } finally {
      setLoginLoading(false);
    }
  };

  // FASE 2 — Setup: scambia l'OTP con una password personale e poi prosegui
  const handleImpostaPassword = async () => {
    if (!nuovaPassword.trim() || !confermaPassword.trim()) return;

    if (nuovaPassword.length < 4) {
      setSetupError('La password deve avere almeno 4 caratteri.');
      return;
    }
    if (nuovaPassword !== confermaPassword) {
      setSetupError('Le due password non coincidono.');
      return;
    }

    setSetupLoading(true);
    setSetupError('');

    try {
      const { data, error } = await supabase.rpc('imposta_password_capitano', {
        p_squadra_id: Number(selectedSquadra),
        p_old_pin: secret,            // l'OTP verificato nella fase di login
        p_nuova_password: nuovaPassword,
      });

      if (error) throw error;

      if (!data?.success) {
        setSetupError(data?.error || 'Impossibile salvare la password.');
        return;
      }

      // Password impostata → da ora la credenziale valida è la nuova password.
      await proseguiNellApp(nuovaPassword);
    } catch (err) {
      console.error('Errore impostazione password:', err);
      setSetupError('Errore di connessione. Riprova.');
    } finally {
      setSetupLoading(false);
    }
  };

  // Submit del form attivo con Enter o click sul bottone
  const handleSubmit = (e) => {
    e.preventDefault();
    if (fase === 'setup') {
      handleImpostaPassword();
    } else {
      handleLoginCapitano();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-left-4">
      {/* Selezione squadra dalla tendina */}
      <div>
        <label className="block text-sm font-black text-slate-600 mb-2 uppercase tracking-wide">🏆 Seleziona la tua Squadra</label>
        {isLoadingDb ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="animate-spin mr-2 text-blue-500" size={24} />
            <span className="text-sm font-bold">Caricamento squadre...</span>
          </div>
        ) : (
          <select
            value={selectedSquadra}
            onChange={(e) => {
              setSelectedSquadra(e.target.value);
              resetForm();            // Reset completo del flusso al cambio squadra
            }}
            disabled={fase === 'setup'}   // bloccata mentre si imposta la password
            className="w-full text-lg p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-200 transition-all outline-none font-bold text-blue-900 appearance-none cursor-pointer hover:border-amber-300 disabled:opacity-60 disabled:cursor-not-allowed"
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

      {/* Dettagli squadra selezionata */}
      {squadraSelezionataObj && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in zoom-in">
          {squadraSelezionataObj.colore && (
            <div className="w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-md" style={{ backgroundColor: squadraSelezionataObj.colore }} />
          )}
          <div>
            <p className="font-black text-blue-900">{squadraSelezionataObj.nome}</p>
            {squadraSelezionataObj.capitano && (
              <p className="text-sm font-bold text-blue-500">Capitano: {squadraSelezionataObj.capitano}</p>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────── FASE LOGIN ───────────────────────── */}
      {fase === 'login' && selectedSquadra && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
            <Lock size={12} />
            PIN Staff o Password Personale
          </label>
          <div className="relative">
            <input
              type={mostraSecret ? 'text' : 'password'}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Inserisci PIN o password"
              className="w-full p-4 pr-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold tracking-widest focus:border-amber-400 focus:ring-4 focus:ring-amber-200 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal hover:border-amber-300"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostraSecret(!mostraSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mostraSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Messaggio di errore login */}
          {loginError && (
            <div className="mt-4 px-4 py-3 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-600 text-sm font-bold text-center animate-in fade-in zoom-in">
              {loginError}
            </div>
          )}

          {/* CTA login — gamificata */}
          <button
            type="submit"
            disabled={!secret.trim() || loginLoading}
            className="group mt-5 w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-300/50 transition-all hover:-translate-y-1 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:shadow-none"
          >
            {loginLoading ? (
              <><Loader2 className="animate-spin" size={20} /> Verifica in corso...</>
            ) : (
              <><ShieldCheck size={22} className="group-hover:rotate-12 transition-transform" /> Accedi e Prosegui</>
            )}
          </button>
        </div>
      )}

      {/* ───────────────────────── FASE SETUP ───────────────────────── */}
      {fase === 'setup' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 space-y-5">
          {/* Badge di sicurezza: primo accesso */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-300/50">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <div>
              <p className="font-black text-emerald-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-emerald-500" />
                Primo accesso!
              </p>
              <p className="text-sm font-bold text-emerald-700 leading-snug mt-0.5">
                Imposta la tua <span className="underline decoration-emerald-300 decoration-2 underline-offset-2">Password Personale</span>.
                La userai per tutti i prossimi accessi: il PIN dello staff non servirà più.
              </p>
            </div>
          </div>

          {/* Nuova password */}
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <KeyRound size={12} />
              Nuova Password
            </label>
            <div className="relative">
              <input
                type={mostraNuovaPassword ? 'text' : 'password'}
                value={nuovaPassword}
                onChange={(e) => setNuovaPassword(e.target.value)}
                placeholder="Scegli la tua password (min. 4 caratteri)"
                className="w-full p-4 pr-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold tracking-widest focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal hover:border-emerald-300"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setMostraNuovaPassword(!mostraNuovaPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {mostraNuovaPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Conferma password */}
          <div>
            <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
              <KeyRound size={12} />
              Conferma Password
            </label>
            <input
              type={mostraNuovaPassword ? 'text' : 'password'}
              value={confermaPassword}
              onChange={(e) => setConfermaPassword(e.target.value)}
              placeholder="Ripeti la password"
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold tracking-widest focus:border-emerald-400 focus:ring-4 focus:ring-emerald-200 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal hover:border-emerald-300"
            />
          </div>

          {/* Messaggio di errore setup */}
          {setupError && (
            <div className="px-4 py-3 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-600 text-sm font-bold text-center animate-in fade-in zoom-in">
              {setupError}
            </div>
          )}

          {/* CTA salva password — gamificata, accento "sicurezza" verde */}
          <button
            type="submit"
            disabled={!nuovaPassword.trim() || !confermaPassword.trim() || setupLoading}
            className="group w-full py-4 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-300/50 transition-all hover:-translate-y-1 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:shadow-none"
          >
            {setupLoading ? (
              <><Loader2 className="animate-spin" size={20} /> Salvataggio...</>
            ) : (
              <><KeyRound size={22} className="group-hover:rotate-12 transition-transform" /> Salva Password e Prosegui</>
            )}
          </button>

          {/* Torna al login (annulla primo accesso) */}
          <button
            type="button"
            onClick={resetForm}
            className="w-full text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Torna indietro
          </button>
        </div>
      )}
    </form>
  );
};

export default Step1Squadra;
