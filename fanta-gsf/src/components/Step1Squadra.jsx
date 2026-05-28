import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

// --- STEP 1 — Selezione Squadra ---
// L'utente sceglie la propria squadra da una tendina (squadre pre-inserite nel DB).
const Step1Squadra = ({
  squadreDisponibili,
  selectedSquadra,
  setSelectedSquadra,
  squadraSelezionataObj,
  isLoadingDb,
  setStepAttuale,
}) => {
  return (
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
  );
};

export default Step1Squadra;
