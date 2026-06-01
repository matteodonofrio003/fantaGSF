import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Loader2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

// --- STEP 1 — Login Capitano + Selezione Squadra ---
// Dopo il login determiniamo la serata in corso e decidiamo dove mandare l'utente:
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
}) => {
  // --- Stati locali per il form di login ---
  const [pinCapitano, setPinCapitano] = useState('');
  const [mostraPin, setMostraPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Gestisce il login del capitano tramite RPC e la successiva biforcazione
  const handleLoginCapitano = async () => {
    if (!selectedSquadra || !pinCapitano.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const { data, error } = await supabase.rpc('login_capitano', {
        p_squadra_id: Number(selectedSquadra),
        p_pin: pinCapitano,
      });

      if (error) throw error;

      if (!data?.success) {
        setLoginError(data?.error || 'PIN errato.');
        return;
      }

      // Login riuscito → segna come autenticato
      setIsCapitanoAutenticato(true);

      // 1) Qual è la serata in corso? (modello ibrido: data + override staff)
      const { data: serataData, error: serataErr } = await supabase.rpc('get_serata_corrente');
      if (serataErr) throw serataErr;
      const serata = serataData?.serata ?? null;
      setSerataCorrente(serata);

      // 2) Carica TUTTE le scommesse della squadra (servono comunque alla dashboard).
      //    Lettura BLINDATA: solo via RPC SECURITY DEFINER con PIN (zero-trust).
      //    La RPC verifica il pin_accesso della squadra e restituisce dati piatti
      //    (nome_giudice già incluso).
      const { data: scommesseDb, error: scommesseErr } = await supabase
        .rpc('get_scommesse_squadra', {
          p_squadra_id: Number(selectedSquadra),
          p_pin: pinCapitano,
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
    } catch (err) {
      console.error('Errore login capitano:', err);
      setLoginError('Errore di connessione. Riprova.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Submit del form con Enter o click sul bottone
  const handleSubmit = (e) => {
    e.preventDefault();
    handleLoginCapitano();
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
              setLoginError('');       // Reset errore al cambio squadra
              setPinCapitano('');      // Reset PIN al cambio squadra
            }}
            className="w-full text-lg p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-200 transition-all outline-none font-bold text-blue-900 appearance-none cursor-pointer hover:border-amber-300"
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

      {/* Campo PIN — visibile solo quando una squadra è selezionata */}
      {selectedSquadra && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide flex items-center gap-1">
            <Lock size={12} />
            PIN della Squadra
          </label>
          <div className="relative">
            <input
              type={mostraPin ? 'text' : 'password'}
              value={pinCapitano}
              onChange={(e) => setPinCapitano(e.target.value)}
              placeholder="Inserisci il PIN del capitano"
              className="w-full p-4 pr-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-lg font-bold tracking-widest focus:border-amber-400 focus:ring-4 focus:ring-amber-200 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal hover:border-amber-300"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setMostraPin(!mostraPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {mostraPin ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      )}

      {/* Messaggio di errore */}
      {loginError && (
        <div className="px-4 py-3 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-600 text-sm font-bold text-center animate-in fade-in zoom-in">
          {loginError}
        </div>
      )}

      {/* Bottone di login/proseguimento — CTA gamificata */}
      <button
        type="submit"
        disabled={!selectedSquadra || !pinCapitano.trim() || loginLoading}
        className="group w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-300/50 transition-all hover:-translate-y-1 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:shadow-none"
      >
        {loginLoading ? (
          <><Loader2 className="animate-spin" size={20} /> Verifica in corso...</>
        ) : (
          <><ShieldCheck size={22} className="group-hover:rotate-12 transition-transform" /> Accedi e Prosegui</>
        )}
      </button>
    </form>
  );
};

export default Step1Squadra;
