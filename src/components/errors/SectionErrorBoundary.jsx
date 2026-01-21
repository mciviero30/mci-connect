import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { telemetry } from '@/components/resilience/TelemetryService';

/**
 * Strategic Error Boundary for critical sections
 * 
 * Usage:
 * <SectionErrorBoundary section="Dashboard" onRetry={() => refetch()}>
 *   <YourComponent />
 * </SectionErrorBoundary>
 */
class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    const { section = 'Unknown Section', onError } = this.props;
    
    // CENTRALIZED ERROR LOGGING (telemetry hook point)
    console.error(`🚨 [${section}] Error Boundary Caught:`, {
      section,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    });
    
    // Log to telemetry (async, non-blocking, deduplicated)
    telemetry.logErrorBoundary(error, errorInfo, section);
    
    // Increment error count to detect error loops
    this.setState(prev => ({ 
      error, 
      errorCount: prev.errorCount + 1 
    }));

    // Optional callback for parent component
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    const { onRetry } = this.props;
    
    // Reset error state
    this.setState({ 
      hasError: false, 
      error: null 
    });

    // Call retry callback if provided
    if (onRetry) {
      onRetry();
    }
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { 
      children, 
      section = 'this section',
      fallbackClassName = '',
      showHomeButton = true,
      language = 'en'
    } = this.props;

    if (hasError) {
      // ERROR LOOP DETECTION - prevent infinite retry cycles
      const isErrorLoop = errorCount > 3;
      
      return (
        <div className={`flex items-center justify-center p-6 ${fallbackClassName}`}>
          <Card className="max-w-lg w-full p-6 bg-white dark:bg-slate-800 border-2 border-orange-200 dark:border-orange-900/30 shadow-xl">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {language === 'es' 
                    ? `Error al cargar ${section}` 
                    : `Error loading ${section}`}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {isErrorLoop
                    ? (language === 'es' 
                        ? 'Este error persiste. Por favor recarga la página o contacta a soporte.' 
                        : 'This error persists. Please reload the page or contact support.')
                    : (language === 'es'
                        ? 'Ocurrió un problema temporal. Puedes reintentar o volver al inicio.'
                        : 'A temporary problem occurred. You can retry or go back to home.')}
                </p>
              </div>

              {/* HIDE TECHNICAL DETAILS FROM END USERS - only console logs */}
              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-left text-xs">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                    {language === 'es' ? 'Detalles técnicos' : 'Technical details'}
                  </summary>
                  <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded text-slate-700 dark:text-slate-300 overflow-auto max-h-40">
                    {error.message}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 justify-center pt-2">
                {!isErrorLoop && (
                  <Button
                    onClick={this.handleRetry}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Reintentar' : 'Retry'}
                  </Button>
                )}
                
                {showHomeButton && (
                  <Link to={createPageUrl('Dashboard')}>
                    <Button variant="outline" className="border-slate-300">
                      <Home className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Volver al Inicio' : 'Go Home'}
                    </Button>
                  </Link>
                )}

                {isErrorLoop && (
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Recargar Página' : 'Reload Page'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return children;
  }
}

export default SectionErrorBoundary;