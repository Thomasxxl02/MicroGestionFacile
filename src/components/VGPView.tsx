import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, CheckCircle, AlertCircle, Clock, Search, Filter, Loader2, FileText, Download } from 'lucide-react';
import { collectionGroup, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  lastMaintenanceDate?: Timestamp;
  nextInspectionDate?: Timestamp;
  inspectionFrequencyMonths?: number;
  status: string;
  siteId: string;
}

export default function VGPView({ companyId }: { companyId: string }) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    const q = query(
      collectionGroup(db, 'equipments'),
      where('companyId', '==', companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Equipment[];
      setEquipments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const getNextVGPDate = (equipment: Equipment) => {
    if (equipment.nextInspectionDate) {
      return equipment.nextInspectionDate.toDate();
    }
    // Fallback if nextInspectionDate is not set
    if (!equipment.lastMaintenanceDate) return null;
    const date = equipment.lastMaintenanceDate.toDate();
    date.setMonth(date.getMonth() + (equipment.inspectionFrequencyMonths || 12));
    return date;
  };

  const getStatus = (nextDate: Date | null) => {
    if (!nextDate) return { label: 'À planifier', color: 'text-gray-500', bg: 'bg-gray-100', icon: <Clock size={14}/> };
    const now = new Date();
    const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'En retard', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle size={14}/> };
    if (diffDays < 30) return { label: 'Urgent', color: 'text-amber-600', bg: 'bg-amber-100', icon: <Clock size={14}/> };
    return { label: 'Conforme', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: <CheckCircle size={14}/> };
  };

  const filteredEquipments = equipments.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const dateA = getNextVGPDate(a)?.getTime() || 0;
    const dateB = getNextVGPDate(b)?.getTime() || 0;
    return dateA - dateB;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Calendar className="text-blue-600" size={28} />
            Vérifications Générales Périodiques (VGP)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Suivi des échéances réglementaires de maintenance pour l'ensemble de vos équipements.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
            <Download size={18} />
            Exporter (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-medium text-gray-600">Équipement</th>
                <th className="p-4 text-sm font-medium text-gray-600">Type</th>
                <th className="p-4 text-sm font-medium text-gray-600">Localisation</th>
                <th className="p-4 text-sm font-medium text-gray-600">Dernière VGP</th>
                <th className="p-4 text-sm font-medium text-gray-600">Prochaine Échéance</th>
                <th className="p-4 text-sm font-medium text-gray-600">Statut</th>
                <th className="p-4 text-sm font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">Aucun équipement trouvé.</td>
                </tr>
              ) : (
                filteredEquipments.map((item) => {
                  const nextDate = getNextVGPDate(item);
                  const status = getStatus(nextDate);
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{item.id}</div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">{item.type}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">{item.location}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600">
                          {item.lastMaintenanceDate?.toDate().toLocaleDateString('fr-FR') || 'Jamais'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-medium ${status.color}`}>
                          {nextDate?.toLocaleDateString('fr-FR') || 'Non définie'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Voir le rapport">
                          <FileText size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
