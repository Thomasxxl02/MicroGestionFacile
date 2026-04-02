import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building, MapPin, FileText, History, UploadCloud, Eye, ArrowLeft, ShieldAlert, CheckCircle, AlertTriangle, Plus, Search, Loader2 } from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import { toast } from './Toast';
import { useFirebase } from '../contexts/FirebaseContext';
import { isValidSiret, suggestERPCategory, logEvent, fetchCompanyInfo } from '../lib/businessLogic';

import { auth } from '../firebase';

export default function SitesView({ companyId }: { companyId: string }) {
  const [selectedSite, setSelectedSite] = useState<any | null>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sireneLoading, setSireneLoading] = useState(false);
  const [sireneError, setSireneError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    siret: '',
    address: '',
    type: 'ERP',
    erpCategory: '',
    erpType: '',
    capacity: 0
  });

  const handleSireneLookup = async () => {
    if (!formData.siret || (formData.siret.length !== 9 && formData.siret.length !== 14)) {
      setSireneError("Veuillez entrer un SIREN (9 chiffres) ou SIRET (14 chiffres) valide.");
      return;
    }

    setSireneLoading(true);
    setSireneError('');

    try {
      const info = await fetchCompanyInfo(formData.siret);
      setFormData(prev => ({
        ...prev,
        name: info.name,
        siret: info.siret || prev.siret,
        address: info.address
      }));
    } catch (error: any) {
      setSireneError(error.message || "Erreur lors de la recherche SIRENE.");
    } finally {
      setSireneLoading(false);
    }
  };

  const fetchSites = async () => {
    if (!companyId || companyId === 'PENDING') return;
    setLoading(true);
    try {
      const q = query(collection(db, `companies/${companyId}/sites`));
      const querySnapshot = await getDocs(q);
      const fetchedSites = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(fetchedSites);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `companies/${companyId}/sites`, auth);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, [companyId]);

  const [capacity, setCapacity] = useState<number>(0);
  const [suggestedCategory, setSuggestedCategory] = useState<string>('');

  const handleCapacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) || 0;
    setCapacity(val);
    setSuggestedCategory(suggestERPCategory(val));
    setFormData(prev => ({ ...prev, capacity: val }));
  };

  const handleAddSite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate SIRET only if it's 14 digits (SIREN is 9)
    if (formData.siret.length === 14 && !isValidSiret(formData.siret)) {
      toast.error("Le numéro SIRET saisi est invalide (doit comporter 14 chiffres et respecter l'algorithme de Luhn).");
      return;
    }

    const newSite = {
      name: formData.name,
      siret: formData.siret,
      type: formData.type,
      erpCategory: formData.erpCategory || suggestedCategory,
      erpType: formData.erpType,
      capacity: formData.capacity,
      address: formData.address,
      createdAt: serverTimestamp()
    };

    try {
      const newSiteRef = doc(collection(db, `companies/${companyId}/sites`));
      await setDoc(newSiteRef, newSite);
      
      // Log event
      const user = auth.currentUser;
      if (user) {
        await logEvent({
          companyId,
          type: 'SITE_ADD',
          description: `Ajout de l'établissement : ${newSite.name} (${formData.siret})`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Utilisateur',
          metadata: { siteId: newSiteRef.id }
        });
      }

      setShowAddModal(false);
      setFormData({
        name: '',
        siret: '',
        address: '',
        type: 'ERP',
        erpCategory: '',
        erpType: '',
        capacity: 0
      });
      fetchSites();
    } catch (error) {
      console.error("Error adding site:", error);
      handleFirestoreError(error, OperationType.CREATE, `companies/${companyId}/sites`, auth);
    }
  };

  if (selectedSite) {
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => setSelectedSite(null)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedSite.name}</h2>
            <p className="text-sm text-gray-500 font-mono">SIRET : {selectedSite.siret} • {selectedSite.address}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Classification Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <ShieldAlert className="text-blue-600" size={20} />
              <h3 className="font-semibold text-gray-900">Classification</h3>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Type d'établissement</p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-blue-50 text-blue-700">
                  {selectedSite.type}
                </span>
              </div>
              {selectedSite.type === 'ERP' && (
                <>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Catégorie ERP</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                      {selectedSite.erpCategory ? `${selectedSite.erpCategory}ème Catégorie` : '-'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Type d'Activité</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                      Type {selectedSite.erpType || '-'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Effectif (Public + Personnel)</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-gray-100 text-gray-700">
                      {selectedSite.capacity ? `${selectedSite.capacity} personnes` : '-'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Plans d'évacuation */}
          <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900">Plans d'Évacuation & Intervention</h3>
              </div>
              <button className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                <UploadCloud size={16} /> Nouvelle version
              </button>
            </div>

            {(!selectedSite.plans || selectedSite.plans.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 p-6">
                <FileText size={32} className="mb-2 opacity-50" />
                <p className="text-sm font-medium text-gray-600">Aucun plan disponible</p>
                <p className="text-xs mt-1">Veuillez uploader le plan d'évacuation validé.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current Plan */}
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white border border-blue-200 rounded flex items-center justify-center text-blue-300">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">Plan Actuel ({selectedSite.plans[0].version})</h4>
                        <span className="bg-blue-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">En vigueur</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Validé le {selectedSite.plans[0].date} par {selectedSite.plans[0].author}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm">
                    <Eye size={18} />
                  </button>
                </div>

                {/* History */}
                {selectedSite.plans.length > 1 && (
                  <div className="pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><History size={16}/> Historique des versions</h4>
                    <div className="space-y-2">
                      {selectedSite.plans.slice(1).map((plan: any) => (
                        <div key={plan.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Version {plan.version}</p>
                            <p className="text-xs text-gray-500">Archivé le {plan.date}</p>
                          </div>
                          <button className="text-xs font-medium text-blue-600 hover:underline">Consulter</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Annuaire des Établissements</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos sites, leurs classifications et leurs plans d'évacuation.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Ajouter un site
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Établissement</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plans</th>
              <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Chargement des sites...</td>
              </tr>
            ) : sites.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Aucun site trouvé. Ajoutez votre premier établissement.</td>
              </tr>
            ) : (
              sites.map((site) => (
                <tr key={site.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedSite(site)}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Building size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{site.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{site.siret}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {site.type}
                      </span>
                      {site.type === 'ERP' && (
                        <span className="text-xs text-gray-500">
                          Cat. {site.erpCategory || '?'} - Type {site.erpType || '?'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {site.plans && site.plans.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <CheckCircle size={14} /> À jour ({site.plans[0].version})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        <AlertTriangle size={14} /> Manquant
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-800">Gérer</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter un établissement</h3>
            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET ou SIREN</label>
                <div className="flex gap-2">
                  <input 
                    name="siret" 
                    type="text" 
                    required 
                    maxLength={14} 
                    minLength={9} 
                    value={formData.siret}
                    onChange={(e) => setFormData({...formData, siret: e.target.value})}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="12345678900012" 
                  />
                  <button 
                    type="button" 
                    onClick={handleSireneLookup}
                    disabled={sireneLoading}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    {sireneLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    Rechercher
                  </button>
                </div>
                {sireneError && <p className="text-xs text-red-600 mt-1">{sireneError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement</label>
                <input 
                  name="name" 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder="Ex: Boutique Lyon Centre" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select 
                    name="type" 
                    required 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="ERP">ERP (Établissement Recevant du Public)</option>
                    <option value="ERT">ERT (Établissement Recevant des Travailleurs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie ERP (1 à 5)</label>
                  <select 
                    name="erpCategory" 
                    value={formData.erpCategory}
                    onChange={(e) => setFormData({...formData, erpCategory: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Non applicable (ERT)</option>
                    <option value="1">1ère Catégorie (&gt; 1500 pers.)</option>
                    <option value="2">2ème Catégorie (701 à 1500 pers.)</option>
                    <option value="3">3ème Catégorie (301 à 700 pers.)</option>
                    <option value="4">4ème Catégorie (&lt; 300 pers.)</option>
                    <option value="5">5ème Catégorie (Petits établissements)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'Activité (ERP)</label>
                  <select 
                    name="erpType" 
                    value={formData.erpType}
                    onChange={(e) => setFormData({...formData, erpType: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Non applicable</option>
                    <option value="J">J - Structures d'accueil pour personnes âgées</option>
                    <option value="L">L - Salles d'auditions, de conférences</option>
                    <option value="M">M - Magasins de vente, centres commerciaux</option>
                    <option value="N">N - Restaurants et débits de boisson</option>
                    <option value="O">O - Hôtels et autres établissements d'hébergement</option>
                    <option value="P">P - Salles de danse et salles de jeux</option>
                    <option value="R">R - Établissements d'éveil, d'enseignement</option>
                    <option value="S">S - Bibliothèques, centres de documentation</option>
                    <option value="T">T - Salles d'expositions</option>
                    <option value="U">U - Établissements de soins</option>
                    <option value="V">V - Établissements de culte</option>
                    <option value="W">W - Administrations, banques, bureaux</option>
                    <option value="X">X - Établissements sportifs couverts</option>
                    <option value="Y">Y - Musées</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effectif Total</label>
                  <input 
                    name="capacity" 
                    type="number" 
                    min="0" 
                    value={formData.capacity}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                    placeholder="Ex: 50" 
                    onChange={handleCapacityChange}
                  />
                  {suggestedCategory && (
                    <p className="text-[10px] text-blue-600 mt-1 font-medium italic">
                      Catégorie ERP suggérée : {suggestedCategory}ème Catégorie
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <textarea 
                  name="address" 
                  rows={2} 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  placeholder="Adresse complète"
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
