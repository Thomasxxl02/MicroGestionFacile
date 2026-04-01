/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LayoutDashboard, FireExtinguisher, DoorOpen, Settings, 
  Wind, BellRing, Lightbulb, Zap, Shield, Building, Users,
  BookOpen, Accessibility, Megaphone, LogOut, Droplets, Droplet, ShieldPlus, FileText,
  Calendar
} from 'lucide-react';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';
import SitesView from './components/SitesView';
import ProvidersView from './components/ProvidersView';
import JournalView from './components/JournalView';
import AccessibilityView from './components/AccessibilityView';
import InstructionsView from './components/InstructionsView';
import DocumentsView from './components/DocumentsView';
import VGPView from './components/VGPView';
import AuditTrailView from './components/AuditTrailView';
import OnboardingView from './components/OnboardingView';
import { useFirebase } from './contexts/FirebaseContext';

type ViewType = 
  | 'dashboard' 
  | 'settings' 
  | 'vgp'
  | 'extincteurs' 
  | 'desenfumage' 
  | 'portes' 
  | 'detection' 
  | 'baes' 
  | 'elec' 
  | 'sprinkler'
  | 'poteaux'
  | 'autres_extinctions'
  | 'sites' 
  | 'providers'
  | 'journal'
  | 'accessibility'
  | 'instructions'
  | 'documents'
  | 'audit';

export default function App() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const { user, userData, loading, signInWithGoogle, logout } = useFirebase();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="bg-blue-600 text-white p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center shadow-lg shadow-blue-200">
            <Shield size={40} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Registre Sécurité Pro</h1>
            <p className="text-gray-500">Connectez-vous pour accéder à votre espace de conformité réglementaire.</p>
          </div>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-white border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 shadow-sm"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Continuer avec Google
          </button>
        </div>
      </div>
    );
  }

  if (!userData?.companyId || userData.companyId === 'PENDING') {
    return (
      <OnboardingView 
        user={user} 
        onComplete={() => window.location.reload()} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Registre<br/>Sécurité Pro</h1>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-6">
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Pilotage</div>
            <div className="space-y-1">
              <NavItem icon={<LayoutDashboard size={18} />} label="Tableau de bord" onClick={() => setActiveView('dashboard')} active={activeView === 'dashboard'} />
              <NavItem icon={<Calendar size={18} />} label="Échéances VGP" onClick={() => setActiveView('vgp')} active={activeView === 'vgp'} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Registre Légal</div>
            <div className="space-y-1">
              <NavItem icon={<BookOpen size={18} />} label="Journal des Événements" onClick={() => setActiveView('journal')} active={activeView === 'journal'} />
              <NavItem icon={<FileText size={18} />} label="Documents & Rapports" onClick={() => setActiveView('documents')} active={activeView === 'documents'} />
              <NavItem icon={<Accessibility size={18} />} label="Registre Accessibilité" onClick={() => setActiveView('accessibility')} active={activeView === 'accessibility'} />
              <NavItem icon={<Megaphone size={18} />} label="Consignes de Sécurité" onClick={() => setActiveView('instructions')} active={activeView === 'instructions'} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Inventaire Technique</div>
            <div className="space-y-1">
              <NavItem icon={<FireExtinguisher size={18} />} label="Extincteurs & RIA" onClick={() => setActiveView('extincteurs')} active={activeView === 'extincteurs'} />
              <NavItem icon={<Droplets size={18} />} label="Réseaux Sprinkler" onClick={() => setActiveView('sprinkler')} active={activeView === 'sprinkler'} />
              <NavItem icon={<Droplet size={18} />} label="Poteaux Incendie (PEI)" onClick={() => setActiveView('poteaux')} active={activeView === 'poteaux'} />
              <NavItem icon={<ShieldPlus size={18} />} label="Autres Extinctions" onClick={() => setActiveView('autres_extinctions')} active={activeView === 'autres_extinctions'} />
              <NavItem icon={<Wind size={18} />} label="Désenfumage" onClick={() => setActiveView('desenfumage')} active={activeView === 'desenfumage'} />
              <NavItem icon={<DoorOpen size={18} />} label="Portes Coupe-Feu" onClick={() => setActiveView('portes')} active={activeView === 'portes'} />
              <NavItem icon={<BellRing size={18} />} label="Détection Incendie" onClick={() => setActiveView('detection')} active={activeView === 'detection'} />
              <NavItem icon={<Lightbulb size={18} />} label="Éclairage Secours" onClick={() => setActiveView('baes')} active={activeView === 'baes'} />
              <NavItem icon={<Zap size={18} />} label="Gaz & Électricité" onClick={() => setActiveView('elec')} active={activeView === 'elec'} />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Administration (HSQE)</div>
            <div className="space-y-1">
              <NavItem icon={<Building size={18} />} label="Établissements & Plans" onClick={() => setActiveView('sites')} active={activeView === 'sites'} />
              <NavItem icon={<Users size={18} />} label="Prestataires & Habilitations" onClick={() => setActiveView('providers')} active={activeView === 'providers'} />
              <NavItem icon={<Shield size={18} />} label="Piste d'Audit" onClick={() => setActiveView('audit')} active={activeView === 'audit'} />
              <NavItem icon={<Settings size={18} />} label="Paramètres" onClick={() => setActiveView('settings')} active={activeView === 'settings'} />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
              {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.displayName || 'Utilisateur'}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeView === 'dashboard' && <DashboardView companyId={userData?.companyId} onNavigate={setActiveView} />}
        {activeView === 'settings' && <SettingsView companyId={userData?.companyId} />}
        {activeView === 'vgp' && <VGPView companyId={userData?.companyId} />}
        {activeView === 'sites' && <SitesView companyId={userData?.companyId} />}
        {activeView === 'providers' && <ProvidersView companyId={userData?.companyId} />}
        {activeView === 'journal' && <JournalView companyId={userData?.companyId} />}
        {activeView === 'documents' && <DocumentsView companyId={userData?.companyId} />}
        {activeView === 'accessibility' && <AccessibilityView companyId={userData?.companyId} />}
        {activeView === 'instructions' && <InstructionsView />}
        {activeView === 'audit' && <AuditTrailView companyId={userData?.companyId} />}
        {['extincteurs', 'desenfumage', 'portes', 'detection', 'baes', 'elec', 'sprinkler', 'poteaux', 'autres_extinctions'].includes(activeView) && (
          <InventoryView category={activeView as any} companyId={userData?.companyId} />
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
      {icon}
      {label}
    </button>
  );
}
