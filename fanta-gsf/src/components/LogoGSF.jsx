import React from 'react';

// --- COMPONENTE LOGO RICREATO ---
// Ricrea l'atmosfera del logo con i pallini colorati
const LogoGSF = () => {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500'];
  return (
    <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-md border-2 border-gray-100 shrink-0">
      {/* Cerchio di "persone" astratte */}
      <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ animationDuration: '20s' }}>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${colors[i % colors.length]}`}
            style={{
              top: '50%', left: '50%',
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-26px)`
            }}
          />
        ))}
      </div>
      <span className="font-black text-2xl tracking-tighter text-gray-800 z-10" style={{ fontFamily: 'impact, sans-serif' }}>
        GSF
      </span>
    </div>
  );
};

export default LogoGSF;
