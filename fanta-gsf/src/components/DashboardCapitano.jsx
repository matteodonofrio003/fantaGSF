import React from 'react';
import { Trophy, Clock, CheckCircle2, XCircle, Award, RefreshCcw, CalendarClock, Hourglass, Ban } from 'lucide-react';

// Palette coerente con il calendario serate (Step2)
const serataColors = [
  'from-rose-500 to-orange-500',
  'from-amber-500 to-yellow-500',
  'from-cyan-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-emerald-500 to-teal-500',
];

// Punti effettivamente ottenuti da una scommessa GIÀ validata.
//  indovinata === true  → incassa i punti in palio
//  indovinata === false → 0 (la scommessa è fallita)
//  indovinata === null  → ancora in attesa (non conteggiata)
const puntiOttenuti = (s) => {
  if (s.indovinata === true) return s.punti;
  if (s.indovinata === false) return 0;
  return null;
};

// Badge di stato di una scommessa GIOCATA, in base al campo `indovinata`
const StatoBadge = ({ indovinata }) => {
  if (indovinata === null || indovinata === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
        <Clock size={12} /> In attesa
      </span>
    );
  }
  if (indovinata === true) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
        <CheckCircle2 size={12} /> Indovinata
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
      <XCircle size={12} /> Fallita
    </span>
  );
};

// --- DASHBOARD CAPITANO (read-only) ---
// Mostrata dopo il login quando il capitano NON può scommettere ora:
//   • ha già giocato la serata in corso, oppure
//   • nessuna serata è aperta.
// Riceve l'array delle scommesse dal DB, l'oggetto squadra e la serata in corso.
const DashboardCapitano = ({ scommesse = [], squadra, serataCorrente = null, onCambiaSquadra }) => {
  // Conteggi di sintesi
  const validate = scommesse.filter(s => s.indovinata !== null && s.indovinata !== undefined);
  const indovinate = scommesse.filter(s => s.indovinata === true).length;
  const fallite = scommesse.filter(s => s.indovinata === false).length;
  const giocate = scommesse.length;

  // Totale parziale: somma dei punti delle sole scommesse VALIDATE
  const totalePunti = validate.reduce((acc, s) => acc + (puntiOttenuti(s) || 0), 0);

  // Banner contestuale in cima alla dashboard
  const haGiocatoCorrente = serataCorrente != null && scommesse.some(s => s.num_serata === serataCorrente);
  let banner;
  if (serataCorrente == null) {
    banner = {
      tono: 'neutro',
      titolo: 'Nessuna serata aperta',
      testo: 'Al momento non ci sono serate attive. Torna quando la prossima serata sarà aperta!',
    };
  } else if (haGiocatoCorrente) {
    banner = {
      tono: 'ok',
      titolo: `Scommessa della Serata ${serataCorrente} registrata`,
      testo: serataCorrente < 5
        ? 'Hai già giocato per stasera. Torna domani per la prossima serata!'
        : 'Hai giocato l’ultima serata. In bocca al lupo per il Gran Finale!',
    };
  }

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
              <p className="text-xl font-black text-green-600 leading-none">{indovinate}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-500 mt-1">Indovinate</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl py-2 text-center">
              <p className="text-xl font-black text-red-600 leading-none">{fallite}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mt-1">Fallite</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl py-2 text-center">
              <p className="text-xl font-black text-gray-500 leading-none">{giocate}/5</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">Giocate</p>
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
          {banner.tono === 'ok' ? <CheckCircle2 size={20} className="shrink-0 mt-0.5" /> : <CalendarClock size={20} className="shrink-0 mt-0.5" />}
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
          const ottenuti = s ? puntiOttenuti(s) : null;

          // Stato di una serata NON giocata, relativo alla serata in corso
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
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.nome_giudice || '—'}</p>
                      <p className="text-sm font-bold text-gray-800 truncate">"{s.azione_scelta}"</p>
                      <div className="mt-2">
                        <StatoBadge indovinata={s.indovinata} />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {s.indovinata === null || s.indovinata === undefined ? 'In palio' : 'Ottenuti'}
                      </p>
                      <p className={`text-2xl font-black leading-none ${
                        ottenuti === null
                          ? 'text-gray-400'
                          : ottenuti > 0
                            ? 'text-green-600'
                            : 'text-gray-400'
                      }`}>
                        {ottenuti === null
                          ? `${s.punti >= 0 ? '+' : ''}${s.punti}`
                          : `${ottenuti > 0 ? '+' : ''}${ottenuti}`}
                        <span className="text-sm font-bold"> pt</span>
                      </p>
                    </div>
                  </div>
                ) : isCorrente ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-blue-600">
                    <CalendarClock size={16} /> Serata aperta — la tua scommessa ti aspetta
                  </div>
                ) : isFutura ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-gray-400">
                    <Hourglass size={16} /> Non ancora aperta
                  </div>
                ) : isPersa ? (
                  <div className="h-full flex items-center gap-2 text-sm font-bold text-gray-400">
                    <Ban size={16} /> Serata non giocata
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
