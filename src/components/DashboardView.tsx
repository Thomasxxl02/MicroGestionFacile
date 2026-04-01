import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ComplianceRing } from './ComplianceRing';
import { AlertTriangle, CalendarClock, ShieldCheck, Bell, Calendar as CalendarIcon, ArrowRight, AlertCircle, Info, Loader2, FileText, Clock, Camera } from 'lucide-react';
import { collectionGroup, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function DashboardView({ companyId, onNavigate }: { companyId?: string, onNavigate?: (view: any) => void }) {
  const [equipments, setEquipments] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    const qEquipments = query(
      collectionGroup(db, 'equipments'),
      where('companyId', '==', companyId)
    );

    const unsubscribeEquipments = onSnapshot(qEquipments, (snapshot) => {
      setEquipments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qAnomalies = query(
      collectionGroup(db, 'anomalies'),
      where('companyId', '==', companyId)
    );

    const unsubscribeAnomalies = onSnapshot(qAnomalies, (snapshot) => {
      setAnomalies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qDocs = query(
      collectionGroup(db, 'documents'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribeDocs = onSnapshot(qDocs, (snapshot) => {
      setRecentDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeEquipments();
      unsubscribeAnomalies();
      unsubscribeDocs();
    };
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Calculate KPIs
  const totalEquipments = equipments.length;
  const compliantEquipments = equipments.filter(e => e.status === 'OK').length;
  
  const openAnomalies = anomalies.filter(a => a.status === 'open');
  const criticalAnomalies = openAnomalies.filter(a => a.severity === 'danger').length;

  const now = new Date();
  const upcomingVgps = equipments.filter(e => {
    if (e.status === 'HS') return false;
    
    let nextDate: Date;
    if (e.nextInspectionDate) {
      nextDate = e.nextInspectionDate.toDate();
    } else {
      const lastDate = e.lastMaintenanceDate?.toDate() || e.installationDate?.toDate();
      if (!lastDate) return true; // Needs maintenance if no date
      
      nextDate = new Date(lastDate);
      const frequencyMonths = e.inspectionFrequencyMonths || 12;
      nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
    }
    
    const diffDays = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // Due in 30 days or overdue
  });

  const overdueVgps = upcomingVgps.filter(e => {
    let nextDate: Date;
    if (e.nextInspectionDate) {
      nextDate = e.nextInspectionDate.toDate();
    } else {
      const lastDate = e.lastMaintenanceDate?.toDate() || e.installationDate?.toDate();
      if (!lastDate) return true;
      nextDate = new Date(lastDate);
      const frequencyMonths = e.inspectionFrequencyMonths || 12;
      nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
    }
    return nextDate < now;
  }).length;

  // Robust Compliance Score Calculation
  // 1. Equipment Status (40%)
  const equipmentScore = totalEquipments > 0 ? (compliantEquipments / totalEquipments) * 40 : 40;
  
  // 2. VGP Punctuality (30%)
  // Penalty for each overdue VGP (max 30% penalty)
  const vgpPenalty = Math.min(overdueVgps * 5, 30);
  const vgpScore = 30 - vgpPenalty;

  // 3. Anomaly Management (30%)
  // Penalty for each critical anomaly (max 30% penalty)
  const anomalyPenalty = Math.min(criticalAnomalies * 10, 30);
  const anomalyScore = 30 - anomalyPenalty;

  const complianceRate = Math.round(equipmentScore + vgpScore + anomalyScore);

  const kpis = [
    { id: 1, label: 'Équipements Conformes', value: `${complianceRate}%`, icon: <ShieldCheck size={24} className="text-emerald-600" />, bg: 'bg-emerald-50', trend: `${compliantEquipments} / ${totalEquipments} équipements` },
    { id: 2, label: 'VGP à venir (30j)', value: upcomingVgps.length.toString(), icon: <CalendarClock size={24} className="text-blue-600" />, bg: 'bg-blue-50', trend: 'À planifier', action: () => onNavigate?.('vgp') },
    { id: 3, label: 'Anomalies Ouvertes', value: openAnomalies.length.toString(), icon: <AlertTriangle size={24} className="text-amber-600" />, bg: 'bg-amber-50', trend: `${criticalAnomalies} critiques` },
  ];

  const vgpCalendar = upcomingVgps.slice(0, 5).map((e) => {
    let nextDate = new Date();
    if (e.nextInspectionDate) {
      nextDate = e.nextInspectionDate.toDate();
    } else {
      const lastDate = e.lastMaintenanceDate?.toDate() || e.installationDate?.toDate();
      if (lastDate) {
        nextDate = new Date(lastDate);
        const frequencyMonths = e.inspectionFrequencyMonths || 12;
        nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
      }
    }
    const isUrgent = nextDate < now;

    return {
      id: e.id,
      date: nextDate.toLocaleDateString('fr-FR'),
      type: e.type,
      provider: 'À définir',
      status: isUrgent ? 'urgent' : 'upcoming'
    };
  });

  const alerts = openAnomalies.slice(0, 5).map(a => ({
    id: a.id,
    severity: a.severity === 'danger' ? 'critical' : 'major',
    message: `${a.description} (Équipement: ${a.equipmentId})`,
    time: a.date?.toDate().toLocaleDateString('fr-FR') || 'Récemment'
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Pilotage & Conformité</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => (window as any).openGlobalScanner?.()}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <Camera size={18} />
            Scanner QR
          </button>
          <div className="text-sm text-gray-500">Dernière mise à jour : À l'instant</div>
        </div>
      </div>

      {/* KPIs Section */}
      {totalEquipments === 0 ? (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center space-y-4">
          <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Info size={32} />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-blue-900">Bienvenue dans votre nouveau registre !</h3>
            <p className="text-blue-700 mt-2">
              Votre inventaire est actuellement vide. Pour découvrir toutes les fonctionnalités de l'application, vous pouvez générer des données de démonstration.
            </p>
          </div>
          <button 
            onClick={() => onNavigate?.('settings')}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowRight size={18} />
            Aller aux Paramètres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center"
          >
            <h3 className="text-sm font-medium text-gray-500 mb-2 w-full text-left">Score Global</h3>
            <ComplianceRing score={complianceRate} />
          </motion.div>

          {kpis.map((kpi, index) => (
            <motion.div 
              key={kpi.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 1) }}
              onClick={kpi.action}
              className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between ${kpi.action ? 'cursor-pointer hover:border-blue-300 transition-all' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
                  <h4 className="text-3xl font-bold text-gray-900 mt-2">{kpi.value}</h4>
                </div>
                <div className={`p-3 rounded-lg ${kpi.bg}`}>
                  {kpi.icon}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 font-medium flex items-center justify-between">
                {kpi.trend}
                {kpi.action && <ArrowRight size={14} className="text-gray-400" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendrier VGP */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-2 overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="text-blue-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900">Calendrier des VGP</h3>
            </div>
            <button 
              onClick={() => onNavigate?.('vgp')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="p-0 flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                  <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type de Vérification</th>
                  <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Prestataire</th>
                  <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vgpCalendar.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 text-sm">Aucune VGP à venir.</td>
                  </tr>
                ) : (
                  vgpCalendar.map((vgp) => (
                    <tr key={vgp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900 whitespace-nowrap">{vgp.date}</td>
                      <td className="p-4 text-sm text-gray-700">{vgp.type}</td>
                      <td className="p-4 text-sm text-gray-600">{vgp.provider}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${vgp.status === 'urgent' ? 'bg-red-100 text-red-800' : 
                            vgp.status === 'upcoming' ? 'bg-amber-100 text-amber-800' : 
                            'bg-blue-100 text-blue-800'}`}
                        >
                          {vgp.status === 'urgent' ? 'Imminent' : vgp.status === 'upcoming' ? 'À planifier' : 'Planifié'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Flux d'Alertes */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="text-amber-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900">Alertes & Anomalies</h3>
            </div>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-6">
              {alerts.length === 0 ? (
                <div className="text-center text-gray-500 text-sm">Aucune anomalie ouverte.</div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex gap-4 relative">
                    <div className="absolute left-[11px] top-8 bottom-[-24px] w-px bg-gray-200 last:hidden"></div>
                    
                    <div className="relative z-10 mt-1">
                      {alert.severity === 'critical' && <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center"><AlertCircle size={14} className="text-red-600" /></div>}
                      {alert.severity === 'major' && <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center"><AlertTriangle size={14} className="text-amber-600" /></div>}
                      {alert.severity === 'info' && <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center"><Info size={14} className="text-blue-600" /></div>}
                    </div>
                    
                    <div>
                      <p className={`text-sm font-medium ${alert.severity === 'critical' ? 'text-red-700' : alert.severity === 'major' ? 'text-amber-700' : 'text-gray-900'}`}>
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Documents Récents */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 lg:col-span-3 flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="text-emerald-600" size={20} />
              <h3 className="text-lg font-medium text-gray-900">Documents Récents</h3>
            </div>
            <button 
              onClick={() => onNavigate?.('documents')}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {recentDocuments.length === 0 ? (
                <div className="col-span-full text-center text-gray-500 text-sm py-4">Aucun document récent.</div>
              ) : (
                recentDocuments.map((doc) => (
                  <div key={doc.id} className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h4>
                        <p className="text-xs text-gray-500">{doc.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock size={10} />
                        {doc.createdAt?.toDate().toLocaleDateString('fr-FR')}
                      </div>
                      <span className="uppercase font-semibold">{doc.type}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

