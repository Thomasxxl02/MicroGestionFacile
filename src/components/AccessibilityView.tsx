import React from 'react';
import { motion } from 'motion/react';
import { Accessibility, FileText, Users, AlertCircle, CheckCircle, UploadCloud, Info } from 'lucide-react';
import { generateAccessibilityRegister } from '../lib/pdfGenerator';

interface AccessibilityViewProps {
  companyId?: string;
}

export default function AccessibilityView({ companyId }: AccessibilityViewProps) {
  const handleGeneratePDF = () => {
    generateAccessibilityRegister();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Accessibility className="text-blue-600" size={28} />
            Registre Public d'Accessibilité
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Conformité aux obligations légales d'accessibilité pour les Personnes à Mobilité Réduite (PMR).
          </p>
        </div>
        <button 
          onClick={handleGeneratePDF}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FileText size={18} />
          Générer le Registre (PDF)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statut Administratif */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="text-emerald-600" size={20} />
            <h3 className="font-semibold text-gray-900">Statut Administratif</h3>
          </div>
          
          <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
            <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-medium text-emerald-900">Attestation de Conformité</h4>
              <p className="text-sm text-emerald-700 mt-1">L'établissement est déclaré conforme aux règles d'accessibilité.</p>
              <p className="text-xs text-emerald-600 mt-2 font-mono">Dépôt préfecture : 12/05/2023</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-400" size={18} />
                <span className="text-sm font-medium text-gray-700">Attestation_Conformite.pdf</span>
              </div>
              <button className="text-blue-600 text-sm font-medium hover:underline">Voir</button>
            </div>
            <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-400" size={18} />
                <span className="text-sm font-medium text-gray-700">Notice_Accessibilite.pdf</span>
              </div>
              <button className="text-blue-600 text-sm font-medium hover:underline">Voir</button>
            </div>
          </div>
        </motion.div>

        {/* Formation du Personnel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">Formation du Personnel</h3>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">2 Formés</span>
          </div>

          <p className="text-sm text-gray-600">
            Le personnel en contact avec le public doit être formé à l'accueil des personnes handicapées.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900 text-sm">Sophie Martin (Accueil)</span>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12}/> Validé</span>
              </div>
              <p className="text-xs text-gray-500">Formation "Accueil PMR" - 15/09/2025</p>
            </div>
            <div className="p-3 border border-gray-100 rounded-lg bg-gray-50">
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-gray-900 text-sm">Marc Dubois (Sécurité)</span>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12}/> Validé</span>
              </div>
              <p className="text-xs text-gray-500">Formation "Évacuation PMR" - 10/10/2025</p>
            </div>
          </div>
          <button className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors">
            + Ajouter une attestation de formation
          </button>
        </motion.div>

        {/* Équipements & Prestations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Accessibility className="text-purple-600" size={20} />
              <h3 className="font-semibold text-gray-900">Équipements Adaptés & Dérogations</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2"><Info size={16}/> Modalités d'accessibilité</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Rampe d'accès amovible disponible à l'accueil (sonnette extérieure).</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Sanitaires PMR situés au RDC, porte de gauche.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                  <span>Boucle magnétique installée au guichet principal.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2"><AlertCircle size={16}/> Dérogations accordées</h4>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h5 className="text-sm font-medium text-amber-900">Dérogation Technique (Architecturale)</h5>
                    <p className="text-xs text-amber-800 mt-1">Impossibilité d'installer un ascenseur pour l'accès au 2ème étage (Bâtiment classé historique).</p>
                    <p className="text-xs text-amber-700 mt-2 font-mono">Arrêté préfectoral n°2023-456</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
