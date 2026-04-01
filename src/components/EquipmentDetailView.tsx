import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, QrCode, CheckCircle, AlertTriangle, AlertCircle, 
  Info, FileText, Image as ImageIcon, Wrench, Calendar, MapPin, Tag, Download, Camera, Loader2, Plus, X, Upload, Shield
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, Timestamp, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import { generateInterventionReport } from '../lib/pdfGenerator';
import { logEvent, calculateNextVGP } from '../lib/businessLogic';

type TabType = 'identity' | 'history' | 'documents' | 'anomalies';

interface EquipmentDetailViewProps {
  equipment: any;
  companyId: string;
  onBack: () => void;
}

interface Intervention {
  id: string;
  date: Timestamp;
  type: string;
  technicianName: string;
  providerName: string;
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | string;
  notes?: string;
  signature?: {
    signedBy: string;
    signedAt: Timestamp;
    hash: string;
  };
  companyId: string;
  siteId: string;
  equipmentId?: string;
  createdAt: Timestamp;
}

interface Anomaly {
  id: string;
  equipmentId?: string;
  description: string;
  severity: 'observation' | 'danger';
  status: 'open' | 'resolved';
  reportedBy: string;
  date: Timestamp;
  companyId: string;
  siteId: string;
  createdAt: Timestamp;
}

interface EquipmentDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  companyId: string;
  createdAt: Timestamp;
}

