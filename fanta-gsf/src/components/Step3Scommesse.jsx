import React, { useState } from 'react';
import { Star, ChevronRight, Loader2, Trash2 } from 'lucide-react';

// --- STEP 3 — Scommesse con Bonus/Malus predefiniti dalla regia ---
// Il capitano abbina un giudice (da Supabase) a un bonus/malus dal catalogo.
// Lo stato locale `nuovaScommessa` e la funzione `aggiungiScommessa` vivono qui dentro.
const Step3Scommesse = ({
  giudiciDb,
  bonusMalusList,
  isLoadingDb,
  scommesse,
  setScommesse,
  setStepAttuale,
}) => {
  // Stato locale del form — giudice + bonus/malus selezionato
  const [nuovaScommessa, setNuovaScommessa] = useState({
    id_giudice: '',
    id_bonus: '',
  });

  // Aggiunge una scommessa abbinando un giudice a un bonus/malus dal catalogo Supabase
  const aggiungiScommessa = () => {
    if (!nuovaScommessa.id_giudice || !nuovaScommessa.id_bonus) return;

    const giudice = giudiciDb.find(g => g.id_giudice === nuovaScommessa.id_giudice);
    const bonusScelto = bonusMalusList.find(b => b.id === Number(nuovaScommessa.id_bonus));
    if (!bonusScelto) return;

    const scommessaCompleta = {
      id: Date.now().toString(),
      giudice_id: nuovaScommessa.id_giudice,
      id_bonus: bonusScelto.id,
      azione: bonusScelto.descrizione,
      punti: bonusScelto.punti,
      nomeGiudice: giudice?.nome,
    };

    setScommesse(prev => [...prev, scommessaCompleta]);
    setNuovaScommessa({ id_giudice: '', id_bonus: '' });
  };

  // Rimuove una scommessa dalla lista locale
  const rimuoviScommessa = (idScommessa) => {
    setScommesse(prev => prev.filter(s => s.id !== idScommessa));
  };

  return (
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

            {/* Select Bonus/Malus — dati da Supabase tabella `catalogo_bonus_malus` */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Bonus / Malus</label>
              <select
                value={nuovaScommessa.id_bonus}
                onChange={e => setNuovaScommessa({...nuovaScommessa, id_bonus: e.target.value})}
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
  );
};

export default Step3Scommesse;
