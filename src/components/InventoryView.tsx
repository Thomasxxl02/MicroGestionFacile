import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Filter, QrCode, Edit2, AlertTriangle, 
  UploadCloud, FileText, CheckCircle, XCircle, 
  Battery, Lightbulb, ShieldAlert, Wind, Zap, Loader2,
  ChevronDown, ChevronUp, History, Bell, Camera, Droplets, Droplet, ShieldPlus, Settings
} from 'lucide-react';
import QrScanner from 'react-qr-scanner';
import { collectionGroup, query, where, onSnapshot, Timestamp, doc, updateDoc, addDoc, collection, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import EquipmentDetailView from './EquipmentDetailView';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { logEvent } from '../lib/businessLogic';

type Category = 'extincteurs' | 'desenfumage' | 'portes' | 'detection' | 'baes' | 'elec' | 'sprinkler' | 'poteaux' | 'autres_extinctions';

interface InventoryViewProps {
  category: Category;
  companyId: string;
}

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'OK' | 'MAINTENANCE' | 'HS';
  brand?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  installationDate?: Timestamp;
  lastMaintenanceDate?: Timestamp;
  nextInspectionDate?: Timestamp;
  inspectionFrequencyMonths?: number;
  agentType?: string;
  charge?: string;
  companyId: string;
  siteId: string;
  createdAt: Timestamp;
}

