/**
 * Validation utilities for forms
 */

export const validation = {
  /**
   * Valide un email selon la norme RFC 5322 simplifiée
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length < 150;
  },

  /**
   * Valide un SIREN français (9 chiffres) avec clé de Luhn
   */
  siren: (siren: string): boolean => {
    if (!/^\d{9}$/.test(siren)) return false;
    return validateLuhn(siren);
  },

  /**
   * Valide un SIRET français (14 chiffres) avec clé de Luhn
   */
  siret: (siret: string): boolean => {
    if (!/^\d{14}$/.test(siret)) return false;
    return validateLuhn(siret);
  },

  /**
   * Valide une adresse (non-vide, longueur raisonnable)
   */
  address: (address: string): boolean => {
    return address.trim().length > 0 && address.length < 200;
  },

  /**
   * Valide un numéro de téléphone français
   */
  phone: (phone: string): boolean => {
    const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/;
    return phoneRegex.test(phone.replace(/[\s\-\.]/g, ''));
  },

  /**
   * Valide un nom (non-vide, caractères valides)
   */
  name: (name: string): boolean => {
    return name.trim().length >= 2 && name.length < 100;
  },

  /**
   * Valide un code postal français
   */
  postalCode: (code: string): boolean => {
    return /^\d{5}$/.test(code);
  },
};

/**
 * Algorithme de Luhn pour valider les numéros avec clé de contrôle
 */
function validateLuhn(num: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = num.length - 1; i >= 0; i--) {
    let digit = parseInt(num.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Retourne les messages d'erreur de validation
 */
export const validationMessages = {
  email: {
    invalid: "Email invalide. Exemple: user@example.com",
    required: "Email requis",
  },
  siren: {
    invalid: "SIREN invalide. Doit comporter 9 chiffres.",
    required: "SIREN requis",
  },
  siret: {
    invalid: "SIRET invalide. Doit comporter 14 chiffres et respecter l'algorithme de Luhn.",
    required: "SIRET requis",
  },
  address: {
    invalid: "Adresse invalide. Doit comporter entre 1 et 200 caractères.",
    required: "Adresse requise",
  },
  phone: {
    invalid: "Numéro de téléphone invalide. Format: +33 ou 0X suivi de 8 chiffres",
    required: "Téléphone requis",
  },
  name: {
    invalid: "Nom invalide. Minimum 2 caractères.",
    required: "Nom requis",
  },
  postalCode: {
    invalid: "Code postal invalide. Doit comporter 5 chiffres.",
    required: "Code postal requis",
  },
};
