import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Trophy, Crown, Loader2, ArrowLeft, Frown } from 'lucide-react';
import LogoGSF from './LogoGSF';

// Stili dei tre gradini del podio (oro / argento / bronzo)
const podio = {
  1: {
    medaglia: '🥇',
    card: 'from-yellow-400 via-amber-400 to-yellow-500 shadow-amber-200',
    badge: 'bg-yellow-900/20 text-yellow-900',
    testo: 'text-yellow-900',
  },
  2: {
    medaglia: '🥈',
    card: 'from-slate-300 via-gray-300 to-slate-400 shadow-slate-200',
    badge: 'bg-slate-700/15 text-slate-700',
    testo: 'text-slate-700',
  },
  3: {
    medaglia: '🥉',
    card: 'from-orange-300 via-amber-500 to-orange-500 shadow-orange-200',
    badge: 'bg-orange-900/20 text-orange-900',
    testo: 'text-orange-900',
  },
};

// Formatta i punti con segno (+/-)
const fmtPunti = (n) => `${n > 0 ? '+' : ''}${n}`;

const Classifica = () => {
  const [righe, setRighe] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    const fetchClassifica = async () => {
      setIsLoading(true);
      setErrore(null);
      try {
        const { data, error } = await supabase
          .from('classifica_generale')
          .select('*')
          .order('punti_totali', { ascending: false })
          .order('nome', { ascending: true });

        if (error) throw error;
        setRighe(data || []);
      } catch (err) {
        console.error('Errore nel fetch della classifica:', err);
        setErrore('Impossibile caricare la classifica. Riprova più tardi.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchClassifica();
  }, []);

  // Posizione 1-based (ranking posizionale)
  const top3 = righe.slice(0, 3);
  const resto = righe.slice(3);

  // Card del podio (1°, 2°, 3°)
  const CardPodio = ({ squadra, posizione, grande }) => {
    const stile = podio[posizione];
    return (
      <div
        className={`relative bg-gradient-to-br ${stile.card} rounded-3xl shadow-xl overflow-hidden ${grande ? 'p-6 sm:p-7' : 'p-5'}`}
      >
        {posizione === 1 && (
          <Crown className="absolute top-4 right-4 text-yellow-900/40" size={grande ? 40 : 32} />
        )}
        <div className={`flex items-center gap-3 ${grande ? 'mb-3' : 'mb-2'}`}>
          <span className={grande ? 'text-5xl' : 'text-4xl'}>{stile.medaglia}</span>
          <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${stile.badge}`}>
            {posizione}° posto
          </span>
        </div>

        <div className="flex items-center gap-3">
          {squadra.colore && (
            <div
              className="w-7 h-7 rounded-full shrink-0 border-2 border-white/70 shadow"
              style={{ backgroundColor: squadra.colore }}
            />
          )}
          <h3 className={`font-black leading-tight break-words ${stile.testo} ${grande ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
            {squadra.nome}
          </h3>
        </div>
        {squadra.capitano && (
          <p className={`text-sm font-bold mt-1 ${stile.testo} opacity-70`}>Cap. {squadra.capitano}</p>
        )}

        <div className="flex items-end justify-between mt-4">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${stile.testo} opacity-60`}>Punti</p>
            <p className={`font-black leading-none ${stile.testo} ${grande ? 'text-5xl' : 'text-4xl'}`}>
              {fmtPunti(squadra.punti_totali)}
            </p>
          </div>
          <p className={`text-xs font-bold ${stile.testo} opacity-70`}>
            {squadra.scommesse_indovinate}✅ / {squadra.scommesse_giocate} giocate
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-yellow-200">

      {/* HEADER */}
      <header className="bg-white border-b-4 border-yellow-400 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-20 flex items-center gap-4">
          <LogoGSF />
          <div className="flex flex-col border-l-2 border-gray-200 pl-4">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-blue-600 leading-none flex items-center gap-2">
              <Trophy className="text-yellow-500" size={26} /> CLASSIFICA
            </h1>
            <h2 className="text-base sm:text-xl font-bold text-slate-500 leading-none">GSF SUMMER</h2>
          </div>
          <a
            href="#/"
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 font-bold text-sm transition-all"
            title="Torna alla Home"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Home</span>
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <Loader2 className="animate-spin mb-3 text-blue-500" size={44} />
            <p className="font-bold">Caricamento classifica...</p>
          </div>
        ) : errore ? (
          <div className="text-center py-24">
            <Frown className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="font-bold text-gray-500">{errore}</p>
          </div>
        ) : righe.length === 0 ? (
          <div className="text-center py-24">
            <Trophy className="mx-auto text-gray-300 mb-3" size={48} />
            <p className="font-bold text-gray-500">Ancora nessuna squadra in classifica.</p>
            <p className="text-sm text-gray-400 mt-1">I punti compariranno appena le scommesse verranno validate.</p>
          </div>
        ) : (
          <>
            {/* PODIO — Top 3 */}
            <section className="mb-8">
              {/* Campione in evidenza */}
              {top3[0] && (
                <div className="mb-4">
                  <CardPodio squadra={top3[0]} posizione={1} grande />
                </div>
              )}
              {/* 2° e 3° affiancati */}
              {(top3[1] || top3[2]) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {top3[1] && <CardPodio squadra={top3[1]} posizione={2} />}
                  {top3[2] && <CardPodio squadra={top3[2]} posizione={3} />}
                </div>
              )}
            </section>

            {/* RESTO DELLA CLASSIFICA — dal 4° in giù */}
            {resto.length > 0 && (
              <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                <h3 className="px-5 py-3 text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100">
                  Resto della classifica
                </h3>
                <ul className="divide-y divide-gray-100">
                  {resto.map((sq, idx) => {
                    const posizione = idx + 4;
                    return (
                      <li key={sq.id_squadra} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <span className="w-8 text-center font-black text-gray-400 text-lg shrink-0">{posizione}</span>
                        {sq.colore && (
                          <div
                            className="w-6 h-6 rounded-full shrink-0 border-2 border-white shadow"
                            style={{ backgroundColor: sq.colore }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-gray-800 truncate">{sq.nome}</p>
                          {sq.capitano && (
                            <p className="text-xs text-gray-400 truncate">Cap. {sq.capitano}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-black text-lg ${sq.punti_totali > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                            {fmtPunti(sq.punti_totali)} <span className="text-xs font-bold">pt</span>
                          </span>
                          <p className="text-[10px] font-bold text-gray-400">{sq.scommesse_indovinate}✅ / {sq.scommesse_giocate}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Torna alla Home */}
            <div className="text-center mt-10">
              <a
                href="#/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <ArrowLeft size={18} /> Torna alla Home
              </a>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Classifica;