function ExtinguisherHistory({ equipmentId, siteId, companyId }: { equipmentId: string, siteId: string, companyId: string }) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interventionsPath = `companies/${companyId}/sites/${siteId}/equipments/${equipmentId}/interventions`;
    const q = query(collection(db, interventionsPath), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInterventions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [equipmentId, siteId, companyId]);

  if (loading) return <div className="p-4 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" size={20} /></div>;

  if (interventions.length === 0) return <div className="p-4 text-center text-gray-500 text-sm">Aucun historique disponible.</div>;

  return (
    <div className="p-4 bg-gray-50 border-t border-gray-100">
      <h5 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2"><History size={16} /> Historique des interventions</h5>
      <div className="space-y-3">
        {interventions.map(int => (
          <div key={int.id} className="bg-white p-3 rounded border border-gray-200 text-sm">
            <div className="flex justify-between font-medium text-gray-800 mb-1">
              <span>{int.type}</span>
              <span>{int.date?.toDate().toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="text-gray-600 text-xs mb-2">Par {int.technicianName} ({int.providerName})</div>
            {int.notes && <p className="text-gray-700 text-xs bg-gray-50 p-2 rounded">{int.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryView({ category, companyId }: InventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [reportingAnomalyFor, setReportingAnomalyFor] = useState<Equipment | null>(null);
  const [anomalyForm, setAnomalyForm] = useState({ description: '', severity: 'observation' as 'observation' | 'danger' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New states for Scanner and History
  const [showScanner, setShowScanner] = useState(false);
  const [scannedId, setScannedId] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [sites, setSites] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') return;
    const fetchSites = async () => {
      try {
        const { getDocs } = await import('firebase/firestore');
        const q = query(collection(db, `companies/${companyId}/sites`));
        const snapshot = await getDocs(q);
        setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching sites:", err);
      }
    };
    fetchSites();
  }, [companyId]);

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    // We map the category to the equipment type
    let equipmentType = '';
    switch(category) {
      case 'extincteurs': equipmentType = 'Extincteur'; break;
      case 'desenfumage': equipmentType = 'Désenfumage'; break;
      case 'portes': equipmentType = 'Porte Coupe-Feu'; break;
      case 'detection': equipmentType = 'Détection Incendie'; break;
      case 'baes': equipmentType = 'BAES'; break;
      case 'elec': equipmentType = 'Électricité'; break;
      case 'sprinkler': equipmentType = 'Sprinkler'; break;
      case 'poteaux': equipmentType = 'Poteau Incendie (PEI)'; break;
      case 'autres_extinctions': equipmentType = 'Autre Moyen d\'Extinction'; break;
      default: equipmentType = category;
    }

    const q = query(
      collectionGroup(db, 'equipments'),
      where('companyId', '==', companyId),
      where('type', '==', equipmentType)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const equipmentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Equipment[];
      setItems(equipmentsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching equipments:", err);
      setError("Erreur lors du chargement des équipements.");
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, `collectionGroup(equipments)`, auth);
    });

    return () => unsubscribe();
  }, [companyId, category]);

  const getCategoryTitle = () => {
    switch(category) {
      case 'extincteurs': return 'Extincteurs & RIA';
      case 'desenfumage': return 'Désenfumage (DENFC)';
      case 'portes': return 'Portes Coupe-Feu';
      case 'detection': return 'Détection Incendie (SSI)';
      case 'baes': return 'Éclairage de Secours (BAES)';
      case 'elec': return 'Gaz & Électricité';
      case 'sprinkler': return 'Réseaux Sprinkler';
      case 'poteaux': return 'Poteaux Incendie (PEI)';
      case 'autres_extinctions': return 'Autres Moyens d\'Extinction';
      default: return 'Inventaire';
    }
  };

  if (selectedEquipment) {
    return <EquipmentDetailView equipment={selectedEquipment} onBack={() => setSelectedEquipment(null)} companyId={companyId} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEditEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;
    setIsSubmitting(true);
    try {
      const equipRef = doc(db, `companies/${companyId}/sites/${editingEquipment.siteId}/equipments/${editingEquipment.id}`);
      
      const updateData: any = {
        name: editingEquipment.name,
        location: editingEquipment.location,
        status: editingEquipment.status
      };

      if (category === 'extincteurs') {
        if (editingEquipment.agentType) updateData.agentType = editingEquipment.agentType;
        if (editingEquipment.charge) updateData.charge = editingEquipment.charge;
      }

      await updateDoc(equipRef, updateData);
      setEditingEquipment(null);
    } catch (err) {
      console.error("Error updating equipment:", err);
      handleFirestoreError(err, OperationType.UPDATE, `equipments/${editingEquipment.id}`, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = items.find(i => i.id === scannedId || i.serialNumber === scannedId);
    if (found) {
      setSelectedEquipment(found);
      setShowScanner(false);
      setScannedId('');
    } else {
      alert("Équipement non trouvé");
    }
  };

  const getUpcomingMaintenances = () => {
    const now = new Date();
    return filteredItems.filter(item => {
      if (item.status === 'HS') return false;
      const lastDate = item.lastMaintenanceDate?.toDate() || item.installationDate?.toDate();
      if (!lastDate) return true; // Needs maintenance if no date
      const monthsDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsDiff >= 11; // Due in 1 month or overdue
    });
  };

  const upcomingMaintenances = category === 'extincteurs' ? getUpcomingMaintenances() : [];

  const statusData = [
    { name: 'Conforme', value: filteredItems.filter(i => i.status === 'OK').length, color: '#10b981' },
    { name: 'En maintenance', value: filteredItems.filter(i => i.status === 'MAINTENANCE').length, color: '#f59e0b' },
    { name: 'Hors service', value: filteredItems.filter(i => i.status === 'HS').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const handleReportAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingAnomalyFor) return;
    setIsSubmitting(true);
    try {
      const anomaliesPath = `companies/${companyId}/sites/${reportingAnomalyFor.siteId}/anomalies`;
      await addDoc(collection(db, anomaliesPath), {
        ...anomalyForm,
        status: 'open',
        reportedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur inconnu',
        date: Timestamp.now(),
        companyId,
        siteId: reportingAnomalyFor.siteId,
        equipmentId: reportingAnomalyFor.id,
        createdAt: Timestamp.now()
      });
      setReportingAnomalyFor(null);
      setAnomalyForm({ description: '', severity: 'observation' });
    } catch (err) {
      console.error("Error reporting anomaly:", err);
      handleFirestoreError(err, OperationType.CREATE, `anomalies`, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">{getCategoryTitle()}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Edit2 size={18} />
            Ajouter
          </button>
          {category === 'extincteurs' && (
            <button 
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <QrCode size={18} />
              Scanner
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un équipement..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="ALL">Tous les statuts</option>
              <option value="OK">Conforme</option>
              <option value="MAINTENANCE">En maintenance</option>
              <option value="HS">Hors service</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* LISTE DES ÉQUIPEMENTS */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h3 className="font-medium text-gray-700">Liste des équipements</h3>
            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{filteredItems.length} éléments</span>
          </div>
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Aucun équipement trouvé.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all overflow-hidden bg-white">
                  <div 
                    onClick={() => setSelectedEquipment(item)}
                    className="p-4 flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 w-2.5 h-2.5 rounded-full ${item.status === 'OK' ? 'bg-emerald-500' : item.status === 'HS' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.id} • {item.location || 'Localisation non définie'}</p>
                        {category === 'extincteurs' && (item.agentType || item.charge) && (
                          <p className="text-xs text-gray-400 mt-1">{item.agentType} {item.charge}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* QUICK ACTIONS */}
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {category === 'extincteurs' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowId(expandedRowId === item.id ? null : item.id);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" 
                          title="Historique"
                        >
                          {expandedRowId === item.id ? <ChevronUp size={18} /> : <History size={18} />}
                        </button>
                      )}
                      <button 
                        onClick={() => setEditingEquipment(item)}
                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                        title="Éditer"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setReportingAnomalyFor(item)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" 
                        title="Signaler Anomalie"
                      >
                        <AlertTriangle size={18} />
                      </button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expandedRowId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ExtinguisherHistory equipmentId={item.id} siteId={item.siteId} companyId={companyId} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOCUS RÉGLEMENTAIRE (UI Spécifique par catégorie) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
            <ShieldAlert className="text-blue-600" size={20} />
            <h3 className="font-semibold text-gray-900">Focus Réglementaire</h3>
          </div>
          
          {category === 'extincteurs' && (
            <div className="space-y-6">
              {upcomingMaintenances.length > 0 && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <Bell size={18} />
                    <h4 className="font-medium text-sm">Maintenances à prévoir</h4>
                  </div>
                  <p className="text-xs text-amber-700 mb-2">{upcomingMaintenances.length} extincteur(s) nécessitent une maintenance préventive imminente ou dépassée.</p>
                  <ul className="text-xs text-amber-800 space-y-1 pl-5 list-disc">
                    {upcomingMaintenances.slice(0, 3).map(item => (
                      <li key={item.id}>{item.name} ({item.location || 'Localisation inconnue'})</li>
                    ))}
                    {upcomingMaintenances.length > 3 && <li>... et {upcomingMaintenances.length - 3} autres</li>}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Répartition des statuts</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Normes EN 3-7 / NF S 61-919</h4>
                <p className="text-xs text-gray-500 mb-4">Répartition des agents extincteurs sur le site.</p>
                <div className="space-y-3">
                  {(() => {
                    const agentCounts: Record<string, number> = {};
                    let total = 0;
                    items.forEach(item => {
                      if (item.agentType) {
                        agentCounts[item.agentType] = (agentCounts[item.agentType] || 0) + 1;
                        total++;
                      }
                    });
                    
                    if (total === 0) return <p className="text-xs text-gray-400">Aucune donnée d'agent extincteur.</p>;

                    return Object.entries(agentCounts).map(([agent, count]) => {
                      const percentage = Math.round((count / total) * 100);
                      let colorClass = "bg-gray-500";
                      let textClass = "text-gray-700";
                      if (agent.includes('Eau')) { colorClass = "bg-blue-500"; textClass = "text-blue-700"; }
                      else if (agent.includes('CO2')) { colorClass = "bg-gray-600"; textClass = "text-gray-700"; }
                      else if (agent.includes('Poudre')) { colorClass = "bg-amber-500"; textClass = "text-amber-700"; }
                      
                      return (
                        <div key={agent}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className={`font-medium ${textClass}`}>{agent}</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          )}

          {category === 'desenfumage' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Schéma des Cantons (DENFC)</h4>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Wind className="text-slate-500" size={18} />
                    <span className="text-sm font-medium">Canton A (Hall)</span>
                  </div>
                  <ul className="space-y-2 pl-7 border-l-2 border-slate-200 ml-2">
                    <li className="text-xs text-gray-600 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500"/> Commande Manuelle RDC</li>
                    <li className="text-xs text-gray-600 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500"/> Exutoire Toiture NORD</li>
                    <li className="text-xs text-gray-600 flex items-center gap-2"><XCircle size={12} className="text-red-500"/> Exutoire Toiture SUD (Défaut)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {category === 'portes' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Compartimentage (EN 1154)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <div className="text-2xl font-bold text-emerald-700">42</div>
                    <div className="text-xs text-emerald-600 mt-1">Ventouses Actives</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100 text-center">
                    <div className="text-2xl font-bold text-red-700">2</div>
                    <div className="text-xs text-red-600 mt-1">Ferme-portes HS</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'detection' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Arborescence Zones (ZDA/ZDM)</h4>
                <div className="text-sm space-y-2">
                  <div className="font-medium text-gray-900 flex items-center gap-2"><Zap size={14} className="text-amber-500"/> ECS Principale</div>
                  <div className="pl-4 space-y-2 border-l border-gray-200 ml-2">
                    <div className="text-gray-700">ZDA 01 - Bureaux RDC</div>
                    <div className="text-gray-700">ZDA 02 - Archives <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded ml-2">Défaut Boucle</span></div>
                    <div className="text-gray-700">ZDM 01 - Déclencheurs Manuels</div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <button className="w-full py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    Enregistrer Essai Hebdomadaire
                  </button>
                </div>
              </div>
            </div>
          )}

          {category === 'baes' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">NF EN 1838 / NF EN 60598-2-22</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Battery className="text-emerald-500" size={18} />
                      <span className="text-sm font-medium text-gray-700">État Batteries</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">98% OK</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Lightbulb className="text-amber-500" size={18} />
                      <span className="text-sm font-medium text-gray-700">Test Lampes</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">100% OK</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'elec' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Rapports de conformité (Consuel)</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer">
                  <UploadCloud className="text-blue-500 mb-3" size={32} />
                  <p className="text-sm font-medium text-gray-900">Uploader un rapport</p>
                  <p className="text-xs text-gray-500 mt-1">PDF jusqu'à 10MB</p>
                </div>
                
                <div className="mt-6 space-y-3">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Derniers documents</h5>
                  <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                    <FileText className="text-red-500" size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Rapport_Q18_2026.pdf</p>
                      <p className="text-xs text-gray-500">Ajouté le 01/03/2026</p>
                    </div>
                    <button className="text-blue-600 text-sm font-medium hover:underline">Voir</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'sprinkler' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Norme NF EN 12845 / Règle APSAD R1</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <Droplets className="text-emerald-500" size={18} />
                      <span className="text-sm font-medium text-emerald-900">Pression Réseau</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-700">Normale (7.5 bar)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <Settings className="text-gray-500" size={18} />
                      <span className="text-sm font-medium text-gray-700">Source d'eau</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">Opérationnelle</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'poteaux' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Norme NF S 62-200 / Règle APSAD R5</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <div className="text-2xl font-bold text-blue-700">60 m³/h</div>
                    <div className="text-xs text-blue-600 mt-1">Débit Minimum Requis</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <div className="text-2xl font-bold text-emerald-700">1 bar</div>
                    <div className="text-xs text-emerald-600 mt-1">Pression Dynamique</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {category === 'autres_extinctions' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Moyens Spécifiques</h4>
                <p className="text-xs text-gray-500 mb-4">Couvertures anti-feu, bacs à sable, systèmes d'extinction automatique à gaz, etc.</p>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldPlus className="text-slate-500" size={18} />
                    <span className="text-sm font-medium">Répartition</span>
                  </div>
                  <ul className="space-y-2 pl-7 border-l-2 border-slate-200 ml-2">
                    <li className="text-xs text-gray-600 flex items-center gap-2">Extinction Gaz (Local Info)</li>
                    <li className="text-xs text-gray-600 flex items-center gap-2">Bacs à sable (Parking)</li>
                    <li className="text-xs text-gray-600 flex items-center gap-2">Couvertures anti-feu (Cuisines)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Edit Modal */}
      {editingEquipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Éditer l'équipement</h3>
              <button onClick={() => setEditingEquipment(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleEditEquipment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input 
                  type="text" 
                  required
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({...editingEquipment, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                <input 
                  type="text" 
                  value={editingEquipment.location || ''}
                  onChange={(e) => setEditingEquipment({...editingEquipment, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select 
                  required
                  value={editingEquipment.status}
                  onChange={(e) => setEditingEquipment({...editingEquipment, status: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OK">Conforme (OK)</option>
                  <option value="MAINTENANCE">En maintenance</option>
                  <option value="HS">Hors service (HS)</option>
                </select>
              </div>
              {category === 'extincteurs' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent extincteur</label>
                    <select 
                      value={editingEquipment.agentType || ''}
                      onChange={(e) => setEditingEquipment({...editingEquipment, agentType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Non défini</option>
                      <option value="Eau Pulvérisée">Eau Pulvérisée</option>
                      <option value="CO2">CO2</option>
                      <option value="Poudre ABC">Poudre ABC</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Charge</label>
                    <input 
                      type="text" 
                      value={editingEquipment.charge || ''}
                      onChange={(e) => setEditingEquipment({...editingEquipment, charge: e.target.value})}
                      placeholder="Ex: 6L, 2Kg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingEquipment(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Anomaly Modal */}
      {reportingAnomalyFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Signaler une Anomalie</h3>
              <button onClick={() => setReportingAnomalyFor(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={handleReportAnomaly} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                <p className="text-sm font-medium text-gray-900">Équipement concerné :</p>
                <p className="text-sm text-gray-600">{reportingAnomalyFor.name} ({reportingAnomalyFor.location})</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de gravité</label>
                <select 
                  required
                  value={anomalyForm.severity}
                  onChange={(e) => setAnomalyForm({...anomalyForm, severity: e.target.value as 'observation' | 'danger'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="observation">Observation (Défaut mineur)</option>
                  <option value="danger">Danger (Équipement inopérant)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  required
                  rows={4}
                  value={anomalyForm.description}
                  onChange={(e) => setAnomalyForm({...anomalyForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Décrivez l'anomalie constatée..."
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setReportingAnomalyFor(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Signaler
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Ajouter un équipement</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              const siteId = formData.get('siteId') as string;
              
              const newEquipment = {
                name: formData.get('name'),
                type: formData.get('type'),
                status: formData.get('status'),
                brand: formData.get('brand'),
                model: formData.get('model'),
                serialNumber: formData.get('serialNumber'),
                location: formData.get('location'),
                companyId,
                siteId,
                createdAt: Timestamp.now()
              };

              if (category === 'extincteurs') {
                (newEquipment as any).agentType = formData.get('agentType');
                (newEquipment as any).charge = formData.get('charge');
                
                const customFieldsStr = formData.get('customFields') as string;
                if (customFieldsStr) {
                  try {
                    (newEquipment as any).customFields = JSON.parse(customFieldsStr);
                  } catch (e) {
                    alert("Format JSON invalide pour les champs personnalisés.");
                    setIsSubmitting(false);
                    return;
                  }
                }
              }

              try {
                const equipRef = await addDoc(collection(db, `companies/${companyId}/sites/${siteId}/equipments`), newEquipment);
                
                // Log to journal
                const user = auth.currentUser;
                if (user) {
                  await logEvent({
                    companyId,
                    type: 'EQUIPMENT_ADD',
                    description: `Ajout de l'équipement : ${newEquipment.name} (${newEquipment.type}) sur le site ${sites.find(s => s.id === siteId)?.name || siteId}`,
                    authorId: user.uid,
                    authorName: user.displayName || user.email || 'Utilisateur',
                    metadata: { equipmentId: equipRef.id, siteId }
                  });
                }

                setShowAddModal(false);
              } catch (err) {
                console.error("Error adding equipment:", err);
                handleFirestoreError(err, OperationType.CREATE, `equipments`, auth);
              } finally {
                setIsSubmitting(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Établissement (Site)</label>
                <select 
                  name="siteId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un site</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'équipement</label>
                  <input 
                    type="text" 
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <input 
                    type="text" 
                    name="type"
                    required
                    defaultValue={category === 'extincteurs' ? 'Extincteur' : category === 'desenfumage' ? 'Désenfumage' : category === 'portes' ? 'Porte Coupe-Feu' : category === 'detection' ? 'Détection Incendie' : category === 'baes' ? 'BAES' : category === 'elec' ? 'Électricité' : ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marque</label>
                  <input 
                    type="text" 
                    name="brand"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modèle</label>
                  <input 
                    type="text" 
                    name="model"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de série</label>
                  <input 
                    type="text" 
                    name="serialNumber"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
                  <input 
                    type="text" 
                    name="location"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut initial</label>
                <select 
                  name="status"
                  required
                  defaultValue="OK"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="OK">Conforme</option>
                  <option value="MAINTENANCE">En maintenance</option>
                  <option value="HS">Hors service</option>
                </select>
              </div>
              
              {category === 'extincteurs' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent extincteur</label>
                    <select 
                      name="agentType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner</option>
                      <option value="Eau Pulvérisée">Eau Pulvérisée</option>
                      <option value="Eau + Additif">Eau + Additif</option>
                      <option value="CO2">CO2</option>
                      <option value="Poudre ABC">Poudre ABC</option>
                      <option value="Mousse">Mousse</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Charge</label>
                    <input 
                      type="text" 
                      name="charge"
                      placeholder="ex: 6L, 2Kg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {category === 'extincteurs' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Champs personnalisés (JSON)</label>
                  <textarea 
                    name="customFields"
                    rows={2}
                    placeholder='{"pression": "15 bar", "fabricant": "Sicli"}'
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Format JSON valide requis pour les champs personnalisés.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Scanner un équipement</h3>
              <button onClick={() => setShowScanner(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="aspect-square bg-black rounded-lg overflow-hidden relative border-4 border-blue-500/30">
                <QrScanner
                  delay={300}
                  onError={(err: any) => console.error(err)}
                  onScan={(data: any) => {
                    if (data) {
                      const text = typeof data === 'string' ? data : data.text;
                      setScannedId(text);
                      const found = items.find(i => i.id === text || i.serialNumber === text);
                      if (found) {
                        setSelectedEquipment(found);
                        setShowScanner(false);
                        setScannedId('');
                      }
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
                <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none animate-pulse"></div>
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-[scan_2s_infinite]"></div>
              </div>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">ou saisie manuelle</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <form onSubmit={handleScanSubmit} className="flex gap-2">
                <input 
                  type="text" 
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  placeholder="ID ou Numéro de série"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Chercher
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
