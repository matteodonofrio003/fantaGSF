import React from 'react';
import { Trophy, CheckCircle2, Loader2 } from 'lucide-react';

// --- ANTEPRIMA SIDEBAR (Pannello destro) ---
// Mostra il riepilogo della squadra, la lista dei pronostici,
// il banner di feedback e il bottone di conferma finale.
const AnteprimaSidebar = ({
  squadraSelezionataObj,
  scommesse,
  handleFinalSubmit,
  isSubmitting,
  submitMessage,
  submitSuccess,
  stepAttuale,
  selectedSquadra,
}) => {
  return (
    <div className="lg:col-span-5 h-[600px] lg:h-auto">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 p-2 rounded-[2rem] shadow-xl h-full flex flex-col transform transition-all hover:-translate-y-1 relative">
        <div className="bg-white/95 backdrop-blur-sm rounded-[1.75rem] h-full p-6 flex flex-col relative overflow-hidden flex-1">

          <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-20 blur-2xl"></div>

          <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6 flex items-center gap-2 shrink-0">
            <Trophy size={14} /> Anteprima Fanta-Team
          </h3>

          {/* Intestazione squadra */}
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

          {/* Lista pronostici */}
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

          {/* Footer: banner di feedback + bottone submit */}
          <div className="mt-4 shrink-0 pt-4 border-t border-gray-100 bg-white relative z-10">
            {/* Banner di feedback: verde successo, rosso errore */}
            {submitMessage && (
              <div className={`mb-3 px-4 py-3 rounded-xl text-sm font-bold text-center border ${
                submitMessage.type === 'success'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {submitMessage.text}
              </div>
            )}
            
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
                <><Loader2 className="animate-spin" size={24} /> SALVATAGGIO IN CORSO...</>
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
  );
};

export default AnteprimaSidebar;
