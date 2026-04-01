import React, { useState } from 'react';
import { Shield, Search, Loader2, Building2, MapPin, ArrowRight, CheckCircle2 } from 'lucide-react';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchCompanyInfo } from '../lib/businessLogic';
import { motion } from 'motion/react';

interface OnboardingViewProps {
  user: any;
  onComplete: () => void;
}

export default function OnboardingView({ user, onComplete }: OnboardingViewProps) {
  const [step, setStep] = useState(1);
  const [siren, setSiren] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyData, setCompanyData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (siren.length < 9) {
      setError('Le SIREN doit comporter au moins 9 chiffres.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const info = await fetchCompanyInfo(siren);
      setCompanyData(info);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Impossible de trouver cette entreprise.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!companyData) return;
    setIsSubmitting(true);
    try {
      const companyId = doc(collection(db, 'companies')).id;
      
      // 1. Create Company
      await setDoc(doc(db, 'companies', companyId), {
        name: companyData.name,
        siren: companyData.siren,
        address: companyData.address,
        activity: companyData.activity,
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      // 2. Update User
      await setDoc(doc(db, 'users', user.uid), {
        companyId: companyId,
        role: 'admin',
        updatedAt: serverTimestamp()
      }, { merge: true });

      onComplete();
    } catch (err) {
      console.error('Onboarding error:', err);
      setError('Une erreur est survenue lors de la création de votre compte.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden"
      >
        <div className="bg-blue-600 p-8 text-white text-center relative">
          <div className="absolute top-4 right-4 opacity-20">
            <Shield size={120} />
          </div>
          <h2 className="text-2xl font-bold relative z-10">Bienvenue sur Registre Sécurité Pro</h2>
          <p className="text-blue-100 mt-2 relative z-10">Configurons votre espace de conformité en quelques secondes.</p>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">1</div>
                <h3 className="text-lg font-semibold text-gray-900">Identifiez votre entreprise</h3>
              </div>
              
              <p className="text-sm text-gray-500">
                Saisissez votre numéro SIREN ou SIRET. Nous récupérerons automatiquement les informations officielles via l'API SIRENE.
              </p>

              <form onSubmit={handleLookup} className="space-y-4">
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="SIREN (9 chiffres) ou SIRET (14 chiffres)"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={siren}
                    onChange={(e) => setSiren(e.target.value.replace(/\D/g, ''))}
                    maxLength={14}
                  />
                </div>
                
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    {error}
                  </p>
                )}

                <button 
                  type="submit"
                  disabled={loading || siren.length < 9}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                  Rechercher mon entreprise
                </button>
              </form>
            </div>
          )}

          {step === 2 && companyData && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Entreprise trouvée !</h3>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dénomination Sociale</label>
                  <p className="text-lg font-bold text-gray-900">{companyData.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">SIREN</label>
                    <p className="font-mono text-gray-700">{companyData.siren}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activité (APE)</label>
                    <p className="text-gray-700">{companyData.activity}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={12} /> Siège Social
                  </label>
                  <p className="text-sm text-gray-600">{companyData.address}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Modifier
                </button>
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="flex-[2] bg-blue-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                  Confirmer et Créer mon Registre
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité conforme au RGPD.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
