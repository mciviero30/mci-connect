import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log full error details ONLY in DEV mode
    if (import.meta.env?.DEV) {
      console.error('🚨 ERROR BOUNDARY CAUGHT:', {
        error,
        message: error?.message,
        stack: error?.stack,
        errorInfo,
        componentStack: errorInfo?.componentStack
      });
    }
    
    // Store error details in state for DEV display
    this.setState({ 
      error: import.meta.env?.DEV ? error : null, 
      errorInfo: import.meta.env?.DEV ? errorInfo : null 
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
          <Card className="max-w-4xl w-full p-8 bg-slate-800 border-red-500/50">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
              <p className="text-slate-400 mb-6">
                The application encountered an unexpected error. Please reload the page to continue.
              </p>
              
              {/* DEV MODE: Display error details */}
              {import.meta.env?.DEV && this.state.error && (
                <div className="text-left mb-6 space-y-4">
                  <div className="bg-red-950/50 border border-red-500/50 rounded p-4">
                    <h3 className="text-red-400 font-bold mb-2">Error Message:</h3>
                    <p className="text-red-300 font-mono text-sm">{this.state.error.message}</p>
                  </div>
                  
                  {this.state.error.stack && (
                    <div className="bg-slate-950 border border-slate-700 rounded p-4 max-h-64 overflow-auto">
                      <h3 className="text-slate-300 font-bold mb-2">Stack Trace:</h3>
                      <pre className="text-slate-400 text-xs whitespace-pre-wrap font-mono">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div className="bg-slate-950 border border-slate-700 rounded p-4 max-h-64 overflow-auto">
                      <h3 className="text-slate-300 font-bold mb-2">Component Stack:</h3>
                      <pre className="text-slate-400 text-xs whitespace-pre-wrap font-mono">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  Reload Page
                </Button>
                <Button 
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;