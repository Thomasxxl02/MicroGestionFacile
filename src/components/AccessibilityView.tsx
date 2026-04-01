import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Accessibility, FileText, Users, AlertCircle, CheckCircle, UploadCloud, Info, Loader2, Edit2, X, Plus, Trash2 } from 'lucide-react';
import { generateAccessibilityRegister } from '../lib/pdfGenerator';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';

interface AccessibilityViewProps {
  companyId?: string;
}

export default function AccessibilityView({ companyId }: AccessibilityViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);

  useEffect(() => {
    if (!companyId || companyId === 'PENDING') {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, `companies/${companyId}/accessibility`, "main"), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId]);

  const handleGeneratePDF = () => {
    generateAccessibilityRegister(data, "Siège Social Paris");
  };

  const handleOpenEdit = () => {
    setEditForm(data || {
      attestationDate: '',
      attestationNumber: '',
      personnel: [],
      equipments: [],
      derogations: []
    });
    setShowEditModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsSaving(true);
    try {
      await setDoc(doc(db, `companies/${companyId}/accessibility`, "main"), {
        ...editForm,
        updatedAt: serverTimestamp()
      });
      setShowEditModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `companies/${companyId}/accessibility/main`, auth);
    } finally {
      setIsSaving(false);
    }
  };

  const addPersonnel = () => {
    const personnel = [...(editForm.personnel || [])];
    personnel.push({ name: '', role: '', training: '', date: '' });
    setEditForm({ ...editForm, personnel });
  };

  const removePersonnel = (index: number) => {
    const personnel = [...(editForm.personnel || [])];
    personnel.splice(index, 1);
    setEditForm({ ...editForm, personnel });
  };

  const updatePersonnel = (index: number, field: string, value: string) => {
    const personnel = [...(editForm.personnel || [])];
    personnel[index] = { ...personnel[index], [field]: value };
    setEditForm({ ...editForm, personnel });
  };

  const addEquipment = () => {
    const equipments = [...(editForm.equipments || [])];
    equipments.push({ description: '' });
    setEditForm({ ...editForm, equipments });
  };

  const removeEquipment = (index: number) => {
    const equipments = [...(editForm.equipments || [])];
    equipments.splice(index, 1);
    setEditForm({ ...editForm, equipments });
  };

  const updateEquipment = (index: number, value: string) => {
    const equipments = [...(editForm.equipments || [])];
    equipments[index] = { description: value };
    setEditForm({ ...editForm, equipments });
  };

  const addDerogation = () => {
    const derogations = [...(editForm.derogations || [])];
    derogations.push({ title: '', description: '', reference: '' });
    setEditForm({ ...editForm, derogations });
  };

  const removeDerogation = (index: number) => {
    const derogations = [...(editForm.derogations || [])];
    derogations.splice(index, 1);
    setEditForm({ ...editForm, derogations });
  };

  const updateDerogation = (index: number, field: string, value: string) => {
    const derogations = [...(editForm.derogations || [])];
    derogations[index] = { ...derogations[index], [field]: value };
    setEditForm({ ...editForm, derogations });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!data && !showEditModal) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center max-w-md mx-auto">
        <div className="bg-blue-50 p-4 rounded-full text-blue-600">
          <Accessibility size={48} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Registre d'Accessibilité non configuré</h3>
        <p className="text-gray-500">
          Les données relatives à l'accessibilité PMR n'ont pas encore été renseignées pour cet établissement.
        </p>
        <button 
          onClick={handleOpenEdit}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Configurer maintenant
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <Accessibility className="text-blue-600" size={28} />
            Registre Public d'Accessibilité
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Conformité aux obligations légales d'accessibilité pour les Personnes à Mobilité Réduite (PMR).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenEdit}
            className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Edit2 size={18} />
            Modifier
          </button>
          <button 
            onClick={handleGeneratePDF}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FileText size={18} />
            Générer le Registre (PDF)
          </button>
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Statut Administratif */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <FileText className="text-emerald-600" size={20} />
              <h3 className="font-semibold text-gray-900">Statut Administratif</h3>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
              <CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-medium text-emerald-900">Attestation de Conformité</h4>
                <p className="text-sm text-emerald-700 mt-1">L'établissement est déclaré conforme aux règles d'accessibilité.</p>
                <p className="text-xs text-emerald-600 mt-2 font-mono">Dépôt préfecture : {data.attestationDate}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="text-gray-400" size={18} />
                  <span className="text-sm font-medium text-gray-700">Attestation_Conformite_{data.attestationNumber}.pdf</span>
                </div>
                <button className="text-blue-600 text-sm font-medium hover:underline">Voir</button>
              </div>
            </div>
          </motion.div>

          {/* Formation du Personnel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-blue-600" size={20} />
                <h3 className="font-semibold text-gray-900">Formation du Personnel</h3>
              </div>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{data.personnel?.length || 0} Formés</span>
            </div>

            <p className="text-sm text-gray-600">
              Le personnel en contact avec le public doit être formé à l'accueil des personnes handicapées.
            </p>

            <div className="space-y-3 pt-2">
              {data.personnel?.map((p: any, idx: number) => (
                <div key={idx} className="p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 text-sm">{p.name} ({p.role})</span>
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle size={12}/> Validé</span>
                  </div>
                  <p className="text-xs text-gray-500">{p.training} - {p.date}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Équipements & Prestations */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Accessibility className="text-purple-600" size={20} />
                <h3 className="font-semibold text-gray-900">Équipements Adaptés & Dérogations</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2"><Info size={16}/> Modalités d'accessibilité</h4>
                <ul className="space-y-2">
                  {data.equipments?.map((e: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                      <span>{e.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2"><AlertCircle size={16}/> Dérogations accordées</h4>
                {data.derogations?.map((d: any, idx: number) => (
                  <div key={idx} className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                      <div>
                        <h5 className="text-sm font-medium text-amber-900">{d.title}</h5>
                        <p className="text-xs text-amber-800 mt-1">{d.description}</p>
                        <p className="text-xs text-amber-700 mt-2 font-mono">{d.reference}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Configurer le Registre d'Accessibilité</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              {/* Administratif */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900 border-b pb-2">Informations Administratives</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date de l'attestation</label>
                    <input 
                      type="date"
                      value={editForm.attestationDate}
                      onChange={(e) => setEditForm({...editForm, attestationDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro d'attestation</label>
                    <input 
                      type="text"
                      value={editForm.attestationNumber}
                      onChange={(e) => setEditForm({...editForm, attestationNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: ACC-2024-001"
                    />
                  </div>
                </div>
              </div>

              {/* Personnel */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-medium text-gray-900">Personnel Formé</h4>
                  <button type="button" onClick={addPersonnel} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                <div className="space-y-4">
                  {editForm.personnel?.map((p: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-lg relative">
                      <button type="button" onClick={() => removePersonnel(idx)} className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                      <input 
                        placeholder="Nom"
                        value={p.name}
                        onChange={(e) => updatePersonnel(idx, 'name', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input 
                        placeholder="Rôle"
                        value={p.role}
                        onChange={(e) => updatePersonnel(idx, 'role', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input 
                        placeholder="Formation"
                        value={p.training}
                        onChange={(e) => updatePersonnel(idx, 'training', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input 
                        type="date"
                        value={p.date}
                        onChange={(e) => updatePersonnel(idx, 'date', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Équipements */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-medium text-gray-900">Équipements & Modalités</h4>
                  <button type="button" onClick={addEquipment} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {editForm.equipments?.map((e: any, idx: number) => (
                    <div key={idx} className="flex gap-2">
                      <input 
                        placeholder="Description de l'équipement ou de la modalité"
                        value={e.description}
                        onChange={(e) => updateEquipment(idx, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button type="button" onClick={() => removeEquipment(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dérogations */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="font-medium text-gray-900">Dérogations</h4>
                  <button type="button" onClick={addDerogation} className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline">
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                <div className="space-y-4">
                  {editForm.derogations?.map((d: any, idx: number) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg space-y-3 relative">
                      <button type="button" onClick={() => removeDerogation(idx)} className="absolute -top-2 -right-2 bg-white border border-gray-200 text-red-500 p-1 rounded-full shadow-sm hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                      <input 
                        placeholder="Titre de la dérogation"
                        value={d.title}
                        onChange={(e) => updateDerogation(idx, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <textarea 
                        placeholder="Description"
                        value={d.description}
                        onChange={(e) => updateDerogation(idx, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={2}
                      />
                      <input 
                        placeholder="Référence administrative"
                        value={d.reference}
                        onChange={(e) => updateDerogation(idx, 'reference', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={18} className="animate-spin" />}
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
