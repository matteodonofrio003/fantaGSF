import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Users, ChevronRight, Loader2, CalendarClock, Star, ListChecks, ShieldCheck } from 'lucide-react';

const Step3Scommesse = ({
  giudiciDb = [],
  serataCorrente,
  isLoadingDb,
  scommesse,
  setScommesse,
  setStepAttuale,
}) => {
  const [azioni, setAzioni] = useState([]);
  const [isLoadingAzioni, setIsLoadingAzioni] = useState(true);

  const [g1, setG1] = useState('');
  const [g2, setG2] = useState('');
  const [g3, setG3] = useState('');

  useEffect(() => {
    const fetchAzioni = async () => {
      if (!serataCorrente) {
        setIsLoadingAzioni(false);
        return;
      }
      setIsLoadingAzioni(true);
      try {
        const { data, error } = await supabase.rpc('get_azioni_serata', {
          p_serata: serataCorrente,
        });
        if (error) throw error;
        setAzioni(data || []);
      } catch (err) {
        console.error('Errore fetch azioni serata:', err);
        setAzioni([]);
      } finally {
        setIsLoadingAzioni(false);
      }
    };
    fetchAzioni();
  }, [serataCorrente]);

  const aggiornaGlobale = (nuovoG1, nuovoG2, nuovoG3) => {
    if (!nuovoG1 || !nuovoG2 || !nuovoG3) {
      setScommesse([]);
      return;
    }

    const j1 = giudiciDb.find(g => String(g.id_giudice) === String(nuovoG1));
    const j2 = giudiciDb.find(g => String(g.id_giudice) === String(nuovoG2));
    const j3 = giudiciDb.find(g => String(g.id_giudice) === String(nuovoG3));

    if (!j1 || !j2 || !j3) {
      setScommesse([]);
      return;
    }

    setScommesse([{
      id: `serata-${serataCorrente}`,
      num_serata: serataCorrente,
      giudice_1_id: Number(nuovoG1),
      giudice_1_nome: j1.nome,
      giudice_1_punti: j1.punteggio_base || 0,
      giudice_2_id: Number(nuovoG2),
      giudice_2_nome: j2.nome,
      giudice_2_punti: j2.punteggio_base || 0,
      giudice_3_id: Number(nuovoG3),
      giudice_3_nome: j3.nome,
      giudice_3_punti: j3.punteggio_base || 0,
    }]);
  };

  const onGiudiceChange = (pos, val) => {
    if (pos === 1) { setG1(val); aggiornaGlobale(val, g2, g3); }
    if (pos === 2) { setG2(val); aggiornaGlobale(g1, val, g3); }
    if (pos === 3) { setG3(val); aggiornaGlobale(g1, g2, val); }
  };

  const pronta = g1 && g2 && g3;
  const erroreDuplicati = pronta && (g1 === g2 || g1 === g3 || g2 === g3);

  const getGiudiceOptions = (excludeIds = []) =>
    giudiciDb.filter(g => !excludeIds.includes(String(g.id_giudice)));

  const corrente = scommesse.find(s => s.num_serata === serataCorrente) || null;

  const renderDropdown = (pos, value, label) => {
    const otherIds = pos === 1 ? [g2, g3] : pos === 2 ? [g1, g3] : [g1, g2];
    const available = getGiudiceOptions(otherIds);

    return (
      <div>
        <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onGiudiceChange(pos, e.target.value)}
          className="w-full p-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">-- Seleziona giudice --</option>
          {available.map(g => (
            <option key={g.id_giudice} value={g.id_giudice}>
              {g.nome} ({g.punteggio_base > 0 ? '+' : ''}{g.punteggio_base || 0} pt base)
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-left-4 flex flex-col h-full">
      <div className="shrink-0">
        <h4 className="font-bold text-gray-700 flex items-center gap-2">
          <Star className="text-yellow-500" size={20} />
          La tua scommessa di stasera
        </h4>
        <p className="text-sm text-gray-500">
          Scegli esattamente 3 giudici diversi. Guadagnerai punti in base alle azioni che compiranno!
        </p>
      </div>

      {isLoadingDb || isLoadingAzioni ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 flex-1">
          <Loader2 className="animate-spin mb-2 text-yellow-500" size={32} />
          <p className="text-sm font-bold">
            {isLoadingDb ? 'Caricamento giudici...' : 'Caricamento azioni...'}
          </p>
        </div>
      ) : (
        <>
          {/* Badge serata in corso */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl px-4 py-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl shrink-0">
              📋
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-200 flex items-center gap-1">
                <CalendarClock size={12} /> Serata in corso
              </p>
              <p className="font-black truncate">Serata {serataCorrente}</p>
            </div>
            <span className="ml-auto text-2xl font-black shrink-0">#{serataCorrente}</span>
          </div>

          {/* 10 Azioni della serata (read-only) */}
          <div className="shrink-0">
            <h5 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5">
              <ListChecks size={14} />
              Le 10 azioni della serata
            </h5>
            {azioni.length === 0 ? (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl text-amber-700 text-sm font-bold text-center">
                La regia non ha ancora configurato le azioni per questa serata.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {azioni.map((a, idx) => (
                  <div
                    key={a.id || idx}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl"
                  >
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 truncate">
                      {a.descrizione}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selezione 3 Giudici */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 shrink-0">
            <h5 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Users size={14} />
              Scegli 3 Giudici
            </h5>

            {renderDropdown(1, g1, 'Giudice 1')}
            {renderDropdown(2, g2, 'Giudice 2')}
            {renderDropdown(3, g3, 'Giudice 3')}

            {erroreDuplicati && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs font-bold">
                I 3 giudici devono essere diversi tra loro.
              </div>
            )}
          </div>

          {/* Riepilogo scelte correnti */}
          <div className="flex-1 overflow-y-auto pr-1 mt-1">
            {corrente ? (
              <div className="bg-white p-4 rounded-xl border shadow-sm">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  I tuoi 3 giudici
                </p>
                {[1, 2, 3].map(n => {
                  const nome = corrente[`giudice_${n}_nome`];
                  const punti = corrente[`giudice_${n}_punti`];
                  return (
                    <div key={n} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                          {n}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{nome}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded ${
                        punti > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {punti > 0 ? '+' : ''}{punti} pt/azione
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-16 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm font-bold">
                Seleziona 3 giudici diversi
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => setStepAttuale(4)}
        disabled={!pronta || erroreDuplicati}
        className={`w-full shrink-0 mt-auto py-3 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
          pronta && !erroreDuplicati
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {pronta && !erroreDuplicati
          ? <>Vai al Riepilogo <ChevronRight size={18} /></>
          : 'Completa la selezione'}
      </button>
    </div>
  );
};

export default Step3Scommesse;
