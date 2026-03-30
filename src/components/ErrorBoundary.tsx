import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      let parsedError = null;
      try {
        if (this.state.error?.message) {
          parsedError = JSON.parse(this.state.error.message);
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full border border-red-100">
            <div className="flex items-center gap-4 mb-6 text-red-600">
              <AlertCircle size={48} />
              <h1 className="text-2xl font-bold">Une erreur inattendue est survenue</h1>
            </div>
            
            <p className="text-gray-600 mb-6">
              L'application a rencontré un problème lors de l'exécution d'une opération.
            </p>

            {parsedError ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6 overflow-auto text-sm">
                <p className="font-semibold text-red-800 mb-2">Détails de l'erreur Firestore :</p>
                <p className="text-red-700"><strong>Opération :</strong> {parsedError.operationType}</p>
                <p className="text-red-700"><strong>Chemin :</strong> {parsedError.path}</p>
                <p className="text-red-700"><strong>Message :</strong> {parsedError.error}</p>
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg border border-gray-200 mb-6 overflow-auto text-sm">
                <p className="text-gray-800 font-mono whitespace-pre-wrap">
                  {this.state.error && this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Recharger l'application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