export default function EquipmentDetailView({ equipment, companyId, onBack }: EquipmentDetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [documents, setDocuments] = useState<EquipmentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [interventionForm, setInterventionForm] = useState({
    type: 'Vérification Annuelle',
    technicianName: '',
    providerName: '',
    status: 'DRAFT',
    notes: ''
  });

  const [anomalyForm, setAnomalyForm] = useState({
    description: '',
    severity: 'observation' as 'observation' | 'danger'
  });
  const [anomalyPhoto, setAnomalyPhoto] = useState<File | null>(null);

  useEffect(() => {
    if (!companyId || !equipment.siteId || !equipment.id) return;

    setLoading(true);

    const interventionsPath = `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/interventions`;
    const interventionsQuery = query(collection(db, interventionsPath), orderBy('date', 'desc'));
    
    const unsubscribeInterventions = onSnapshot(interventionsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Intervention[];
      setInterventions(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, interventionsPath, auth);
    });

    const anomaliesPath = `companies/${companyId}/sites/${equipment.siteId}/anomalies`;
    const anomaliesQuery = query(
      collection(db, anomaliesPath),
      where('equipmentId', '==', equipment.id),
      orderBy('date', 'desc')
    );

    const unsubscribeAnomalies = onSnapshot(anomaliesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Anomaly[];
      setAnomalies(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, anomaliesPath, auth);
    });

    const documentsPath = `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/documents`;
    const documentsQuery = query(collection(db, documentsPath), orderBy('createdAt', 'desc'));
    
    const unsubscribeDocuments = onSnapshot(documentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EquipmentDocument[];
      setDocuments(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, documentsPath, auth);
      setLoading(false);
    });

    return () => {
      unsubscribeInterventions();
      unsubscribeAnomalies();
      unsubscribeDocuments();
    };
  }, [companyId, equipment.siteId, equipment.id]);

  const handleAddIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !equipment.siteId || !equipment.id) return;
    
    setIsSubmitting(true);
    const interventionsPath = `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/interventions`;
    const equipmentRef = doc(db, `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}`);
    const journalPath = `companies/${companyId}/journal`;
    
    try {
      // 1. Add intervention
      await addDoc(collection(db, interventionsPath), {
        ...interventionForm,
        status: 'DRAFT', // Interventions start as DRAFT
        date: Timestamp.now(),
        companyId,
        siteId: equipment.siteId,
        equipmentId: equipment.id,
        createdAt: Timestamp.now()
      });

      // 2. Update equipment lastMaintenanceDate, nextInspectionDate and status
      const newStatus = interventionForm.status === 'Conforme' ? 'OK' : 
                        interventionForm.status === 'Non Conforme' ? 'HS' : 'MAINTENANCE';
      
      const { nextDate, frequencyMonths } = calculateNextVGP(equipment.type, new Date());

      await updateDoc(equipmentRef, {
        lastMaintenanceDate: Timestamp.now(),
        nextInspectionDate: Timestamp.fromDate(nextDate),
        inspectionFrequencyMonths: frequencyMonths,
        status: newStatus
      });

      // 3. Add to global journal via business logic
      const user = auth.currentUser;
      if (user) {
        await logEvent({
          companyId,
          type: 'VGP_PERFORMED',
          description: `Maintenance effectuée sur l'équipement ${equipment.name} (${equipment.serialNumber || 'Sans N/S'}) par ${interventionForm.technicianName || 'Technicien'}. Statut: ${interventionForm.status}.`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Système',
          metadata: { 
            siteId: equipment.siteId, 
            equipmentId: equipment.id,
            nextInspectionDate: nextDate.toISOString()
          }
        });
      }

      setShowInterventionModal(false);
      setInterventionForm({
        type: 'Vérification Annuelle',
        technicianName: '',
        providerName: '',
        status: 'DRAFT',
        notes: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, interventionsPath, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIntervention = async (intervention: Intervention) => {
    if (!companyId || !equipment.siteId || !equipment.id) return;
    
    // Add confirmation dialog for the signature workflow
    if (!window.confirm("En signant cette intervention, elle deviendra définitivement inaltérable (lecture seule). Confirmez-vous cette action ?")) {
      return;
    }
    
    try {
      const interventionRef = doc(db, `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/interventions/${intervention.id}`);
      
      // Generate a simple hash of the intervention data for the signature
      const dataToHash = `${intervention.id}-${intervention.date.toMillis()}-${intervention.technicianName}`;
      const hash = btoa(dataToHash); // Simple base64 encoding for demo, use crypto in prod
      
      const user = auth.currentUser;
      
      await updateDoc(interventionRef, {
        status: 'SIGNED',
        signature: {
          signedBy: user?.uid || 'unknown',
          signedAt: Timestamp.now(),
          hash: hash
        }
      });

      if (user) {
        await logEvent({
          companyId,
          type: 'INTERVENTION_SIGNED',
          description: `Intervention signée et verrouillée sur l'équipement ${equipment.name} (${equipment.internalId})`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Utilisateur',
          metadata: { equipmentId: equipment.id, interventionId: intervention.id, hash }
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `interventions/${intervention.id}`, auth);
    }
  };

  const handleAddAnomaly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !equipment.siteId || !equipment.id) return;
    
    setIsSubmitting(true);
    const anomaliesPath = `companies/${companyId}/sites/${equipment.siteId}/anomalies`;
    
    try {
      let photoUrl = '';
      if (anomalyPhoto) {
        const storageRef = ref(storage, `companies/${companyId}/sites/${equipment.siteId}/anomalies/${Date.now()}_${anomalyPhoto.name}`);
        const uploadTask = await uploadBytesResumable(storageRef, anomalyPhoto);
        photoUrl = await getDownloadURL(uploadTask.ref);
      }

      await addDoc(collection(db, anomaliesPath), {
        ...anomalyForm,
        photoUrl,
        status: 'open',
        reportedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur inconnu',
        date: Timestamp.now(),
        companyId,
        siteId: equipment.siteId,
        equipmentId: equipment.id,
        createdAt: Timestamp.now()
      });

      // Log to journal
      const user = auth.currentUser;
      if (user) {
        await logEvent({
          companyId,
          type: 'ANOMALY_REPORT',
          description: `Nouvelle anomalie signalée sur ${equipment.name} : ${anomalyForm.description}`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Utilisateur',
          metadata: { equipmentId: equipment.id, severity: anomalyForm.severity }
        });
      }

      setShowAnomalyModal(false);
      setAnomalyForm({
        description: '',
        severity: 'observation'
      });
      setAnomalyPhoto(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, anomaliesPath, auth);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveAnomaly = async (anomalyId: string) => {
    if (!companyId || !equipment.siteId) return;
    
    try {
      const anomalyRef = doc(db, `companies/${companyId}/sites/${equipment.siteId}/anomalies/${anomalyId}`);
      await updateDoc(anomalyRef, {
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        resolvedBy: auth.currentUser?.displayName || auth.currentUser?.email || 'Utilisateur'
      });

      // Log to journal
      const user = auth.currentUser;
      if (user) {
        await logEvent({
          companyId,
          type: 'ANOMALY_RESOLVE',
          description: `Anomalie résolue sur ${equipment.name}`,
          authorId: user.uid,
          authorName: user.displayName || user.email || 'Utilisateur',
          metadata: { equipmentId: equipment.id, anomalyId }
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `anomalies/${anomalyId}`, auth);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId || !equipment.siteId || !equipment.id) return;

    setUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/documents/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed", error);
        setUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        // Save metadata to Firestore
        const documentsPath = `companies/${companyId}/sites/${equipment.siteId}/equipments/${equipment.id}/documents`;
        try {
          await addDoc(collection(db, documentsPath), {
            name: file.name,
            type: file.type.includes('pdf') ? 'PDF' : file.type.includes('image') ? 'Image' : 'Document',
            url: downloadURL,
            size: file.size,
            companyId,
            createdAt: Timestamp.now()
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, documentsPath, auth);
        } finally {
          setUploading(false);
          setUploadProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  };

  // Détermination du badge de statut
  const getStatusBadge = (status: string) => {
    if (status === 'OK') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800"><CheckCircle size={16} /> Conforme</span>;
    }
    if (status === 'MAINTENANCE' || status === 'OBSERVATION') {
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800"><AlertTriangle size={16} /> Observation</span>;
    }
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"><AlertCircle size={16} /> Danger</span>;
  };

  const handleDownloadReport = (intervention: Intervention) => {
    // Merge equipment identity with the passed equipment object for the report
    const equipmentData = {
      ...equipment,
      brand: equipment.brand || 'N/A',
      model: equipment.model || 'N/A',
      serialNumber: equipment.serialNumber || 'N/A',
      locationDesc: equipment.location || 'N/A',
    };
    
    // Format intervention date for the PDF generator
    const formattedIntervention = {
      ...intervention,
      date: intervention.date?.toDate().toISOString() || new Date().toISOString()
    };
    
    generateInterventionReport(formattedIntervention, equipmentData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-6 max-w-5xl mx-auto h-full flex flex-col"
    >
      {/* HEADER */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">{equipment.name}</h2>
              {getStatusBadge(equipment.status)}
            </div>
            <p className="text-sm text-gray-500 font-mono">{equipment.id} • {equipment.location || 'Localisation non définie'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm">
            <QrCode size={18} />
            Code QR
          </button>
          <button 
            onClick={() => setShowInterventionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
          >
            <Wrench size={18} />
            Intervenir
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-gray-200">
        <TabButton active={activeTab === 'identity'} onClick={() => setActiveTab('identity')} icon={<Info size={18} />} label="Identité" />
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Calendar size={18} />} label="Historique" />
        <TabButton active={activeTab === 'documents'} onClick={() => setActiveTab('documents')} icon={<FileText size={18} />} label="Documents" />
        <TabButton active={activeTab === 'anomalies'} onClick={() => setActiveTab('anomalies')} icon={<AlertTriangle size={18} />} label="Anomalies" badge={anomalies.filter(a => a.status === 'open').length} />
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'identity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-3">Caractéristiques</h3>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Tag size={14}/> Marque</p>
                  <p className="font-medium text-gray-900">{equipment.brand || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Tag size={14}/> Modèle</p>
                  <p className="font-medium text-gray-900">{equipment.model || 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Calendar size={14}/> Installation</p>
                  <p className="font-medium text-gray-900">{equipment.installationDate ? equipment.installationDate.toDate().toLocaleDateString('fr-FR') : 'Non renseigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><QrCode size={14}/> Numéro de série</p>
                  <p className="font-medium text-gray-900 font-mono text-sm">{equipment.serialNumber || 'Non renseigné'}</p>
                </div>
                {equipment.agentType && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Info size={14}/> Agent extincteur</p>
                    <p className="font-medium text-gray-900">{equipment.agentType}</p>
                  </div>
                )}
                {equipment.charge && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Info size={14}/> Charge</p>
                    <p className="font-medium text-gray-900">{equipment.charge}</p>
                  </div>
                )}
                {equipment.customFields && Object.keys(equipment.customFields).map((key) => (
                  <div key={key}>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><Tag size={14}/> {key}</p>
                    <p className="font-medium text-gray-900">{String(equipment.customFields[key])}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-100 pb-3">Localisation</h3>
              <div>
                <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5"><MapPin size={14}/> Description</p>
                <p className="font-medium text-gray-900">{equipment.location || 'Non renseigné'}</p>
              </div>
              <div className="mt-4 border-2 border-dashed border-gray-200 rounded-lg h-48 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <ImageIcon size={32} className="mb-2 opacity-50" />
                <span className="text-sm font-medium">Photo de l'emplacement</span>
                <button className="mt-2 text-xs text-blue-600 font-medium hover:underline flex items-center gap-1"><Camera size={12}/> Ajouter une photo</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">Historique des interventions</h3>
              <button 
                onClick={() => setShowInterventionModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                <Plus size={16} />
                Nouvelle intervention
              </button>
            </div>
            
            {interventions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Aucune intervention</h3>
                <p className="text-gray-500 mt-1">L'historique de cet équipement est vide.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 py-4">
                {interventions.map((event) => (
                  <div key={event.id} className="relative pl-8">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600"></div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{event.type}</h4>
                        <span className="text-sm text-gray-500 font-mono">{event.date?.toDate().toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{event.notes || 'Aucune note.'}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 flex items-center gap-1.5"><Wrench size={14}/> {event.technicianName} ({event.providerName})</span>
                        <div className="flex items-center gap-3">
                          <span className={`font-medium px-2 py-1 rounded ${
                            event.status === 'SIGNED' ? 'bg-emerald-50 text-emerald-600' : 
                            event.status === 'PENDING_SIGNATURE' ? 'bg-amber-50 text-amber-600' : 
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {event.status === 'SIGNED' ? 'Signé' : event.status === 'PENDING_SIGNATURE' ? 'En attente de signature' : 'Brouillon'}
                          </span>
                          
                          {event.status === 'SIGNED' && event.signature && (
                            <span className="text-emerald-600 flex items-center gap-1" title={`Hash: ${event.signature.hash}`}>
                              <Shield size={14} />
                              Certifié
                            </span>
                          )}
                          
                          {event.status !== 'SIGNED' && (
                            <button 
                              onClick={() => handleSignIntervention(event)}
                              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-medium hover:underline"
                            >
                              <CheckCircle size={14} />
                              Signer
                            </button>
                          )}

                          <button 
                            onClick={() => handleDownloadReport(event)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline"
                          >
                            <FileText size={14} />
                            PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="space-y-3">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun document associé à cet équipement.
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{doc.name}</h4>
                        <p className="text-xs text-gray-500">
                          {doc.type} • Ajouté le {doc.createdAt?.toDate().toLocaleDateString('fr-FR')} • {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors" 
                      title="Télécharger"
                    >
                      <Download size={20} />
                    </a>
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`w-full py-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                  uploading 
                    ? 'border-blue-300 bg-blue-50 text-blue-600' 
                    : 'border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600'
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={24} className="mb-2 animate-spin" />
                    <span className="font-medium text-sm">Téléchargement en cours... {Math.round(uploadProgress)}%</span>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="mb-2" />
                    <span className="font-medium text-sm">Ajouter un document (PDF, Image)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Anomalies signalées</h3>
              <button 
                onClick={() => setShowAnomalyModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium text-sm"
              >
                <Plus size={16} />
                Signaler une anomalie
              </button>
            </div>

            {anomalies.length === 0 ? (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
                <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-gray-900">Aucune anomalie</h3>
                <p className="text-gray-500 mt-1">Cet équipement ne présente aucun défaut connu.</p>
              </div>
            ) : (
              anomalies.map((anomaly) => (
                <div key={anomaly.id} className={`bg-white p-6 rounded-xl shadow-sm border flex gap-6 ${anomaly.status === 'resolved' ? 'border-gray-200 opacity-75' : anomaly.severity === 'danger' ? 'border-red-200' : 'border-amber-200'}`}>
                  <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0 border border-gray-200 overflow-hidden">
                    {(anomaly as any).photoUrl ? (
                      <img src={(anomaly as any).photoUrl} alt="Anomalie" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon size={32} className="opacity-50" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        anomaly.status === 'resolved' ? 'bg-gray-100 text-gray-800' :
                        anomaly.severity === 'danger' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {anomaly.status === 'resolved' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} 
                        {anomaly.status === 'resolved' ? 'Résolu' : anomaly.severity === 'danger' ? 'Danger' : 'Observation'}
                      </span>
                      <span className="text-sm text-gray-500">{anomaly.date?.toDate().toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-gray-900 font-medium mb-4">{anomaly.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-sm text-gray-500">Signalé par : {anomaly.reportedBy}</span>
                      {anomaly.status === 'open' && (
                        <button 
                          onClick={() => handleResolveAnomaly(anomaly.id)}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          Marquer comme résolu
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Intervention Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Nouvelle Intervention</h3>
              <button onClick={() => setShowInterventionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddIntervention} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'intervention</label>
                <select 
                  required
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({...interventionForm, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Vérification Annuelle">Vérification Annuelle</option>
                  <option value="Maintenance Préventive">Maintenance Préventive</option>
                  <option value="Dépannage">Dépannage</option>
                  <option value="Mise en service">Mise en service</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prestataire</label>
                  <input 
                    type="text" 
                    required
                    value={interventionForm.providerName}
                    onChange={(e) => setInterventionForm({...interventionForm, providerName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Apave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
                  <input 
                    type="text" 
                    required
                    value={interventionForm.technicianName}
                    onChange={(e) => setInterventionForm({...interventionForm, technicianName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nom du technicien"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select 
                  required
                  value={interventionForm.status}
                  onChange={(e) => setInterventionForm({...interventionForm, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="DRAFT">Brouillon</option>
                  <option value="PENDING_SIGNATURE">En attente de signature</option>
                  <option value="Conforme">Conforme</option>
                  <option value="Observation">Observation</option>
                  <option value="Non Conforme">Non Conforme</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  rows={3}
                  value={interventionForm.notes}
                  onChange={(e) => setInterventionForm({...interventionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Détails de l'intervention..."
                ></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
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
      {showAnomalyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Signaler une Anomalie</h3>
              <button onClick={() => setShowAnomalyModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAnomaly} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau de gravité</label>
                <select 
                  required
                  value={anomalyForm.severity}
                  onChange={(e) => setAnomalyForm({...anomalyForm, severity: e.target.value as 'observation' | 'danger'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Décrivez l'anomalie constatée..."
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optionnel)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setAnomalyPhoto(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowAnomalyModal(false)}
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
    </motion.div>
  );
}

function TabButton({ active, onClick, icon, label, badge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`py-4 px-6 font-medium text-sm flex items-center gap-2 transition-colors relative ${
        active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1.5 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs font-bold">
          {badge}
        </span>
      )}
      {active && (
        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
      )}
    </button>
  );
}
