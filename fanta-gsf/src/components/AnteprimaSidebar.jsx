import React from 'react';
import { Trophy, CheckCircle2, Loader2, Users } from 'lucide-react';

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
  const scommessa = scommesse.length > 0 ? scommesse[0] : null;

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

          {/* Lista pronostici / 3 giudici scelti */}
          <div className="space-y-6 flex-1 overflow-y-auto pr-1">
            <div>
              <h4 className="font-bold text-sm text-gray-400 uppercase mb-3 border-b border-gray-100 pb-1 sticky top-0 bg-white/95 z-10 py-1 flex items-center gap-1.5">
                <Users size={14} />
                Giudici scelti
              </h4>
              {!scommessa ? (
                <div className="h-12 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                  Nessun giudice selezionato
                </div>
              ) : (
                <div className="space-y-2">
                  {[1, 2, 3].map(n => {
                    const nome = scommessa[`giudice_${n}_nome`];
                    const punti = scommessa[`giudice_${n}_punti`];
                    return (
                      <div
                        key={n}
                        className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                            {n}
                          </span>
                          <span className="font-bold text-gray-700 text-sm">{nome || '—'}</span>
                        </div>
                        <span className={`text-xs font-black px-2 py-0.5 rounded ${
                          punti > 0
                            ? 'text-green-600 bg-green-50'
                            : 'text-gray-500 bg-gray-100'
                        }`}>
                          {punti > 0 ? '+' : ''}{punti || 0} pt/az
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer: banner di feedback + bottone submit */}
          <div className="mt-4 shrink-0 pt-4 border-t border-gray-100 bg-white relative z-10">
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
                <><CheckCircle2 size={24} /> SCOMMESSA SALVATA!</>
              ) : (
                'CONFERMA SCOMMESSA'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnteprimaSidebar;
