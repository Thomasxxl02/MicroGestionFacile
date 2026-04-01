import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Search, Filter, Loader2, Download, Clock, User, FileText } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import { auth } from '../firebase';

interface AuditLog {
  id: string;
  type: string;
  description: string;
  authorId: string;
  authorName: string;
  companyId: string;
  metadata?: any;
  createdAt: Timestamp;
}

export default function AuditTrailView({ companyId }: { companyId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    let q = query(
      collection(db, 'audit_logs'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AuditLog[];
      setLogs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs', auth);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.type.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesFilter = filterType === 'ALL' || log.type.includes(filterType);
    
    return matchesSearch && matchesFilter;
  });

  const getLogIcon = (type: string) => {
    if (type.includes('SIGN')) return <FileText size={16} className="text-emerald-600" />;
    if (type.includes('DELETE') || type.includes('REMOVE')) return <Shield size={16} className="text-red-600" />;
    if (type.includes('ADD') || type.includes('CREATE')) return <Shield size={16} className="text-blue-600" />;
    if (type.includes('UPDATE') || type.includes('EDIT')) return <Shield size={16} className="text-amber-600" />;
    return <Clock size={16} className="text-gray-600" />;
  };

  const getLogBg = (type: string) => {
    if (type.includes('SIGN')) return 'bg-emerald-50 border-emerald-100';
    if (type.includes('DELETE') || type.includes('REMOVE')) return 'bg-red-50 border-red-100';
    if (type.includes('ADD') || type.includes('CREATE')) return 'bg-blue-50 border-blue-100';
    if (type.includes('UPDATE') || type.includes('EDIT')) return 'bg-amber-50 border-amber-100';
    return 'bg-gray-50 border-gray-100';
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Date', 'Heure', 'Utilisateur', 'Action', 'Description', 'Métadonnées'];
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map(log => {
        const date = log.createdAt?.toDate();
        const dateStr = date ? date.toLocaleDateString('fr-FR') : '';
        const timeStr = date ? date.toLocaleTimeString('fr-FR') : '';
        const metadataStr = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '';
        
        return [
          `"${dateStr}"`,
          `"${timeStr}"`,
          `"${log.authorName.replace(/"/g, '""')}"`,
          `"${log.type}"`,
          `"${log.description.replace(/"/g, '""')}"`,
          `"${metadataStr}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_trail_${companyId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Shield className="text-blue-600" size={28} />
            Piste d'Audit (Audit Trail)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Journal immuable de toutes les actions critiques effectuées sur la plateforme.
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            Exporter (CSV)
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher une action, un utilisateur..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={18} />
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Tous les événements</option>
            <option value="SIGN">Signatures</option>
            <option value="ADD">Créations</option>
            <option value="UPDATE">Modifications</option>
            <option value="DELETE">Suppressions</option>
            <option value="AUTH">Authentification</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Date & Heure</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Utilisateur</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Action</th>
                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Aucun log d'audit trouvé.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock size={14} className="text-gray-400" />
                        <span className="font-mono">{log.createdAt?.toDate().toLocaleString('fr-FR')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {log.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]" title={log.authorName}>
                          {log.authorName}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getLogBg(log.type)}`}>
                        {getLogIcon(log.type)}
                        {log.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-gray-700">{log.description}</p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-1 text-xs text-gray-400 font-mono truncate max-w-md" title={JSON.stringify(log.metadata)}>
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
