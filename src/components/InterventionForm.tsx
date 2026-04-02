import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Save, FileText } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from './Toast';

export default function InterventionForm({ companyId, establishmentId, equipmentId }: { companyId: string, establishmentId: string, equipmentId: string }) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [technician, setTechnician] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!technician || !description) {
      toast.warning('Veuillez remplir tous les champs requis.');
      return;
    }
    setSaving(true);
    try {
      const signatureData = sigCanvas.current?.toDataURL();
      const interventionsRef = collection(db, `companies/${companyId}/establishments/${establishmentId}/equipment/${equipmentId}/interventions`);
      await addDoc(interventionsRef, {
        equipmentId,
        date: new Date().toISOString(),
        technicianName: technician,
        description,
        signatureData
      });
      toast.success('Intervention enregistrée avec succès !');
      setTechnician('');
      setDescription('');
      sigCanvas.current?.clear();
    } catch (error) {
      console.error('Error saving intervention:', error);
      toast.error('Erreur lors de l\'enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Rapport d\'Intervention', 10, 10);
    doc.text(`Technicien: ${technician}`, 10, 20);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 30);
    doc.text(`Description: ${description}`, 10, 40);
    doc.save('rapport_intervention.pdf');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Nouvelle Intervention</h3>
      <input type="text" placeholder="Nom du technicien" className="w-full p-2 border rounded" value={technician} onChange={(e) => setTechnician(e.target.value)} />
      <textarea placeholder="Description" className="w-full p-2 border rounded" value={description} onChange={(e) => setDescription(e.target.value)} />
      
      <div className="border rounded p-2">
        <SignatureCanvas ref={sigCanvas} canvasProps={{ width: 500, height: 200, className: 'sigCanvas' }} />
      </div>
      
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"><Save size={16} /> {saving ? 'Enregistrement...' : 'Enregistrer'}</button>
        <button onClick={generatePDF} className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg"><FileText size={16} /> Générer PDF</button>
      </div>
    </div>
  );
}
