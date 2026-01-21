import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Lightweight Error Boundary for Modals/Dialogs
 * 
 * Usage:
 * <ModalErrorBoundary onClose={() => setDialogOpen(false)}>
 *   <ComplexModalContent />
 * </ModalErrorBoundary>
 */
class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 [Modal] Error Boundary Caught:', {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    });
    
    this.setState({ error });
  }

  handleClose = () => {
    const { onClose } = this.props;
    
    // Reset error state
    this.setState({ hasError: false, error: null });
    
    // Close modal
    if (onClose) {
      onClose();
    }
  };

  render() {
    const { hasError } = this.state;
    const { children, language = 'en' } = this.props;

    if (hasError) {
      return (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {language === 'es' 
                ? 'Error al cargar este contenido' 
                : 'Error loading this content'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {language === 'es'
                ? 'Por favor cierra este diálogo e intenta nuevamente.'
                : 'Please close this dialog and try again.'}
            </p>
          </div>

          <Button
            onClick={this.handleClose}
            variant="outline"
            className="border-slate-300"
          >
            <X className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Cerrar' : 'Close'}
          </Button>
        </div>
      );
    }

    return children;
  }
}

export default ModalErrorBoundary;