import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

class ToastManager {
  private listeners: Set<(toast: ToastMessage) => void> = new Set();
  private removeListeners: Set<(id: string) => void> = new Set();

  subscribe(listener: (toast: ToastMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeRemove(listener: (id: string) => void) {
    this.removeListeners.add(listener);
    return () => this.removeListeners.delete(listener);
  }

  show(message: string, type: ToastType = 'info') {
    const id = Date.now().toString();
    const toast: ToastMessage = { id, message, type };
    this.listeners.forEach(listener => listener(toast));
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      this.removeListeners.forEach(listener => listener(id));
    }, 4000);
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warning(message: string) {
    this.show(message, 'warning');
  }

  info(message: string) {
    this.show(message, 'info');
  }
}

export const toast = new ToastManager();

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    toast.subscribe((newToast) => {
      setToasts(prev => [...prev, newToast]);
    });
  }, []);

  useEffect(() => {
    toast.subscribeRemove((id) => {
      setToasts(prev => prev.filter(t => t.id !== id));
    });
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} className="text-green-600" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-600" />;
      case 'warning':
        return <AlertCircle size={20} className="text-yellow-600" />;
      default:
        return <Info size={20} className="text-blue-600" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      default:
        return 'text-blue-800';
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg pointer-events-auto animate-in fade-in slide-in-from-right ${getBgColor(t.type)}`}
        >
          {getIcon(t.type)}
          <p className={`text-sm font-medium ${getTextColor(t.type)}`}>
            {t.message}
          </p>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-auto flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
