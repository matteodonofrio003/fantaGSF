import React from 'react';
import { Calendar, ChevronRight, Loader2, Radio } from 'lucide-react';

// Palette di gradienti per le card delle serate
const serataColors = [
  'from-rose-500 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
];

// --- STEP 2 — Calendario Serate (read-only) ---
// Visualizzazione dei giochi programmati per ogni serata. Nessuna interazione.
const Step2Calendario = ({ calendarioSerate, serataCorrente, isLoadingDb, setStepAttuale }) => {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
      <div className="shrink-0">
        <h4 className="font-bold text-gray-700 flex items-center gap-2">
          <Calendar className="text-blue-500" size={20} />
          Calendario Serate
        </h4>
        <p className="text-sm text-gray-500 mb-4">Ecco i giochi programmati per ogni serata. Solo visualizzazione.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-3 pb-2">
        {isLoadingDb ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="animate-spin mb-2 text-blue-500" size={32} />
            <p className="text-sm font-bold">Caricamento calendario...</p>
          </div>
        ) : calendarioSerate.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm font-bold">
            Nessuna serata programmata.
          </div>
        ) : (
          calendarioSerate.map((serata, idx) => {
            const isCorrente = serata.serata === serataCorrente;
            return (
            <div
              key={serata.serata}
              className={`rounded-2xl border overflow-hidden bg-white shadow-sm ${
                isCorrente ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
            >
              {/* Header della serata con gradiente */}
              <div className={`bg-gradient-to-r ${serataColors[idx % serataColors.length]} px-4 py-2.5 flex items-center gap-2`}>
                <span className="text-lg">{serata.emoji}</span>
                <span className="text-white font-bold text-sm tracking-wide">{serata.titolo}</span>
                {isCorrente && (
                  <span className="ml-auto inline-flex items-center gap-1 bg-white/90 text-blue-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    <Radio size={11} /> Stasera
                  </span>
                )}
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
            );
          })
        )}
      </div>

      <button onClick={() => setStepAttuale(3)} className="w-full shrink-0 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors mt-auto">
        {serataCorrente ? 'Vai alla scommessa di stasera' : 'Prosegui alle Scommesse'} <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default Step2Calendario;
