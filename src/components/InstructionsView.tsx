import React from 'react';
import { motion } from 'motion/react';
import { Megaphone, Flame, ShieldAlert, HeartPulse, Printer, Phone } from 'lucide-react';

export default function InstructionsView() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Megaphone className="text-blue-600" size={28} />
            Consignes de Sécurité
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Procédures d'urgence à afficher obligatoirement dans l'établissement (Art. R4227-37 du Code du Travail).
          </p>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Printer size={18} />
          Imprimer pour Affichage
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* En cas d'incendie */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-200 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Flame size={120} />
          </div>
          <div className="flex items-center gap-3 border-b border-red-200 pb-3 relative z-10">
            <div className="p-2 bg-red-600 text-white rounded-lg">
              <Flame size={24} />
            </div>
            <h3 className="text-xl font-bold text-red-900 uppercase tracking-wide">En cas d'incendie</h3>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="bg-white/60 p-4 rounded-lg border border-red-100">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Donner l'alarme
              </h4>
              <p className="text-sm text-red-900 pl-8">Appuyez sur le déclencheur manuel le plus proche (boîtier rouge).</p>
            </div>
            
            <div className="bg-white/60 p-4 rounded-lg border border-red-100">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Appeler les secours
              </h4>
              <div className="pl-8 flex gap-4">
                <span className="flex items-center gap-2 font-bold text-lg text-red-700"><Phone size={20}/> 18</span>
                <span className="flex items-center gap-2 font-bold text-lg text-red-700"><Phone size={20}/> 112</span>
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-lg border border-red-100">
              <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <span className="bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Évacuer
              </h4>
              <ul className="text-sm text-red-900 pl-8 list-disc space-y-1">
                <li>Dirigez-vous vers les sorties de secours en suivant le balisage vert.</li>
                <li><strong>Ne prenez pas les ascenseurs.</strong></li>
                <li>Rejoignez le point de rassemblement.</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* En cas d'accident */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-emerald-50 p-6 rounded-xl shadow-sm border border-emerald-200 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <HeartPulse size={120} />
          </div>
          <div className="flex items-center gap-3 border-b border-emerald-200 pb-3 relative z-10">
            <div className="p-2 bg-emerald-600 text-white rounded-lg">
              <HeartPulse size={24} />
            </div>
            <h3 className="text-xl font-bold text-emerald-900 uppercase tracking-wide">En cas d'accident</h3>
          </div>
          
          <div className="space-y-4 relative z-10">
            <div className="bg-white/60 p-4 rounded-lg border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Protéger
              </h4>
              <p className="text-sm text-emerald-900 pl-8">Écartez le danger pour éviter un sur-accident (couper le courant, baliser).</p>
            </div>
            
            <div className="bg-white/60 p-4 rounded-lg border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Alerter
              </h4>
              <div className="pl-8 flex flex-col gap-2">
                <span className="text-sm text-emerald-900">Prévenez un Sauveteur Secouriste du Travail (SST) ou appelez le SAMU :</span>
                <span className="flex items-center gap-2 font-bold text-lg text-emerald-700"><Phone size={20}/> 15</span>
              </div>
            </div>

            <div className="bg-white/60 p-4 rounded-lg border border-emerald-100">
              <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <span className="bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Secourir
              </h4>
              <p className="text-sm text-emerald-900 pl-8">Ne déplacez pas la victime sauf danger immédiat. Couvrez-la et parlez-lui.</p>
            </div>
          </div>
        </motion.div>

        {/* Confinement / Attentat (PPMS) */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-amber-50 p-6 rounded-xl shadow-sm border border-amber-200 space-y-4 md:col-span-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldAlert size={120} />
          </div>
          <div className="flex items-center gap-3 border-b border-amber-200 pb-3 relative z-10">
            <div className="p-2 bg-amber-600 text-white rounded-lg">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-xl font-bold text-amber-900 uppercase tracking-wide">Alerte Attentat / Intrusion (PPMS)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            <div className="bg-white/60 p-4 rounded-lg border border-amber-100">
              <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                S'échapper
              </h4>
              <p className="text-sm text-amber-900">Si possible, fuyez loin du danger. Ne prenez pas vos affaires personnelles.</p>
            </div>
            
            <div className="bg-white/60 p-4 rounded-lg border border-amber-100">
              <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                Se cacher
              </h4>
              <p className="text-sm text-amber-900">Enfermez-vous dans un local, barricadez la porte, éteignez les lumières et mettez vos téléphones en silencieux.</p>
            </div>

            <div className="bg-white/60 p-4 rounded-lg border border-amber-100">
              <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                Alerter
              </h4>
              <p className="text-sm text-amber-900">Dès que vous êtes en sécurité, appelez les forces de l'ordre au <strong>17</strong> ou envoyez un SMS au <strong>114</strong>.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
