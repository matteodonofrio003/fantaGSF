import React from 'react';
import { Trophy, Award, RefreshCcw, Users, Hash } from 'lucide-react';

const serataColors = [
  'from-rose-500 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
];

const DashboardCapitano = ({ scommesse = [], squadra, serataCorrente = null, onCambiaSquadra }) => {
  const giocate = scommesse.length;
  const calcolate = scommesse.filter(s => s.punteggio_ottenuto > 0).length;
  const totalePunti = scommesse.reduce((acc, s) => acc + (s.punteggio_ottenuto || 0), 0);

  const haGiocatoCorrente = serataCorrente != null && scommesse.some(s => s.num_serata === serataCorrente);
  let banner;
  if (serataCorrente == null) {
    banner = {
      tono: 'neutro',
      titolo: 'Nessuna serata aperta',
      testo: 'Al momento non ci sono serate attive. Torna quando la prossima serata sara aperta!',
    };
  } else if (haGiocatoCorrente) {
    banner = {
      tono: 'ok',
      titolo: `Scommessa della Serata ${serataCorrente} registrata`,
      testo: serataCorrente < 5
        ? 'Hai gia scelto i tuoi 3 giudici per stasera. Torna domani per la prossima serata!'
        : 'Hai scelto i giudici per l\'ultima serata. In bocca al lupo per il Gran Finale!',
    };
  }

  const GiudiciScelti = ({ s }) => {
    if (!s.giudice_1_id && !s.giudice_2_id && !s.giudice_3_id) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {[1, 2, 3].map(n => {
          const nome = s[`giudice_${n}_nome`];
          const punti = s[`giudice_${n}_punti`];
          if (!nome) return null;
          return (
            <span
              key={n}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
            >
              {nome}
              <span className="text-blue-400">({punti > 0 ? '+' : ''}{punti || 0})</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 max-w-3xl mx-auto">
      {/* HERO — intestazione squadra + punteggio parziale */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2rem] shadow-xl p-1.5 mb-6">
        <div className="bg-white/95 backdrop-blur-sm rounded-[1.6rem] p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-300 rounded-full opacity-20 blur-2xl" />

          <div className="flex items-center gap-2 text-indigo-400 mb-4">
            <Trophy size={16} />
            <span className="text-xs font-black uppercase tracking-widest">La tua dashboard</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 relative">
            <div className="flex items-center gap-4 min-w-0">
              {squadra?.colore && (
                <div
                  className="w-12 h-12 rounded-2xl shrink-0 border-2 border-white shadow"
                  style={{ backgroundColor: squadra.colore }}
                />
              )}
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black text-indigo-900 break-words leading-none">
                  {squadra?.nome || 'La tua squadra'}
                </h2>
                {squadra?.capitano && (
                  <p className="text-sm font-bold text-indigo-400 mt-1">Cap. {squadra.capitano}</p>
                )}
              </div>
            </div>

            {/* Punteggio parziale */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3 text-center shrink-0">
              <div className="flex items-center justify-center gap-1.5 text-indigo-400">
                <Award size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Punti parziali</span>
              </div>
              <p className={`text-3xl font-black leading-none mt-1 ${totalePunti >= 0 ? 'text-indigo-900' : 'text-red-600'}`}>
                {totalePunti > 0 ? '+' : ''}{totalePunti}
              </p>
            </div>
          </div>

          {/* Mini-riepilogo conteggi */}
          <div className="grid grid-cols-3 gap-2 mt-6 relative">
            <div className="bg-green-50 border border-green-100 rounded-xl py-2 text-center">
              <p className="text-xl font-black text-green-600 leading-none">{calcolate}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mt-1">Calcolate</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl py-2 text-center">
              <p className="text-xl font-black text-blue-600 leading-none">{giocate}/5</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mt-1">Giocate</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl py-2 text-center">
              <p className="text-xl font-black text-amber-600 leading-none">{giocate - calcolate}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mt-1">In attesa</p>
            </div>
          </div>
        </div>
      </div>

      {/* BANNER CONTESTUALE */}
      {banner && (
        <div className={`mb-6 rounded-2xl border px-5 py-4 flex items-start gap-3 ${
          banner.tono === 'ok'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <Hash size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-black">{banner.titolo}</p>
            <p className="text-sm font-medium opacity-90">{banner.testo}</p>
          </div>
        </div>
      )}

      {/* ELENCO DELLE 5 SERATE */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((num, idx) => {
          const s = scommesse.find(x => x.num_serata === num);
          const ottenuto = s ? (s.punteggio_ottenuto || 0) : null;

          const isCorrente = serataCorrente === num;
          const isFutura = serataCorrente != null && num > serataCorrente;
          const isPersa = serataCorrente != null && num < serataCorrente && !s;

          return (
            <div
              key={num}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden flex ${
                isCorrente && !s ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'
              }`}
            >
              {/* Colonna serata con gradiente */}
              <div className={`bg-gradient-to-b ${serataColors[idx % serataColors.length]} w-20 shrink-0 flex flex-col items-center justify-center text-white ${(!s && (isFutura || isPersa)) ? 'opacity-60' : ''}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Serata</span>
                <span className="text-3xl font-black leading-none">{num}</span>
              </div>

              {/* Corpo della card */}
              <div className="flex-1 p-4 min-w-0">
                {s ? (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Users size={12} /> 3 giudici scelti
                      </p>
                      <GiudiciScelti s={s} />
                      {s.punteggio_ottenuto > 0 ? (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                            Punteggio calcolato
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                            In attesa di calcolo
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {s.punteggio_ottenuto > 0 ? 'Ottenuti' : 'Da calcolare'}
                      </p>
                      <p className={`text-2xl font-black leading-none ${
                        s.punteggio_ottenuto > 0
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}>
                        {s.punteggio_ottenuto > 0 ? '+' : ''}{ottenuto}
                        <span className="text-sm font-bold"> pt</span>
                      </p>
                    </div>
                  </div>
                ) : isCorrente ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-blue-600">
                    <Users size={16} /> Serata aperta — scegli i tuoi 3 giudici
                  </div>
                ) : isFutura ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-gray-400">
                    Non ancora aperta
                  </div>
                ) : isPersa ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-gray-400">
                    Serata non giocata
                  </div>
                ) : (
                  <div className="h-full flex items-center text-sm font-bold text-gray-300 italic">
                    Nessuna scommessa
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: cambio squadra */}
      {onCambiaSquadra && (
        <div className="text-center mt-8">
          <button
            onClick={onCambiaSquadra}
            className="inline-flex items-center gap-2 text-sm text-blue-500 font-bold hover:underline"
          >
            <RefreshCcw size={14} /> Esci e cambia squadra
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardCapitano;
