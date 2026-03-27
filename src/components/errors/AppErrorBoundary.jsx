import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Top-level App Error Boundary
 * Catches any unhandled React render errors across the entire app.
 * Provides a friendly recovery UI instead of a blank screen.
 */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error, errorId: Date.now().toString(36) };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console for dev; swap for Sentry/telemetry in production
    console.error('🚨 [AppErrorBoundary] Uncaught render error:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorId: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Algo salió mal</h2>
          <p className="text-slate-500 text-sm">
            Ocurrió un error inesperado. Puedes intentar recargar esta sección o volver al inicio.
          </p>
          {this.state.error?.message && (
            <details className="text-left bg-slate-50 rounded-lg p-3 text-xs text-slate-400">
              <summary className="cursor-pointer font-medium text-slate-500 mb-1">Detalles del error</summary>
              <code className="break-all">{this.state.error.message}</code>
            </details>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Ir al inicio
            </button>
          </div>
          {this.state.errorId && (
            <p className="text-xs text-slate-300">ID: {this.state.errorId}</p>
          )}
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
