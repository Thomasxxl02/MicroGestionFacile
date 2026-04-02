# Guide d'Utilisation - Toast, Validation et Vérification des Doublons

## 📋 Vue d'ensemble des améliorations

Ce guide documente les 3 améliorations implémentées dans l'application.

---

## 1️⃣ Système de Toast (Notifications)

### Pourquoi ?
Remplace les `alert()` par des notifications élégantes et non-intrusive qui s'affichent dans le coin supérieur droit de l'écran.

### Comment l'utiliser ?

```typescript
import { toast } from './components/Toast';

// Succès
toast.success('Utilisateur ajouté avec succès.');

// Erreur
toast.error('Erreur lors de l\'enregistrement.');

// Avertissement
toast.warning('Veuillez remplir tous les champs requis.');

// Information
toast.info('L\'importation est en cours...');
```

### Caractéristiques
- ✅ Disparaît automatiquement après 4 secondes
- ✅ Bouton fermer manuel
- ✅ 4 types : success (vert), error (rouge), warning (orange), info (bleu)
- ✅ Empilable : plusieurs notifications s'affichent côte à côte

### Intégration obligatoire
Le composant `<ToastContainer />` doit être présent dans votre layout racine. C'est déjà fait dans [App.tsx](../App.tsx).

---

## 2️⃣ Module de Validation

### Fonctions disponibles

Tous les validateurs se trouvent dans [lib/validation.ts](src/lib/validation.ts)

```typescript
import { validation, validationMessages } from '../lib/validation';

// Email
validation.email('user@example.com')        // → true
validationMessages.email.invalid            // → "Email invalide. Exemple: user@example.com"

// SIREN (9 chiffres, clé de Luhn)
validation.siren('123456789')               // → boolean

// SIRET (14 chiffres, clé de Luhn)  
validation.siret('12345678900012')          // → boolean

// Adresse (1-200 caractères)
validation.address('123 rue de la Paix')    // → true

// Téléphone français
validation.phone('0612345678')              // → true
validation.phone('+33612345678')            // → true

// Nom (2-100 caractères)
validation.name('Jean Dupont')              // → true

// Code postal
validation.postalCode('75000')              // → true
```

### Exemple d'utilisation complet

```typescript
import { validation, validationMessages } from '../lib/validation';
import { toast } from './components/Toast';

const handleAddUser = async (email: string, name: string) => {
  // Valider l'email
  if (!validation.email(email)) {
    toast.error(validationMessages.email.invalid);
    return;
  }

  // Valider le nom
  if (!validation.name(name)) {
    toast.error(validationMessages.name.invalid);
    return;
  }

  // Procéder à l'enregistrement
  try {
    await saveUser(email, name);
    toast.success('Utilisateur ajouté avec succès.');
  } catch (error) {
    toast.error('Erreur lors de l\'enregistrement.');
  }
};
```

### Algorithme de Luhn
Les validateurs **SIREN** et **SIRET** utilisent l'algorithme de Luhn pour vérifier la clé de contrôle, comme le font les systèmes French SIRENE officiels.

---

## 3️⃣ Vérification des Doublons Email

### Implémenter la vérification

Exemple implémenté dans [SettingsView.tsx](../components/SettingsView.tsx) dans la fonction `handleAddUser` :

```typescript
// 1. Charger les utilisateurs existants
const users = await fetchUsers(companyId);

// 2. Vérifier les doublons
const emailExists = users.some(u => u.email.toLowerCase() === newEmail.toLowerCase());

if (emailExists) {
  toast.error('Cet email est déjà utilisé par un autre utilisateur.');
  return;
}

// 3. Procéder à l'ajout
await addUser(newEmail);
```

### Points importants

- ✅ Utilise `.toLowerCase()` pour ignorer la casse
- ✅ Charge les données AVANT de faire la validation
- ✅ Affiche un message clair avec toast
- ✅ Empêche l'envoi du formulaire si doublons trouvés

---

## 📝 Exemple complet : Ajouter un fournisseur

```typescript
import { validation, validationMessages } from '../lib/validation';
import { toast } from './components/Toast';

const handleAddProvider = async (formData) => {
  // Valider email
  if (!validation.email(formData.email)) {
    toast.error(validationMessages.email.invalid);
    return;
  }

  // Valider téléphone
  if (!validation.phone(formData.phone)) {
    toast.error(validationMessages.phone.invalid);
    return;
  }

  // Vérifier les doublons email
  const emailExists = providers.some(p => p.email.toLowerCase() === formData.email.toLowerCase());
  if (emailExists) {
    toast.error('Un fournisseur avec cet email existe déjà.');
    return;
  }

  // Enregistrer
  try {
    await saveFournisseur(formData);
    toast.success('Fournisseur ajouté avec succès.');
    fetchProviders(); // Recharger la liste
  } catch (error) {
    toast.error('Erreur lors de l\'ajout.');
  }
};
```

---

## 🔍 Fichiers modifiés

### Créés
- ✨ [src/components/Toast.tsx](src/components/Toast.tsx) - Système de notification
- ✨ [src/lib/validation.ts](src/lib/validation.ts) - Module de validation

### Mis à jour  
- 🔄 [src/App.tsx](src/App.tsx) - Ajout du ToastContainer
- 🔄 [src/components/SettingsView.tsx](src/components/SettingsView.tsx) - Validations, doublons, toasts
- 🔄 [src/components/InterventionForm.tsx](src/components/InterventionForm.tsx) - Remplacé alert → toast
- 🔄 [src/components/ProvidersView.tsx](src/components/ProvidersView.tsx) - Validations email/phone, toasts
- 🔄 [src/components/InventoryView.tsx](src/components/InventoryView.tsx) - Remplacé alert → toast
- 🔄 [src/components/SitesView.tsx](src/components/SitesView.tsx) - Validation SIRET, toasts

---

## ⚡ Checklist de migration

Si vous avez d'autres composants avec `alert()` :

- [ ] Importer : `import { toast } from './components/Toast';`
- [ ] Remplacer `alert('message')` par `toast.info('message')`
- [ ] Ajouter validations avant traitement
- [ ] Vérifier les doublons si applicable
- [ ] Tester avec le langage français
- [ ] Vérifier que les messages s'affichent 4 secondes

---

## 🎨 Personnalisation du Toast

Le design est en Tailwind CSS. Pour modifier les couleurs, éditez [Toast.tsx](src/components/Toast.tsx), fonction `getIcon()` et `getBgColor()`.

**Couleurs actuelles :**
- 🟢 Succès : vert (bg-green-50, text-green-800)
- 🔴 Erreur : rouge (bg-red-50, text-red-800)  
- 🟡 Avertissement : orange (bg-yellow-50, text-yellow-800)
- 🔵 Info : bleu (bg-blue-50, text-blue-800)

