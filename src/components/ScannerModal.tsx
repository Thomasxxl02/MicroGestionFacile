import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { XCircle, Camera, Search, Info } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onFound: (equipment: any) => void;
}

export default function ScannerModal({ isOpen, onClose, companyId, onFound }: ScannerModalProps) {
  const [scannedId, setScannedId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "reader";

  useEffect(() => {
    if (isOpen) {
      const startScanner = async () => {
        try {
          const html5QrCode = new Html5Qrcode(scannerId);
          scannerRef.current = html5QrCode;
          
          const config = { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (decodedText && !isSearching) {
                setScannedId(decodedText);
                handleSearch(decodedText);
              }
            },
            () => {
              // ignore errors during scanning
            }
          );
        } catch (err) {
          console.error("Failed to start scanner:", err);
          setError("Erreur d'accès à la caméra. Vérifiez les permissions.");
        }
      };

      startScanner();

      return () => {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(err => console.error("Failed to stop scanner:", err));
          }
        }
      };
    }
  }, [isOpen]);

  const handleSearch = async (id: string) => {
    if (!id || isSearching) return;
    setIsSearching(true);
    setError(null);

    try {
      const q = query(
        collectionGroup(db, 'equipments'),
        where('companyId', '==', companyId)
      );
      
      const snapshot = await getDocs(q);
      const equipments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const found = equipments.find((i: any) => i.id === id || i.serialNumber === id);
      
      if (found) {
        // Success feedback
        if (navigator.vibrate) navigator.vibrate(100);
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-positive-interface-beep-221.mp3');
        audio.play().catch(() => {});
        
        onFound(found);
        onClose();
        setScannedId('');
      } else {
        setError("Équipement non trouvé dans votre inventaire.");
      }
    } catch (err) {
      console.error("Error searching equipment:", err);
      setError("Erreur lors de la recherche.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(scannedId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Scanner un équipement</h3>
              <p className="text-xs text-gray-500">QR Code ou Code-barres</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2 animate-shake">
              <XCircle size={16} />
              {error}
            </div>
          )}

          <div className="aspect-square bg-black rounded-2xl overflow-hidden relative border-4 border-white shadow-inner group">
            <div id={scannerId} className="w-full h-full [&>video]:object-cover"></div>
            
            {/* Overlay UI */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-64 border-2 border-white/30 rounded-3xl relative">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_infinite]"></div>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-10">
              <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                <p className="text-white text-xs font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isSearching ? 'bg-blue-500' : 'bg-red-500'}`}></span>
                  {isSearching ? 'Recherche...' : 'Prêt à scanner'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-widest">ou saisie manuelle</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  value={scannedId}
                  onChange={(e) => setScannedId(e.target.value)}
                  placeholder="ID ou Numéro de série"
                  className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>
              <button 
                type="submit"
                disabled={isSearching}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 disabled:opacity-50"
              >
                {isSearching ? '...' : 'Chercher'}
              </button>
            </form>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
            <Info size={16} />
          </div>
          <p className="text-[11px] text-gray-500 leading-tight">
            Le scanner identifie automatiquement l'équipement via son QR Code ou son code-barres.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
