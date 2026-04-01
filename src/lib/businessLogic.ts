import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type EventType = 'EQUIPMENT_ADD' | 'EQUIPMENT_UPDATE' | 'EQUIPMENT_DELETE' | 'ANOMALY_REPORT' | 'ANOMALY_RESOLVE' | 'SITE_ADD' | 'SITE_UPDATE' | 'DOCUMENT_UPLOAD' | 'VGP_PERFORMED' | 'INTERVENTION_SIGNED';

export interface JournalEntry {
  companyId: string;
  type: EventType;
  description: string;
  authorId: string;
  authorName: string;
  metadata?: any;
}

/**
 * Logs an event to the company's journal for audit trail purposes.
 */
export async function logEvent(entry: JournalEntry) {
  try {
    const eventsRef = collection(db, `companies/${entry.companyId}/events`);
    const auditLogsRef = collection(db, 'audit_logs');
    
    // Simple mock hash for demonstration of immutability
    const mockHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Map type to category and title for UI consistency
    let category = 'autre';
    let title: string = entry.type;

    switch (entry.type) {
      case 'SITE_ADD':
        category = 'officiel';
        title = 'Nouvel Établissement';
        break;
      case 'EQUIPMENT_ADD':
        category = 'intervention';
        title = 'Nouvel Équipement';
        break;
      case 'VGP_PERFORMED':
        category = 'intervention';
        title = 'Vérification Périodique';
        break;
      case 'ANOMALY_REPORT':
        category = 'incident';
        title = 'Signalement Anomalie';
        break;
      case 'ANOMALY_RESOLVE':
        category = 'intervention';
        title = 'Résolution Anomalie';
        break;
      case 'DOCUMENT_UPLOAD':
        category = 'officiel';
        title = 'Nouveau Document';
        break;
      case 'SITE_UPDATE':
      case 'EQUIPMENT_UPDATE':
        category = 'intervention';
        title = 'Mise à jour';
        break;
      case 'INTERVENTION_SIGNED':
        category = 'officiel';
        title = 'Signature Intervention';
        break;
    }

    // Write to the company's journal (business events)
    await addDoc(eventsRef, {
      type: entry.type,
      category,
      title,
      description: entry.description,
      author: entry.authorName,
      authorId: entry.authorId,
      date: serverTimestamp(),
      createdAt: serverTimestamp(),
      metadata: entry.metadata || {},
      hash: mockHash,
      isImmutable: true
    });

    // Write to the global audit trail (compliance/security events)
    await addDoc(auditLogsRef, {
      type: entry.type,
      description: entry.description,
      authorId: entry.authorId,
      authorName: entry.authorName,
      companyId: entry.companyId,
      metadata: entry.metadata || {},
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Failed to log event to journal/audit:", error);
  }
}

/**
 * Suggests an ERP category based on the total capacity (public + staff).
 * Note: This is a simplified version of the French regulation.
 */
export function suggestERPCategory(capacity: number): string {
  if (capacity > 1500) return '1';
  if (capacity >= 701) return '2';
  if (capacity >= 301) return '3';
  if (capacity >= 1) {
    // Differentiation between 4 and 5 depends on specific thresholds per ERP type.
    // For simplicity, we'll use 300 as a general threshold.
    return capacity <= 300 ? '5' : '4';
  }
  return '5';
}

/**
 * Calculates the next regulatory inspection date (VGP) and frequency based on equipment type.
 * Standard frequency in France is usually 1 year for fire safety equipment.
 */
export function calculateNextVGP(type: string, lastDate: Date): { nextDate: Date, frequencyMonths: number } {
  const nextDate = new Date(lastDate);
  
  // Default is 1 year (12 months)
  let frequencyMonths = 12;
  
  // Specific cases (simplified)
  switch (type.toLowerCase()) {
    case 'électricité':
    case 'gaz':
      frequencyMonths = 12; // Can be 3 years in some ERT cases, but safety first
      break;
    case 'ascenseur':
      // Actually more frequent (6 weeks for maintenance, but VGP is different)
      frequencyMonths = 12;
      break;
    default:
      frequencyMonths = 12;
  }
  
  nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
  return { nextDate, frequencyMonths };
}

/**
 * Validates a SIRET number (14 digits, Luhn algorithm).
 */
export function isValidSiret(siret: string): boolean {
  if (!/^\d{14}$/.test(siret)) return false;
  
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let tmp = parseInt(siret[i]) * ((i % 2 === 0) ? 1 : 2);
    sum += tmp > 9 ? tmp - 9 : tmp;
  }
  return sum % 10 === 0;
}

/**
 * Fetches company information from the French public API (Recherche Entreprises)
 * using a SIREN or SIRET number.
 */
export async function fetchCompanyInfo(siretOrSiren: string) {
  const cleanNumber = siretOrSiren.replace(/\s/g, '');
  
  if (cleanNumber.length !== 9 && cleanNumber.length !== 14) {
    throw new Error("Le numéro doit contenir 9 (SIREN) ou 14 (SIRET) chiffres.");
  }

  try {
    const response = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${cleanNumber}`);
    
    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error("Aucune entreprise trouvée pour ce numéro.");
    }

    const company = data.results[0];
    const siege = company.siege;

    return {
      name: company.nom_complet,
      siren: company.siren,
      siret: siege?.siret || '',
      address: siege?.adresse || '',
      activity: company.activite_principale || '',
      isClosed: company.etat_administratif === 'C'
    };
  } catch (error) {
    console.error("Erreur lors de la recherche d'entreprise:", error);
    throw error;
  }
}
