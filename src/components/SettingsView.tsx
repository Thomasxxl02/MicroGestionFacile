import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Save, Building2, Users, Plus, Trash2, Shield, Wrench, Eye, Database, Loader2 } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';

export default function SettingsView({ companyId }: { companyId: string }) {
  const [activeTab, setActiveTab] = useState<'company' | 'users'>('company');

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-semibold text-gray-900">Paramètres</h2>
      
      <div className="flex border-b border-gray-200">
        <button 
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'company' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('company')}
        >
          <Building2 size={18} />
          Entreprise
        </button>
        <button 
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 transition-colors ${activeTab === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          Utilisateurs & Techniciens
        </button>
      </div>

      {activeTab === 'company' ? (
        <CompanySettings companyId={companyId} />
      ) : (
        <UserManagement companyId={companyId} />
      )}
    </div>
  );
}

function CompanySettings({ companyId }: { companyId: string }) {
  const [companyData, setCompanyData] = useState({
    name: '',
    siren: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const docRef = doc(db, 'companies', companyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCompanyData(docSnap.data() as any);
        }
      } catch (error) {
        console.error("Error fetching company data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [companyId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'companies', companyId);
      await setDoc(docRef, { ...companyData, id: companyId }, { merge: true });
      alert('Informations enregistrées avec succès.');
    } catch (error) {
      console.error("Error saving company data:", error);
      alert('Erreur lors de l\'enregistrement. Vérifiez vos droits d\'accès (Admin requis).');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm("Voulez-vous générer des données de démonstration ? Cela ajoutera des sites, équipements et événements fictifs.")) return;
    
    setSeeding(true);
    try {
      // 1. Create Sites
      const sites = [
        {
          name: "Siège Social - Paris",
          siret: "12345678900012",
          type: "ERP",
          erpCategory: "3",
          erpType: "W",
          capacity: 450,
          address: "15 Rue de la Paix, 75000 Paris",
          createdAt: serverTimestamp()
        },
        {
          name: "Entrepôt Logistique - Lyon",
          siret: "12345678900045",
          type: "ERT",
          address: "ZAC des Lumières, 69000 Lyon",
          createdAt: serverTimestamp()
        }
      ];

      const siteRefs = [];
      for (const site of sites) {
        const ref = doc(collection(db, `companies/${companyId}/sites`));
        await setDoc(ref, site);
        siteRefs.push({ id: ref.id, ...site });
      }

      // 2. Create Equipments for each site
      for (const site of siteRefs) {
        const equipments = [
          {
            name: "Extincteur Eau Pulvérisée 6L",
            type: "extincteurs",
            brand: "Sicli",
            model: "E6A",
            serialNumber: `SN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            location: "Accueil RDC",
            status: "OK",
            installationDate: Timestamp.fromDate(new Date(2023, 5, 15)),
            lastMaintenanceDate: Timestamp.fromDate(new Date(2025, 5, 10)),
            companyId,
            siteId: site.id,
            agentType: "Eau + Additif",
            charge: 6,
            createdAt: serverTimestamp()
          },
          {
            name: "Bloc de Secours (BAES)",
            type: "baes",
            brand: "Kaufel",
            model: "Primo",
            serialNumber: `SN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            location: "Sortie de secours Nord",
            status: "OK",
            installationDate: Timestamp.fromDate(new Date(2024, 1, 20)),
            lastMaintenanceDate: Timestamp.fromDate(new Date(2025, 1, 15)),
            companyId,
            siteId: site.id,
            createdAt: serverTimestamp()
          },
          {
            name: "Extincteur CO2 2kg",
            type: "extincteurs",
            brand: "Desautel",
            model: "C2",
            serialNumber: `SN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            location: "Local Informatique",
            status: "MAINTENANCE",
            installationDate: Timestamp.fromDate(new Date(2023, 8, 10)),
            lastMaintenanceDate: Timestamp.fromDate(new Date(2024, 8, 12)),
            companyId,
            siteId: site.id,
            agentType: "CO2",
            charge: 2,
            createdAt: serverTimestamp()
          }
        ];

        for (const eq of equipments) {
          const eqRef = doc(collection(db, `companies/${companyId}/sites/${site.id}/equipments`));
          await setDoc(eqRef, eq);
          
          // Add an anomaly for the one in MAINTENANCE
          if (eq.status === 'MAINTENANCE') {
            await addDoc(collection(db, `companies/${companyId}/sites/${site.id}/anomalies`), {
              equipmentId: eqRef.id,
              description: "Date de péremption de la charge dépassée.",
              severity: "observation",
              status: "open",
              reportedBy: "Système",
              date: Timestamp.now(),
              companyId,
              siteId: site.id,
              createdAt: serverTimestamp()
            });
          }
        }
      }

      // 3. Add Journal Events
      const events = [
        {
          type: "EXERCICE",
          category: "exercice",
          title: "Exercice d'évacuation annuel",
          description: "Évacuation complète du bâtiment en 3min 12s. Aucun incident à déplorer. Point de rassemblement validé.",
          date: Timestamp.fromDate(new Date(2025, 9, 15)),
          author: "Responsable Sécurité",
          createdAt: serverTimestamp(),
          hash: Math.random().toString(36).substring(2, 15)
        },
        {
          type: "OFFICIEL",
          category: "officiel",
          title: "Passage Commission de Sécurité",
          description: "Visite périodique de la commission. Avis favorable sans réserve.",
          date: Timestamp.fromDate(new Date(2025, 11, 5)),
          author: "Préfecture",
          createdAt: serverTimestamp(),
          hash: Math.random().toString(36).substring(2, 15)
        }
      ];

      for (const event of events) {
        await addDoc(collection(db, `companies/${companyId}/events`), event);
      }

      alert('Données de démonstration générées avec succès !');
      window.location.reload();
    } catch (error) {
      console.error("Error seeding data:", error);
      handleFirestoreError(error, OperationType.CREATE, `companies/${companyId}`, auth);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'entreprise / Raison sociale</label>
          <input 
            type="text" 
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={companyData.name || ''}
            onChange={(e) => setCompanyData({...companyData, name: e.target.value})}
            placeholder="Ex: Acme Corp"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Numéro SIREN</label>
          <input 
            type="text" 
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={companyData.siren || ''}
            onChange={(e) => setCompanyData({...companyData, siren: e.target.value})}
            maxLength={9}
            placeholder="123456789"
          />
          <p className="text-xs text-gray-500 mt-1">Le numéro SIREN doit comporter exactement 9 chiffres.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adresse du siège social</label>
          <textarea 
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={companyData.address || ''}
            onChange={(e) => setCompanyData({...companyData, address: e.target.value})}
            rows={3}
            placeholder="123 rue de la Paix, 75000 Paris"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center border-t border-gray-100">
        <button 
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
        >
          {seeding ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
          Générer des données démo
        </button>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
        >
          <Save size={18} />
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  );
}

function UserManagement({ companyId }: { companyId: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'technician' });

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('companyId', '==', companyId));
      const querySnapshot = await getDocs(q);
      const fetchedUsers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    try {
      const newUserRef = doc(collection(db, 'users'));
      await setDoc(newUserRef, {
        ...newUser,
        companyId,
        id: newUserRef.id
      });
      setNewUser({ name: '', email: '', role: 'technician' });
      fetchUsers();
    } catch (error) {
      console.error("Error adding user:", error);
      alert("Erreur lors de l'ajout de l'utilisateur (Admin requis).");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Erreur lors de la suppression.");
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <Shield size={16} className="text-red-600" />;
      case 'technician': return <Wrench size={16} className="text-blue-600" />;
      default: return <Eye size={16} className="text-gray-600" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'admin': return 'Administrateur';
      case 'technician': return 'Technicien';
      default: return 'Observateur';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ajouter un utilisateur</h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input 
              type="text" 
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              placeholder="Jean Dupont"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              value={newUser.email}
              onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              placeholder="jean@exemple.fr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select 
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="technician">Technicien</option>
              <option value="admin">Administrateur</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>
          <button 
            type="submit"
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium w-full"
          >
            <Plus size={18} />
            Ajouter
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-sm font-medium text-gray-600">Nom</th>
              <th className="p-4 text-sm font-medium text-gray-600">Email</th>
              <th className="p-4 text-sm font-medium text-gray-600">Rôle</th>
              <th className="p-4 text-sm font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Chargement...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">Aucun utilisateur trouvé.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{user.name}</td>
                  <td className="p-4 text-gray-600">{user.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {getRoleIcon(user.role)}
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
