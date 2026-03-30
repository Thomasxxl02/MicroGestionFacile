import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Award, AlertCircle, CheckCircle, Calendar, Phone, Mail, FileText, UserCheck, Plus } from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';

export default function ProvidersView({ companyId }: { companyId: string }) {
  const [activeTab, setActiveTab] = useState<'providers' | 'certifications'>('providers');
  const [providers, setProviders] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [showAddCertModal, setShowAddCertModal] = useState(false);

  const fetchData = async () => {
    if (!companyId || companyId === 'PENDING') return;
    setLoading(true);
    try {
      const providersQuery = query(collection(db, `companies/${companyId}/providers`));
      const certsQuery = query(collection(db, `companies/${companyId}/certifications`));
      
      const [providersSnap, certsSnap] = await Promise.all([
        getDocs(providersQuery),
        getDocs(certsQuery)
      ]);
      
      setProviders(providersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCertifications(certsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error("Error fetching providers/certs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleAddProvider = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newProvider = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      specialties: (formData.get('specialties') as string).split(',').map(s => s.trim()),
      contact: formData.get('contact') as string,
      phone: formData.get('phone') as string,
      contractEnd: formData.get('contractEnd') as string,
      status: formData.get('status') as string,
      createdAt: serverTimestamp()
    };

    try {
      const newRef = doc(collection(db, `companies/${companyId}/providers`));
      await setDoc(newRef, newProvider);
      setShowAddProviderModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding provider:", error);
      alert("Erreur lors de l'ajout. Vérifiez vos droits.");
    }
  };

  const handleAddCert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCert = {
      user: formData.get('user') as string,
      role: formData.get('role') as string,
      type: formData.get('type') as string,
      deliveryDate: formData.get('deliveryDate') as string,
      expiryDate: formData.get('expiryDate') as string,
      status: formData.get('status') as string,
      createdAt: serverTimestamp()
    };

    try {
      const newRef = doc(collection(db, `companies/${companyId}/certifications`));
      await setDoc(newRef, newCert);
      setShowAddCertModal(false);
      fetchData();
    } catch (error) {
      console.error("Error adding certification:", error);
      alert("Erreur lors de l'ajout. Vérifiez vos droits.");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Intervenants & Habilitations</h2>
          <p className="text-sm text-gray-500 mt-1">Gérez vos prestataires externes et les diplômes de votre personnel.</p>
        </div>
        <button 
          onClick={() => activeTab === 'providers' ? setShowAddProviderModal(true) : setShowAddCertModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          {activeTab === 'providers' ? 'Ajouter un prestataire' : 'Ajouter une habilitation'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button 
          onClick={() => setActiveTab('providers')}
          className={`py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors relative ${
            activeTab === 'providers' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Briefcase size={18} />
          Prestataires Externes
          {activeTab === 'providers' && (
            <motion.div layoutId="activeTabProviders" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('certifications')}
          className={`py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors relative ${
            activeTab === 'certifications' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Award size={18} />
          Habilitations Internes
          <span className="ml-1.5 bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs font-bold">{certifications.length}</span>
          {activeTab === 'certifications' && (
            <motion.div layoutId="activeTabProviders" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'providers' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prestataire</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spécialités</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contrat</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Chargement...</td></tr>
              ) : providers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucun prestataire trouvé.</td></tr>
              ) : providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{provider.name}</p>
                        <p className="text-xs text-gray-500">{provider.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {provider.specialties?.map((spec: string) => (
                        <span key={spec} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 flex items-center gap-1.5"><Mail size={12}/> {provider.contact}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1.5"><Phone size={12}/> {provider.phone}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className={`text-sm font-medium ${provider.status === 'Actif' ? 'text-gray-900' : 'text-red-600'}`}>
                        {provider.contractEnd}
                      </span>
                    </div>
                    {provider.status === 'Expiré' && (
                      <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mt-1 inline-block">Expiré</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-800">Éditer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'certifications' && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employé</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Habilitation</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Délivrance</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Expiration</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chargement...</td></tr>
              ) : certifications.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucune habilitation trouvée.</td></tr>
              ) : certifications.map((cert) => (
                <tr key={cert.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                        <UserCheck size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{cert.user}</p>
                        <p className="text-xs text-gray-500">{cert.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {cert.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 font-mono">{cert.deliveryDate}</td>
                  <td className="p-4 text-sm text-gray-900 font-mono font-medium">{cert.expiryDate}</td>
                  <td className="p-4">
                    {cert.status === 'Valid' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <CheckCircle size={14} /> Valide
                      </span>
                    )}
                    {cert.status === 'Expiring' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                        <AlertCircle size={14} /> À recycler
                      </span>
                    )}
                    {cert.status === 'Expired' && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md">
                        <AlertCircle size={14} /> Expiré
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Voir le diplôme">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Provider Modal */}
      {showAddProviderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter un prestataire</h3>
            <form onSubmit={handleAddProvider} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du prestataire</label>
                <input name="name" type="text" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ex: Apave" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input name="type" type="text" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bureau de Contrôle" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                  <select name="status" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="Actif">Actif</option>
                    <option value="Expiré">Expiré</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spécialités (séparées par des virgules)</label>
                <input name="specialties" type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Électricité, SSI" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
                  <input name="contact" type="email" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="contact@apave.fr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input name="phone" type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="01 23 45 67 89" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fin de contrat</label>
                <input name="contractEnd" type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="31/12/2026" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddProviderModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showAddCertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ajouter une habilitation</h3>
            <form onSubmit={handleAddCert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'employé</label>
                <input name="user" type="text" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle / Fonction</label>
                <input name="role" type="text" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Agent de Sécurité" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'habilitation</label>
                <input name="type" type="text" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="SSIAP 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de délivrance</label>
                  <input name="deliveryDate" type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="10/05/2024" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
                  <input name="expiryDate" type="text" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="10/05/2027" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select name="status" required className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="Valid">Valide</option>
                  <option value="Expiring">À recycler</option>
                  <option value="Expired">Expiré</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowAddCertModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
