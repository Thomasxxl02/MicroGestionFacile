import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Clock, ShieldCheck, AlertTriangle, Users, 
  Lock, FileSignature, Search, Filter, CheckCircle, Loader2, Plus, X
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import { generateJournalReport } from '../lib/pdfGenerator';

interface Event {
  id: string;
  date: Timestamp;
  type: string;
  category: string;
  title: string;
  description: string;
  author: string;
  hash?: string;
  hasAttachment?: boolean;
  createdAt: Timestamp;
}

interface JournalViewProps {
  companyId: string;
}

export default function JournalView({ companyId }: JournalViewProps) {
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Exercice d\'évacuation',
    category: 'exercice',
    title: '',
    description: ''
  });

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    const eventsRef = collection(db, 'companies', companyId, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(eventsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching events:", err);
      setError("Erreur lors du chargement du journal.");
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, `companies/${companyId}/events`, auth);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || companyId === 'PENDING') return;

    setIsSubmitting(true);
    const eventsPath = `companies/${companyId}/events`;

    try {
      await addDoc(collection(db, eventsPath), {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        author: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur inconnu',
        createdAt: serverTimestamp(),
        hash: Math.random().toString(36).substring(2, 15) // Mock hash for demo
      });
      setShowAddModal(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type: 'Exercice d\'évacuation',
        category: 'exercice',
        title: '',
        description: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, eventsPath, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case 'officiel': return <ShieldCheck className="text-purple-600" size={20} />;
      case 'exercice': return <Users className="text-emerald-600" size={20} />;
      case 'incident': return <AlertTriangle className="text-red-600" size={20} />;
      case 'intervention': return <Clock className="text-blue-600" size={20} />;
      default: return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getBadgeForCategory = (category: string, type: string) => {
    switch (category) {
      case 'officiel': return <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded border border-purple-200">{type}</span>;
      case 'exercice': return <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded border border-emerald-200">{type}</span>;
      case 'incident': return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded border border-red-200">{type}</span>;
      case 'intervention': return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200">{type}</span>;
      default: return <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200">{type}</span>;
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">Journal des Événements</h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <Lock size={12} /> Immuable & Opposable
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Registre chronologique sécurisé. Toute entrée est définitive et horodatée.</p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm w-48 lg:w-64"
            />
          </div>
          <button 
            onClick={() => generateJournalReport(events, 'Mon Entreprise')}
            className="flex items-center gap-2 px-4 py-2 border border-blue-200 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            <FileSignature size={16} /> Exporter (PDF)
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium">
            <Filter size={16} /> Filtrer
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Nouvelle Entrée
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="p-6 overflow-y-auto flex-1">
          {events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucun événement dans le journal. Cliquez sur "Nouvelle Entrée" pour ajouter un événement.
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 pb-8">
              {events.map((evt, index) => (
                <motion.div 
                  key={evt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-8"
                >
                  {/* Timeline Dot */}
                  <div className="absolute -left-[21px] top-1 w-10 h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                    {getIconForCategory(evt.category)}
                  </div>

                  {/* Event Card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        {getBadgeForCategory(evt.category, evt.type)}
                        <span className="text-sm font-medium text-gray-900">{evt.title}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900 block">{formatDate(evt.date).split(' ')[0]}</span>
                        <span className="text-xs text-gray-500">{formatDate(evt.date).split(' ')[1]}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <FileSignature size={14} /> Saisi par : {evt.author}
                        </span>
                        {evt.hash && (
                          <span className="flex items-center gap-1.5 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200" title="Empreinte cryptographique (Hash)">
                            <Lock size={12} /> {evt.hash}
                          </span>
                        )}
                      </div>
                      
                      {evt.hasAttachment && (
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1.5">
                          <CheckCircle size={16} /> Pièce jointe
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Consigner un événement</h3>
                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  Attention : Toute saisie dans le journal est définitive et non modifiable.
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'événement</label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select 
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="officiel">Officiel (Commission, etc.)</option>
                    <option value="exercice">Exercice (Évacuation, etc.)</option>
                    <option value="incident">Incident / Alarme</option>
                    <option value="intervention">Intervention technique</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type d'événement</label>
                  <input 
                    type="text" 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Exercice d'évacuation"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titre court</label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Exercice semestriel Bâtiment A"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description détaillée (Constatations, actions prises)</label>
                <textarea 
                  required
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez précisément l'événement, les personnes impliquées, et les mesures conservatoires prises..."
                ></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
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
                  Sceller l'événement
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
