import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, UploadCloud, Search, Filter, Download, 
  Eye, Trash2, Plus, File, FileCheck, FileWarning,
  Building, Loader2, X
} from 'lucide-react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import { logEvent } from '../lib/businessLogic';

interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  siteId?: string;
  siteName?: string;
  url: string;
  size: number;
  createdAt: Timestamp;
  author: string;
}

export default function DocumentsView({ companyId }: { companyId: string }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<string>('autre');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      const name = file.name.toLowerCase();
      if (name.includes('rapport') || name.includes('vgp') || name.includes('q18') || name.includes('q19')) {
        setSuggestedCategory('rapport');
      } else if (name.includes('plan') || name.includes('evac') || name.includes('interv')) {
        setSuggestedCategory('plan');
      } else if (name.includes('certif') || name.includes('conform')) {
        setSuggestedCategory('certificat');
      } else if (name.includes('demeure') || name.includes('injonct')) {
        setSuggestedCategory('mise_en_demeure');
      } else {
        setSuggestedCategory('autre');
      }
    }
  };

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') return;

    setLoading(true);
    
    // Fetch sites for the dropdown
    const sitesQ = query(collection(db, `companies/${companyId}/sites`));
    getDocs(sitesQ).then(snapshot => {
      const fetchedSites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(fetchedSites);
    });

    // Real-time listener for documents
    const docsPath = `companies/${companyId}/documents`;
    const docsQ = query(collection(db, docsPath), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(docsQ, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Document[];
      setDocuments(fetchedDocs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, docsPath, auth);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId || companyId === 'PENDING' || !selectedFile) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const formData = new FormData(e.currentTarget);
    const siteId = formData.get('siteId') as string;
    const category = formData.get('category') as string;
    const name = formData.get('name') as string;
    const siteName = siteId === 'GLOBAL' ? 'Global' : sites.find(s => s.id === siteId)?.name || 'Inconnu';

    const storagePath = `companies/${companyId}/documents/${Date.now()}_${selectedFile.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, selectedFile);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed", error);
        setIsUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        try {
          const docsPath = `companies/${companyId}/documents`;
          const docRef = doc(collection(db, docsPath));
          await setDoc(docRef, {
            name,
            type: selectedFile.type.includes('pdf') ? 'PDF' : selectedFile.type.includes('image') ? 'Image' : 'Document',
            category,
            siteId: siteId === 'GLOBAL' ? null : siteId,
            siteName,
            url: downloadURL,
            size: selectedFile.size,
            author: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur',
            createdAt: serverTimestamp()
          });

      // Log to journal
      const user = auth.currentUser;
      if (user) {
        await logEvent({
          companyId,
          type: 'DOCUMENT_UPLOAD',
          description: `Nouveau document uploadé : ${name} (${category}) pour ${siteName}`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Utilisateur',
          metadata: { docId: docRef.id, siteId }
        });
      }
          
          setShowUploadModal(false);
          setSelectedFile(null);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `companies/${companyId}/documents`, auth);
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
        }
      }
    );
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.')) return;
    try {
      await deleteDoc(doc(db, `companies/${companyId}/documents/${docId}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `companies/${companyId}/documents/${docId}`, auth);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.siteName && doc.siteName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'ALL' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rapport': return <FileCheck className="text-emerald-500" size={20} />;
      case 'plan': return <File className="text-blue-500" size={20} />;
      case 'certificat': return <FileText className="text-amber-500" size={20} />;
      case 'mise_en_demeure': return <FileWarning className="text-red-500" size={20} />;
      default: return <FileText className="text-gray-500" size={20} />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'rapport': return 'Rapport de vérification (Q18, etc.)';
      case 'plan': return "Plan d'évacuation / intervention";
      case 'certificat': return 'Certificat de conformité';
      case 'mise_en_demeure': return 'Mise en demeure / Injonction';
      default: return 'Autre document';
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents & Rapports</h2>
          <p className="text-gray-500">Gérez vos rapports de vérification, plans et certificats de conformité.</p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <UploadCloud size={20} />
          Ajouter un document
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Rechercher un document, un site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="relative min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
          >
            <option value="ALL">Toutes les catégories</option>
            <option value="rapport">Rapports de vérification</option>
            <option value="plan">Plans</option>
            <option value="certificat">Certificats</option>
            <option value="mise_en_demeure">Mises en demeure</option>
            <option value="autre">Autres</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 text-sm font-semibold text-gray-600">Document</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Catégorie</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Établissement</th>
                <th className="p-4 text-sm font-semibold text-gray-600">Date d'ajout</th>
                <th className="p-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Aucun document trouvé.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getCategoryIcon(doc.category)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.type} • {formatSize(doc.size)} • Ajouté par {doc.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getCategoryLabel(doc.category)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building size={16} className="text-gray-400" />
                        {doc.siteName}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {doc.createdAt?.toDate().toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                          title="Voir"
                        >
                          <Eye size={18} />
                        </a>
                        <a 
                          href={doc.url} 
                          download={doc.name}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
                          title="Télécharger"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Ajouter un document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du document</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  placeholder="Ex: Rapport Q18 Annuel 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select 
                  name="category"
                  required
                  value={suggestedCategory}
                  onChange={(e) => setSuggestedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="rapport">Rapport de vérification (Q18, etc.)</option>
                  <option value="plan">Plan d'évacuation / intervention</option>
                  <option value="certificat">Certificat de conformité</option>
                  <option value="mise_en_demeure">Mise en demeure / Injonction</option>
                  <option value="autre">Autre document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Établissement concerné</label>
                <select 
                  name="siteId"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="GLOBAL">Document global (Tous les sites)</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (PDF, JPG, PNG)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                    selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <UploadCloud className={selectedFile ? 'text-blue-500' : 'text-gray-400'} size={24} />
                  <p className="text-sm text-gray-600 mt-2">
                    {selectedFile ? selectedFile.name : 'Cliquez pour sélectionner un fichier'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Max 10 MB</p>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept=".pdf,.jpg,.jpeg,.png" 
                  />
                </div>
              </div>

              {isUploading && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                  {isUploading ? 'Envoi...' : 'Uploader'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
