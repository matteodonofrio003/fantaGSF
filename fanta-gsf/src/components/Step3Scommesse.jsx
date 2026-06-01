import React, { useState } from 'react';
import { Star, ChevronRight, Loader2, CalendarClock } from 'lucide-react';

const Step3Scommesse = ({
  giudiciDb,
  bonusMalusList,
  calendarioSerate = [],
  serataCorrente,
  isLoadingDb,
  scommesse,
  setScommesse,
  setStepAttuale,
}) => {
  // Troviamo se c'è già una scommessa in memoria
  const corrente = scommesse.find(s => s.num_serata === serataCorrente) || null;

  // ✅ FIX: Usiamo STATI LOCALI per i menu a tendina.
  // In questo modo il click non viene "resettato" immediatamente dal componente genitore.
  const [idGiudiceSel, setIdGiudiceSel] = useState(corrente?.giudice_id ?? '');
  const [idBonusSel, setIdBonusSel] = useState(corrente ? String(corrente.id_bonus) : '');

  // Info serata dal calendario (titolo + emoji)
  const infoSerata = calendarioSerate.find(c => c.serata === serataCorrente);

  // Aggiorna lo stato globale SOLO se entrambi i campi sono pieni
  const aggiornaGlobale = (nuovoGiudice, nuovoBonus) => {
    if (!nuovoGiudice || !nuovoBonus) {
      setScommesse([]); // Selezione incompleta
      return;
    }
    const giudice = giudiciDb.find(g => String(g.id_giudice) === String(nuovoGiudice));
    const bonus = bonusMalusList.find(x => x.id === Number(nuovoBonus));
    
    if (!giudice || !bonus) {
      setScommesse([]);
      return;
    }

    setScommesse([{
      id: `serata-${serataCorrente}`,
      num_serata: serataCorrente,
      giudice_id: nuovoGiudice,
      id_bonus: bonus.id,
      azione: bonus.descrizione,
      punti: bonus.punti,
      nomeGiudice: giudice.nome,
    }]);
  };

  const onGiudiceChange = (e) => {
    const val = e.target.value;
    setIdGiudiceSel(val); // Salva il click a schermo
    aggiornaGlobale(val, idBonusSel); // Tenta il salvataggio globale
  };

  const onBonusChange = (e) => {
    const val = e.target.value;
    setIdBonusSel(val); // Salva il click a schermo
    aggiornaGlobale(idGiudiceSel, val); // Tenta il salvataggio globale
  };

  const pronta = scommesse.length === 1;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
      <div className="shrink-0">
        <h4 className="font-bold text-gray-700 flex items-center gap-2">
          <Star className="text-yellow-500" size={20} />
          La tua scommessa di stasera
        </h4>
        <p className="text-sm text-gray-500">
          Hai diritto a una sola scommessa per serata: scegli un giudice e un bonus/malus.
        </p>
      </div>

      {isLoadingDb ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 flex-1">
          <Loader2 className="animate-spin mb-2 text-yellow-500" size={32} />
          <p className="text-sm font-bold">Caricamento giudici...</p>
        </div>
      ) : (
        <>
          {/* Badge serata in corso */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl px-4 py-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
              {infoSerata?.emoji || '🎮'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 flex items-center gap-1">
                <CalendarClock size={12} /> Serata in corso
              </p>
              <p className="font-black truncate">
                {infoSerata?.titolo || `Serata ${serataCorrente}`}
              </p>
            </div>
            <span className="ml-auto text-2xl font-black shrink-0">#{serataCorrente}</span>
          </div>

          {/* Form della scommessa */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shrink-0">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Giudice</label>
              <select
                value={idGiudiceSel}
                onChange={onGiudiceChange}
                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Seleziona un giudice --</option>
                {giudiciDb.map(g => (
                  <option key={g.id_giudice} value={g.id_giudice}>{g.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Bonus / Malus</label>
              <select
                value={idBonusSel}
                onChange={onBonusChange}
                className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">-- Scegli un bonus/malus --</option>
                {bonusMalusList.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.descrizione} ({b.punti > 0 ? '+' : ''}{b.punti} pt)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Riepilogo della scelta corrente */}
          <div className="flex-1 overflow-y-auto pr-1 mt-1">
            {corrente ? (
              <div className="bg-white p-3 rounded-lg border shadow-sm relative overflow-hidden"
                style={{ borderColor: corrente.punti >= 0 ? '#bbf7d0' : '#fecaca' }}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${corrente.punti >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                <div className="flex items-center justify-between pl-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-400 mb-0.5">{corrente.nomeGiudice}</div>
                    <div className="text-sm font-bold text-gray-800 truncate">"{corrente.azione}"</div>
                  </div>
                  <span className={`font-bold text-xs px-2 py-1 rounded whitespace-nowrap ml-2 ${
                    corrente.punti >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                  }`}>
                    {corrente.punti >= 0 ? '+' : ''}{corrente.punti} pt
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                Compila giudice e bonus/malus
              </div>
            )}
          </div>
        </>
      )}

      {/* Procedi: abilitato SOLO quando la scommessa è completa */}
      <button
        onClick={() => setStepAttuale(4)}
        disabled={!pronta}
        className={`w-full shrink-0 mt-auto py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
          pronta
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {pronta
          ? <>Vai al Riepilogo <ChevronRight size={18} /></>
          : 'Completa la scommessa'}
      </button>
    </div>
  );
};

export default Step3Scommesse;