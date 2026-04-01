import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to format dates
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const generateInterventionReport = (intervention: any, equipment: any) => {
  const doc = new jsPDF();
  
  // --- HEADER ---
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('RAPPORT D\'INTERVENTION', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Référence: INT-${intervention.id || Math.random().toString(36).substring(2, 8).toUpperCase()}`, 105, 28, { align: 'center' });
  doc.text(`Date: ${formatDate(intervention.date)}`, 105, 34, { align: 'center' });

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);

  // --- COMPANY & PROVIDER INFO ---
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉTABLISSEMENT CLIENT', 14, 50);
  doc.text('PRESTATAIRE', 110, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Nom: RegTech Sécurité', 14, 58);
  doc.text('Adresse: 15 Rue de la Paix, 75000 Paris', 14, 64);
  doc.text('Contact: Jean Dupont', 14, 70);

  doc.text(`Technicien: ${intervention.technicianName || 'Non spécifié'}`, 110, 58);
  doc.text(`Entreprise: ${intervention.providerName || 'Interne'}`, 110, 64);

  // --- EQUIPMENT INFO ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('ÉQUIPEMENT CONCERNÉ', 14, 85);

  autoTable(doc, {
    startY: 90,
    head: [['Type', 'Marque', 'Modèle', 'Localisation', 'N° Série']],
    body: [
      [
        equipment.type || 'N/A',
        equipment.brand || 'N/A',
        equipment.model || 'N/A',
        equipment.location || 'N/A',
        equipment.serialNumber || 'N/A'
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 }
  });

  // --- INTERVENTION DETAILS ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DÉTAILS DE L\'INTERVENTION', 14, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Type d\'intervention', 'Statut', 'Observations']],
    body: [
      [
        intervention.type || 'Maintenance Préventive',
        intervention.status || 'Terminé',
        intervention.notes || 'Aucune observation particulière.'
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // --- SIGNATURES ---
  const signY = (doc as any).lastAutoTable.finalY + 30;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Signature du Technicien', 40, signY, { align: 'center' });
  doc.text('Signature du Client', 160, signY, { align: 'center' });

  // Draw signature boxes
  doc.setDrawColor(150, 150, 150);
  doc.rect(15, signY + 5, 80, 40);
  doc.rect(115, signY + 5, 80, 40);

  // If we have a signature image (base64)
  if (intervention.signature) {
    try {
      doc.addImage(intervention.signature, 'PNG', 20, signY + 10, 70, 30);
    } catch (e) {
      console.error('Failed to add signature to PDF', e);
    }
  }

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré par RegTech Sécurité le ${new Date().toLocaleDateString('fr-FR')} - Document opposable`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(`Rapport_Intervention_${equipment.id}_${new Date().getTime()}.pdf`);
};

export const generateJournalReport = (events: any[], companyName: string = 'Entreprise') => {
  const doc = new jsPDF();
  
  // --- HEADER ---
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('REGISTRE DE SÉCURITÉ', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Établissement: ${companyName}`, 105, 28, { align: 'center' });
  doc.text(`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`, 105, 34, { align: 'center' });

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);

  // --- JOURNAL DES ÉVÉNEMENTS ---
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Journal des Événements & Interventions', 14, 50);

  const tableData = events.map(event => [
    formatDate(event.date?.toDate ? event.date.toDate().toISOString() : event.date),
    event.type || event.category || 'N/A',
    event.title || 'N/A',
    event.author || 'N/A',
    event.hash ? `Oui (${event.hash.substring(0, 8)}...)` : 'Non'
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Date', 'Type', 'Description', 'Auteur', 'Signé/Haché']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9 }
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document généré numériquement - Valeur probante garantie par hachage cryptographique`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Registre_Securite_${new Date().getTime()}.pdf`);
};

export const generateAccessibilityRegister = (data: any, companyName: string = 'Établissement') => {
  const doc = new jsPDF();
  
  // --- HEADER ---
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('REGISTRE PUBLIC D\'ACCESSIBILITÉ', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Établissement: ${companyName}`, 105, 28, { align: 'center' });
  doc.text(`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`, 105, 34, { align: 'center' });

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);

  // --- STATUT ADMINISTRATIF ---
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Statut Administratif', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Attestation de conformité déposée en préfecture le: ${data?.attestationDate || 'N/A'}`, 14, 58);
  doc.text(`Catégorie ERP: ${data?.erpCategory || 'N/A'}ème Catégorie`, 14, 64);
  doc.text(`Type ERP: Type ${data?.erpType || 'N/A'}`, 14, 70);

  // --- FORMATION DU PERSONNEL ---
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Formation du Personnel', 14, 85);

  const personnelData = (data?.personnel || []).map((p: any) => [
    p.name,
    p.role,
    p.training,
    p.date
  ]);

  autoTable(doc, {
    startY: 90,
    head: [['Nom de l\'employé', 'Fonction', 'Formation Suivie', 'Date de validation']],
    body: personnelData.length > 0 ? personnelData : [['Aucun personnel formé enregistré', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 }
  });

  // --- EQUIPEMENTS & DEROGATIONS ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Équipements Adaptés & Dérogations', 14, finalY);

  const equipmentData = (data?.equipments || []).map((e: any) => [
    'Équipement',
    e.description,
    e.status === 'ok' ? 'Opérationnel' : 'À vérifier'
  ]);

  const derogationData = (data?.derogations || []).map((d: any) => [
    'Dérogation',
    d.description,
    `Accordée (${d.reference})`
  ]);

  const combinedData = [...equipmentData, ...derogationData];

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Type', 'Description', 'Statut']],
    body: combinedData.length > 0 ? combinedData : [['Aucune donnée enregistrée', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 10 }
  });

  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Document obligatoire (Art. R. 111-19-60 du Code de la construction et de l'habitation)`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Registre_Accessibilite_${new Date().getTime()}.pdf`);
};
